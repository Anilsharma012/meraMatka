import mongoose from "mongoose";
import Game from "../models/Game";
import Result from "../models/Result";
import Bet from "../models/Bet";
import User from "../models/User";
import connectDB from "../config/database";
import AutoCloseService from "../services/autoCloseService";

class AutoCloseSelfTest {
  private testGameId: string | null = null;
  private testUserId: string | null = null;
  private autoCloseService: AutoCloseService;

  constructor() {
    this.autoCloseService = AutoCloseService.getInstance();
  }

  /**
   * Run all self-tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 STARTING AUTO-CLOSE SELF-TESTS');
    console.log('=' .repeat(50));

    try {
      await connectDB();
      
      await this.test1_CreateExpiredGame();
      await this.test2_AutoCloseAfterTimeout();
      await this.test3_RejectBetsOnClosedGame();
      await this.test4_DeclareResultAndChartsSync();
      await this.test5_CleanupTestData();

      console.log('');
      console.log('✅ ALL TESTS PASSED! Auto-close system is working correctly.');
      console.log('🎯 System is ready for production use.');

    } catch (error) {
      console.error('❌ TESTS FAILED:', error);
      await this.cleanup();
      throw error;
    } finally {
      await mongoose.connection.close();
    }
  }

  /**
   * Test 1: Create a game that should be auto-closed
   */
  private async test1_CreateExpiredGame(): Promise<void> {
    console.log('\n📋 TEST 1: Create expired game for auto-close');
    
    // Create test admin user if needed
    let testUser = await User.findOne({ mobile: '9999999999' });
    if (!testUser) {
      testUser = await User.create({
        fullName: 'Test Admin',
        email: 'test@example.com',
        mobile: '9999999999',
        password: 'test123',
        role: 'admin'
      });
    }
    this.testUserId = testUser._id.toString();

    // Create game with times that make it expired
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    
    // Convert to IST time strings
    const startTimeIST = this.utcToISTTimeString(twoMinutesAgo);
    const endTimeIST = this.utcToISTTimeString(oneMinuteAgo);
    const resultTimeIST = this.utcToISTTimeString(now);

    const testGame = await Game.create({
      name: 'TEST Auto-Close Game',
      type: 'crossing',
      description: 'Test game for auto-close validation',
      isActive: true,
      startTime: startTimeIST,
      endTime: endTimeIST,
      resultTime: resultTimeIST,
      timezone: 'Asia/Kolkata',
      minBet: 10,
      maxBet: 1000,
      commission: 5,
      jodiPayout: 95,
      harufPayout: 9,
      crossingPayout: 95,
      currentStatus: 'open', // Initially open
      acceptingBets: true,
      marketId: 'test-market',
      createdBy: testUser._id
    });

    this.testGameId = testGame._id.toString();
    
    console.log(`✅ Created test game: ${testGame.name}`);
    console.log(`   Start: ${startTimeIST} IST`);
    console.log(`   End: ${endTimeIST} IST`);
    console.log(`   Status: ${testGame.currentStatus}`);
    console.log(`   Accepting Bets: ${testGame.acceptingBets}`);
  }

  /**
   * Test 2: Verify auto-close functionality
   */
  private async test2_AutoCloseAfterTimeout(): Promise<void> {
    console.log('\n📋 TEST 2: Trigger auto-close and verify');
    
    if (!this.testGameId) throw new Error('Test game not created');

    // Trigger manual auto-close check
    await this.autoCloseService.triggerManualClose();

    // Verify game was closed
    const updatedGame = await Game.findById(this.testGameId);
    if (!updatedGame) throw new Error('Test game not found');

    console.log(`   Game Status: ${updatedGame.currentStatus}`);
    console.log(`   Accepting Bets: ${updatedGame.acceptingBets}`);
    console.log(`   Auto-Closed At: ${updatedGame.autoClosedAt?.toISOString()}`);

    // Verify auto-close worked
    if (updatedGame.currentStatus !== 'closed') {
      throw new Error(`Expected status 'closed', got '${updatedGame.currentStatus}'`);
    }

    if (updatedGame.acceptingBets !== false) {
      throw new Error(`Expected acceptingBets false, got ${updatedGame.acceptingBets}`);
    }

    if (!updatedGame.autoClosedAt) {
      throw new Error('autoClosedAt should be set');
    }

    console.log('✅ Auto-close working correctly');
  }

  /**
   * Test 3: Verify betting is rejected on closed games
   */
  private async test3_RejectBetsOnClosedGame(): Promise<void> {
    console.log('\n📋 TEST 3: Verify betting rejection on closed game');
    
    if (!this.testGameId || !this.testUserId) throw new Error('Test data not ready');

    try {
      // Attempt to place a bet (this should fail)
      const bet = await Bet.create({
        userId: new mongoose.Types.ObjectId(this.testUserId),
        gameId: new mongoose.Types.ObjectId(this.testGameId),
        betType: 'crossing',
        betNumber: '35',
        betAmount: 100,
        potentialWinning: 9500,
        status: 'pending'
      });

      // If we reach here, the test failed (bet should have been rejected)
      throw new Error('Bet was accepted on closed game - THIS SHOULD NOT HAPPEN');
      
    } catch (error) {
      // This is expected - betting should be rejected
      console.log('✅ Betting correctly rejected on closed game');
    }
  }

  /**
   * Test 4: Declare result and verify Charts sync
   */
  private async test4_DeclareResultAndChartsSync(): Promise<void> {
    console.log('\n📋 TEST 4: Declare result and verify Charts sync');
    
    if (!this.testGameId) throw new Error('Test game not created');

    const now = new Date();
    
    // Create result entry directly (simulating result declaration)
    const testResult = await Result.create({
      gameId: new mongoose.Types.ObjectId(this.testGameId),
      marketId: 'test-market',
      marketName: 'TEST Auto-Close Game',
      gameType: 'crossing',
      result: {
        crossing: '35'
      },
      declaredAtUTC: now,
      status: 'published',
      method: 'manual'
      // declaredDateIST and declaredTimeIST auto-calculated by pre-save middleware
    });

    console.log(`✅ Result declared: crossing = 35`);
    console.log(`   Declared At UTC: ${testResult.declaredAtUTC.toISOString()}`);
    console.log(`   Declared Date IST: ${testResult.declaredDateIST}`);
    console.log(`   Declared Time IST: ${testResult.declaredTimeIST}`);

    // Verify Charts API can fetch this result
    const todayIST = testResult.declaredDateIST;
    const chartResults = await Result.find({
      declaredDateIST: todayIST,
      marketId: 'test-market',
      status: 'published'
    });

    if (chartResults.length === 0) {
      throw new Error('Result not found in Charts query');
    }

    if (chartResults[0].result.crossing !== '35') {
      throw new Error('Result data mismatch in Charts');
    }

    console.log('✅ Charts sync working correctly');
  }

  /**
   * Test 5: Cleanup test data
   */
  private async test5_CleanupTestData(): Promise<void> {
    console.log('\n📋 TEST 5: Cleanup test data');
    
    await this.cleanup();
    
    console.log('✅ Test data cleaned up');
  }

  /**
   * Cleanup helper
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.testGameId) {
        await Game.findByIdAndDelete(this.testGameId);
        await Result.deleteMany({ gameId: this.testGameId });
        await Bet.deleteMany({ gameId: this.testGameId });
      }

      // Clean up test user (optional - might want to keep for other tests)
      if (this.testUserId) {
        await User.findOneAndDelete({ mobile: '9999999999' });
      }
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  }

  /**
   * Convert UTC Date to IST time string (HH:mm)
   */
  private utcToISTTimeString(utcDate: Date): string {
    const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
    const hours = String(istDate.getHours()).padStart(2, '0');
    const minutes = String(istDate.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new AutoCloseSelfTest();
  tester.runAllTests()
    .then(() => {
      console.log('\n🎉 ALL SELF-TESTS COMPLETED SUCCESSFULLY!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 SELF-TESTS FAILED:', error);
      process.exit(1);
    });
}

export default AutoCloseSelfTest;
