const SupportTicket = require('../models/supportTicketModel');
const emailService = require('./emailService');
const sanitizeHtml = require('sanitize-html');

class SupportService {
  generateTicketId() {
    const year = new Date().getFullYear();
    const timestamp = String(Date.now()).slice(-6);
    return `SUPP-${year}-${timestamp}`;
  }

  sanitizeInput(text) {
    return sanitizeHtml(text, {
      allowedTags: [],
      allowedAttributes: {}
    }).trim();
  }

  async createSupportTicket(data, ipAddress, userAgent) {
    try {
      // Sanitize all inputs
      const cleanData = {
        name: this.sanitizeInput(data.name),
        email: data.email.toLowerCase().trim(),
        subject: this.sanitizeInput(data.subject),
        message: this.sanitizeInput(data.message)
      };

      // Generate ticket ID
      const ticketId = this.generateTicketId();

      // Create ticket in database
      const ticket = await SupportTicket.create({
        ticketId,
        ...cleanData,
        status: 'open',
        priority: 'normal',
        source: 'website_contact_form',
        ipAddress,
        userAgent
      });

      // Send notification to support team
      try {
        await emailService.sendSupportNotification({
          ticketId,
          ...cleanData
        });
      } catch (emailError) {
        console.error('Failed to send support notification email:', emailError);
        // Don't fail the request if email fails
      }

      // Send confirmation to user
      try {
        await emailService.sendSupportConfirmation({
          to: cleanData.email,
          name: cleanData.name,
          ticketId,
          subject: cleanData.subject
        });
      } catch (emailError) {
        console.error('Failed to send user confirmation email:', emailError);
        // Don't fail the request if email fails
      }

      return {
        success: true,
        message: "We've received your message and will get back to you within 24 hours.",
        ticketId
      };
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw error;
    }
  }

  async getTicketById(ticketId) {
    const ticket = await SupportTicket.findOne({ ticketId });
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    return ticket;
  }

  async getTicketsByEmail(email) {
    const tickets = await SupportTicket.find({ 
      email: email.toLowerCase() 
    }).sort({ createdAt: -1 });
    return tickets;
  }

  escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Admin inbox: paginated filters + lightweight rows */
  async adminListTickets(opts = {}) {
    const page = Math.max(parseInt(opts.page, 10) || 1, 1);
    let limit = parseInt(opts.limit, 10) || 20;
    limit = Math.min(Math.max(limit, 1), 100);

    const query = {};

    const status = opts.status;
    if (status && ['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      query.status = status;
    }

    const priority = opts.priority;
    if (priority && ['low', 'normal', 'high', 'urgent'].includes(priority)) {
      query.priority = priority;
    }

    const rawSearch = opts.search ? String(opts.search).trim() : '';
    if (rawSearch) {
      const rx = new RegExp(this.escapeRegex(rawSearch), 'i');
      query.$or = [
        { ticketId: rx },
        { name: rx },
        { email: rx },
        { subject: rx },
        { message: rx }
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      SupportTicket.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          'ticketId name email subject message status priority source responses createdAt updatedAt resolvedAt ipAddress'
        )
        .lean(),
      SupportTicket.countDocuments(query)
    ]);

    const tickets = items.map((t) => ({
      _id: t._id,
      ticketId: t.ticketId,
      name: t.name,
      email: t.email,
      subject: t.subject,
      messagePreview:
        t.message && t.message.length > 200 ? `${String(t.message).slice(0, 197)}…` : (t.message || ''),
      status: t.status,
      priority: t.priority,
      source: t.source,
      responseCount: Array.isArray(t.responses) ? t.responses.length : 0,
      ipAddress: t.ipAddress,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      resolvedAt: t.resolvedAt
    }));

    return {
      tickets,
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
      total
    };
  }

  /** Full ticket document for CS view */
  async adminGetTicketByTicketId(ticketId) {
    const ticket = await SupportTicket.findOne({ ticketId }).lean();
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.statusCode = 404;
      throw err;
    }
    return ticket;
  }

  async adminPatchTicket(ticketId, { status, priority }) {
    const updates = {};

    if (status !== undefined) {
      if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
        const err = new Error('Invalid status');
        err.statusCode = 400;
        throw err;
      }
      updates.status = status;
      if (status === 'resolved' || status === 'closed') {
        updates.resolvedAt = new Date();
      } else {
        updates.resolvedAt = null;
      }
    }

    if (priority !== undefined) {
      if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
        const err = new Error('Invalid priority');
        err.statusCode = 400;
        throw err;
      }
      updates.priority = priority;
    }

    if (!Object.keys(updates).length) {
      const err = new Error('No valid fields to update');
      err.statusCode = 400;
      throw err;
    }

    const ticket = await SupportTicket.findOneAndUpdate(
      { ticketId },
      { $set: updates },
      { new: true }
    ).lean();

    if (!ticket) {
      const err = new Error('Ticket not found');
      err.statusCode = 404;
      throw err;
    }
    return ticket;
  }

  async adminStaffReply(ticketId, adminUser, plainMessage) {
    const labelParts = [];
    if (adminUser?.name) labelParts.push(adminUser.name);
    if (adminUser?.email) labelParts.push(adminUser.email);
    const from = labelParts.length ? `${labelParts[0]} (support)` : 'Support';
    const message = this.sanitizeInput(plainMessage || '');
    if (!message || message.length < 1) {
      const err = new Error('Message is required');
      err.statusCode = 400;
      throw err;
    }
    return this.addResponse(ticketId, from, message);
  }

  async updateTicketStatus(ticketId, status) {
    const ticket = await SupportTicket.findOneAndUpdate(
      { ticketId },
      { 
        status,
        ...(status === 'resolved' || status === 'closed' ? { resolvedAt: new Date() } : {})
      },
      { new: true }
    );
    
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    
    return ticket;
  }

  async addResponse(ticketId, from, message) {
    const ticket = await SupportTicket.findOne({ ticketId });
    
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    ticket.responses.push({
      from,
      message: this.sanitizeInput(message),
      timestamp: new Date()
    });

    await ticket.save();
    return ticket;
  }
}

module.exports = new SupportService();
