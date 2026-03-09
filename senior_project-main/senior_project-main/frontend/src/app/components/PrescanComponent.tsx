"use client";

import React from 'react';
import { ChevronLeftIcon, ArrowRightIcon, FaceSmileIcon, LightBulbIcon, IdentificationIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

// --- สินทรัพย์ (Assets) ---
// เราสามารถใช้ import เหมือนเดิม หรือใช้ URL โดยตรงก็ได้
// สมมติว่าไฟล์รูปภาพยังอยู่ที่เดิม

interface PrescanComponentProps {
  nextScanPath: string;
}

const PrescanComponent = ({ nextScanPath }: PrescanComponentProps) => {
  // ดึง location จาก nextScanPath
  const location = nextScanPath.includes('/campus/') ? 'campus' : 'hospital';

  const handleThaiDLogin = () => {
    window.location.href = `/api/login?location=${location}`;
  };

  return (
    // ---- พื้นหลังหลักและ Aurora Effect ----
    <div className="font-sans flex flex-col min-h-screen bg-slate-900 overflow-hidden relative">

      {/* Aurora Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <div className="absolute top-[-20%] left-[-25%] w-96 h-96 md:w-[500px] md:h-[500px] bg-red-600 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-25%] w-96 h-96 md:w-[500px] md:h-[500px] bg-rose-700 rounded-full filter blur-3xl opacity-40 animate-pulse animation-delay-4000"></div>
      </div>

      {/* ---- Header แบบ Glassmorphism ---- */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-black/20 backdrop-blur-lg border-b border-white/10 shadow-lg">
        <Link href="/" className="flex items-center group gap-2 transition-all">
          <ChevronLeftIcon className="h-7 w-7 text-white group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="text-xl font-bold text-white tracking-wider">ยืนยันตัวตน</span>
        </Link>
        <img
          src="/img/Mae-Fah-Luang-University-2.png"
          alt="Mae Fah Luang University Logo"
          className="w-14 h-auto object-contain drop-shadow-lg"
        />
      </header>

      {/* ---- Content หลัก ---- */}
      <main className="flex flex-1 items-center justify-center p-4 z-10">
        
        {/* Card กลางแบบ Glassmorphism */}
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 text-center transform transition-all duration-500 hover:scale-[1.02]">

            {/* ไอคอนใบหน้า */}
            <div className="flex justify-center mb-6">
              <img
                src="/img/3d-face-scan-icon-png.webp"
                alt="Face Scan Illustration"
                className="w-40 h-auto object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
              />
            </div>

            {/* หัวข้อหลักแบบ Gradient */}
            <h1 className="text-4xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-red-200 via-white to-red-300">
              เตรียมพร้อมสแกน
            </h1>

            {/* คำอธิบาย */}
            <p className="text-gray-300 text-lg leading-relaxed max-w-xs mx-auto mb-10">
              จัดใบหน้าของคุณให้อยู่ในตำแหน่งที่เหมาะสม เพื่อการยืนยันตัวตนที่รวดเร็วและปลอดภัย
            </p>

            {/* ส่วนของคำแนะนำ */}
            <div className="space-y-4 mb-12 text-left">
              {/* คำแนะนำ 1 */}
              <div className="flex items-center bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                <div className="flex-shrink-0 mr-4 w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <LightBulbIcon className="h-6 w-6 text-yellow-300"/>
                </div>
                <div>
                  <h3 className="font-bold text-white">อยู่ในที่แสงสว่าง</h3>
                  <p className="text-gray-400 text-sm">หลีกเลี่ยงที่มืดหรือแสงจ้าเกินไป</p>
                </div>
              </div>
              {/* คำแนะนำ 2 */}
              <div className="flex items-center bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                <div className="flex-shrink-0 mr-4 w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <FaceSmileIcon className="h-6 w-6 text-green-300"/>
                </div>
                <div>
                  <h3 className="font-bold text-white">มองตรงไปข้างหน้า</h3>
                  <p className="text-gray-400 text-sm">จัดตำแหน่งใบหน้าให้อยู่ในกรอบพอดี</p>
                </div>
              </div>
            </div>

            {/* ปุ่ม Call to Action */}
            <div className="space-y-4">
              {/* ปุ่ม ThaiD Authentication */}
              

              {/* ปุ่มเริ่มสแกนใบหน้า */}
              <Link
                href={nextScanPath}
                className="group inline-flex items-center justify-center w-full px-8 py-4 bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-lg rounded-full shadow-lg hover:shadow-red-500/40 hover:scale-105 transform transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-red-400/50"
              >
                <span>เริ่มสแกนใบหน้า</span>
                <ArrowRightIcon className="w-6 h-6 ml-2 transform group-hover:translate-x-1.5 transition-transform duration-300" />
              </Link>
            </div>

            
        </div>
      </main>
    </div>
  );
};

export default PrescanComponent;