import mongoose from "mongoose";
import { FileService } from "../services/fileService";
import Face from "../models/face";
import { FaceService } from "../services/faceService";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "mydb";

async function migrateImages() {
  try {
    console.log("🔄 Starting image migration...");
    
    // เชื่อมต่อ MongoDB
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME,
    });
    console.log("✅ Connected to MongoDB");

    // ดึงข้อมูลทั้งหมดที่มี image เป็น base64
    const facesWithImages = await Face.find({ 
      $and: [
        { image: { $exists: true } },
        { image: { $ne: null } },
        { image: { $ne: "" } }
      ]
    });

    console.log(`📊 Found ${facesWithImages.length} records with base64 images`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const face of facesWithImages) {
      try {
        // ถอดรหัส citizenID เพื่อใช้เป็นชื่อไฟล์
        const citizenID = FaceService.decodeCitizenID(face.citizenID);
        if (!citizenID) {
          console.warn(`⚠️  Cannot decode citizenID for record ${face._id}`);
          continue;
        }

        // บันทึก base64 เป็นไฟล์และได้ encrypted path
        const imagePath = await FileService.saveImageFromBase64(face.image, citizenID);
        
        // อัปเดต record ใน DB
        await Face.findByIdAndUpdate(face._id, {
          $set: { imagePath: imagePath },
          $unset: { image: 1 }
        });

        console.log(`✅ Migrated image for citizenID: ${citizenID}`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ Error migrating record ${face._id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n📈 Migration completed:`);
    console.log(`   ✅ Successfully migrated: ${migratedCount} records`);
    console.log(`   ❌ Errors: ${errorCount} records`);
    console.log(`   📁 Images saved to: ${FileService['uploadDir']}`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// รัน migration ถ้าเรียกไฟล์นี้โดยตรง
if (require.main === module) {
  migrateImages();
}

export { migrateImages }; 