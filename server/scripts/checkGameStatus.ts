import mongoose from "mongoose";
import Game from "../models/Game";
import connectDB from "../config/database";

const checkGameStatus = async () => {
  try {
    console.log("🔍 Checking all games and their status...");

    // Connect to database
    await connectDB();

    // Get all games
    const allGames = await Game.find({}).select('name type declaredResult resultDeclaredAt currentStatus isActive').sort({ name: 1 });

    console.log(`📊 Found ${allGames.length} total games:`);
    console.log("");

    allGames.forEach((game, index) => {
      console.log(`${index + 1}. ${game.name} (${game.type || 'N/A'})`);
      console.log(`   Status: ${game.currentStatus}`);
      console.log(`   Active: ${game.isActive}`);
      console.log(`   Result: ${game.declaredResult || 'Not declared'}`);
      console.log(`   Result Time: ${game.resultDeclaredAt?.toLocaleString() || 'N/A'}`);
      console.log("");
    });

    // Check specifically for Goa Market
    const goaMarket = await Game.findOne({ 
      name: { $regex: /goa/i }
    });

    if (goaMarket) {
      console.log("🏖️  FOUND GOA MARKET:");
      console.log("   Name:", goaMarket.name);
      console.log("   Result:", goaMarket.declaredResult);
      console.log("   Result Time:", goaMarket.resultDeclaredAt?.toLocaleString());
      console.log("   Status:", goaMarket.currentStatus);
    } else {
      console.log("🔍 No 'Goa Market' game found. Let me check all game names...");
      console.log("Available games:", allGames.map(g => g.name));
    }

  } catch (error) {
    console.error("❌ Error checking games:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the script
checkGameStatus();
