import express from "express";
import Game from "../models/Game";
import Result from "../models/Result";

const router = express.Router();

/**
 * GET /api/charts/results
 * Fetch results by IST date (for Charts page compatibility)
 */
router.get("/results", async (req, res) => {
  try {
    const { date } = req.query;

    // Default to today in IST if no date provided
    let targetDateIST = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    if (date && typeof date === 'string') {
      targetDateIST = date;
    }

    console.log('📊 Charts API - Fetching results:', {
      dateIST: targetDateIST,
      timestamp: new Date().toISOString()
    });

    // Fetch results from dedicated Results collection
    const results = await Result.find({
      declaredDateIST: targetDateIST,
      status: 'published'
    })
      .populate('gameId', 'name type')
      .populate('declaredBy', 'fullName')
      .sort({ declaredAtUTC: -1 }) // Newest first
      .lean();

    console.log(`📊 Found ${results.length} results for ${targetDateIST}`);

    // Format results for Charts page
    const formattedResults = results.map(result => ({
      id: result._id,
      name: result.marketName,
      type: result.gameType,
      winnerNumber: result.result?.jodi || result.result?.haruf || result.result?.crossing || 'N/A',
      resultTime: result.declaredAtUTC,
      icon: getGameIcon(result.marketName, result.gameType),
      color: getGameColor(result.marketName, result.gameType)
    }));

    res.json({
      success: true,
      date: targetDateIST,
      results: formattedResults,
      total: formattedResults.length
    });

  } catch (error) {
    console.error("❌ Charts API error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch results",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
});

/**
 * GET /api/charts/results/by-date
 * Fetch results by IST date with proper boundary conversion
 */
router.get("/results/by-date", async (req, res) => {
  try {
    const { date, marketId } = req.query;
    
    // Default to today in IST if no date provided
    let targetDateIST = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    if (date && typeof date === 'string') {
      targetDateIST = date;
    }
    
    console.log('📊 Charts API - Fetching results:', {
      dateIST: targetDateIST,
      marketId: marketId || 'all',
      timestamp: new Date().toISOString()
    });

    // Build query
    const query: any = {
      declaredDateIST: targetDateIST,
      status: 'published'
    };
    
    if (marketId && marketId !== 'all') {
      query.marketId = marketId;
    }

    // Fetch results from dedicated Results collection
    const results = await Result.find(query)
      .populate('gameId', 'name type')
      .populate('declaredBy', 'fullName')
      .sort({ declaredAtUTC: -1 }) // Newest first
      .lean();

    console.log(`📊 Found ${results.length} results for ${targetDateIST}`);

    // Format results for frontend
    const formattedResults = results.map(result => ({
      id: result._id,
      gameId: result.gameId,
      marketId: result.marketId,
      marketName: result.marketName,
      gameType: result.gameType,
      
      // Result data
      result: result.result,
      winnerNumber: getWinnerNumber(result.result),
      
      // Timing (IST for display)
      declaredTimeIST: result.declaredTimeIST,
      declaredDateIST: result.declaredDateIST,
      declaredAtUTC: result.declaredAtUTC,
      
      // Metadata
      status: result.status,
      method: result.method,
      declaredBy: result.declaredBy?.fullName || 'System',
      
      // UI helpers
      icon: getMarketIcon(result.marketId),
      color: getMarketColor(result.marketId),
      
      // Statistics
      totalBets: result.totalBets || 0,
      totalWinners: result.totalWinners || 0,
      totalWinningAmount: result.totalWinningAmount || 0
    }));

    res.json({
      success: true,
      date: targetDateIST,
      marketId: marketId || 'all',
      results: formattedResults,
      total: formattedResults.length,
      metadata: {
        fetchedAt: new Date().toISOString(),
        timezone: 'Asia/Kolkata'
      }
    });

  } catch (error) {
    console.error("❌ Charts API error:", error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch results",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
});

/**
 * GET /api/charts/results/history
 * Fetch historical results for multiple days
 */
router.get("/results/history", async (req, res) => {
  try {
    const { days = 7, marketId } = req.query;
    const numDays = Math.min(parseInt(days as string) || 7, 30); // Max 30 days
    
    console.log('📊 Charts API - Fetching history:', {
      days: numDays,
      marketId: marketId || 'all'
    });

    const results = [];
    
    for (let i = 0; i < numDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateIST = date.toISOString().split('T')[0];
      
      // Build query for this date
      const query: any = {
        declaredDateIST: dateIST,
        status: 'published'
      };
      
      if (marketId && marketId !== 'all') {
        query.marketId = marketId;
      }
      
      const dayResults = await Result.find(query)
        .populate('gameId', 'name type')
        .sort({ declaredAtUTC: -1 })
        .lean();
      
      if (dayResults.length > 0) {
        results.push({
          date: dateIST,
          displayDate: date.toLocaleDateString('en-IN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          results: dayResults.map(result => ({
            marketName: result.marketName,
            gameType: result.gameType,
            result: getWinnerNumber(result.result),
            time: result.declaredTimeIST,
            marketId: result.marketId
          })),
          totalResults: dayResults.length
        });
      }
    }

    res.json({
      success: true,
      history: results,
      totalDays: results.length,
      requestedDays: numDays,
      marketId: marketId || 'all'
    });

  } catch (error) {
    console.error("❌ Charts history API error:", error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch results history",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
});

/**
 * GET /api/charts/markets
 * Get list of available markets
 */
router.get("/markets", async (req, res) => {
  try {
    const markets = await Result.distinct('marketId');
    const marketDetails = await Promise.all(
      markets.map(async (marketId) => {
        const latestResult = await Result.findOne({
          marketId,
          status: 'published'
        }).sort({ declaredAtUTC: -1 }).lean();

        return {
          id: marketId,
          name: latestResult?.marketName || formatMarketName(marketId),
          icon: getMarketIcon(marketId),
          color: getMarketColor(marketId),
          lastResult: latestResult ? {
            result: getWinnerNumber(latestResult.result),
            date: latestResult.declaredDateIST,
            time: latestResult.declaredTimeIST
          } : null
        };
      })
    );

    res.json({
      success: true,
      markets: [
        { id: 'all', name: 'All Markets', icon: '📊', color: 'from-gray-500 to-gray-600' },
        ...marketDetails
      ]
    });

  } catch (error) {
    console.error("❌ Markets API error:", error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch markets",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
});

/**
 * GET /api/charts/latest
 * Get latest results for auto-refresh functionality
 */
router.get("/latest", async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const maxLimit = Math.min(parseInt(limit as string) || 5, 20);

    console.log('📊 Charts API - Fetching latest results for auto-refresh');

    // Get the most recent results across all markets
    const latestResults = await Result.find({
      status: 'published'
    })
      .populate('gameId', 'name type')
      .sort({ declaredAtUTC: -1 }) // Newest first
      .limit(maxLimit)
      .lean();

    const formattedResults = latestResults.map(result => ({
      id: result._id,
      gameId: result.gameId,
      marketId: result.marketId,
      marketName: result.marketName,
      gameType: result.gameType,

      // Result data
      result: result.result,
      winnerNumber: getWinnerNumber(result.result),

      // Timing (IST for display)
      declaredTimeIST: result.declaredTimeIST,
      declaredDateIST: result.declaredDateIST,
      declaredAtUTC: result.declaredAtUTC,

      // UI helpers
      icon: getMarketIcon(result.marketId),
      color: getMarketColor(result.marketId),
    }));

    res.json({
      success: true,
      results: formattedResults,
      total: formattedResults.length,
      lastUpdate: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Latest results API error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch latest results",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
});

/**
 * POST /api/charts/declare-result
 * Declare a new result (creates entry in Results collection)
 */
router.post("/declare-result", async (req, res) => {
  try {
    const { gameId, marketId, result } = req.body;
    
    // Validate required fields
    if (!gameId || !marketId || !result) {
      return res.status(400).json({
        success: false,
        message: "gameId, marketId, and result are required"
      });
    }

    // Get game details
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found"
      });
    }

    const now = new Date(); // UTC
    
    // Create result entry
    const newResult = await Result.create({
      gameId,
      marketId: marketId.toLowerCase(),
      marketName: game.name,
      gameType: game.type,
      result,
      declaredAtUTC: now,
      status: 'published',
      method: 'manual'
      // declaredDateIST and declaredTimeIST will be auto-calculated by pre-save middleware
    });

    console.log(`🎯 Result declared: ${game.name} - ${JSON.stringify(result)}`);

    res.json({
      success: true,
      message: "Result declared successfully",
      data: {
        resultId: newResult._id,
        gameId,
        marketId,
        marketName: game.name,
        result,
        declaredAtUTC: now,
        declaredDateIST: newResult.declaredDateIST,
        declaredTimeIST: newResult.declaredTimeIST
      }
    });

  } catch (error) {
    console.error("❌ Declare result API error:", error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to declare result",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
});

// Helper functions

function getWinnerNumber(result: any): string {
  if (result.jodi) return result.jodi;
  if (result.haruf) return result.haruf;
  if (result.crossing) return result.crossing;
  return 'N/A';
}

function getMarketIcon(marketId: string): string {
  const market = marketId.toLowerCase();
  
  if (market.includes('goa')) return '🏖️';
  if (market.includes('gali')) return '⚔️';
  if (market.includes('disawer') || market.includes('disawar')) return '🎲';
  if (market.includes('delhi')) return '🦁';
  if (market.includes('dubai')) return '🏢';
  if (market.includes('mumbai')) return '🌊';
  if (market.includes('kolkata')) return '🎭';
  if (market.includes('chennai')) return '🏛️';
  if (market.includes('bangalore')) return '🌟';
  if (market.includes('hyderabad')) return '💎';
  if (market.includes('rajdhani')) return '👑';
  
  return '🎮';
}

function getMarketColor(marketId: string): string {
  const market = marketId.toLowerCase();
  
  if (market.includes('goa')) return 'from-teal-500 to-teal-600';
  if (market.includes('gali')) return 'from-red-500 to-red-600';
  if (market.includes('disawer') || market.includes('disawar')) return 'from-indigo-500 to-indigo-600';
  if (market.includes('delhi')) return 'from-yellow-500 to-yellow-600';
  if (market.includes('dubai')) return 'from-blue-500 to-blue-600';
  if (market.includes('mumbai')) return 'from-purple-500 to-purple-600';
  if (market.includes('kolkata')) return 'from-green-500 to-green-600';
  if (market.includes('chennai')) return 'from-orange-500 to-orange-600';
  if (market.includes('bangalore')) return 'from-pink-500 to-pink-600';
  if (market.includes('hyderabad')) return 'from-teal-500 to-teal-600';
  if (market.includes('rajdhani')) return 'from-amber-500 to-amber-600';
  
  return 'from-gray-500 to-gray-600';
}

function formatMarketName(marketId: string): string {
  return marketId.split(/[_-]/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

export default router;
