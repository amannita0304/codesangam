const express = require('express');
const {
  getComplaints,
  getComplaint,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  getMyComplaints,
  getAssignedComplaints,
  assignComplaint
} = require('../controllers/complaintController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { validateComplaint } = require('../middleware/validation');

// File upload setup
const multer = require('multer');
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './public/uploads/');
  },
  filename: function(req, file, cb){
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

router.use(protect);

router.route('/')
  .get(authorize('admin', 'staff'), getComplaints)
  .post(upload.single('photo'), validateComplaint, createComplaint);

router.route('/citizen/my-complaints')
  .get(getMyComplaints);

router.route('/staff/assigned')
  .get(authorize('staff'), getAssignedComplaints);

router.route('/:id/assign')
  .put(authorize('admin'), assignComplaint);

router.route('/:id')
  .get(getComplaint)
  .put(upload.single('resolutionPhoto'), updateComplaint)
  .delete(authorize('admin'), deleteComplaint);

module.exports = router;