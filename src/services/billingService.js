const crypto = require('crypto');
const User = require('../models/userModel');
const Property = require('../models/propertyModel');
const PaymentWebhookEvent = require('../models/paymentWebhookEventModel');
const {
  FREE_TIER_DAILY_LISTING_CREATES,
  PAYSTACK_PRO_AMOUNT_NGN,
  PRO_MAX_FEATURED_LISTINGS
} = require('../constants/billingConfig');

/** UTC midnight — stable server boundary without per-user TZ (document in FAQ if needed). */
function startOfUtcDay(referenceDate = new Date()) {
  const d = new Date(referenceDate);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const PAYSTACK_SECRET = () => process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_URL =
  () => process.env.FRONTEND_URL || 'https://www.findhouse.online';

function verifySignature(rawBodyUtf8String, signature) {
  const secret = PAYSTACK_SECRET();
  if (!secret || !signature) return false;
  const hash = crypto
    .createHmac('sha512', secret)
    .update(rawBodyUtf8String)
    .digest('hex');
  try {
    if (signature.length !== hash.length) return false;
    return crypto.timingSafeEqual(Buffer.from(hash, 'utf8'), Buffer.from(signature, 'utf8'));
  } catch {
    return false;
  }
}

async function paystackInitializeTransaction(body) {
  const secret = PAYSTACK_SECRET();
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not configured');
  const r = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return r.json();
}

async function paystackVerifyTransaction(reference) {
  const secret = PAYSTACK_SECRET();
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not configured');
  const r = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secret}` }
    }
  );
  return r.json();
}

function hasActiveProBilling(billingDoc) {
  if (!billingDoc) return false;
  if (
    billingDoc.plan === 'pro' &&
    billingDoc.subscriptionStatus === 'active' &&
    billingDoc.subscriptionExpiresAt
  ) {
    return new Date(billingDoc.subscriptionExpiresAt) > new Date();
  }
  return false;
}

class BillingService {
  /**
   * @param {mongoose.Document | { _id: string }} userLike Authenticated user
   */
  async assertCanCreateListing(userLike) {
    const userId = userLike._id?.toString() || userLike.toString();

    const user = await User.findById(userId).select('role billing').lean();
    if (!user) throw new Error('User not found');

    if (user.role === 'admin' || user.role === 'agent') return;

    if (hasActiveProBilling(user.billing)) return;

    const createdToday = await Property.countDocuments({
      owner: userId,
      createdAt: { $gte: startOfUtcDay() }
    });

    if (createdToday >= FREE_TIER_DAILY_LISTING_CREATES) {
      const err = new Error(
        `Free plan allows up to ${FREE_TIER_DAILY_LISTING_CREATES} new listings per day (UTC). Upgrade to FindHouse Pro for unlimited creates while subscribed.`
      );
      err.statusCode = 403;
      err.code = 'LISTING_DAILY_LIMIT_EXCEEDED';
      throw err;
    }
  }

  async initializeProCheckout(userLike) {
    const userId = userLike._id?.toString() || userLike.toString();
    const user = await User.findById(userId).select('email');
    if (!user?.email) throw new Error('User email required for checkout');

    const amountNgn =
      PAYSTACK_PRO_AMOUNT_NGN > 0
        ? PAYSTACK_PRO_AMOUNT_NGN
        : 5000;

    const amountKobo = amountNgn * 100;

    const base = FRONTEND_URL().replace(/\/+$/, '');
    const body = await paystackInitializeTransaction({
      email: user.email,
      amount: amountKobo,
      currency: 'NGN',
      callback_url: `${base}/profile?billing=success`,
      metadata: {
        userId,
        upgrade: 'pro'
      }
    });

    if (!body.status) {
      const err = new Error(body.message || 'Unable to start Paystack checkout');
      err.statusCode = 502;
      throw err;
    }

    return {
      authorizationUrl: body.data.authorization_url,
      accessCode: body.data.access_code,
      reference: body.data.reference
    };
  }

  /**
   * Paystack webhook: req has raw Buffer body & headers
   */
  async processWebhook(req) {
    const rawBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    const rawStr = rawBuffer.toString('utf8');
    const signature = req.headers['x-paystack-signature'];

    if (!verifySignature(rawStr, signature)) {
      const err = new Error('Invalid Paystack webhook signature');
      err.statusCode = 400;
      throw err;
    }

    /** @type {{ event?: string }} */
    let event;
    try {
      event = JSON.parse(rawStr);
    } catch {
      const err = new Error('Invalid webhook JSON');
      err.statusCode = 400;
      throw err;
    }

    if (event.event !== 'charge.success') {
      return { ignored: event.event };
    }

    /** @type {{ reference?: string } | undefined} */
    const payload = /** @type {any} */ (event).data;
    const reference = payload?.reference;
    if (!reference) {
      return { noop: true, reason: 'no_reference' };
    }

    try {
      await PaymentWebhookEvent.create({ reference, event: event.event });
    } catch (e) {
      if (e.code === 11000) {
        return { duplicate: true, reference };
      }
      throw e;
    }

    const ver = await paystackVerifyTransaction(reference);
    if (!ver.status || ver.data.status !== 'success') {
      const err = new Error('Transaction verification failed');
      err.statusCode = 400;
      throw err;
    }

    /** @type {Record<string, unknown>} */
    let md = {};

    /** @type {any} */
    const mdRaw = ver.data.metadata;
    if (mdRaw && typeof mdRaw === 'object' && !Array.isArray(mdRaw)) {
      md = mdRaw;
    } else if (typeof mdRaw === 'string') {
      try {
        const parsed = JSON.parse(mdRaw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          md = parsed;
        }
      } catch {
        md = {};
      }
    }

    const userId = String(md.userId ?? md.user_id ?? '').trim();

    const customerMd = /** @type {any} */ (ver.data.customer)?.metadata;

    const resolved =
      userId ||
      String(customerMd?.userId ?? customerMd?.user_id ?? '').trim();

    if (!resolved || md.upgrade !== 'pro') {
      return { noop: true, reason: 'not_pro_upgrade' };
    }

    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    /** @type {any} */
    const verData = ver.data;
    const customerCode =
      verData.customer && verData.customer.customer_code
        ? verData.customer.customer_code
        : null;

    await User.findByIdAndUpdate(resolved, {
      $set: {
        'billing.plan': 'pro',
        'billing.subscriptionStatus': 'active',
        'billing.subscriptionExpiresAt': expires,
        'billing.paystackCustomerCode': customerCode,
        'billing.lastTransactionReference': reference
      }
    });

    return { upgraded: true, userId: resolved };
  }

  sanitizeBillingPublic(userLean) {
    const b =
      userLean?.billing != null &&
      typeof userLean.billing === 'object'
        ? userLean.billing
        : {};

    const subscriptionExpiresAt = b.subscriptionExpiresAt || null;
    const expiredByDate =
      subscriptionExpiresAt !== null &&
      new Date(subscriptionExpiresAt).getTime() <= Date.now();

    let subscriptionStatus = b.subscriptionStatus || 'none';

    let plan = b.plan || 'free';

    if (subscriptionStatus === 'active' && plan === 'pro' && expiredByDate) {
      subscriptionStatus = 'expired';
      plan = 'free';
    }

    const proActive =
      plan === 'pro' &&
      subscriptionStatus === 'active' &&
      subscriptionExpiresAt &&
      !expiredByDate;

    return {
      plan: proActive ? 'pro' : plan,
      subscriptionStatus,
      subscriptionExpiresAt,
      /** Free-tier daily creation cap (UTC day); not a concurrent inventory limit */
      freeTierDailyListingCreates: FREE_TIER_DAILY_LISTING_CREATES,
      /** @deprecated Same numeric value as freeTierDailyListingCreates — prefer new field */
      listingLimitFree: FREE_TIER_DAILY_LISTING_CREATES,
      isProActive: proActive || false,
      proMaxFeaturedListings: PRO_MAX_FEATURED_LISTINGS
    };
  }
}

module.exports = new BillingService();
module.exports.hasActiveProBilling = hasActiveProBilling;
