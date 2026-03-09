import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "mydb";

// ป้องกันการเชื่อมหลายครั้งระหว่าง hot-reload (เช่น Next.js dev mode)
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: MONGODB_DB_NAME,
      })
      .then((mongoose) => {
        console.log(`✅ เชื่อมต่อ MongoDB แล้ว (DB: ${MONGODB_DB_NAME})`);
        return mongoose;
      })
      .catch((err) => {
        console.error("❌ เชื่อมต่อ MongoDB ไม่สำเร็จ:", err.message);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
