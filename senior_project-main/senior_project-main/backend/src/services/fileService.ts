import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ENCRYPT_SECRET = process.env.CRYPTO_SECRET || "12345678901234567890123456789012";

export class FileService {
  private static uploadDir = path.join(process.cwd(), 'uploads', 'images');

  /**
   * สร้างโฟลเดอร์ถ้ายังไม่มี
   */
  private static ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * เข้ารหัส text ด้วย AES-256-CBC
   */
  private static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPT_SECRET, 'utf8'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * ถอดรหัส text ด้วย AES-256-CBC
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
   * บันทึก base64 image เป็นไฟล์และเข้ารหัส path
   */
  static async saveImageFromBase64(base64Data: string, citizenID: string): Promise<string> {
    try {
      this.ensureUploadDir();

      // ตรวจสอบว่าเป็น base64 image หรือไม่
      if (!base64Data.startsWith('data:image/')) {
        throw new Error('Invalid image format');
      }

      // แยก mime type และ data
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 format');
      }

      const mimeType = matches[1];
      const base64Image = matches[2];

      // กำหนดนามสกุลไฟล์
      const extension = mimeType.split('/')[1] || 'jpg';
      
      // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const filename = `img_${timestamp}_${randomString}.${extension}`;
      const filePath = path.join(this.uploadDir, filename);

      // แปลง base64 เป็น buffer และบันทึกไฟล์
      const imageBuffer = Buffer.from(base64Image, 'base64');
      fs.writeFileSync(filePath, imageBuffer);

      // เข้ารหัส path ก่อนบันทึกลง DB
      const encryptedPath = this.encrypt(filePath);
      
      console.log(`[FileService] Saved image: ${filename}`);
      return encryptedPath;
    } catch (error) {
      console.error('[FileService] Error saving image:', error);
      throw error;
    }
  }

  /**
   * อ่านไฟล์ image จาก encrypted path
   */
  static async getImageFromEncryptedPath(encryptedPath: string): Promise<Buffer | null> {
    try {
      const decryptedPath = this.decrypt(encryptedPath);
      
      if (!fs.existsSync(decryptedPath)) {
        console.warn(`[FileService] File not found: ${decryptedPath}`);
        return null;
      }

      const imageBuffer = fs.readFileSync(decryptedPath);
      return imageBuffer;
    } catch (error) {
      console.error('[FileService] Error reading image:', error);
      return null;
    }
  }

  /**
   * ลบไฟล์ image
   */
  static async deleteImage(encryptedPath: string): Promise<boolean> {
    try {
      const decryptedPath = this.decrypt(encryptedPath);
      
      if (fs.existsSync(decryptedPath)) {
        fs.unlinkSync(decryptedPath);
        console.log(`[FileService] Deleted image: ${decryptedPath}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[FileService] Error deleting image:', error);
      return false;
    }
  }

  /**
   * สร้าง base64 จาก encrypted path
   */
  static async getBase64FromEncryptedPath(encryptedPath: string, mimeType: string = 'image/jpeg'): Promise<string | null> {
    try {
      const imageBuffer = await this.getImageFromEncryptedPath(encryptedPath);
      if (!imageBuffer) return null;

      const base64 = imageBuffer.toString('base64');
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('[FileService] Error converting to base64:', error);
      return null;
    }
  }
} 