import { Request, Response, Router, NextFunction } from "express";
import Face from "../models/face";
import { FaceService } from "../services/faceService";
import { ThaIDService } from "../services/thaIDService";
import crypto from 'crypto';

const asyncHandler = (fn: Function) => 
(req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const router = Router();
const thaIDService = new ThaIDService();

// Debug endpoint เพื่อทดสอบ
router.get("/debug", (req: Request, res: Response) => {
  console.log('Debug endpoint hit');
  const clientSecret = process.env.THAID_CLIENT_SECRET || process.env.NEXT_PUBLIC_THAID_CLIENT_SECRET || '';
  const clientId = process.env.THAID_CLIENT_ID || process.env.NEXT_PUBLIC_THAID_CLIENT_ID || '';
  const redirectUri = process.env.THAID_CALLBACK_URL || process.env.NEXT_PUBLIC_THAID_CALLBACK_URL || '';
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  res.json({ 
    message: "Debug endpoint working",
    timestamp: new Date().toISOString(),
    session: req.session,
    env: {
      clientId: clientId,
      clientSecret: clientSecret,
      clientSecretLength: clientSecret.length || 0,
      redirectUri: redirectUri,
      frontendUrl: process.env.FRONTEND_URL,
      credentials: credentials
    }
  });
});

// ตรวจสอบการตั้งค่า ThaID
router.get(
  "/thaid-config",
  asyncHandler(async (req: Request, res: Response) => {
    const isValid = thaIDService.validateConfig();
    if (!isValid) {
      return res.status(500).json({
        message: "การตั้งค่า ThaID ไม่สมบูรณ์",
        status: "error"
      });
    }

    const config = thaIDService.getConfig();
    return res.json({
      message: "การตั้งค่า ThaID สมบูรณ์",
      config: {
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        authUrl: config.authUrl
      },
      status: "success"
    });
  })
);

// สร้าง Authorization URL และ redirect ไปยัง ThaID
router.get(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    if (!thaIDService.validateConfig()) {
      return res.status(500).json({
        message: "การตั้งค่า ThaID ไม่สมบูรณ์",
        status: "error"
      });
    }

    // รับ location จาก query parameter
    const { location } = req.query;
    console.log('Login request with location:', location);

    // Debug: แสดงการตั้งค่า
    const config = thaIDService.getConfig();
    console.log('ThaID Config:', {
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      authUrl: config.authUrl
    });

    // สร้าง state parameter เพื่อป้องกัน CSRF
    const state = crypto.randomBytes(32).toString('hex');
    req.session.thaIDState = state;
    
    // เก็บ location ใน session
    if (location && (location === 'campus' || location === 'hospital')) {
      req.session.thaidLocation = location as string;
      console.log('Stored location in session:', location);
    } else {
      // default เป็น campus
      req.session.thaidLocation = 'campus';
      console.log('Using default location: campus');
    }
    
    // บันทึก session ก่อน redirect
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          reject(err);
        } else {
          console.log('Session saved successfully');
          console.log('Session data after save:', {
            thaIDState: req.session.thaIDState,
            thaidLocation: req.session.thaidLocation,
            sessionID: req.sessionID
          });
          console.log('Session store info:', {
            hasStore: !!req.sessionStore,
            storeType: req.sessionStore?.constructor.name
          });
          resolve();
        }
      });
    });

    // สร้าง Authorization URL
    const authUrl = thaIDService.generateAuthUrl(state);
    console.log('Generated Auth URL:', authUrl);
    
    // Redirect ไปยัง ThaID
    res.redirect(authUrl);
  })
);

// Callback endpoint จาก ThaID
router.get(
  "/callback",
  asyncHandler(async (req: Request, res: Response) => {
    console.log('=== ThaID Callback Endpoint Hit ===');
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);
    console.log('Full request object:', {
      url: req.url,
      method: req.method,
      query: req.query,
      params: req.params
    });
    console.log('Session data:', {
      thaIDState: req.session.thaIDState,
      thaidLocation: req.session.thaidLocation,
      citizenID: req.session.citizenID
    });
    
    const { code, state, error } = req.query;
    
    console.log('ThaID callback received:', { code: !!code, state: !!state, error });

    // ตรวจสอบ error จาก ThaID
    if (error) {
      console.error('ThaID error:', error);
      return res.redirect(`/thaid?error=callback_failed`);
    }

    // ตรวจสอบ state parameter
    console.log('State validation:', {
      receivedState: state,
      sessionState: req.session.thaIDState,
      statesMatch: state === req.session.thaIDState
    });
    
    if (!state || state !== req.session.thaIDState) {
      console.error('Invalid state parameter');
      console.error('Received state:', state);
      console.error('Session state:', req.session.thaIDState);
      return res.redirect(`/thaid?error=invalid_state`);
    }

    // ตรวจสอบ authorization code
    if (!code) {
      console.error('No authorization code received');
      return res.redirect(`/thaid?error=no_code`);
    }

    try {
      console.log('Exchanging code for token...');
      console.log('Code received:', code);
      // แลกเปลี่ยน code เป็น token
      const tokenResponse = await thaIDService.exchangeCodeForToken(code as string);
      console.log('Token exchange successful:', { 
        hasAccessToken: !!tokenResponse.access_token,
        hasIdToken: !!tokenResponse.id_token,
        scope: tokenResponse.scope
      });
      
      // ตรวจสอบ token
      const introspectResponse = await thaIDService.introspectToken(tokenResponse.access_token);
      
      if (!introspectResponse.active) {
        console.error('Token is not active');
        return res.redirect(`/thaid?error=token_exchange_failed`);
      }

      // ดึงข้อมูลผู้ใช้จาก ID Token (ถ้ามี)
      let userInfo = null;
      if (tokenResponse.id_token) {
        userInfo = thaIDService.parseUserInfoFromToken(tokenResponse.id_token);
      }

      // ถ้าไม่มี ID Token ให้ใช้ข้อมูลจาก introspection
      if (!userInfo && introspectResponse.sub) {
        userInfo = {
          sub: introspectResponse.sub,
          pid: introspectResponse.sub, // ใช้ sub เป็น pid
          name: '', // ไม่มีข้อมูลชื่อ
          scope: introspectResponse.scope || ''
        };
      }

      if (!userInfo || !userInfo.pid) {
        console.error('No user info or citizen ID found');
        return res.redirect(`/thaid?error=no_citizen_id`);
      }

      // ตรวจสอบรูปแบบเลขบัตรประชาชน
      if (!/^\d{13}$/.test(userInfo.pid)) {
        console.error('Invalid citizen ID format');
        return res.redirect(`/thaid?error=invalid_citizen_id`);
      }

      // เช็คซ้ำใน database
      const allFaces = await Face.find({});
      let isDuplicate = false;
      for (const face of allFaces) {
        try {
          const decrypted = FaceService.decodeCitizenID(face.citizenID);
          if (decrypted === userInfo.pid) {
            isDuplicate = true;
            break;
          }
        } catch (e) {
          // ignore decode error
        }
      }
      
      if (isDuplicate) {
        console.log('Duplicate citizen ID detected:', userInfo.pid);
        return res.redirect(`/thaid?error=duplicate_citizen_id&citizenID=${userInfo.pid}`);
      }

      // บันทึกข้อมูลลงใน session
      req.session.citizenID = userInfo.pid;
      req.session.thaidVerified = true;
      req.session.thaidUserInfo = userInfo;
      req.session.thaIDAccessToken = tokenResponse.access_token;
      await req.session.save?.();

      // ลบ state ที่ใช้แล้ว
      delete req.session.thaIDState;

      // Redirect ไปยังหน้า scan ในโหมด register ตาม location ที่เลือก
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8010';
      const location = req.session.thaidLocation || 'campus';
      const redirectUrl = `${frontendUrl}/${location}/scan/face/register`;
      console.log('Redirecting to:', redirectUrl);
      console.log('Frontend URL:', frontendUrl);
      console.log('Location from session:', location);
      res.redirect(redirectUrl);

    } catch (error) {
      console.error('Token exchange or user info error:', error);
      console.error('Error details:', error);
      return res.redirect(`/thaid?error=callback_failed`);
    }
  })
);

// ThaiD callback endpoint - รับข้อมูลจาก frontend callback (legacy)
router.post(
  "/thaid-callback",
  asyncHandler(async (req: Request, res: Response) => {
    const { citizenID, accessToken, userInfo } = req.body;
    
    if (!citizenID) {
      return res.status(400).json({ 
        message: "ไม่พบ citizenID จาก ThaiD",
        status: "error"
      });
    }

    // เช็คซ้ำใน database
    const allFaces = await Face.find({});
    let isDuplicate = false;
    for (const face of allFaces) {
      try {
        const decrypted = FaceService.decodeCitizenID(face.citizenID);
        if (decrypted === citizenID) {
          isDuplicate = true;
          break;
        }
      } catch (e) {
        // ignore decode error
      }
    }
    
    if (isDuplicate) {
      return res.status(400).json({ 
        message: "เลขบัตรประชาชนนี้ได้ถูกลงทะเบียนแล้ว",
        status: "error"
      });
    }

    // บันทึก citizenID ลงใน session
    req.session.citizenID = citizenID;
    req.session.thaidVerified = true;
    req.session.thaidUserInfo = userInfo;
    await req.session.save?.();

    return res.json({
      message: "ยืนยันตัวตนด้วย ThaiD สำเร็จ",
      citizenID,
      status: "success"
    });
  })
);

// Get ThaiD verification status
router.get(
  "/thaid-status",
  asyncHandler(async (req: Request, res: Response) => {
    const isVerified = req.session.thaidVerified || false;
    const citizenID = req.session.citizenID;
    const userInfo = req.session.thaidUserInfo;

    return res.json({
      isVerified,
      citizenID,
      userInfo,
      status: "success"
    });
  })
);

// ตรวจสอบ Access Token
router.post(
  "/thaid-introspect",
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        message: "กรุณาระบุ token",
        status: "error"
      });
    }

    try {
      const introspectResponse = await thaIDService.introspectToken(token);
      return res.json({
        ...introspectResponse,
        status: "success"
      });
    } catch (error) {
      return res.status(500).json({
        message: "ไม่สามารถตรวจสอบ token ได้",
        status: "error"
      });
    }
  })
);

// ยกเลิก Access Token
router.post(
  "/thaid-revoke",
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        message: "กรุณาระบุ token",
        status: "error"
      });
    }

    try {
      const revokeResponse = await thaIDService.revokeToken(token);
      return res.json({
        ...revokeResponse,
        status: "success"
      });
    } catch (error) {
      return res.status(500).json({
        message: "ไม่สามารถยกเลิก token ได้",
        status: "error"
      });
    }
  })
);

// Legacy endpoint for backward compatibility
router.post(
  "/set-citizenid",
  asyncHandler(async (req: Request, res: Response) => {
    const { citizenID } = req.body;
    if (!citizenID) {
      return res.status(400).json({ message: "กรุณาระบุ citizenID" });
    }

    // เช็คซ้ำใน database
    const allFaces = await Face.find({});
    let isDuplicate = false;
    for (const face of allFaces) {
      try {
        const decrypted = FaceService.decodeCitizenID(face.citizenID);
        if (decrypted === citizenID) {
          isDuplicate = true;
          break;
        }
      } catch (e) {
        // ignore decode error
      }
    }
    if (isDuplicate) {
      return res.status(400).json({ message: "เลขบัตรประชาชนนี้ได้ถูกลงทะเบียนแล้ว" });
    }

    req.session.citizenID = citizenID;
    await req.session.save?.();
    return res.json({ message: "บันทึก citizenID สำเร็จ" });
  })
);

export default router;
