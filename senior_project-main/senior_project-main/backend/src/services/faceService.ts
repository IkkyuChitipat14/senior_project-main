import crypto from "crypto";
import Face from "../models/face";

const ENCRYPT_SECRET = process.env.CRYPTO_SECRET || "12345678901234567890123456789012"; // 32 bytes

export class FaceService {
  /**
   * Decrypt encrypted text using AES-256-CBC
   */
  private static decrypt(text: string): string {
    const [ivHex, encrypted] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPT_SECRET, 'utf8'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Decode face embedding from encrypted token
   */
  static decodeFaceEmbedding(token: string): number[] | null {
    try {
      return JSON.parse(this.decrypt(token));
    } catch (err) {
      console.warn("Invalid faceEmbedding encrypted:", err);
      return null;
    }
  }

  /**
   * Decode citizen ID from encrypted token
   */
  static decodeCitizenID(token: string): string | null {
    try {
      return this.decrypt(token);
    } catch (err) {
      console.warn("Invalid citizenID encrypted:", err);
      return null;
    }
  }

  /**
   * Calculate Euclidean distance between two arrays
   */
  static euclideanDistance(arr1: number[], arr2: number[]): number {
    return Math.sqrt(
      arr1.reduce((sum, val, i) => sum + Math.pow(val - arr2[i], 2), 0)
    );
  }

  /**
   * Find matching face in database
   */
  static async findMatchingFace(faceEmbedding: number[], threshold: number = 0.4): Promise<{ matched: boolean; citizenID: string | null }> {
    try {
      const allFaces = await Face.find({});
      console.log(`[FaceService] Searching through ${allFaces.length} faces in database`);
      
      let matched = false;
      let matchedID: string | null = null;
      let bestDistance = Infinity;

      for (let face of allFaces) {
        const decodedEmbedding = this.decodeFaceEmbedding(face.faceEmbedding);
        const decodedCitizenID = this.decodeCitizenID(face.citizenID);

        if (!decodedEmbedding || !decodedCitizenID) {
          console.warn(`[FaceService] Skipping face with invalid data: embedding=${!!decodedEmbedding}, citizenID=${!!decodedCitizenID}`);
          continue;
        }

        if (decodedEmbedding.length !== faceEmbedding.length) {
          console.warn(
            `[FaceService] Skipping mismatched embedding (DB=${decodedEmbedding.length}, input=${faceEmbedding.length})`
          );
          continue;
        }

        const distance = this.euclideanDistance(decodedEmbedding, faceEmbedding);
        console.log(`[FaceService] Distance for ${decodedCitizenID}: ${distance.toFixed(4)} (threshold: ${threshold})`);
        
        if (distance < threshold && distance < bestDistance) {
          matched = true;
          matchedID = decodedCitizenID;
          bestDistance = distance;
          console.log(`[FaceService] New best match found! Distance: ${distance.toFixed(4)}, CitizenID: ${decodedCitizenID}`);
        }
      }

      console.log(`[FaceService] Final result: matched=${matched}, citizenID=${matchedID}, bestDistance=${bestDistance.toFixed(4)}`);
      return { matched, citizenID: matchedID };
    } catch (error) {
      console.error("[FaceService] Error in findMatchingFace:", error);
      return { matched: false, citizenID: null };
    }
  }
} 