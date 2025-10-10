const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const User = require('../models/User');

class SLAEnforcementService {
  
  // Check for SLA breaches and mark overdue
  static async checkSLABreaches() {
    try {
      const now = new Date();
      const overdueComplaints = await Complaint.find({
        status: { $in: ['OPEN', 'IN PROGRESS'] },
        slaDeadline: { $lt: now },
        isOverdue: false
      });

      let breachCount = 0;

      for (const complaint of overdueComplaints) {
        complaint.isOverdue = true;
        await complaint.save();
        breachCount++;

        // Send notifications
        await this.sendSLABreachNotifications(complaint);
      }

      console.log(`✅ Checked SLA breaches: ${breachCount} overdue complaints`);
      return breachCount;
      
    } catch (error) {
      console.error('SLA breach check error:', error);
      return 0;
    }
  }

  // Send notifications for SLA breaches
  static async sendSLABreachNotifications(complaint) {
    const notifications = [];

    // Notify assigned staff
    if (complaint.assignedTo) {
      notifications.push(
        Notification.create({
          user: complaint.assignedTo,
          title: '🚨 SLA BREACHED',
          message: `Complaint ${complaint.complaintId} is now OVERDUE! Please resolve immediately.`,
          complaint: complaint._id,
          type: 'SLA_BREACH'
        })
      );
    }

    // Notify locality admin
    const localAdmin = await User.findOne({
      role: 'admin',
      'address.locality': complaint.location.locality
    });

    if (localAdmin) {
      notifications.push(
        Notification.create({
          user: localAdmin._id,
          title: 'SLA Breach in Your Locality',
          message: `Complaint ${complaint.complaintId} in ${complaint.location.locality} is overdue.`,
          complaint: complaint._id,
          type: 'SLA_BREACH'
        })
      );
    }

    await Promise.all(notifications);
  }

  // Calculate and update performance metrics
  static async updatePerformanceMetrics() {
    try {
      const metrics = await Complaint.aggregate([
        {
          $facet: {
            localityStats: [
              {
                $group: {
                  _id: '$location.locality',
                  totalComplaints: { $sum: 1 },
                  resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
                  overdue: { $sum: { $cond: ['$isOverdue', 1, 0] } },
                  avgResolutionTime: { $avg: '$timeToResolve' }
                }
              }
            ],
            staffPerformance: [
              {
                $match: { assignedTo: { $ne: null } }
              },
              {
                $group: {
                  _id: '$assignedTo',
                  totalAssigned: { $sum: 1 },
                  resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
                  avgResolutionTime: { $avg: '$timeToResolve' },
                  overdueCount: { $sum: { $cond: ['$isOverdue', 1, 0] } }
                }
              }
            ],
            departmentPerformance: [
              {
                $group: {
                  _id: '$type',
                  total: { $sum: 1 },
                  resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
                  avgResolutionTime: { $avg: '$timeToResolve' }
                }
              }
            ]
          }
        }
      ]);

      return metrics[0];
      
    } catch (error) {
      console.error('Performance metrics error:', error);
      return null;
    }
  }
}

module.exports = SLAEnforcementService;