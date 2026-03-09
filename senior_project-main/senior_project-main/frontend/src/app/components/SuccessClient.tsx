// เพิ่มการจัดการ cleanup ในหน้า SuccessClient.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const SuccessClient = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  
  // Detect Safari
  const isSafari = typeof navigator !== 'undefined' && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  // Robust param extraction
  const citizenID = searchParams.get("citizenID") || "";
  const modeParam = searchParams.get("mode");
  const classifiedTypeParam = searchParams.get("classifiedType");

  const mode = modeParam === "register" ? "register" : modeParam === "scan" ? "scan" : null;
  const classifiedType = classifiedTypeParam === "hospital" ? "hospital" : "campus";

  const [paramError, setParamError] = useState<string | null>(null);

  // ✅ Enhanced Camera Cleanup Function with Safari handling
  useEffect(() => {
    const cleanupAnyRemainingCamera = () => {
      try {
        console.log("🧹 Success page: Starting camera cleanup...", { isSafari });
        
        // หยุด video elements ทั้งหมดในหน้า
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            if (stream && stream.getTracks) {
              stream.getTracks().forEach(track => {
                if (track.readyState === 'live') {
                  track.stop();
                  console.log("Stopped track:", track.kind, track.id);
                }
              });
            }
            video.srcObject = null;
            video.src = '';
            video.pause();
          }
        });

        // Safari-specific cleanup
        if (isSafari) {
          const allVideos = document.querySelectorAll('video');
          allVideos.forEach(video => {
            video.pause();
            video.srcObject = null;
            video.src = '';
            video.removeAttribute('src');
            video.removeAttribute('autoplay');
            video.removeAttribute('playsinline');
            video.removeAttribute('muted');
            
            // Safari: ลบ video element และสร้างใหม่
            const parent = video.parentNode;
            if (parent) {
              const newVideo = video.cloneNode(false) as HTMLVideoElement;
              parent.replaceChild(newVideo, video);
            }
          });
        } else {
          // ล้าง video elements ที่อาจมี srcObject ค้างอยู่
          const allVideos = document.querySelectorAll('video');
          allVideos.forEach(video => {
            video.pause();
            video.srcObject = null;
            video.src = '';
            video.load();
          });
        }

        console.log("✅ Success page: Camera cleanup completed");
      } catch (error) {
        console.warn("Warning during camera cleanup:", error);
      }
    };

    // ทำ cleanup ทันทีเมื่อเข้าหน้า
    cleanupAnyRemainingCamera();

    // Cleanup เมื่อออกจากหน้า
    const handleBeforeUnload = () => {
      cleanupAnyRemainingCamera();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cleanupAnyRemainingCamera();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cleanupAnyRemainingCamera();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!citizenID) {
      setParamError("ไม่พบหมายเลขบัตรประชาชน (citizenID)");
    } else if (!mode) {
      setParamError("โหมด (mode) ไม่ถูกต้อง");
    } else {
      setParamError(null);
    }
  }, [citizenID, mode]);

  const handleLogout = async () => {
    try {
      console.log("🚪 Starting logout process...", { isSafari });
      
      // ทำ cleanup กล้องก่อน logout (ใช้วิธีที่ปลอดภัย)
      try {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            if (stream && stream.getTracks) {
              stream.getTracks().forEach(track => {
                if (track.readyState === 'live') {
                  track.stop();
                  console.log("Logout: Stopped track:", track.kind, track.id);
                }
              });
            }
            video.srcObject = null;
            video.src = '';
            video.pause();
          }
        });
        
        // Safari-specific logout cleanup
        if (isSafari) {
          const allVideos = document.querySelectorAll('video');
          allVideos.forEach(video => {
            video.pause();
            video.srcObject = null;
            video.src = '';
            video.removeAttribute('src');
            video.removeAttribute('autoplay');
            video.removeAttribute('playsinline');
            video.removeAttribute('muted');
            
            // Safari: ลบ video element และสร้างใหม่
            const parent = video.parentNode;
            if (parent) {
              const newVideo = video.cloneNode(false) as HTMLVideoElement;
              parent.replaceChild(newVideo, video);
            }
          });
        }
        
        console.log("✅ Logout: Camera cleanup completed");
      } catch (e) {
        console.warn("Warning during logout camera cleanup:", e);
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      await fetch(`${backendUrl}/logout`, {
        method: "POST",
        credentials: "include",
      });
      
      console.log("✅ Logout successful, redirecting...");
      setIsLoggedOut(true);
      
      // Safari ต้องการเวลานานกว่าในการ redirect
      const redirectDelay = isSafari ? 3000 : 2000;
      setTimeout(() => {
        router.push("/");
      }, redirectDelay);
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggedOut(true);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    }
  };

  // Rest of the component remains the same...
  if (paramError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="bg-white/10 p-8 rounded-2xl shadow-xl text-center border border-red-400/40">
          <h2 className="text-2xl font-bold text-red-600 mb-4">เกิดข้อผิดพลาด</h2>
          <p className="text-red-400 mb-6">{paramError}</p>
          <Link href="/">
            <button 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:bg-blue-700 transition"
              onClick={() => {
                // ทำ cleanup กล้องก่อนกลับหน้าหลัก
                try {
                  const videos = document.querySelectorAll('video');
                  videos.forEach(video => {
                    if (video.srcObject) {
                      const stream = video.srcObject as MediaStream;
                      if (stream && stream.getTracks) {
                        stream.getTracks().forEach(track => track.stop());
                      }
                      video.srcObject = null;
                      video.src = '';
                      video.pause();
                    }
                  });
                } catch (e) {}
              }}
            >
              กลับหน้าหลัก
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoggedOut) {
    return (
      <div className="font-sans flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-20%] left-[-25%] w-96 h-96 md:w-[500px] md:h-[500px] bg-blue-600 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute bottom-[-20%] right-[-25%] w-96 h-96 md:w-[500px] md:h-[500px] bg-indigo-700 rounded-full filter blur-3xl opacity-40 animate-pulse animation-delay-4000"></div>
        </div>
        <div className="relative z-10 w-full max-w-sm bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 text-center">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <div className="text-white">
            <h2 className="text-2xl font-bold mb-4">ออกจากระบบสำเร็จ</h2>
            <p className="text-gray-300">ขอบคุณที่ใช้งานระบบ</p>
            <div className="mt-4">
              <div className="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-400 mt-2">กำลังกลับไปยังหน้าหลัก...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const systemLabel = classifiedType === "hospital" ? "โรงพยาบาล" : "มหาวิทยาลัย";

  return (
    <div className="font-sans flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden bg-slate-900">
      {/* Aurora Background Blobs */}
      <div className="absolute inset-0 z-0">
        <div className={`absolute top-[-20%] left-[-25%] w-96 h-96 md:w-[500px] md:h-[500px] ${classifiedType === "hospital" ? "bg-blue-600" : "bg-green-600"} rounded-full filter blur-3xl opacity-30 animate-pulse`}></div>
        <div className={`absolute bottom-[-20%] right-[-25%] w-96 h-96 md:w-[500px] md:h-[500px] ${classifiedType === "hospital" ? "bg-indigo-700" : "bg-emerald-700"} rounded-full filter blur-3xl opacity-40 animate-pulse animation-delay-4000`}></div>
      </div>
      
      {/* Main Content Card */}
      <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 text-center">
        {/* Header */}
        <div className="mb-6">
          <div className={`w-20 h-20 ${classifiedType === "hospital" ? "bg-blue-500" : "bg-green-500"} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {mode === "register" ? `ลงทะเบียนสำเร็จ (${systemLabel})` : `ยืนยันใบหน้าสำเร็จ (${systemLabel})`}
          </h1>
          <p className={`${classifiedType === "hospital" ? "text-blue-300" : "text-green-300"} text-lg`}>🎉 ยินดีต้อนรับสู่ระบบ{systemLabel}</p>
          <p className="text-gray-300 mt-2">WiFi ฟรี 1 ชั่วโมง</p>
        </div>
        
        {/* Citizen ID Display */}
        {citizenID && (
          <div className="bg-white/10 rounded-xl p-4 mb-6">
            <p className="text-gray-300 text-sm mb-2">หมายเลขบัตรประชาชน</p>
            <p className="text-white font-mono text-lg break-all">{citizenID}</p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className={`w-full px-6 py-3 ${classifiedType === "hospital" ? "bg-yellow-600 hover:bg-yellow-700" : "bg-red-600 hover:bg-red-700"} text-white font-bold rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105`}
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessClient;