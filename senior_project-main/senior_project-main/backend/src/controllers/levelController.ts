import { Request, Response } from "express";

export class LevelController {
  /**
   * Set user level based on location (campus/hospital)
   */
  static async setUserLevel(req: Request, res: Response) {
    try {
      const { location } = req.body;
      
      if (!location || !['campus', 'hospital'].includes(location)) {
        return res.status(400).json({
          message: "Invalid location. Must be 'campus' or 'hospital'",
          status: "error"
        });
      }

      // Map location to level
      const level = location === 'campus' ? 1 : 2;
      
      // Save level to session
      req.session.userLevel = level;
      await req.session.save();

      console.log(`[BACKEND] User level set: ${location} (level ${level})`);

      return res.json({
        success: true,
        level,
        location,
        message: `User level set to ${location} (level ${level})`,
        status: "success"
      });

    } catch (error) {
      console.error("Error in setUserLevel:", error);
      return res.status(500).json({
        message: "Internal server error",
        status: "error"
      });
    }
  }

  /**
   * Get current user level
   */
  static async getUserLevel(req: Request, res: Response) {
    try {
      const sessionLevel = req.session.userLevel;
      
      if (sessionLevel) {
        const location = sessionLevel === 1 ? 'campus' : 'hospital';
        return res.json({
          level: sessionLevel,
          location,
          status: "success"
        });
      }

      // No level set
      return res.json({
        level: null,
        location: null,
        message: "No user level set",
        status: "success"
      });

    } catch (error) {
      console.error("Error in getUserLevel:", error);
      return res.status(500).json({
        message: "Internal server error",
        status: "error"
      });
    }
  }
} 