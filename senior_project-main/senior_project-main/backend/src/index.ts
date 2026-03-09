import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
dotenv.config();
import connectDB from "./utils/db";
import scanRoutes from './routes/scanRoutes';
import clearpassRoutes from './routes/clearpassRoutes';
import thaidRoutes from './controllers/thaid';
import sessionRoutes from './controllers/check-session';
import levelRoutes from './routes/levelRoutes';

// --- New Imports for Session Management ---
import corsMiddleware from "./middleware/corsMiddleware";
import sessionMiddleware from "./middleware/session"; // ✅ use "import" instead of require

// ------------------------------------------


const app = express();
const PORT = process.env.PORT || 8020;

// Log current timezones and times at startup
(() => {
  const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  const format = (date: Date, tz?: string) => new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);

  console.log("[Time] System TZ:", systemTz || "unknown");
  console.log("[Time] Local:", format(now));
  console.log("[Time] UTC:", format(now, "UTC"));
  console.log("[Time] Asia/Bangkok:", format(now, "Asia/Bangkok"));
})();

// เชื่อมต่อกับ MongoDB (Mongoose)
connectDB();

// Middleware
app.use(sessionMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: "5mb" }));

// Routes
app.use("/api/", scanRoutes);
app.use("/api/", sessionRoutes);
app.use("/api/", levelRoutes);
app.use("/api/", clearpassRoutes);

// ThaID routes - ทั้ง /api และ / (สำหรับ callback)
app.use("/api/", thaidRoutes);
app.use("/", thaidRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Faces endpoint for testing

app.get("/", (req, res) => {
  res.send("Backend is running...");
});

app.get("/hello", (req, res) => {
  res.send("Backend is running...");
});

// Global Error Handling Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'An unexpected error occurred.',
    error: err.message,
    status: 'error'
  });
});

// Middleware for handling 404 Not Found errors
app.use((req, res, next) => {
    res.status(404).json({ message: 'API Endpoint not found.' });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});