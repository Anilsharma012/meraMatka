import mongoose from "mongoose";
import Game from "../models/Game";
import Result from "../models/Result";
import connectDB from "../config/database";

const migrateExistingResults = async () => {
  try {
    console.log("🔄 Migrating existing game results to Results collection...");

    await connectDB();

    // Find games with declared results
    const gamesWithResults = await Game.find({
      declaredResult: { $exists: true, $ne: null },
      resultDeclaredAt: { $exists: true },
    }).select("name type declaredResult resultDeclaredAt marketId");

    console.log(
      `📊 Found ${gamesWithResults.length} games with results to migrate`,
    );

    for (const game of gamesWithResults) {
      try {
        // Check if result already exists in Results collection
        const existingResult = await Result.findOne({
          gameId: game._id,
          declaredAtUTC: game.resultDeclaredAt,
        });

        if (existingResult) {
          console.log(`⏭️  Skipping ${game.name} - already migrated`);
          continue;
        }

        // Create marketId from game name if not set
        let marketId = game.marketId;
        if (!marketId) {
          marketId = game.name
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
        }

        // Create result object based on game type
        const result: any = {};
        if (game.type === "jodi") {
          result.jodi = game.declaredResult;
        } else if (game.type === "haruf") {
          result.haruf = game.declaredResult;
        } else if (game.type === "crossing") {
          result.crossing = game.declaredResult;
        }

        // Create new Result entry
        const newResult = await Result.create({
          gameId: game._id,
          marketId,
          marketName: game.name,
          gameType: game.type,
          result,
          declaredAtUTC: game.resultDeclaredAt,
          status: "published",
          method: "manual",
          // declaredDateIST and declaredTimeIST will be auto-calculated
        });

        console.log(
          `✅ Migrated: ${game.name} -> ${game.declaredResult} (${newResult.declaredDateIST} ${newResult.declaredTimeIST})`,
        );
      } catch (error) {
        console.error(`❌ Error migrating ${game.name}:`, error);
      }
    }

    // Verify migration
    const totalResults = await Result.countDocuments();
    console.log(
      `🎯 Migration complete! Total results in Results collection: ${totalResults}`,
    );

    // Test query for today
    const today = new Date().toISOString().split("T")[0];
    const todayResults = await Result.find({
      declaredDateIST: today,
      status: "published",
    }).select("marketName result declaredTimeIST");

    console.log(`📊 Today's results (${today}):`);
    todayResults.forEach((result) => {
      const winnerNumber =
        result.result.jodi ||
        result.result.haruf ||
        result.result.crossing ||
        "N/A";
      console.log(
        `   - ${result.marketName}: ${winnerNumber} at ${result.declaredTimeIST}`,
      );
    });
  } catch (error) {
    console.error("❌ Migration error:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run migration
migrateExistingResults();
