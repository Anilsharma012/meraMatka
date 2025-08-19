import mongoose from "mongoose";
import Game from "../models/Game";
import connectDB from "../config/database";

const addTodaysResults = async () => {
  try {
    console.log("🎯 Adding today's game results...");

    // Connect to database
    await connectDB();

    // Get first 3 active games
    const games = await Game.find({ isActive: true }).limit(3);
    console.log(`📊 Found ${games.length} active games`);

    if (games.length === 0) {
      console.log("❌ No active games found.");
      return;
    }

    // Set today's date with Indian timezone
    const now = new Date();
    const todayIST = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    todayIST.setHours(16, 30, 0, 0); // 4:30 PM IST

    console.log(`📅 Setting result date to: ${todayIST.toISOString()}`);

    const sampleNumbers = ["42", "78", "35"];

    let resultsCreated = 0;

    // Clear any existing results for today first
    await Game.updateMany(
      {
        isActive: true,
        resultDeclaredAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        }
      },
      {
        $unset: {
          declaredResult: "",
          resultDeclaredAt: "",
          resultMethod: "",
        }
      }
    );

    // Add results for each game
    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      const resultNumber = sampleNumbers[i] || "50";
      
      // Set result time with slight differences
      const resultTime = new Date(todayIST);
      resultTime.setMinutes(resultTime.getMinutes() + (i * 15)); // 15 minute gaps

      await Game.findByIdAndUpdate(game._id, {
        declaredResult: resultNumber,
        resultDeclaredAt: resultTime,
        resultMethod: "manual",
        currentStatus: "result_declared",
        lastResultDate: resultTime,
      });

      console.log(`✅ Added result for ${game.name}: ${resultNumber} at ${resultTime.toLocaleString()}`);
      resultsCreated++;
    }

    console.log(`🎉 Successfully added ${resultsCreated} results for today!`);
    
    // Verify the results
    const verifyResults = await Game.find({
      declaredResult: { $exists: true, $ne: null },
      resultDeclaredAt: {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      }
    }).select('name declaredResult resultDeclaredAt');

    console.log("📊 Verification - Found results:", verifyResults.map(r => ({
      name: r.name,
      result: r.declaredResult,
      time: r.resultDeclaredAt?.toLocaleString()
    })));

  } catch (error) {
    console.error("❌ Error adding today's results:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the script
addTodaysResults();
