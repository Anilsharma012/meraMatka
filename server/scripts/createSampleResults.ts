import mongoose from "mongoose";
import Game from "../models/Game";
import connectDB from "../config/database";

const createSampleResults = async () => {
  try {
    console.log("🎯 Creating sample game results for charts...");

    // Connect to database
    await connectDB();

    // Get all active games
    const games = await Game.find({ isActive: true }).limit(5);
    console.log(`📊 Found ${games.length} active games`);

    if (games.length === 0) {
      console.log("❌ No active games found. Please create some games first.");
      return;
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sampleResults = [
      { number: "42", date: today },
      { number: "78", date: yesterday },
      { number: "35", date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000) }, // 2 days ago
    ];

    let resultsCreated = 0;

    // Create results for each game
    for (const game of games.slice(0, 3)) { // Limit to first 3 games
      for (let i = 0; i < sampleResults.length; i++) {
        const sample = sampleResults[i];
        const resultDate = new Date(sample.date);
        resultDate.setHours(16, 30, 0, 0); // Set result time to 4:30 PM
        
        // Check if result already exists for this game and date
        const existingResult = await Game.findOne({
          _id: game._id,
          declaredResult: { $exists: true },
          resultDeclaredAt: {
            $gte: new Date(sample.date.getFullYear(), sample.date.getMonth(), sample.date.getDate()),
            $lt: new Date(sample.date.getFullYear(), sample.date.getMonth(), sample.date.getDate() + 1),
          }
        });

        if (!existingResult) {
          // Update game with result
          await Game.findByIdAndUpdate(game._id, {
            declaredResult: sample.number,
            resultDeclaredAt: resultDate,
            resultMethod: "manual",
            currentStatus: "result_declared",
            lastResultDate: resultDate,
          });

          console.log(`✅ Created result for ${game.name}: ${sample.number} on ${sample.date.toDateString()}`);
          resultsCreated++;
        } else {
          console.log(`⏭️  Result already exists for ${game.name} on ${sample.date.toDateString()}`);
        }
      }
    }

    console.log(`🎉 Successfully created ${resultsCreated} sample results!`);
    console.log("📊 Now go to Charts page to see the results!");

  } catch (error) {
    console.error("❌ Error creating sample results:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the script
createSampleResults();
