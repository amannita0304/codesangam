const cron = require('node-cron');
const SLAEnforcementService = require('./slaEnforcementService');
const AutoAssignmentService = require('./autoAssignmentService');

class CronService {
  static startSLAEnforcementCron() {
    // Run every hour to check SLA breaches
    cron.schedule('0 * * * *', async () => {
      console.log('🕐 Running hourly SLA enforcement...');
      try {
        const breachCount = await SLAEnforcementService.checkSLABreaches();
        const reassignedCount = await AutoAssignmentService.reassignOverdueComplaints();
        
        console.log(`✅ SLA Enforcement: ${breachCount} breaches, ${reassignedCount} reassigned`);
      } catch (error) {
        console.error('❌ Cron job error:', error);
      }
    });

    // Run every 6 hours to update performance metrics
    cron.schedule('0 */6 * * *', async () => {
      console.log('📊 Updating performance metrics...');
      await SLAEnforcementService.updatePerformanceMetrics();
    });

    console.log('✅ Cron jobs started: SLA enforcement & performance tracking');
  }
}

module.exports = CronService;