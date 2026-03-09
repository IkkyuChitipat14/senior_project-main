import { Router } from "express";
import { LevelController } from "../controllers/levelController";

const router = Router();

// Async handler wrapper for error handling
const asyncHandler = (
  fn: (req: any, res: any, next: any) => Promise<any>
) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// POST /level/set - Set user level based on location
router.post(
  "/level/set",
  asyncHandler(LevelController.setUserLevel)
);

// GET /level - Get current user level
router.get(
  "/level",
  asyncHandler(LevelController.getUserLevel)
);

export default router; 