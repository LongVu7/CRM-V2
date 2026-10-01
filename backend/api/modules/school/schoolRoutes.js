const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { authorizeLookup } = require('../../../authorization/lookupPolicy');
const { validateBody, validateParams } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const { createSchoolSchema, updateSchoolSchema } = require('./schoolSchemas');
const schoolController = require('./schoolController');

router.route('/')
    .get(authenticate, authorize('school.read'), schoolController.getAllSchools)
    .post(authenticate, authorize('school.create'), validateBody(createSchoolSchema), schoolController.createSchool);

router.route('/options')
    .get(authenticate, authorizeLookup('school.options'), schoolController.getSchoolOptions);

router.route('/statistics')
    .get(authenticate, authorize('school.read'), schoolController.getStatistics);

router.route('/:id')
    .get(authenticate, authorize('school.read'), validateParams(idParamSchema), schoolController.getSchoolById)
    .put(authenticate, authorize('school.update'), validateParams(idParamSchema), validateBody(updateSchoolSchema), schoolController.updateSchool)
    .delete(authenticate, authorize('school.delete'), validateParams(idParamSchema), schoolController.deleteSchool);

module.exports = router;
