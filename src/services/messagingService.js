const Conversation = require('../models/conversationModel');
const Property = require('../models/propertyModel');
const engagementService = require('./engagementService');

const OWNER_FIELDS = 'name nickname profilePicture isVerified verification.status';

function otherParticipant(conversation, userId) {
  return (conversation.participants || []).find((p) => String(p._id || p) !== String(userId));
}

class MessagingService {
  /** Threads for the inbox, newest activity first. */
  async listConversations(userId) {
    const rows = await Conversation.find({ participants: userId })
      .sort({ lastMessageAt: -1 })
      .populate('participants', OWNER_FIELDS)
      .populate('property', 'title images price location status')
      .lean();

    return rows.map((row) => {
      const last = row.messages?.[row.messages.length - 1];
      return {
        _id: row._id,
        property: row.property,
        counterpart: otherParticipant(row, userId),
        lastMessage: last
          ? {
              body: last.kind === 'viewing_request' ? 'Viewing request' : last.body,
              at: last.createdAt,
              mine: String(last.sender) === String(userId)
            }
          : null,
        unread: (row.messages || []).filter(
          (m) => String(m.sender) !== String(userId) && !m.readAt
        ).length,
        lastMessageAt: row.lastMessageAt
      };
    });
  }

  async getConversation(userId, conversationId) {
    const conversation = await Conversation.findOne({ _id: conversationId, participants: userId })
      .populate('participants', OWNER_FIELDS)
      .populate('property', 'title images price location status availableFrom');

    if (!conversation) {
      throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
    }

    // Opening a thread marks the other side's messages as read.
    let touched = false;
    conversation.messages.forEach((message) => {
      if (String(message.sender) !== String(userId) && !message.readAt) {
        message.readAt = new Date();
        touched = true;
      }
    });
    if (touched) await conversation.save();

    return {
      _id: conversation._id,
      property: conversation.property,
      counterpart: otherParticipant(conversation.toObject(), userId),
      messages: conversation.messages
    };
  }

  /**
   * Opens (or reuses) the thread between an enquirer and a listing's owner.
   * One thread per property per pair, enforced by a unique index.
   */
  async startConversation(userId, propertyId) {
    const property = await Property.findById(propertyId).select('owner title images');
    if (!property || property.deletedAt) {
      throw Object.assign(new Error('Property not found'), { statusCode: 404 });
    }
    if (String(property.owner) === String(userId)) {
      throw Object.assign(new Error('You cannot message your own listing'), { statusCode: 400 });
    }

    const participants = [userId, property.owner];
    let conversation = await Conversation.findOne({ property: propertyId, participants: { $all: participants } });

    if (!conversation) {
      conversation = await Conversation.create({ participants, property: propertyId, messages: [] });
    }

    return this.getConversation(userId, conversation._id);
  }

  async sendMessage(userId, conversationId, { body, kind, viewingRequest }) {
    const conversation = await Conversation.findOne({ _id: conversationId, participants: userId }).populate(
      'property',
      'title'
    );
    if (!conversation) {
      throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
    }
    if (kind !== 'viewing_request' && !String(body || '').trim()) {
      throw Object.assign(new Error('Message body is required'), { statusCode: 400 });
    }

    conversation.messages.push({
      sender: userId,
      body: body || '',
      kind: kind || 'text',
      viewingRequest: kind === 'viewing_request' ? viewingRequest : undefined
    });
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const recipient = otherParticipant(conversation.toObject(), userId);
    if (recipient) {
      await engagementService.notify(recipient, {
        category: 'messages',
        tone: 'neutral',
        title: kind === 'viewing_request' ? 'New viewing request' : 'You have a new message',
        body: kind === 'viewing_request' ? viewingRequest?.place || '' : String(body).slice(0, 120),
        conversation: conversation._id,
        property: conversation.property?._id || conversation.property
      });
    }

    return conversation.messages[conversation.messages.length - 1];
  }

  /** Accept or decline a viewing request embedded in a thread. */
  async respondToViewing(userId, conversationId, messageId, status) {
    if (!['accepted', 'declined'].includes(status)) {
      throw Object.assign(new Error('status must be accepted or declined'), { statusCode: 400 });
    }

    const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
    if (!conversation) throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });

    const message = conversation.messages.id(messageId);
    if (!message || message.kind !== 'viewing_request') {
      throw Object.assign(new Error('Viewing request not found'), { statusCode: 404 });
    }

    message.viewingRequest.status = status;
    await conversation.save();

    await engagementService.notify(message.sender, {
      category: 'messages',
      tone: status === 'accepted' ? 'success' : 'neutral',
      title: `Viewing ${status}`,
      body: message.viewingRequest.place || '',
      conversation: conversation._id
    });

    return message;
  }

  /** Enquiry counts per listing, for the owner's analytics. */
  async enquiryCounts(ownerId) {
    const rows = await Conversation.aggregate([
      { $match: { participants: ownerId } },
      { $group: { _id: '$property', count: { $sum: 1 } } }
    ]);
    return rows.reduce((acc, row) => {
      acc[String(row._id)] = row.count;
      return acc;
    }, {});
  }

  /**
   * Median first-reply time in minutes — published on the public profile, which
   * is precisely why measuring it changes owner behaviour.
   */
  async replyStats(ownerId) {
    const conversations = await Conversation.find({ participants: ownerId }).select('messages').lean();

    const gaps = [];
    let answered = 0;
    conversations.forEach((conversation) => {
      const messages = conversation.messages || [];
      const firstIncoming = messages.find((m) => String(m.sender) !== String(ownerId));
      if (!firstIncoming) return;
      const firstReply = messages.find(
        (m) => String(m.sender) === String(ownerId) && new Date(m.createdAt) > new Date(firstIncoming.createdAt)
      );
      if (!firstReply) return;
      answered += 1;
      gaps.push((new Date(firstReply.createdAt) - new Date(firstIncoming.createdAt)) / 60000);
    });

    const enquired = conversations.filter((c) =>
      (c.messages || []).some((m) => String(m.sender) !== String(ownerId))
    ).length;

    if (!gaps.length) return { replyMinutes: null, replyRate: enquired ? 0 : null, conversations: enquired };

    gaps.sort((a, b) => a - b);
    const median = gaps[Math.floor(gaps.length / 2)];
    return {
      replyMinutes: Math.round(median),
      replyRate: enquired ? Math.round((answered / enquired) * 100) : null,
      conversations: enquired
    };
  }
}

module.exports = new MessagingService();
