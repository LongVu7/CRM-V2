const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const accountController = require('./accountController');



// ─── CRUD routes
router.route('/')
    .get(authenticate, authorize('account.read'), accountController.getAllAccounts)
    .post(authenticate, authorize('account.create'), accountController.createAccount);

router.route('/:id')
    .get(authenticate, authorize('account.read'), accountController.getAccountById)
    .put(authenticate, authorize('account.update'), accountController.updateAccount)
    .delete(authenticate, authorize('account.delete'), accountController.deleteAccount);

// ─── Role assignment
router.route('/:id/assign-role')
    .put(authenticate, authorize('account.assign_role'), accountController.assignRole);

module.exports = router;
