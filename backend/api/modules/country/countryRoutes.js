const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const countryController = require('./countryController');

router.route('/')
    .get(authenticate, authorize('read', 'country'), countryController.getAllCountries);

module.exports = router;
