const express = require('express');
const {
  getDashboardStats,
  generateCSVReport,
  generatePDFReport
} = require('../controllers/reportController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/csv', generateCSVReport);
router.get('/pdf', generatePDFReport);

module.exports = router;