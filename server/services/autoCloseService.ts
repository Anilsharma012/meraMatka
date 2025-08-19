import cron from 'node-cron';
import Game from '../models/Game';

class AutoCloseService {
  private static instance: AutoCloseService;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  private constructor() {}

  static getInstance(): AutoCloseService {
    if (!AutoCloseService.instance) {
      AutoCloseService.instance = new AutoCloseService();
    }
    return AutoCloseService.instance;
  }

  /**
   * Convert time string (HH:mm) to today's UTC Date
   */
  private timeToUTC(timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const istDate = new Date();
    istDate.setHours(hours, minutes, 0, 0);
    
    // Convert IST to UTC (IST is UTC+5:30)
    const utcDate = new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000));
    return utcDate;
  }

  /**
   * Auto-close games that have passed their endTime
   */
  private async autoCloseExpiredGames(): Promise<void> {
    try {
      const now = new Date(); // Current UTC time
      
      console.log(`🕐 [${now.toISOString()}] Running auto-close check...`);

      // Find games that should be closed
      // Logic: For each active game, check if current UTC time > endTimeUTC
      const activeGames = await Game.find({
        isActive: true,
        currentStatus: { $in: ['open', 'waiting'] }
      }).select('name startTime endTime currentStatus timezone');

      let closedCount = 0;

      for (const game of activeGames) {
        try {
          // Convert game's endTime to UTC for comparison
          const gameEndTimeUTC = this.timeToUTC(game.endTime);
          
          // Add buffer of 1 minute to ensure game definitely ended
          const endTimeWithBuffer = new Date(gameEndTimeUTC.getTime() + (1 * 60 * 1000));

          if (now >= endTimeWithBuffer) {
            // Game should be closed
            await Game.findByIdAndUpdate(game._id, {
              currentStatus: 'closed',
              acceptingBets: false,
              lastStatusChange: now,
              autoClosedAt: now
            });

            console.log(`🔒 Auto-closed: ${game.name} (ended at ${game.endTime} IST)`);
            closedCount++;
          }
        } catch (gameError) {
          console.error(`❌ Error processing game ${game.name}:`, gameError);
        }
      }

      if (closedCount > 0) {
        console.log(`✅ Auto-closed ${closedCount} expired games`);
      } else {
        console.log(`⏳ No games needed closing (checked ${activeGames.length} active games)`);
      }

    } catch (error) {
      console.error('❌ Error in auto-close worker:', error);
    }
  }

  /**
   * Startup sweep to close any games that should have been closed
   */
  private async startupSweep(): Promise<void> {
    console.log('🧹 Running startup sweep for expired games...');
    await this.autoCloseExpiredGames();
  }

  /**
   * Start the auto-close service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Auto-close service is already running');
      return;
    }

    console.log('🚀 Starting auto-close service...');

    // Run startup sweep first
    await this.startupSweep();

    // Schedule cron job to run every 60 seconds
    this.cronJob = cron.schedule('*/60 * * * * *', async () => {
      await this.autoCloseExpiredGames();
    }, {
      scheduled: false // Don't start immediately
    });

    // Start the cron job
    this.cronJob.start();
    this.isRunning = true;

    console.log('✅ Auto-close service started (runs every 60 seconds)');
  }

  /**
   * Stop the auto-close service
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('🛑 Auto-close service stopped');
  }

  /**
   * Manual trigger for testing
   */
  async triggerManualClose(): Promise<void> {
    console.log('🔧 Manual trigger: auto-close check');
    await this.autoCloseExpiredGames();
  }

  /**
   * Get service status
   */
  getStatus(): { isRunning: boolean; nextRun: string | null } {
    return {
      isRunning: this.isRunning,
      nextRun: this.cronJob ? 'Every 60 seconds' : null
    };
  }

  /**
   * Force close a specific game (manual override)
   */
  async forceCloseGame(gameId: string, adminId?: string): Promise<void> {
    try {
      const now = new Date();
      
      await Game.findByIdAndUpdate(gameId, {
        currentStatus: 'closed',
        acceptingBets: false,
        lastStatusChange: now,
        manuallyClosedAt: now,
        manuallyClosedBy: adminId
      });

      const game = await Game.findById(gameId).select('name');
      console.log(`🔒 Manually closed: ${game?.name} by admin ${adminId || 'system'}`);
      
    } catch (error) {
      console.error(`❌ Error force closing game ${gameId}:`, error);
      throw error;
    }
  }
}

export default AutoCloseService;
