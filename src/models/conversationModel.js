const mongoose = require('mongoose');

/**
 * Messages are embedded rather than kept in their own collection: a property
 * enquiry thread is short and is always read in full, so one document per
 * conversation avoids a join on every open.
 */
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    body: { type: String, default: '' },
    /**
     * Structured payloads WhatsApp cannot produce — currently viewing
     * requests, with the accepted slot mirrored into the owner's bookings.
     */
    kind: {
      type: String,
      enum: ['text', 'viewing_request'],
      default: 'text'
    },
    viewingRequest: {
      date: Date,
      place: String,
      note: String,
      status: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
        default: 'pending'
      }
    },
    readAt: { type: Date, default: null }
  },
  { timestamps: true, _id: true }
);

const conversationSchema = new mongoose.Schema(
  {
    /** Always [enquirer, owner]. */
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true
    },
    messages: [messageSchema],
    lastMessageAt: { type: Date, default: Date.now }
  },
  { timestamps: true, versionKey: false }
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ property: 1, participants: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
