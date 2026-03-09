// middleware/session.ts

import session from "express-session";
import MongoStore from "connect-mongo";

const MONGODB_URI = process.env.MONGODB_URI!;
const SESSION_SECRET = process.env.SESSION_SECRET || "your_super_secret_key";

const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: "mongodb://mongo:27017/session",
    collectionName: "sessions",
    ttl: 14 * 24 * 60 * 60,
    autoRemove: "interval",
    autoRemoveInterval: 10,
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    secure: false, // Set to false for now to debug session issues
    httpOnly: true,
    sameSite: "lax",
  },
  name: 'sessionId', // Custom session name
});

export default sessionMiddleware;
