const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');

class AutoAssignmentService {
  
  // Auto-assign complaint to appropriate staff
  static async autoAssignComplaint(complaint) {
    try {
      // Find suitable staff based on locality and department
      const suitableStaff = await User.find({
        role: 'staff',
        'address.locality': complaint.location.locality,
        department: this.getDepartmentFromType(complaint.type),
        isApproved: true,
        isActive: true
      });

      if (suitableStaff.length === 0) {
        // No staff in same locality, find in nearby localities
        const nearbyStaff = await User.find({
          role: 'staff',
          department: this.getDepartmentFromType(complaint.type),
          isApproved: true,
          isActive: true
        }).limit(5);

        if (nearbyStaff.length > 0) {
          return await this.assignToLeastBusyStaff(nearbyStaff, complaint);
        }
        return null; // No staff available
      }

      return await this.assignToLeastBusyStaff(suitableStaff, complaint);
      
    } catch (error) {
      console.error('Auto-assignment error:', error);
      return null;
    }
  }

  // Assign to staff with least workload
  static async assignToLeastBusyStaff(staffList, complaint) {
    const staffWorkloads = await Promise.all(
      staffList.map(async (staff) => {
        const activeComplaints = await Complaint.countDocuments({
          assignedTo: staff._id,
          status: { $in: ['OPEN', 'IN PROGRESS'] }
        });
        return { staff, workload: activeComplaints };
      })
    );

    // Sort by workload (ascending)
    staffWorkloads.sort((a, b) => a.workload - b.workload);
    
    const selectedStaff = staffWorkloads[0].staff;
    
    // Update complaint
    complaint.assignedTo = selectedStaff._id;
    complaint.status = 'IN PROGRESS';
    
    // Calculate assignment time
    const assignTime = (new Date() - complaint.createdAt) / (1000 * 60 * 60);
    complaint.timeToAssign = Math.round(assignTime * 100) / 100;
    
    await complaint.save();

    // Send notification
    await Notification.create({
      user: selectedStaff._id,
      title: 'New Complaint Auto-Assigned',
      message: `You have been automatically assigned a ${complaint.type} complaint in ${complaint.location.locality}. Due: ${complaint.slaDeadline.toDateString()}`,
      complaint: complaint._id,
      type: 'ASSIGNMENT'
    });

    return selectedStaff;
  }

  // Map complaint type to department
  static getDepartmentFromType(complaintType) {
    const typeToDepartment = {
      'Road Damage': 'Roads',
      'Water Leakage': 'Water', 
      'Garbage': 'Garbage',
      'Electricity': 'Electricity',
      'Sewage': 'Water',
      'Other': 'General'
    };
    return typeToDepartment[complaintType] || 'General';
  }

  // Reassign overdue complaints
  static async reassignOverdueComplaints() {
    try {
      const overdueComplaints = await Complaint.find({
        status: { $in: ['OPEN', 'IN PROGRESS'] },
        isOverdue: true,
        escalationLevel: { $lt: 2 } // Only reassign if not already escalated
      }).populate('assignedTo');

      for (const complaint of overdueComplaints) {
        console.log(`Reassigning overdue complaint: ${complaint.complaintId}`);
        
        // Escalate level
        complaint.escalationLevel += 1;
        
        // Find supervisor or different staff
        const supervisor = await User.findOne({
          role: 'admin',
          'address.locality': complaint.location.locality
        });

        if (supervisor) {
          complaint.assignedTo = supervisor._id;
          await complaint.save();

          await Notification.create({
            user: supervisor._id,
            title: 'ESCALATED: Overdue Complaint',
            message: `Complaint ${complaint.complaintId} is overdue and has been escalated to you`,
            complaint: complaint._id,
            type: 'ESCALATION'
          });
        }
      }

      return overdueComplaints.length;
    } catch (error) {
      console.error('Reassignment error:', error);
      return 0;
    }
  }
}

module.exports = AutoAssignmentService;