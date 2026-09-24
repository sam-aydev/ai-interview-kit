import mongoose from "mongoose";

export const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("[API] Connected to MongoDB");
  } catch (error) {
    console.error("[API] MongoDB connection error:", error);
    process.exit(1);
  }
};
