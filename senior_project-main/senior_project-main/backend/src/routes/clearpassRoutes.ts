import { Router } from "express";
import { clearpassAllowInternet } from "../controllers/clearpassController";

const router = Router();

router.post("/clearpass", clearpassAllowInternet);

export default router;


