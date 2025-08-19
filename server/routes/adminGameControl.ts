import express from "express";
import Game from "../models/Game";
import AutoCloseService from "../services/autoCloseService";
import { adminAuth, AdminRequest } from "../middleware/adminAuth";

const router = express.Router();

/**
 * POST /api/admin/games/:id/close
 * Manual override to close a game immediately
 */
router.post("/games/:id/close", adminAuth, async (req, res) => {
  try {
    const { id: gameId } = req.params;
    const adminId = (req as AdminRequest).admin?._id;

    console.log(`🔒 Admin ${adminId} requesting to close game ${gameId}`);

    // Validate game exists
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found"
      });
    }

    // Use auto-close service for consistent behavior
    const autoCloseService = AutoCloseService.getInstance();
    await autoCloseService.forceCloseGame(gameId, adminId?.toString());

    // Get updated game data
    const updatedGame = await Game.findById(gameId).select('name currentStatus acceptingBets manuallyClosedAt');

    res.json({
      success: true,
      message: `Game "${updatedGame?.name}" has been manually closed`,
      data: {
        gameId,
        gameName: updatedGame?.name,
        currentStatus: updatedGame?.currentStatus,
        acceptingBets: updatedGame?.acceptingBets,
        manuallyClosedAt: updatedGame?.manuallyClosedAt,
        closedBy: adminId
      }
    });

  } catch (error) {
    console.error("❌ Error closing game:", error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to close game",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
});

/**
 * GET /api/admin/auto-close/status
 * Get auto-close service status
 */
router.get("/auto-close/status", adminAuth, async (req, res) => {
  try {
    const autoCloseService = AutoCloseService.getInstance();
    const status = autoCloseService.getStatus();

    // Get recent auto-closed games
    const recentlyClosedGames = await Game.find({
      autoClosedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).select('name autoClosedAt currentStatus').sort({ autoClosedAt: -1 });

    res.json({
      success: true,
      autoCloseService: status,
      recentlyClosedGames: recentlyClosedGames.map(game => ({
        id: game._id,
        name: game.name,
        autoClosedAt: game.autoClosedAt,
        currentStatus: game.currentStatus
      })),
      systemTime: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error getting auto-close status:", error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to get auto-close status",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
});

/**
 * POST /api/admin/auto-close/trigger
 * Manual trigger for auto-close check (for testing)
 */
router.post("/auto-close/trigger", adminAuth, async (req, res) => {
  try {
    const autoCloseService = AutoCloseService.getInstance();
    await autoCloseService.triggerManualClose();

    res.json({
      success: true,
      message: "Auto-close check triggered manually",
      triggeredAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error triggering auto-close:", error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to trigger auto-close",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
});

export default router;
