'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { api } from '../utils/api';
import { QrCodeIcon } from '@heroicons/react/24/outline'; // เปลี่ยนไอคอนให้สื่อความหมายมากขึ้น

interface HomeProps {
  location: 'campus' | 'hospital';
  locationName: string;
}

const Home: React.FC<HomeProps> = ({ location, locationName }) => {
  useEffect(() => {
    const setUserLevel = async () => {
      try {
        await api.setUserLevel(location);
        console.log(`User level set to: ${location}`);
      } catch (error) {
        console.error('Failed to set user level:', error);
      }
    };

    setUserLevel();
  }, [location]);

  return (
    // ---- พื้นหลังหลักและ Aurora Effect ----
    <div className="font-sans flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden bg-slate-900">
      
      {/* Aurora Background Blobs */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-25%] w-96 h-96 md:w-[500px] md:h-[500px] bg-red-600 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-25%] w-96 h-96 md:w-[500px] md:h-[500px] bg-rose-700 rounded-full filter blur-3xl opacity-40 animate-pulse animation-delay-4000"></div>
      </div>

      {/* ---- Main Content Card แบบ Glassmorphism ---- */}
      <div className="relative z-10 w-full max-w-sm bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 text-center flex flex-col items-center transform transition-all duration-500 hover:scale-[1.02] shadow-2xl">
        
        {/* Icon Section */}
        <div className="w-36 h-36 sm:w-40 sm:h-40 mx-auto mb-6 flex items-center justify-center">
          <img
            src="/img/a4ba41_30e404dce82b4ee38e3344e4db0ae235~mv2_d_1354_1607_s_2.png"
            alt="MFU-WIFI Logo"
            className="w-full h-full object-contain filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
            onError={(e) => {
              e.currentTarget.src = "https://placehold.co/256x256/EF4444/FFFFFF?text=MFU+WIFI";
              e.currentTarget.alt = "MFU-WIFI Logo Placeholder";
            }}
          />
        </div>

        {/* Title แบบ Gradient */}
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-1 bg-clip-text text-transparent bg-gradient-to-br from-white to-red-300">
          MFU-WIFI
        </h1>

        {/* Location Indicator */}
        <p className="text-red-300 text-lg sm:text-xl font-medium mb-6">
          {locationName}
        </p>

        {/* Description */}
        <p className="text-gray-300 text-base leading-relaxed mb-10 max-w-xs mx-auto">
          เชื่อมต่อโลกดิจิทัลด้วยการ
          <strong className="font-bold text-white block text-lg">สแกนใบหน้าเพื่อยืนยันตัวตน</strong>
        </p>

        {/* Action Button */}
        <div className="w-full">
          <Link
            href={`/${location}/thaid`}
            className="group inline-flex items-center justify-center w-full px-8 py-4 bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-xl rounded-full shadow-lg hover:shadow-red-500/40 hover:scale-105 transform transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-red-400/50"
          >
            <QrCodeIcon className="w-7 h-7 mr-3 transform transition-transform group-hover:rotate-6" />
            <span>สแกนใบหน้า</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;