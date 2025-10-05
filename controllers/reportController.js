const Complaint = require('../models/Complaint');
const User = require('../models/User');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// @desc    Get dashboard statistics
// @route   GET /api/reports/dashboard
// @access  Private (Admin)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolvedComplaints = await Complaint.countDocuments({ status: 'RESOLVED' });
    const pendingComplaints = await Complaint.countDocuments({ 
      status: { $in: ['OPEN', 'IN PROGRESS'] } 
    });
    const totalUsers = await User.countDocuments();
    const totalStaff = await User.countDocuments({ role: 'staff' });

    // Complaints by type
    const complaintsByType = await Complaint.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly trends
    const monthlyTrends = await Complaint.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalComplaints,
        resolvedComplaints,
        pendingComplaints,
        totalUsers,
        totalStaff,
        complaintsByType,
        monthlyTrends
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Generate CSV report
// @route   GET /api/reports/csv
// @access  Private (Admin)
exports.generateCSVReport = async (req, res, next) => {
  try {
    const complaints = await Complaint.find()
      .populate('citizen', 'name email phone')
      .populate('assignedTo', 'name')
      .sort('-createdAt');

    const csvWriter = createCsvWriter({
      path: 'temp/complaints_report.csv',
      header: [
        { id: 'complaintId', title: 'Complaint ID' },
        { id: 'type', title: 'Type' },
        { id: 'description', title: 'Description' },
        { id: 'location', title: 'Location' },
        { id: 'citizen', title: 'Citizen' },
        { id: 'status', title: 'Status' },
        { id: 'assignedTo', title: 'Assigned To' },
        { id: 'priority', title: 'Priority' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'resolvedAt', title: 'Resolved At' }
      ]
    });

    const records = complaints.map(complaint => ({
      complaintId: complaint.complaintId,
      type: complaint.type,
      description: complaint.description,
      location: complaint.location.address,
      citizen: complaint.citizen.name,
      status: complaint.status,
      assignedTo: complaint.assignedTo ? complaint.assignedTo.name : 'Not Assigned',
      priority: complaint.priority,
      createdAt: complaint.createdAt.toISOString().split('T')[0],
      resolvedAt: complaint.resolvedAt ? complaint.resolvedAt.toISOString().split('T')[0] : 'Not Resolved'
    }));

    await csvWriter.writeRecords(records);

    res.download('temp/complaints_report.csv', 'complaints_report.csv', (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }
      // Clean up temporary file
      fs.unlinkSync('temp/complaints_report.csv');
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Generate PDF report
// @route   GET /api/reports/pdf
// @access  Private (Admin)
exports.generatePDFReport = async (req, res, next) => {
  try {
    const complaints = await Complaint.find()
      .populate('citizen', 'name email phone')
      .populate('assignedTo', 'name')
      .sort('-createdAt');

    const doc = new PDFDocument();
    const filename = `complaints_report_${Date.now()}.pdf`;

    res.setHeader('Content-disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Municipal Complaints Report', 100, 100);
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, 100, 130);

    let yPosition = 180;

    complaints.forEach((complaint, index) => {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 100;
      }

      doc.fontSize(10)
         .text(`Complaint ID: ${complaint.complaintId}`, 100, yPosition)
         .text(`Type: ${complaint.type}`, 100, yPosition + 15)
         .text(`Description: ${complaint.description.substring(0, 100)}...`, 100, yPosition + 30)
         .text(`Location: ${complaint.location.address}`, 100, yPosition + 45)
         .text(`Citizen: ${complaint.citizen.name}`, 100, yPosition + 60)
         .text(`Status: ${complaint.status}`, 100, yPosition + 75)
         .text(`Assigned To: ${complaint.assignedTo ? complaint.assignedTo.name : 'Not Assigned'}`, 100, yPosition + 90)
         .text(`Created: ${complaint.createdAt.toLocaleDateString()}`, 100, yPosition + 105);

      yPosition += 130;

      // Add separator line
      if (index < complaints.length - 1) {
        doc.moveTo(100, yPosition - 10).lineTo(500, yPosition - 10).stroke();
      }
    });

    doc.end();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};