import express from "express";
import cors from "cors";
import "dotenv/config";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import kitRoutes from "./routes/kit.routes.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://ai-interview-kit-7rrg.onrender.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/kits", kitRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "TraoPrep API is live and running!",
  });
});

app.get("/health", (req, res) => {
  res
    .status(200)
    .json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Initialize Server
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[API] Server running on http://localhost:${PORT}`);
  });
};

startServer();
