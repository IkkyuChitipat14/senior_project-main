// Test script สำหรับทดสอบการทำงานของระบบ scan
const axios = require('axios');

const BACKEND_URL = 'http://localhost:8020';

async function testScan() {
  try {
    console.log('🧪 ทดสอบระบบ Scan Face...');
    
    // ทดสอบการเชื่อมต่อ backend
    console.log('1. ทดสอบการเชื่อมต่อ backend...');
    const healthCheck = await axios.get(`${BACKEND_URL}/health`);
    console.log('✅ Backend เชื่อมต่อสำเร็จ:', healthCheck.status);
    
    // ทดสอบการ scan ด้วยข้อมูลจำลอง
    console.log('\n2. ทดสอบการ scan ด้วยข้อมูลจำลอง...');
    const mockFaceEmbedding = new Array(128).fill(0.1); // สร้าง array จำลอง
    
    const scanResponse = await axios.post(`${BACKEND_URL}/scan`, {
      faceEmbedding: mockFaceEmbedding,
      classifiedType: 'campus',
      mode: 'scan'
    });
    
    console.log('✅ Scan response:', scanResponse.data);
    
    // ตรวจสอบผลลัพธ์
    if (scanResponse.data.matched) {
      console.log('⚠️  ระบบพบใบหน้าที่ตรงกัน แต่ไม่ควรเป็นเช่นนั้นสำหรับข้อมูลจำลอง');
    } else {
      console.log('✅ ระบบทำงานถูกต้อง - ไม่พบใบหน้าที่ตรงกัน');
    }
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function testDatabase() {
  try {
    console.log('\n3. ทดสอบการเชื่อมต่อฐานข้อมูล...');
    
    const response = await axios.get(`${BACKEND_URL}/faces`);
    console.log('✅ ฐานข้อมูลเชื่อมต่อสำเร็จ');
    console.log(`📊 จำนวนใบหน้าที่บันทึกในระบบ: ${response.data.faces?.length || 0}`);
    
  } catch (error) {
    console.error('❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้:', error.message);
  }
}

// รันการทดสอบ
async function runTests() {
  console.log('🚀 เริ่มการทดสอบระบบ...\n');
  
  await testScan();
  await testDatabase();
  
  console.log('\n✨ การทดสอบเสร็จสิ้น');
}

runTests();
