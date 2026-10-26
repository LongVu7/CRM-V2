const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { validateBody, validateParams } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const { createStudentSchema, updateStudentSchema, importStudentsPayloadSchema } = require('./studentSchemas');
const upload = require('../../../middleware/upload');
const studentController = require('./studentController');

router.route('/')
    .get(authenticate, authorize('read', 'student'), studentController.getAllStudents)
    .post(authenticate, authorize('create', 'student'), validateBody(createStudentSchema), studentController.createStudent);

router.route('/options')
    .get(authenticate, studentController.getStudentOptions);

router.route('/export')
    .get(authenticate, authorize('export', 'student'), studentController.exportStudents);

router.route('/import/preview')
    .post(authenticate, authorize('import', 'student'), upload.array('files'), studentController.previewImport);

router.route('/import/confirm')
    .post(authenticate, authorize('import', 'student'), validateBody(importStudentsPayloadSchema), studentController.confirmImport);

router.route('/:id')
    .get(authenticate, authorize('read', 'student'), validateParams(idParamSchema), studentController.getStudentById)
    .put(authenticate, authorize('update', 'student'), validateParams(idParamSchema), validateBody(updateStudentSchema), studentController.updateStudent)
    .delete(authenticate, authorize('delete', 'student'), validateParams(idParamSchema), studentController.deleteStudent);

module.exports = router;