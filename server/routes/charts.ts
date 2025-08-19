import express from "express";
import Game from "../models/Game";
import GameResult from "../models/GameResult";

const router = express.Router();

// Get game results for charts by date
router.get("/results", async (req, res) => {
  try {
    const { date } = req.query;
    
    let targetDate = new Date();
    if (date && typeof date === 'string') {
      targetDate = new Date(date);
    }
    
    // Set to start of day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Set to end of day
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('📊 Fetching results for date range:', {
      date: date || 'today',
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString()
    });

    // Get games with results declared on the target date
    const gamesWithResults = await Game.find({
      declaredResult: { $exists: true, $ne: null },
      resultDeclaredAt: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      isActive: true
    }).select('name type declaredResult resultDeclaredAt').sort({ resultDeclaredAt: -1 });

    console.log(`📊 Found ${gamesWithResults.length} games with results for ${targetDate.toDateString()}`);

    // Format results for frontend
    const formattedResults = gamesWithResults.map(game => ({
      id: game._id,
      name: game.name,
      type: game.type,
      winnerNumber: game.declaredResult,
      resultTime: game.resultDeclaredAt,
      icon: getGameIcon(game.name, game.type),
      color: getGameColor(game.name, game.type)
    }));

    res.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      results: formattedResults,
      total: formattedResults.length
    });

  } catch (error) {
    console.error("Error fetching chart results:", error);

    // Ensure we haven't already sent a response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch results",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
});

// Get historical results for multiple days
router.get("/history", async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const numDays = Math.min(parseInt(days as string) || 7, 30); // Max 30 days
    
    const results = [];
    
    for (let i = 0; i < numDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const dayResults = await Game.find({
        declaredResult: { $exists: true, $ne: null },
        resultDeclaredAt: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        isActive: true
      }).select('name declaredResult resultDeclaredAt').sort({ resultDeclaredAt: -1 });
      
      if (dayResults.length > 0) {
        results.push({
          date: date.toISOString().split('T')[0],
          displayDate: date.toLocaleDateString('en-IN'),
          results: dayResults.map(game => ({
            gameName: game.name,
            result: game.declaredResult,
            time: game.resultDeclaredAt
          }))
        });
      }
    }

    res.json({
      success: true,
      history: results,
      totalDays: results.length
    });

  } catch (error) {
    console.error("Error fetching results history:", error);

    // Ensure we haven't already sent a response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch results history",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
});

// Helper function to get game icon
function getGameIcon(gameName: string, gameType?: string): string {
  const name = gameName.toLowerCase();
  
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

// Helper function to get game color
function getGameColor(gameName: string, gameType?: string): string {
  const name = gameName.toLowerCase();
  
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

export default router;
