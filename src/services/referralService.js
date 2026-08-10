const crypto = require('crypto');
const Referral = require('../models/referralModel');
const User = require('../models/userModel');
const settingsService = require('./settingsService');
const engagementService = require('./engagementService');

/**
 * Share-to-earn. The app has been promising "Earn ₦5,000 if they rent it" in
 * the share sheet with nothing behind it; this is the mechanism.
 *
 * The payout figure is never hard-coded — it comes from settingsService, which
 * an admin can change without a redeploy.
 */

const SHARE_BASE = process.env.PUBLIC_APP_URL || 'https://findhouse.online';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 — these get read aloud

function generateCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i += 1) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

/** Lazily assigns a referral code the first time a user needs one. */
async function ensureCode(userId) {
  const user = await User.findById(userId).select('referralCode');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  if (user.referralCode) return user.referralCode;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    const taken = await User.exists({ referralCode: code });
    if (taken) continue;
    user.referralCode = code;
    await user.save();
    return code;
  }
  throw new Error('Could not allocate a referral code');
}

/**
 * Links a new signup to whoever invited them. Called from registration.
 * Never throws into the signup path — a bad code must not block an account.
 */
async function attachReferral(inviteeId, rawCode) {
  try {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) return null;

    const referrer = await User.findOne({ referralCode: code }).select('_id');
    if (!referrer) return null;
    if (String(referrer._id) === String(inviteeId)) return null; // no self-referral

    const existing = await Referral.findOne({ invitee: inviteeId });
    if (existing) return existing;

    const referral = await Referral.create({ referrer: referrer._id, invitee: inviteeId, code });

    // Pay immediately only if the operator configured signup-time qualification.
    if ((await settingsService.get('referralQualifyOn')) === 'signup') {
      await qualify(inviteeId, 'signup');
    }

    return referral;
  } catch (error) {
    console.error('attachReferral failed:', error.message);
    return null;
  }
}

/**
 * Marks an invitee's referral as qualified. Idempotent — the first qualifying
 * event wins and later ones are ignored.
 */
async function qualify(inviteeId, reason) {
  const referral = await Referral.findOne({ invitee: inviteeId, status: 'pending' });
  if (!referral) return null;

  referral.status = 'qualified';
  referral.qualifiedBy = reason;
  referral.qualifiedAt = new Date();
  referral.bonusAmount = await settingsService.get('referralBonus');
  await referral.save();

  await engagementService.notify(referral.referrer, {
    category: 'account',
    tone: 'success',
    title: `You earned ₦${referral.bonusAmount.toLocaleString('en-NG')}`,
    body: 'Someone you invited just qualified. We will be in touch about payout.'
  });

  return referral;
}

/**
 * Hook for the events that count as qualifying. Called after a listing is
 * published and after a Pro subscription activates.
 */
async function onInviteeMilestone(userId, reason) {
  try {
    if ((await settingsService.get('referralQualifyOn')) !== 'listing_or_pro') return null;
    return await qualify(userId, reason);
  } catch (error) {
    console.error('Referral milestone failed:', error.message);
    return null;
  }
}

/** Everything the app's Refer & earn screen needs. */
async function summary(userId) {
  const [code, bonus, rows] = await Promise.all([
    ensureCode(userId),
    settingsService.get('referralBonus'),
    Referral.find({ referrer: userId })
      .populate('invitee', 'name createdAt')
      .sort({ createdAt: -1 })
      .lean()
  ]);

  const counts = { pending: 0, qualified: 0, paid: 0 };
  let earned = 0;
  let awaiting = 0;

  rows.forEach((row) => {
    if (counts[row.status] !== undefined) counts[row.status] += 1;
    if (row.status === 'paid') earned += row.bonusAmount || 0;
    if (row.status === 'qualified') awaiting += row.bonusAmount || 0;
  });

  return {
    code,
    bonus,
    shareUrl: `${SHARE_BASE}/?ref=${code}`,
    counts,
    totals: { earned, awaiting },
    invites: rows.map((row) => ({
      id: row._id,
      name: row.invitee?.name ?? 'Someone',
      joinedAt: row.invitee?.createdAt ?? row.createdAt,
      status: row.status,
      bonusAmount: row.bonusAmount
    }))
  };
}

/* ------------------------------------------------------------------- admin */

async function listForAdmin({ status } = {}) {
  const query = status && status !== 'all' ? { status } : {};
  return Referral.find(query)
    .populate('referrer', 'name email referralCode')
    .populate('invitee', 'name email')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
}

async function markPaid(referralId, adminUserId, payoutReference) {
  const referral = await Referral.findById(referralId);
  if (!referral) throw Object.assign(new Error('Referral not found'), { statusCode: 404 });
  if (referral.status !== 'qualified') {
    throw Object.assign(new Error('Only qualified referrals can be paid'), { statusCode: 400 });
  }

  referral.status = 'paid';
  referral.paidAt = new Date();
  referral.paidBy = adminUserId;
  referral.payoutReference = payoutReference || null;
  await referral.save();

  await engagementService.notify(referral.referrer, {
    category: 'account',
    tone: 'success',
    title: `₦${(referral.bonusAmount || 0).toLocaleString('en-NG')} referral bonus paid`,
    body: payoutReference ? `Reference ${payoutReference}` : 'Check your payout account.'
  });

  return referral;
}

module.exports = {
  ensureCode,
  attachReferral,
  qualify,
  onInviteeMilestone,
  summary,
  listForAdmin,
  markPaid
};
