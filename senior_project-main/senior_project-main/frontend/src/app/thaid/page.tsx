"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import ThaIDConfigCheck from "../components/ThaIDConfigCheck";

export default function App() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const location = searchParams.get('location') || 'campus'; // รับ location จาก URL parameters
  const [configValid, setConfigValid] = useState(false);

  useEffect(() => {
    // Auto-redirect to ThaiD login after a short delay (only if no error and config is valid)
    if (!error && configValid) {
      const timer = setTimeout(() => {
        // ใช้ location จาก URL parameters แทนการ hardcode campus
        window.location.href = `/api/login?location=${location}`;
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [error, configValid, location]);

  const handleThaiDLogin = () => {
    // ใช้ location จาก URL parameters แทนการ hardcode campus
    window.location.href = `/api/login?location=${location}`;
  };

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'auth_failed':
        return 'การยืนยันตัวตนกับ ThaiD ล้มเหลว';
      case 'invalid_state':
        return 'การยืนยันตัวตนไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
      case 'no_code':
        return 'ไม่ได้รับรหัสยืนยันตัวตน';
      case 'token_exchange_failed':
        return 'การแลกเปลี่ยนรหัสยืนยันตัวตนล้มเหลว';
      case 'userinfo_failed':
        return 'ไม่สามารถดึงข้อมูลผู้ใช้ได้';
      case 'no_citizen_id':
        return 'ไม่พบเลขบัตรประชาชนในข้อมูล';
      case 'invalid_citizen_id':
        return 'รูปแบบเลขบัตรประชาชนไม่ถูกต้อง';
      case 'callback_error':
        return 'เกิดข้อผิดพลาดในการยืนยันตัวตน';
      case 'config_error':
        return 'การตั้งค่า ThaiD ไม่สมบูรณ์';
      case 'network_error':
        return 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย';
      default:
        return null;
    }
  };

  const errorMessage = getErrorMessage(error);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-200">
        <div className="text-center mb-6">
          <Image
            src="/img/ThaID.png"
            alt="ThaiD Logo"
            width={120}
            height={80}
            className="mx-auto mb-4"
          />
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            ยืนยันตัวตนด้วย ThaiD
          </h2>
          <p className="text-gray-600">
            {error ? 'เกิดข้อผิดพลาดในการยืนยันตัวตน' : 'ระบบจะนำท่านไปยังหน้าเข้าสู่ระบบของ ThaiD'}
          </p>
        </div>

        {/* ThaID Configuration Check */}
        <div className="mb-6">
          <ThaIDConfigCheck 
            onConfigValid={() => setConfigValid(true)}
            onConfigInvalid={() => setConfigValid(false)}
          />
        </div>

        <hr className="border-t-2 border-blue-200 mb-8" />

        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong className="font-bold">ข้อผิดพลาด: </strong>
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="text-center">
          {!error ? (
            <>
              {configValid ? (
                <>
                  <div className="mb-6">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">กำลังนำท่านไปยังหน้าเข้าสู่ระบบ...</p>
                  </div>
                  
                  <button
                    onClick={handleThaiDLogin}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
                  >
                    เข้าสู่ระบบด้วย ThaiD
                  </button>
                  
                  <p className="text-sm text-gray-500 mt-4">
                    หากไม่ถูกนำไปโดยอัตโนมัติ กรุณาคลิกปุ่มด้านบน
                  </p>
                </>
              ) : (
                <div className="mb-6">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <p className="text-gray-600">กรุณารอการตรวจสอบการตั้งค่า ThaID</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-gray-600">
                  {error === 'duplicate_citizen_id' 
                    ? 'ไม่สามารถลงทะเบียนได้ เนื่องจากเลขบัตรประชาชนนี้ได้ถูกลงทะเบียนแล้ว' 
                    : 'เกิดข้อผิดพลาดในการยืนยันตัวตน'
                  }
                </p>
              </div>
              
              <div className="space-y-3">
                {error !== 'duplicate_citizen_id' && (
                  <button
                    onClick={handleThaiDLogin}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
                  >
                    ลองใหม่อีกครั้ง
                  </button>
                )}
                
                <button
                  onClick={() => router.push('/')}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
                >
                  กลับหน้าหลัก
                </button>
              </div>
              
              <p className="text-sm text-gray-500 mt-4">
                {error === 'duplicate_citizen_id' 
                  ? 'หากต้องการความช่วยเหลือ กรุณาติดต่อผู้ดูแลระบบ'
                  : 'หากปัญหายังคงเกิดขึ้น กรุณาติดต่อผู้ดูแลระบบ'
                }
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
