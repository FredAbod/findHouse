const asyncHandler = require('express-async-handler');
const messagingService = require('../services/messagingService');

const listConversations = asyncHandler(async (req, res) => {
  res.json(await messagingService.listConversations(req.user._id));
});

const getConversation = asyncHandler(async (req, res) => {
  res.json(await messagingService.getConversation(req.user._id, req.params.id));
});

/** Opens (or reuses) the thread for a listing: { propertyId }. */
const startConversation = asyncHandler(async (req, res) => {
  const conversation = await messagingService.startConversation(req.user._id, req.body.propertyId);
  res.status(201).json(conversation);
});

const sendMessage = asyncHandler(async (req, res) => {
  res.status(201).json(await messagingService.sendMessage(req.user._id, req.params.id, req.body));
});

const respondToViewing = asyncHandler(async (req, res) => {
  res.json(
    await messagingService.respondToViewing(req.user._id, req.params.id, req.params.messageId, req.body.status)
  );
});

module.exports = {
  listConversations,
  getConversation,
  startConversation,
  sendMessage,
  respondToViewing
};
