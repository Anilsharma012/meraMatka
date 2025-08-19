import mongoose from "mongoose";
import Game from "../models/Game";
import connectDB from "../config/database";

const cleanupDummyData = async () => {
  try {
    console.log("🧹 Cleaning up dummy data and showing only real admin results...");

    // Connect to database
    await connectDB();

    // Get all games with declared results
    const gamesWithResults = await Game.find({
      declaredResult: { $exists: true, $ne: null }
    }).select('name declaredResult resultDeclaredAt resultMethod');

    console.log("📊 Current games with results:", gamesWithResults.map(g => ({
      name: g.name,
      result: g.declaredResult,
      time: g.resultDeclaredAt?.toLocaleString(),
      method: g.resultMethod
    })));

    // Remove dummy results (results added by scripts, not by admin)
    const dummyGames = ["Ghaziabad", "Gali", "Faridabad"];
    
    const cleanupResult = await Game.updateMany(
      {
        name: { $in: dummyGames },
        resultMethod: "manual" // These were added by script
      },
      {
        $unset: {
          declaredResult: "",
          resultDeclaredAt: "",
          resultMethod: "",
          lastResultDate: ""
        },
        $set: {
          currentStatus: "waiting"
        }
      }
    );

    console.log(`🗑️  Removed dummy data from ${cleanupResult.modifiedCount} games`);

    // Show remaining real results
    const realResults = await Game.find({
      declaredResult: { $exists: true, $ne: null }
    }).select('name declaredResult resultDeclaredAt resultMethod resultDeclaredBy');

    console.log("✅ Real admin-declared results remaining:", realResults.map(g => ({
      name: g.name,
      result: g.declaredResult,
      time: g.resultDeclaredAt?.toLocaleString(),
      method: g.resultMethod,
      declaredBy: g.resultDeclaredBy
    })));

    if (realResults.length === 0) {
      console.log("ℹ️  No real admin results found. Please declare some results through admin panel.");
    }

  } catch (error) {
    console.error("❌ Error cleaning up data:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the script
cleanupDummyData();
