import mongoose from "mongoose";
import Game from "../models/Game";
import connectDB from "../config/database";

const testChartsAPI = async () => {
  try {
    console.log("🧪 Testing Charts API functionality...");

    // Connect to database
    await connectDB();

    // Test 1: Check if we have any games with results
    const gamesWithResults = await Game.find({
      declaredResult: { $exists: true, $ne: null }
    }).select('name declaredResult resultDeclaredAt currentStatus');

    console.log("📊 Games with declared results:", gamesWithResults.length);
    
    if (gamesWithResults.length > 0) {
      gamesWithResults.forEach(game => {
        console.log(`   - ${game.name}: ${game.declaredResult} (${game.resultDeclaredAt?.toLocaleString()})`);
      });
    } else {
      console.log("❌ No games have declared results yet");
      
      // Let's add a test result to Goa Market
      const goaMarket = await Game.findOne({ name: /goa.*market/i });
      if (goaMarket) {
        console.log("🎯 Adding test result to Goa Market...");
        
        const now = new Date();
        await Game.findByIdAndUpdate(goaMarket._id, {
          declaredResult: "35",
          resultDeclaredAt: now,
          resultMethod: "manual",
          currentStatus: "result_declared",
          lastResultDate: now,
        });
        
        console.log("✅ Added test result: Goa Market = 35");
      }
    }

    // Test 2: Test date filtering logic
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const todaysResults = await Game.find({
      declaredResult: { $exists: true, $ne: null },
      resultDeclaredAt: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      isActive: true
    }).select('name type declaredResult resultDeclaredAt');

    console.log(`📅 Today's results (${today.toDateString()}):`, todaysResults.length);
    todaysResults.forEach(game => {
      console.log(`   - ${game.name} (${game.type}): ${game.declaredResult} at ${game.resultDeclaredAt?.toLocaleTimeString()}`);
    });

    // Test 3: Create mock API response
    const mockApiResponse = {
      success: true,
      date: today.toISOString().split('T')[0],
      results: todaysResults.map(game => ({
        id: game._id,
        name: game.name,
        type: game.type,
        winnerNumber: game.declaredResult,
        resultTime: game.resultDeclaredAt,
        icon: getGameIcon(game.name, game.type),
        color: getGameColor(game.name, game.type)
      })),
      total: todaysResults.length
    };

    console.log("🔧 Mock API Response:", JSON.stringify(mockApiResponse, null, 2));

  } catch (error) {
    console.error("❌ Error testing Charts API:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Helper functions (copied from charts.ts)
function getGameIcon(gameName: string, gameType?: string): string {
  const name = gameName.toLowerCase();
  
  if (name.includes('goa')) return '🏖️';
  if (name.includes('gali')) return '⚔️';
  if (name.includes('disawer') || name.includes('disawar')) return '🎲';
  if (name.includes('delhi')) return '🦁';
  if (name.includes('dubai')) return '🏢';
  if (name.includes('mumbai')) return '🌊';
  if (name.includes('kolkata')) return '🎭';
  if (name.includes('chennai')) return '🏛️';
  if (name.includes('bangalore')) return '🌟';
  if (name.includes('hyderabad')) return '💎';
  if (name.includes('rajdhani')) return '👑';
  
  // Default icons by type
  if (gameType === 'jodi') return '🎯';
  if (gameType === 'haruf') return '🎲';
  if (gameType === 'crossing') return '🔄';
  
  return '🎮';
}

function getGameColor(gameName: string, gameType?: string): string {
  const name = gameName.toLowerCase();
  
  if (name.includes('goa')) return 'from-teal-500 to-teal-600';
  if (name.includes('gali')) return 'from-red-500 to-red-600';
  if (name.includes('disawer') || name.includes('disawar')) return 'from-indigo-500 to-indigo-600';
  if (name.includes('delhi')) return 'from-yellow-500 to-yellow-600';
  if (name.includes('dubai')) return 'from-blue-500 to-blue-600';
  if (name.includes('mumbai')) return 'from-purple-500 to-purple-600';
  if (name.includes('kolkata')) return 'from-green-500 to-green-600';
  if (name.includes('chennai')) return 'from-orange-500 to-orange-600';
  if (name.includes('bangalore')) return 'from-pink-500 to-pink-600';
  if (name.includes('hyderabad')) return 'from-teal-500 to-teal-600';
  if (name.includes('rajdhani')) return 'from-amber-500 to-amber-600';
  
  // Default colors by type
  if (gameType === 'jodi') return 'from-blue-500 to-blue-600';
  if (gameType === 'haruf') return 'from-green-500 to-green-600';
  if (gameType === 'crossing') return 'from-purple-500 to-purple-600';
  
  return 'from-gray-500 to-gray-600';
}

// Run the test
testChartsAPI();
