import { Router } from "express";
import { ScanController } from "../controllers/scanController";

const router = Router();

// Async handler wrapper for error handling
const asyncHandler = (
  fn: (req: any, res: any, next: any) => Promise<any>
) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// POST /scan - Face scanning endpoint
router.post(
  "/scan",
  asyncHandler(ScanController.scanFace)
);

// GET /image/:citizenID - Get image by citizenID
router.get(
  "/image/:citizenID",
  asyncHandler(ScanController.getImage)
);

// GET /image/:citizenID/base64 - Get image as base64 by citizenID
router.get(
  "/image/:citizenID/base64",
  asyncHandler(ScanController.getImageBase64)
);

// GET /faces/all - Get all faces with level information
router.get(
  "/faces/all",
  asyncHandler(ScanController.getAllFaces)
);

export default router; 