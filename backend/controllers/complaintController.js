const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const User = require('../models/User');
const AutoAssignmentService = require('../services/autoAssignmentService');
const SLAEnforcementService = require('../services/slaEnforcementService');

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
    query = Complaint.find(JSON.parse(queryStr))
      .populate('citizen', 'name email phone')
      .populate('assignedTo', 'name');

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

    // === SLA STATUS CALCULATION ===
    const complaintsWithSLA = complaints.map(complaint => {
      const complaintObj = complaint.toObject();
      
      // Calculate SLA status
      const now = new Date();
      const timeRemaining = complaint.slaDeadline - now;
      const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
      
      complaintObj.slaStatus = {
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        isOverdue: complaint.isOverdue,
        escalationLevel: complaint.escalationLevel,
        deadline: complaint.slaDeadline
      };
      
      return complaintObj;
    });

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
      data: complaintsWithSLA
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

    // === ADD SLA STATUS ===
    const complaintObj = complaint.toObject();
    const now = new Date();
    const timeRemaining = complaint.slaDeadline - now;
    const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
    
    complaintObj.slaStatus = {
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      isOverdue: complaint.isOverdue,
      escalationLevel: complaint.escalationLevel,
      deadline: complaint.slaDeadline
    };

    res.status(200).json({
      success: true,
      data: complaintObj
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
// @desc    Create complaint with AUTO-ASSIGNMENT
// @route   POST /api/complaints
// @access  Private
exports.createComplaint = async (req, res, next) => {
  try {
    // Add citizen to req.body
    req.body.citizen = req.user.id;

    // Get citizen's locality
    const citizen = await User.findById(req.user.id);
    if (citizen.address && citizen.address.locality) {
      req.body.location = {
        ...req.body.location,
        locality: citizen.address.locality
      };
    }

    // Handle file upload
    if (req.file) {
      req.body.photo = `/uploads/${req.file.filename}`;
    }

    const complaint = await Complaint.create(req.body);

    // === AUTO-ASSIGNMENT MAGIC HERE ===
    const assignedStaff = await AutoAssignmentService.autoAssignComplaint(complaint);
    
    if (assignedStaff) {
      console.log(`✅ Auto-assigned ${complaint.complaintId} to ${assignedStaff.name}`);
    } else {
      console.log(`⚠️  No staff available for auto-assignment of ${complaint.complaintId}`);
      
      // Notify admins that assignment is needed
      const localAdmins = await User.find({
        role: 'admin',
        'address.locality': complaint.location.locality
      });
      
      for (const admin of localAdmins) {
        await Notification.create({
          user: admin._id,
          title: 'Manual Assignment Required',
          message: `Complaint ${complaint.complaintId} needs manual assignment - no auto staff available`,
          complaint: complaint._id,
          type: 'ASSIGNMENT'
        });
      }
    }

    res.status(201).json({
      success: true,
      data: complaint,
      autoAssigned: !!assignedStaff,
      assignedTo: assignedStaff ? assignedStaff.name : 'Pending assignment'
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

    // === SLA CHECK BEFORE UPDATE ===
    const now = new Date();
    const isOverdue = now > complaint.slaDeadline && 
                     req.body.status !== 'RESOLVED' && 
                     complaint.status !== 'RESOLVED';

    if (isOverdue && !complaint.isOverdue) {
      req.body.isOverdue = true;
      req.body.escalationLevel = Math.min(complaint.escalationLevel + 1, 2);
      
      // Create SLA breach notification
      await Notification.create({
        user: complaint.assignedTo || (await User.findOne({ role: 'admin' }))._id,
        title: 'SLA Breach Alert',
        message: `Complaint ${complaint.complaintId} has breached SLA deadline`,
        complaint: complaint._id,
        type: 'SLA_BREACH'
      });
    }

    // Handle resolution photo upload
    if (req.file && req.body.status === 'RESOLVED') {
      req.body.resolutionPhoto = `/uploads/${req.file.filename}`;
      req.body.resolvedAt = new Date();
      
      // === CALCULATE RESOLUTION TIME ===
      const resolutionTime = (new Date() - complaint.createdAt) / (1000 * 60 * 60); // in hours
      req.body.timeToResolve = Math.round(resolutionTime * 100) / 100;
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
        complaint: complaint._id,
        type: 'STATUS_UPDATE'
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

    // === ADD SLA STATUS ===
    const complaintsWithSLA = complaints.map(complaint => {
      const complaintObj = complaint.toObject();
      const now = new Date();
      const timeRemaining = complaint.slaDeadline - now;
      const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
      
      complaintObj.slaStatus = {
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        isOverdue: complaint.isOverdue,
        deadline: complaint.slaDeadline
      };
      
      return complaintObj;
    });

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaintsWithSLA
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

    // === ADD SLA STATUS AND PRIORITY SORTING ===
    const complaintsWithSLA = complaints.map(complaint => {
      const complaintObj = complaint.toObject();
      const now = new Date();
      const timeRemaining = complaint.slaDeadline - now;
      const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
      
      complaintObj.slaStatus = {
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        isOverdue: complaint.isOverdue,
        escalationLevel: complaint.escalationLevel,
        deadline: complaint.slaDeadline
      };
      
      // Calculate urgency score for sorting
      const priorityWeights = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      complaintObj.urgencyScore = priorityWeights[complaint.priority] + 
                                 (complaint.isOverdue ? 2 : 0) + 
                                 (daysRemaining <= 1 ? 1 : 0);
      
      return complaintObj;
    });

    // Sort by urgency (most urgent first)
    complaintsWithSLA.sort((a, b) => b.urgencyScore - a.urgencyScore);

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaintsWithSLA
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

    // === CALCULATE TIME TO ASSIGN ===
    const complaintBefore = await Complaint.findById(req.params.id);
    const assignTime = (new Date() - complaintBefore.createdAt) / (1000 * 60 * 60); // in hours

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { 
        assignedTo: staffId,
        status: 'IN PROGRESS',
        timeToAssign: Math.round(assignTime * 100) / 100,
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
        complaint: complaint._id,
        type: 'ASSIGNMENT'
      }),
      Notification.create({
        user: staffId,
        title: 'New Complaint Assigned',
        message: `You have been assigned a new ${complaint.type} complaint. SLA Deadline: ${complaint.slaDeadline.toDateString()}`,
        complaint: complaint._id,
        type: 'ASSIGNMENT'
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

// @desc    Advanced search with filters
// @route   GET /api/complaints/search
// @access  Private
exports.searchComplaints = async (req, res) => {
  try {
    const { type, status, locality, priority, dateFrom, dateTo, assignedTo, overdue } = req.query;
    
    let filter = {};
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (locality) filter['location.locality'] = new RegExp(locality, 'i');
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (overdue === 'true') filter.isOverdue = true;
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const complaints = await Complaint.find(filter)
      .populate('citizen', 'name phone')
      .populate('assignedTo', 'name')
      .sort('-createdAt');

    // === ADD SLA STATUS ===
    const complaintsWithSLA = complaints.map(complaint => {
      const complaintObj = complaint.toObject();
      const now = new Date();
      const timeRemaining = complaint.slaDeadline - now;
      const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
      
      complaintObj.slaStatus = {
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        isOverdue: complaint.isOverdue,
        escalationLevel: complaint.escalationLevel,
        deadline: complaint.slaDeadline
      };
      
      return complaintObj;
    });

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaintsWithSLA
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get SLA dashboard stats
// @route   GET /api/complaints/sla/stats
// @access  Private (Admin/Staff)
exports.getSLAStats = async (req, res) => {
  try {
    const slaStats = await Complaint.aggregate([
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] }
          },
          withinSLA: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'RESOLVED'] },
                    { $lte: ['$resolvedAt', '$slaDeadline'] }
                  ]
                },
                1,
                0
              ]
            }
          },
          overdue: {
            $sum: { $cond: ['$isOverdue', 1, 0] }
          },
          avgResolutionTime: { $avg: '$timeToResolve' },
          avgAssignmentTime: { $avg: '$timeToAssign' }
        }
      },
      {
        $project: {
          type: '$_id',
          total: 1,
          resolved: 1,
          withinSLA: 1,
          overdue: 1,
          slaComplianceRate: {
            $round: [
              {
                $cond: [
                  { $eq: ['$resolved', 0] },
                  0,
                  { $multiply: [{ $divide: ['$withinSLA', '$resolved'] }, 100] }
                ]
              },
              2
            ]
          },
          resolutionRate: {
            $round: [
              {
                $cond: [
                  { $eq: ['$total', 0] },
                  0,
                  { $multiply: [{ $divide: ['$resolved', '$total'] }, 100] }
                ]
              },
              2
            ]
          },
          avgResolutionTime: { $round: [{ $ifNull: ['$avgResolutionTime', 0] }, 2] },
          avgAssignmentTime: { $round: [{ $ifNull: ['$avgAssignmentTime', 0] }, 2] }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: slaStats
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Run SLA enforcement (for cron jobs)
// @route   POST /api/complaints/sla/enforce
// @access  Private (Admin)
exports.enforceSLA = async (req, res, next) => {
  try {
    const breachCount = await SLAEnforcementService.checkSLABreaches();
    const reassignedCount = await AutoAssignmentService.reassignOverdueComplaints();
    const performanceMetrics = await SLAEnforcementService.updatePerformanceMetrics();

    res.status(200).json({
      success: true,
      data: {
        slaBreachesFound: breachCount,
        complaintsReassigned: reassignedCount,
        performanceMetrics: performanceMetrics
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get performance dashboard
// @route   GET /api/complaints/performance
// @access  Private (Admin)
exports.getPerformanceDashboard = async (req, res, next) => {
  try {
    const performanceMetrics = await SLAEnforcementService.updatePerformanceMetrics();
    
    // Get real-time stats
    const realTimeStats = await Complaint.aggregate([
      {
        $facet: {
          currentStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          overdueByLocality: [
            { $match: { isOverdue: true } },
            { $group: { _id: '$location.locality', count: { $sum: 1 } } }
          ],
          todayComplaints: [
            { 
              $match: { 
                createdAt: { 
                  $gte: new Date(new Date().setHours(0,0,0,0)) 
                } 
              } 
            },
            { $count: 'count' }
          ]
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        performanceMetrics: performanceMetrics,
        realTimeStats: realTimeStats[0]
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


