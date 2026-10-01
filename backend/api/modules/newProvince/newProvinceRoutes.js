const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { authorizeLookup } = require('../../../authorization/lookupPolicy');
const newProvinceController = require('./newProvinceController');

router.route('/')
    .get(authenticate, authorizeLookup('new_province.read'), newProvinceController.getAllNewProvinces);

module.exports = router;
