const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { requireAdmin } = authorize;
const accountController = require('./accountController');

// All account administration routes are restricted strictly to Administrators
router.use(authenticate, requireAdmin);

// ─── CRUD routes
router.route('/')
    .get(authenticate, authorize('read', 'account'), accountController.getAllAccounts)
    .post(authenticate, authorize('create', 'account'), accountController.createAccount);

router.route('/:id')
    .get(authenticate, authorize('read', 'account'), accountController.getAccountById)
    .put(authenticate, authorize('update', 'account'), accountController.updateAccount)
    .delete(authenticate, authorize('delete', 'account'), accountController.deleteAccount);

// ─── Role assignment
router.route('/:id/assign-role')
    .put(authenticate, authorize('assign_role', 'account'), accountController.assignRole);

module.exports = router;
