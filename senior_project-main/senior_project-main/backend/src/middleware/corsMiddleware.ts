import cors from "cors";

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:8010";

const corsOptions = {
  origin: [
    allowedOrigin, 
    `${allowedOrigin}/success.html`, 
    `${allowedOrigin}/thaid.html`,
    // Production server domains
    'https://p-auth-wifi.mfu.ac.th',
    'https://auth-wifi.mfu.ac.th'
  ], // allowed origins including static files
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true, // if you use cookies/auth
};

const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
