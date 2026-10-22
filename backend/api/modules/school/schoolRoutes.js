const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { validateBody, validateParams } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const { createSchoolSchema, updateSchoolSchema } = require('./schoolSchemas');
const schoolController = require('./schoolController');

router.route('/')
    .get(authenticate, authorize('read', 'school'), schoolController.getAllSchools)
    .post(authenticate, authorize('create', 'school'), validateBody(createSchoolSchema), schoolController.createSchool);

router.route('/options')
    // .get(authenticate, authorize('read', 'school'), schoolController.getSchoolOptions);
    .get(authenticate, schoolController.getSchoolOptions);


router.route('/statistics')
    .get(authenticate, authorize('read', 'school'), schoolController.getStatistics);

router.route('/:id')
    .get(authenticate, validateParams(idParamSchema), schoolController.getSchoolById)
    .put(authenticate, authorize('update', 'school'), validateParams(idParamSchema), validateBody(updateSchoolSchema), schoolController.updateSchool)
    .delete(authenticate, authorize('delete', 'school'), validateParams(idParamSchema), schoolController.deleteSchool);

module.exports = router;
