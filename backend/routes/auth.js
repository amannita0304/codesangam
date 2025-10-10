const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  register,
  login,
  getMe,
  logout,
  createAdmin,
  getPendingApprovals,
  approveStaff,
  updateProfile,
  changePassword
} = require('../controllers/authController');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Private routes (protected - require login)
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// Admin only routes (protected + admin role)
router.get('/pending-approvals', protect, authorize('admin'), getPendingApprovals);
router.put('/approve-staff/:id', protect, authorize('admin'), approveStaff);
router.post('/admin/create', protect, authorize('admin'), createAdmin);

module.exports = router;