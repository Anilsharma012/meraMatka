import mongoose, { Schema, Document } from "mongoose";

export interface IResult extends Document {
  gameId: mongoose.Types.ObjectId;
  marketId: string; // goa, delhi, disawer, etc.
  marketName: string; // Goa Market, Delhi Bazar, etc.
  gameType: "jodi" | "haruf" | "crossing";

  // Result Data (store all possible results)
  result: {
    jodi?: string; // 2-digit number (00-99)
    haruf?: string; // 1-digit number (0-9) 
    crossing?: string; // crossing result
  };

  // Timestamps (UTC for storage)
  declaredAtUTC: Date; // When result was declared (UTC)
  gameStartTimeUTC?: Date; // Game start time (UTC)
  gameEndTimeUTC?: Date; // Game end time (UTC)

  // Status and Metadata
  status: "published" | "pending" | "cancelled";
  declaredBy?: mongoose.Types.ObjectId; // Admin who declared
  method: "manual" | "automatic";

  // Helper fields for quick queries
  declaredDateIST: string; // YYYY-MM-DD in IST for date filtering
  declaredTimeIST: string; // HH:mm in IST for display

  // Statistics (optional)
  totalBets?: number;
  totalBetAmount?: number;
  totalWinners?: number;
  totalWinningAmount?: number;

  createdAt: Date;
  updatedAt: Date;
}

const ResultSchema: Schema = new Schema(
  {
    gameId: {
      type: Schema.Types.ObjectId,
      ref: "Game",
      required: true,
      index: true,
    },
    marketId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    marketName: {
      type: String,
      required: true,
      trim: true,
    },
    gameType: {
      type: String,
      enum: ["jodi", "haruf", "crossing"],
      required: true,
      index: true,
    },

    // Result Data
    result: {
      jodi: {
        type: String,
        match: /^[0-9]{1,2}$/,
        trim: true,
      },
      haruf: {
        type: String,
        match: /^[0-9]$/,
        trim: true,
      },
      crossing: {
        type: String,
        trim: true,
      },
    },

    // Timestamps (UTC for storage)
    declaredAtUTC: {
      type: Date,
      required: true,
      index: true,
    },
    gameStartTimeUTC: {
      type: Date,
    },
    gameEndTimeUTC: {
      type: Date,
    },

    // Status and Metadata
    status: {
      type: String,
      enum: ["published", "pending", "cancelled"],
      default: "published",
      index: true,
    },
    declaredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    method: {
      type: String,
      enum: ["manual", "automatic"],
      default: "manual",
    },

    // Helper fields for quick queries (auto-calculated)
    declaredDateIST: {
      type: String, // YYYY-MM-DD
      index: true,
    },
    declaredTimeIST: {
      type: String, // HH:mm
    },

    // Statistics (optional)
    totalBets: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalBetAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWinners: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWinningAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
ResultSchema.index({ declaredDateIST: -1, marketId: 1 }); // Date + market filtering
ResultSchema.index({ declaredAtUTC: -1, status: 1 }); // Time-based queries
ResultSchema.index({ marketId: 1, declaredAtUTC: -1 }); // Market-specific results
ResultSchema.index({ gameType: 1, declaredDateIST: -1 }); // Type-based filtering

// Static methods for IST conversion
ResultSchema.statics.convertUTCToIST = function(utcDate: Date): { dateIST: string; timeIST: string } {
  // Convert UTC to IST (UTC + 5:30)
  const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
  
  const dateIST = istDate.getFullYear() + '-' + 
    String(istDate.getMonth() + 1).padStart(2, '0') + '-' + 
    String(istDate.getDate()).padStart(2, '0');
    
  const timeIST = String(istDate.getHours()).padStart(2, '0') + ':' + 
    String(istDate.getMinutes()).padStart(2, '0');
    
  return { dateIST, timeIST };
};

ResultSchema.statics.convertISTDateToUTCRange = function(istDateStr: string): { startUTC: Date; endUTC: Date } {
  // Convert IST date (YYYY-MM-DD) to UTC range (00:00 to 23:59 IST)
  const [year, month, day] = istDateStr.split('-').map(Number);
  
  // Start of day in IST (00:00:00)
  const startIST = new Date(year, month - 1, day, 0, 0, 0, 0);
  // End of day in IST (23:59:59)
  const endIST = new Date(year, month - 1, day, 23, 59, 59, 999);
  
  // Convert to UTC (IST - 5:30)
  const startUTC = new Date(startIST.getTime() - (5.5 * 60 * 60 * 1000));
  const endUTC = new Date(endIST.getTime() - (5.5 * 60 * 60 * 1000));
  
  return { startUTC, endUTC };
};

// Pre-save middleware to auto-calculate IST fields
ResultSchema.pre('save', function(this: IResult) {
  if (this.declaredAtUTC && (!this.declaredDateIST || !this.declaredTimeIST)) {
    // Convert UTC to IST manually (UTC + 5:30)
    const istDate = new Date(this.declaredAtUTC.getTime() + (5.5 * 60 * 60 * 1000));

    this.declaredDateIST = istDate.getFullYear() + '-' +
      String(istDate.getMonth() + 1).padStart(2, '0') + '-' +
      String(istDate.getDate()).padStart(2, '0');

    this.declaredTimeIST = String(istDate.getHours()).padStart(2, '0') + ':' +
      String(istDate.getMinutes()).padStart(2, '0');
  }
});

export default mongoose.model<IResult>("Result", ResultSchema);
