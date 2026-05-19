const express = require('express');
const rawBodySaver = express.raw({ type: 'application/json' });
const { handleWebhook } = require('../controllers/billingController');

const router = express.Router();
router.post('/', rawBodySaver, handleWebhook);

module.exports = router;
