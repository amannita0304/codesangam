const User = require('../models/User');
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  const options = {
    expires: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    ),
    httpOnly: true
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        locality: user.address?.locality || null
      }
    });
};

// @desc    Register user (UPDATED with department validation)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, address, department } = req.body;

    // === SECURITY: PREVENT ADMIN REGISTRATION ===
    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin registration is not allowed publicly. Contact system administrator.'
      });
    }

    // === SECURITY: Staff registration requires locality ===
    if (role === 'staff' && (!address || !address.locality)) {
      return res.status(400).json({
        success: false,
        message: 'Staff registration requires locality information'
      });
    }

    // === NEW: Staff registration requires department ===
    if (role === 'staff' && !department) {
      return res.status(400).json({
        success: false,
        message: 'Department is required for staff registration'
      });
    }

    // === NEW: Validate department enum values for staff ===
    if (role === 'staff' && department) {
      const validDepartments = ['Roads', 'Water', 'Garbage', 'Electricity', 'General'];
      if (!validDepartments.includes(department)) {
        return res.status(400).json({
          success: false,
          message: `Invalid department. Must be one of: ${validDepartments.join(', ')}`
        });
      }
    }

    // === NEW: Remove department for non-staff users ===
    if (role !== 'staff' && department) {
      delete req.body.department; // Clean up department for citizens
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user - include department only for staff
    const userData = {
      name,
      email,
      password,
      role: role || 'citizen',
      phone,
      address,
      isApproved: role === 'citizen' // Auto-approve citizens only
    };

    // Only add department for staff users
    if (role === 'staff') {
      userData.department = department;
    }

    const user = await User.create(userData);

    // Notify local admin about new staff registration
    if (role === 'staff' && address.locality) {
      const localAdmin = await User.findOne({ 
        role: 'admin', 
        'address.locality': address.locality,
        isApproved: true 
      });
      
      if (localAdmin) {
        await Notification.create({
          user: localAdmin._id,
          title: 'New Staff Registration - Approval Required',
          message: `New staff "${name}" (${department}) registered in your locality (${address.locality}). Please review and approve.`,
          type: 'STAFF_REGISTRATION'
        });
        
        console.log(`📧 Notification sent to ${localAdmin.name} for staff approval`);
      }
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user (UPDATED with approval checks)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // === SECURITY: Check if staff/admin is approved ===
    if ((user.role === 'staff' || user.role === 'admin') && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval from administrator'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create admin (Only by existing admin)
// @route   POST /api/auth/admin/create
// @access  Private (Admin only)
exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, phone, address } = req.body;

    // Validate required fields for admin
    if (!name || !email || !password || !phone || !address || !address.locality) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, phone, and address with locality'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Verify requesting admin has authority for this locality
    if (req.user.address.locality !== address.locality) {
      return res.status(403).json({
        success: false,
        message: 'You can only create admins for your own locality'
      });
    }

    // Create admin user
    const admin = await User.create({
      name,
      email,
      password,
      role: 'admin',
      phone,
      address,
      isApproved: true, // Auto-approve admins
      approvedBy: req.user.id,
      approvedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: `Admin created successfully for ${address.locality} locality`,
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        locality: admin.address.locality,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
};

// @desc    Get pending staff approvals (for admin)
// @route   GET /api/auth/pending-approvals
// @access  Private (Admin only)
exports.getPendingApprovals = async (req, res, next) => {
  try {
    const pendingStaff = await User.find({
      role: 'staff',
      isApproved: false,
      'address.locality': req.user.address.locality // Only show staff from admin's locality
    }).select('-password');

    res.status(200).json({
      success: true,
      count: pendingStaff.length,
      data: pendingStaff
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Approve staff account
// @route   PUT /api/auth/approve-staff/:id
// @access  Private (Admin only)
exports.approveStaff = async (req, res, next) => {
  try {
    const staff = await User.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    // Verify staff is from admin's locality
    if (staff.address.locality !== req.user.address.locality) {
      return res.status(403).json({
        success: false,
        message: 'You can only approve staff from your own locality'
      });
    }

    // Verify it's actually a staff account
    if (staff.role !== 'staff') {
      return res.status(400).json({
        success: false,
        message: 'Can only approve staff accounts'
      });
    }

    staff.isApproved = true;
    staff.approvedBy = req.user.id;
    staff.approvedAt = new Date();
    await staff.save();

    // Send notification to approved staff
    await Notification.create({
      user: staff._id,
      title: 'Account Approved',
      message: `Your staff account has been approved by ${req.user.name}. You can now access the system.`,
      type: 'ACCOUNT_APPROVAL'
    });

    res.status(200).json({
      success: true,
      message: `Staff ${staff.name} approved successfully`,
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        locality: staff.address.locality,
        department: staff.department
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, address } = req.body;
    
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) {
      user.address = { ...user.address, ...address };
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};