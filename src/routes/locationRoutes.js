const express = require('express');
const router = express.Router();
const { getStates, getCities } = require('../controllers/locationController');

router.get('/states', getStates);
router.get('/cities', getCities);

module.exports = router;
