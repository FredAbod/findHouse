const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: [
      'verification_approved',
      'verification_rejected',
      'user_role_changed',
      'user_suspended',
      'user_unsuspended',
      'property_removed',
      'property_restored',
      'admin_login',
      'settings_changed'
    ],
    required: true
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  targetProperty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ admin: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetUser: 1, createdAt: -1 });

// Static method to log an admin action
auditLogSchema.statics.logAction = async function(adminId, action, data = {}, req = null) {
  const logEntry = {
    admin: adminId,
    action,
    targetUser: data.targetUser,
    targetProperty: data.targetProperty,
    details: data.details || {}
  };

  if (req) {
    logEntry.ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    logEntry.userAgent = req.get?.('User-Agent') || 'unknown';
  }

  return await this.create(logEntry);
};

// Static method to get audit logs with filters
auditLogSchema.statics.getAuditLogs = async function(filters = {}, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  const query = {};

  if (filters.admin) query.admin = filters.admin;
  if (filters.action) query.action = filters.action;
  if (filters.targetUser) query.targetUser = filters.targetUser;
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }

  const logs = await this.find(query)
    .populate('admin', 'name email')
    .populate('targetUser', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(query);

  return {
    logs,
    page,
    pages: Math.ceil(total / limit),
    total
  };
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
