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
