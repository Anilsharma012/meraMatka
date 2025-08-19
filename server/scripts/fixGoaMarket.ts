import mongoose from "mongoose";
import Game from "../models/Game";
import connectDB from "../config/database";

const fixGoaMarket = async () => {
  try {
    console.log("🔧 Fixing Goa Market game for fresh result declaration...");

    // Connect to database
    await connectDB();

    // Find Goa Market game
    const goaMarket = await Game.findOne({ 
      name: { $regex: /goa.*market/i }
    });

    if (!goaMarket) {
      console.log("❌ Goa Market game not found");
      return;
    }

    console.log("📊 Current Goa Market state:");
    console.log("   Name:", goaMarket.name);
    console.log("   Status:", goaMarket.currentStatus);
    console.log("   Active:", goaMarket.isActive);
    console.log("   Declared Result:", goaMarket.declaredResult);
    console.log("   Result Time:", goaMarket.resultDeclaredAt?.toLocaleString());

    // Reset the game to allow fresh result declaration
    const resetData = {
      $unset: {
        declaredResult: "",
        resultDeclaredAt: "",
        resultDeclaredBy: "",
        resultMethod: "",
        lastResultDate: "",
      },
      $set: {
        currentStatus: "closed", // Set to closed so admin can declare result
        isActive: true,
        isResultPending: false,
        lastStatusChange: new Date()
      }
    };

    await Game.findByIdAndUpdate(goaMarket._id, resetData);

    console.log("✅ Goa Market has been reset and is ready for result declaration!");
    console.log("💡 Now go to Admin Panel → Game Management → Goa Market → Declare Result");
    console.log("   Enter result number (like 35) and it will show in charts immediately");

    // Verify the fix
    const updatedGame = await Game.findById(goaMarket._id).select('name currentStatus declaredResult isActive');
    console.log("📊 Updated state:");
    console.log("   Status:", updatedGame?.currentStatus);
    console.log("   Active:", updatedGame?.isActive);
    console.log("   Result:", updatedGame?.declaredResult || "Ready for declaration");

  } catch (error) {
    console.error("❌ Error fixing Goa Market:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the script
fixGoaMarket();
