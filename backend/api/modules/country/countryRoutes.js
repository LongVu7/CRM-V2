const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const countryController = require('./countryController');

router.route('/')
    .get(authenticate, countryController.getAllCountries);

module.exports = router;
