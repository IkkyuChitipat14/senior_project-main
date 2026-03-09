// src/routes/session.ts
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/check-session', (req: Request, res: Response) => {
  if (req.session && req.session.faceEmbedding) {
    res.status(200).json({
      hasEmbedding: true,
      faceEmbedding: req.session.faceEmbedding || null,
      citizenID: req.session.citizenID || null, // เผื่อใช้ในอนาคต
      userLevel: req.session.userLevel || null, // เพิ่ม user level
    });
  } else {
    res.status(404).json({
      hasEmbedding: false,
      message: 'No faceEmbedding in session',
    });
  }
});
// Logout endpoint
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({
        success: false,
        message: 'Error logging out'
      });
    }
    
    res.clearCookie('sessionId'); // Clear session cookie (matches custom session name)
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});


export default router;
