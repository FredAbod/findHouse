const mongoose = require('mongoose');

/**
 * In-app notification feed. Rows are created server-side by the events that
 * matter to a user: a saved search matching new stock, a price drop on a
 * favourited listing, a reply in a conversation, an account/verification change.
 */
const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    /** Drives the category chips in the mobile notification centre. */
    category: {
      type: String,
      enum: ['matches', 'messages', 'account'],
      default: 'matches'
    },
    /** Drives the icon tint. */
    tone: {
      type: String,
      enum: ['primary', 'success', 'warning', 'neutral'],
      default: 'primary'
    },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    /** Optional deep-link target so a tap lands on the right screen. */
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      default: null
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null
    },
    thumb: { type: String, default: null },
    read: { type: Boolean, default: false }
  },
  { timestamps: true, versionKey: false }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
