const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { authorizeLookup } = require('../../../authorization/lookupPolicy');
const countryController = require('./countryController');

router.route('/')
    .get(authenticate, authorizeLookup('country.read'), countryController.getAllCountries);

module.exports = router;
