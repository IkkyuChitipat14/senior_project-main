import { Request, Response } from "express";
import { FaceService } from "../services/faceService";
import { FileService } from "../services/fileService";
import Face from "../models/face";
import { allowInternetForMac } from "../services/clearpassService";
import crypto from "crypto";

const ENCRYPT_SECRET = process.env.CRYPTO_SECRET || "12345678901234567890123456789012"; // 32 bytes
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPT_SECRET, 'utf8'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export class ScanController {
  /**
   * Handle face scan or register request
   */
  static async scanFace(req: Request, res: Response) {
    try {
      let { faceEmbedding, image, citizenID, mode, level } = req.body;
      // Default mode = 'scan' if not provided
      if (!mode) mode = "scan";
      
      // Get level from session if not provided in request
      if (!level && req.session.userLevel) {
        level = req.session.userLevel;
      }

      // Debug log
      console.log("[BACKEND] Received:", { mode, citizenID, hasFaceEmbedding: !!faceEmbedding, hasImage: !!image, sessionCitizenID: req.session.citizenID, level });

      // Validate input
      if (!faceEmbedding || !Array.isArray(faceEmbedding)) {
        return res.status(400).json({ 
          message: "Missing or invalid faceEmbedding",
          status: "error"
        });
      }

      // Prepare citizenID
      if (!citizenID && req.session.citizenID) {
        citizenID = req.session.citizenID;
      }

      // ถอดรหัส faceEmbedding ถ้ามาเป็น string (encrypted)
      let faceEmbeddingArray = faceEmbedding;
      if (typeof faceEmbedding === 'string') {
        try {
          const decoded = FaceService.decodeFaceEmbedding(faceEmbedding);
          if (!Array.isArray(decoded)) {
            return res.status(400).json({
              message: "faceEmbedding ถอดรหัสไม่ได้",
              status: "error"
            });
          }
          faceEmbeddingArray = decoded;
        } catch (e) {
          return res.status(400).json({
            message: "faceEmbedding ถอดรหัสไม่ได้",
            status: "error"
          });
        }
      }
      // ตรวจสอบว่า faceEmbedding ต้องเป็น array ที่มีความยาว 128 (มาตรฐาน face-api.js)
      if (!Array.isArray(faceEmbeddingArray) || faceEmbeddingArray.length !== 128) {
        return res.status(400).json({
          message: "faceEmbedding ไม่ถูกต้อง กรุณาสแกนใบหน้าใหม่อีกครั้ง",
          status: "error"
        });
      }

      // Find matching face using service
      const result = await FaceService.findMatchingFace(faceEmbeddingArray);

      // Save to session
      req.session.faceEmbedding = faceEmbeddingArray;
      if (result.citizenID) {
        req.session.citizenID = result.citizenID;
      } else if (citizenID) {
        req.session.citizenID = citizenID;
      }
      // Save level to session if provided
      if (level) {
        req.session.userLevel = level;
      }
      await req.session.save();

      // Register mode: save to DB
      if (mode === "register") {
        if (!citizenID) {
          return res.status(400).json({ message: "Missing citizenID for registration", status: "error" });
        }
        try {
          // ดึงข้อมูลทั้งหมดจาก DB
          const allFaces = await Face.find({});
          // ตรวจสอบใบหน้าซ้ำ (faceEmbedding) แบบใช้ threshold
          let isFaceDuplicate = false;
          for (const face of allFaces) {
            try {
              const dbEmbedding = FaceService.decodeFaceEmbedding(face.faceEmbedding);
              if (Array.isArray(dbEmbedding) && dbEmbedding.length === 128) {
                const distance = FaceService.euclideanDistance(dbEmbedding, faceEmbeddingArray);
                if (distance < 0.4) { // ใช้ threshold เดียวกับระบบ scan
                  isFaceDuplicate = true;
                  break;
                }
              }
            } catch (e) {
              // ignore decode error
            }
          }
          if (isFaceDuplicate) {
            return res.status(400).json({ message: "ใบหน้านี้ได้ถูกลงทะเบียนแล้ว ไม่สามารถลงทะเบียนซ้ำได้", status: "error" });
          }
          let isDuplicate = false;
          for (const face of allFaces) {
            try {
              // ถอดรหัส citizenID
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
            return res.status(400).json({ message: "เลขบัตรประชาชนนี้ได้ถูกลงทะเบียนแล้ว ไม่สามารถลงทะเบียนซ้ำได้", status: "error" });
          }

          // บันทึกไฟล์ image และได้ encrypted path
          let imagePath = undefined;
          if (image && typeof image === "string" && image.startsWith("data:image/")) {
            try {
              imagePath = await FileService.saveImageFromBase64(image, citizenID);
            } catch (fileError) {
              console.error("[BACKEND] Error saving image file:", fileError);
              return res.status(500).json({ message: "Error saving image file", status: "error" });
            }
          }

          const faceToken = encrypt(JSON.stringify(faceEmbeddingArray));
          const idToken = encrypt(citizenID);
          await Face.create({
            faceEmbedding: faceToken,
            citizenID: idToken,
            imagePath: imagePath,
            level: level || 1, // Default to campus (1) if not provided
          });
          console.log("[BACKEND] Registered face for citizenID", citizenID);
          // Optionally trigger ClearPass if mac provided
          const mac: string | undefined = req.body?.mac;
          console.log("[BACKEND] ClearPass (register) mac:", mac ?? "<none>");
          if (mac) {
            try {
              console.log("[BACKEND] Invoking ClearPass allowInternetForMac (register) for", mac);
              await allowInternetForMac(mac, 1);
              console.log("[BACKEND] ClearPass completed (register) for", mac);
            } catch (cpErr) {
              console.error("[BACKEND] ClearPass error (register):", cpErr);
              // Do not fail registration on ClearPass error
            }
          }
          return res.json({ matched: true, citizenID, status: "success", message: "ลงทะเบียนสำเร็จ" });
        } catch (err) {
          console.error("[BACKEND] Error saving to DB:", err);
          return res.status(500).json({ message: "DB error: " + (err as Error).message, status: "error" });
        }
      }

      // Scan mode: เพิ่มการตรวจสอบที่เข้มงวดขึ้น
      if (mode === "scan") {
        // ตรวจสอบว่า result.matched เป็น true และมี citizenID หรือไม่
        if (result.matched && result.citizenID) {
          console.log(`[BACKEND] Scan successful for citizenID: ${result.citizenID}`);
          // Optionally trigger ClearPass if mac provided
          const mac: string | undefined = req.body?.mac;
          console.log("[BACKEND] ClearPass (scan) mac:", mac ?? "<none>");
          if (mac) {
            try {
              console.log("[BACKEND] Invoking ClearPass allowInternetForMac (scan) for", mac);
              await allowInternetForMac(mac, 1);
              console.log("[BACKEND] ClearPass completed (scan) for", mac);
            } catch (cpErr) {
              console.error("[BACKEND] ClearPass error (scan):", cpErr);
              // Do not fail scan response on ClearPass error
            }
          }
          return res.json({ 
            matched: true, 
            citizenID: result.citizenID,
            status: "success"
          });
        } else {
          console.log("[BACKEND] No matching face found in database");
          return res.json({ 
            matched: false, 
            citizenID: null,
            status: "success",
            message: "ไม่พบข้อมูลใบหน้าในระบบ"
          });
        }
      }

      // Fallback for other modes
      return res.json({ 
        matched: result.matched, 
        citizenID: result.citizenID,
        status: "success"
      });
    } catch (error) {
      console.error("Error in scanFace:", error);
      res.status(500).json({ 
        message: "Internal server error during face scan",
        status: "error"
      });
    }
  }

  /**
   * Get all faces with level information
   */
  static async getAllFaces(req: Request, res: Response) {
    try {
      const allFaces = await Face.find({}).sort({ createdAt: -1 });
      
      const facesWithLevel = allFaces.map(face => {
        let decryptedCitizenID = null;
        try {
          decryptedCitizenID = FaceService.decodeCitizenID(face.citizenID);
        } catch (e) {
          // ignore decode error
        }
        
        return {
          citizenID: decryptedCitizenID,
          level: face.level || 1,
          location: face.level === 2 ? 'hospital' : 'campus',
          createdAt: face.createdAt,
          updatedAt: face.updatedAt
        };
      });

      return res.json({
        faces: facesWithLevel,
        total: facesWithLevel.length,
        campusCount: facesWithLevel.filter(f => f.level === 1).length,
        hospitalCount: facesWithLevel.filter(f => f.level === 2).length,
        status: "success"
      });

    } catch (error) {
      console.error("Error in getAllFaces:", error);
      return res.status(500).json({
        message: "Internal server error",
        status: "error"
      });
    }
  }

  /**
   * Get image by citizenID
   */
  static async getImage(req: Request, res: Response) {
    try {
      const { citizenID } = req.params;
      
      if (!citizenID) {
        return res.status(400).json({ 
          message: "Missing citizenID parameter",
          status: "error"
        });
      }

      // หาข้อมูลใน DB
      const allFaces = await Face.find({});
      let targetFace = null;
      
      for (const face of allFaces) {
        try {
          const decrypted = FaceService.decodeCitizenID(face.citizenID);
          if (decrypted === citizenID) {
            targetFace = face;
            break;
          }
        } catch (e) {
          // ignore decode error
        }
      }

      if (!targetFace || !targetFace.imagePath) {
        return res.status(404).json({ 
          message: "Image not found for this citizenID",
          status: "error"
        });
      }

      // ดึง image จาก encrypted path
      const imageBuffer = await FileService.getImageFromEncryptedPath(targetFace.imagePath);
      
      if (!imageBuffer) {
        return res.status(404).json({ 
          message: "Image file not found",
          status: "error"
        });
      }

      // ส่ง image กลับไป
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Length', imageBuffer.length);
      res.send(imageBuffer);

    } catch (error) {
      console.error("Error in getImage:", error);
      res.status(500).json({ 
        message: "Internal server error while retrieving image",
        status: "error"
      });
    }
  }

  /**
   * Get image as base64 by citizenID
   */
  static async getImageBase64(req: Request, res: Response) {
    try {
      const { citizenID } = req.params;
      
      if (!citizenID) {
        return res.status(400).json({ 
          message: "Missing citizenID parameter",
          status: "error"
        });
      }

      // หาข้อมูลใน DB
      const allFaces = await Face.find({});
      let targetFace = null;
      
      for (const face of allFaces) {
        try {
          const decrypted = FaceService.decodeCitizenID(face.citizenID);
          if (decrypted === citizenID) {
            targetFace = face;
            break;
          }
        } catch (e) {
          // ignore decode error
        }
      }

      if (!targetFace || !targetFace.imagePath) {
        return res.status(404).json({ 
          message: "Image not found for this citizenID",
          status: "error"
        });
      }

      // ดึง image เป็น base64 จาก encrypted path
      const base64Image = await FileService.getBase64FromEncryptedPath(targetFace.imagePath);
      
      if (!base64Image) {
        return res.status(404).json({ 
          message: "Image file not found",
          status: "error"
        });
      }

      res.json({ 
        image: base64Image,
        status: "success"
      });

    } catch (error) {
      console.error("Error in getImageBase64:", error);
      res.status(500).json({ 
        message: "Internal server error while retrieving image",
        status: "error"
      });
    }
  }
} 