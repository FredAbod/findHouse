const asyncHandler = require('express-async-handler');
const supportService = require('../services/supportService');

const submitContactForm = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');

  const result = await supportService.createSupportTicket(
    { name, email, subject, message },
    ipAddress,
    userAgent
  );

  res.json(result);
});

const getTicket = asyncHandler(async (req, res) => {
  const ticket = await supportService.getTicketById(req.params.ticketId);
  res.json(ticket);
});

const getTicketsByEmail = asyncHandler(async (req, res) => {
  const tickets = await supportService.getTicketsByEmail(req.params.email);
  res.json({ tickets });
});

const updateTicketStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const ticket = await supportService.updateTicketStatus(req.params.ticketId, status);
  res.json(ticket);
});

const addTicketResponse = asyncHandler(async (req, res) => {
  const { from, message } = req.body;
  const ticket = await supportService.addResponse(req.params.ticketId, from, message);
  res.json(ticket);
});

module.exports = {
  submitContactForm,
  getTicket,
  getTicketsByEmail,
  updateTicketStatus,
  addTicketResponse
};
