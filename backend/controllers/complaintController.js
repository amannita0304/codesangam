const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Private
exports.getComplaints = async (req, res, next) => {
  try {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    query = Complaint.find(JSON.parse(queryStr)).populate('citizen', 'name email phone').populate('assignedTo', 'name');

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Complaint.countDocuments();

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const complaints = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: complaints.length,
      pagination,
      data: complaints
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single complaint
// @route   GET /api/complaints/:id
// @access  Private
exports.getComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('citizen', 'name email phone')
      .populate('assignedTo', 'name')
      .populate('notes.staff', 'name');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    res.status(200).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create complaint
// @route   POST /api/complaints
// @access  Private
exports.createComplaint = async (req, res, next) => {
  try {
    // Add citizen to req.body
    req.body.citizen = req.user.id;

    // Handle file upload
    if (req.file) {
      req.body.photo = `/uploads/${req.file.filename}`;
    }

    const complaint = await Complaint.create(req.body);

    // Create notification for admins
    const admins = await User.find({ role: 'admin' });
    const notificationPromises = admins.map(admin => 
      Notification.create({
        user: admin._id,
        title: 'New Complaint Submitted',
        message: `A new ${complaint.type} complaint has been submitted by ${req.user.name}`,
        complaint: complaint._id
      })
    );

    await Promise.all(notificationPromises);

    res.status(201).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update complaint
// @route   PUT /api/complaints/:id
// @access  Private
exports.updateComplaint = async (req, res, next) => {
  try {
    let complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Handle resolution photo upload
    if (req.file && req.body.status === 'RESOLVED') {
      req.body.resolutionPhoto = `/uploads/${req.file.filename}`;
      req.body.resolvedAt = new Date();
    }

    // Add note if provided
    if (req.body.note) {
      req.body.notes = [
        ...complaint.notes,
        {
          staff: req.user.id,
          note: req.body.note,
          createdAt: new Date()
        }
      ];
    }

    // Update timestamp
    req.body.updatedAt = new Date();

    complaint = await Complaint.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Create notification for citizen if status changed
    if (req.body.status && req.body.status !== complaint.status) {
      await Notification.create({
        user: complaint.citizen,
        title: 'Complaint Status Updated',
        message: `Your complaint ${complaint.complaintId} status has been changed to ${req.body.status}`,
        complaint: complaint._id
      });
    }

    res.status(200).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete complaint
// @route   DELETE /api/complaints/:id
// @access  Private (Admin only)
exports.deleteComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    await Complaint.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get complaints by citizen
// @route   GET /api/complaints/citizen/my-complaints
// @access  Private
exports.getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ citizen: req.user.id })
      .populate('assignedTo', 'name')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get assigned complaints for staff
// @route   GET /api/complaints/staff/assigned
// @access  Private (Staff)
exports.getAssignedComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ assignedTo: req.user.id })
      .populate('citizen', 'name phone')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Assign complaint to staff
// @route   PUT /api/complaints/:id/assign
// @access  Private (Admin)
exports.assignComplaint = async (req, res, next) => {
  try {
    const { staffId } = req.body;

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { 
        assignedTo: staffId,
        status: 'IN PROGRESS',
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('citizen', 'name email phone').populate('assignedTo', 'name');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Create notifications
    await Promise.all([
      Notification.create({
        user: complaint.citizen,
        title: 'Complaint Assigned',
        message: `Your complaint ${complaint.complaintId} has been assigned to staff and is now in progress`,
        complaint: complaint._id
      }),
      Notification.create({
        user: staffId,
        title: 'New Complaint Assigned',
        message: `You have been assigned a new ${complaint.type} complaint`,
        complaint: complaint._id
      })
    ]);

    res.status(200).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};