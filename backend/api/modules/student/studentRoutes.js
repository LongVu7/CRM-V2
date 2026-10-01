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
    .get(authenticate, authorize('student.read'), studentController.getAllStudents)
    .post(authenticate, authorize('student.create'), validateBody(createStudentSchema), studentController.createStudent);

router.route('/export')
    .get(authenticate, authorize('student.export'), studentController.exportStudents);

router.route('/import/preview')
    .post(authenticate, authorize('student.import'), upload.array('files'), studentController.previewImport);

router.route('/import/confirm')
    .post(authenticate, authorize('student.import'), validateBody(importStudentsPayloadSchema), studentController.confirmImport);

router.route('/:id')
    .get(authenticate, authorize('student.read'), validateParams(idParamSchema), studentController.getStudentById)
    .put(authenticate, authorize('student.update'), validateParams(idParamSchema), validateBody(updateStudentSchema), studentController.updateStudent)
    .delete(authenticate, authorize('student.delete'), validateParams(idParamSchema), studentController.deleteStudent);

module.exports = router;