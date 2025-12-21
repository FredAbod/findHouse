const User = require('../models/userModel');
const Activity = require('../models/activityModel');
const Analytics = require('../models/analyticsModel');
const AuditLog = require('../models/auditLogModel');
const { encrypt, decrypt, maskIdNumber } = require('../utils/encryption');

class VerificationService {
  // Submit verification request
  async submitVerification(userId, verificationData, documentUrl) {
    const { idType, idNumber, residentialAddress } = verificationData;

    // Validate ID type
    if (!['NIN', 'BVN', 'DRIVERS_LICENSE'].includes(idType)) {
      throw new Error('Invalid ID type. Must be NIN, BVN, or DRIVERS_LICENSE');
    }

    if (!idNumber || idNumber.length < 5) {
      throw new Error('Invalid ID number');
    }

    // Validate residential address
    if (!residentialAddress) {
      throw new Error('Residential address is required');
    }

    let parsedAddress = residentialAddress;
    if (typeof residentialAddress === 'string') {
      try {
        parsedAddress = JSON.parse(residentialAddress);
      } catch (e) {
        throw new Error('Invalid residential address format');
      }
    }

    if (!parsedAddress.address || !parsedAddress.city || !parsedAddress.state) {
      throw new Error('Residential address must include address, city, and state');
    }

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Check if already verified or pending
    if (user.verification?.status === 'verified') {
      throw new Error('User is already verified');
    }

    if (user.verification?.status === 'pending') {
      throw new Error('Verification request already pending');
    }

    // Encrypt ID number before storing
    const encryptedIdNumber = encrypt(idNumber);

    // Update user with verification data
    user.verification = {
      status: 'pending',
      idType,
      idNumber: encryptedIdNumber,
      documentUrl,
      residentialAddress: {
        address: parsedAddress.address,
        city: parsedAddress.city,
        state: parsedAddress.state
      },
      submittedAt: new Date()
    };

    await user.save();

    // Log activity and update analytics
    await Promise.all([
      Activity.logActivity('verification_submitted', userId, {
        idType
      }),
      Analytics.incrementMetric('verificationRequests')
    ]);

    return {
      success: true,
      message: 'Verification request submitted successfully',
      verificationId: user._id.toString(),
      status: 'pending'
    };
  }

  // Get verification status
  async getVerificationStatus(userId) {
    const user = await User.findById(userId).select('verification verifiedAt');
    
    if (!user) throw new Error('User not found');

    return {
      status: user.verification?.status || 'unverified',
      idType: user.verification?.idType,
      submittedAt: user.verification?.submittedAt,
      reviewedAt: user.verification?.reviewedAt,
      rejectionReason: user.verification?.rejectionReason,
      verifiedAt: user.verifiedAt
    };
  }

  // Get all pending verification requests (Admin only)
  async getPendingVerifications(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const users = await User.find({
      'verification.status': 'pending'
    })
      .select('name email phone verification createdAt')
      .sort({ 'verification.submittedAt': 1 }) // Oldest first
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({
      'verification.status': 'pending'
    });

    // Mask ID numbers for security (decrypt first, then mask)
    const maskedUsers = users.map(user => {
      let maskedIdNumber = null;
      if (user.verification?.idNumber) {
        try {
          const decryptedId = decrypt(user.verification.idNumber);
          maskedIdNumber = maskIdNumber(decryptedId);
        } catch (e) {
          // If decryption fails (old unencrypted data), use direct masking
          maskedIdNumber = maskIdNumber(user.verification.idNumber);
        }
      }
      
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        idType: user.verification?.idType,
        idNumber: maskedIdNumber,
        documentUrl: user.verification?.documentUrl,
        submittedAt: user.verification?.submittedAt,
        userCreatedAt: user.createdAt
      };
    });

    return {
      verifications: maskedUsers,
      page,
      pages: Math.ceil(total / limit),
      total
    };
  }

  // Approve verification (Admin only)
  async approveVerification(userId, adminId, req = null) {
    const user = await User.findById(userId);
    
    if (!user) throw new Error('User not found');
    if (user.verification?.status !== 'pending') {
      throw new Error('No pending verification request found');
    }

    user.verification.status = 'verified';
    user.verification.reviewedAt = new Date();
    user.verification.reviewedBy = adminId;
    user.isVerified = true;
    user.verifiedAt = new Date();

    await user.save();

    // Log activity and audit
    await Promise.all([
      Activity.logActivity('verification_approved', adminId, {
        verifiedUserId: userId,
        userName: user.name
      }),
      AuditLog.logAction(adminId, 'verification_approved', {
        targetUser: userId,
        details: {
          userName: user.name,
          userEmail: user.email,
          idType: user.verification.idType
        }
      }, req)
    ]);

    // TODO: Send email notification to user
    // await emailService.sendVerificationApproved(user.email, user.name);

    return {
      success: true,
      message: 'User verification approved',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        verificationStatus: 'verified'
      }
    };
  }

  // Reject verification (Admin only)
  async rejectVerification(userId, adminId, reason, req = null) {
    const user = await User.findById(userId);
    
    if (!user) throw new Error('User not found');
    if (user.verification?.status !== 'pending') {
      throw new Error('No pending verification request found');
    }

    user.verification.status = 'rejected';
    user.verification.reviewedAt = new Date();
    user.verification.reviewedBy = adminId;
    user.verification.rejectionReason = reason || 'Verification documents not acceptable';

    await user.save();

    // Log activity and audit
    await Promise.all([
      Activity.logActivity('verification_rejected', adminId, {
        rejectedUserId: userId,
        userName: user.name,
        reason: user.verification.rejectionReason
      }),
      AuditLog.logAction(adminId, 'verification_rejected', {
        targetUser: userId,
        details: {
          userName: user.name,
          userEmail: user.email,
          idType: user.verification.idType,
          rejectionReason: user.verification.rejectionReason
        }
      }, req)
    ]);

    // TODO: Send email notification to user with rejection reason
    // await emailService.sendVerificationRejected(user.email, user.name, user.verification.rejectionReason);

    return {
      success: true,
      message: 'User verification rejected',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        verificationStatus: 'rejected',
        rejectionReason: user.verification.rejectionReason
      }
    };
  }

  // Get verification stats (Admin only)
  async getVerificationStats() {
    const [pending, verified, rejected, unverified] = await Promise.all([
      User.countDocuments({ 'verification.status': 'pending' }),
      User.countDocuments({ 'verification.status': 'verified' }),
      User.countDocuments({ 'verification.status': 'rejected' }),
      User.countDocuments({ 
        $or: [
          { 'verification.status': 'unverified' },
          { 'verification.status': { $exists: false } }
        ]
      })
    ]);

    return {
      pending,
      verified,
      rejected,
      unverified,
      total: pending + verified + rejected + unverified
    };
  }
}

module.exports = new VerificationService();
