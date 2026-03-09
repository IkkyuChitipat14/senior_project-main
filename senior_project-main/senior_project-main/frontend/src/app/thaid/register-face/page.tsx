"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function RegisterFacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("กำลังเตรียมการลงทะเบียน...");

  useEffect(() => {
    const run = async () => {
      try {
        const citizenID = searchParams.get("citizenID");
        if (!citizenID) {
          setError("ไม่พบ citizenID จาก ThaiD");
          return;
        }

        // 1) ส่ง citizenID ไป backend เพื่อบันทึกใน session
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const resp = await fetch(`${backendUrl}/thaid-callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ citizenID }),
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          setError(data?.message || "บันทึกข้อมูล ThaiD ไม่สำเร็จ");
          return;
        }

        setStatus("บันทึกข้อมูล ThaiD สำเร็จ กำลังนำไปสแกนเพื่อบันทึกใบหน้า...");

        // 2) ดึง user level จาก backend เพื่อเลือกเส้นทาง location
        const levelResp = await fetch(`${backendUrl}/level`, {
          method: "GET",
          credentials: "include",
        });
        const levelData = await levelResp.json().catch(() => ({}));
        const location = levelData?.location === "hospital" ? "hospital" : "campus";

        // 3) นำผู้ใช้ไปหน้า scan โหมด register ตาม location
        router.replace(`/${location}/scan/face/register`);
      } catch (e: any) {
        setError(e?.message || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ");
      }
    };
    run();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="bg-white/10 p-6 rounded-xl border border-white/20 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-3">เกิดข้อผิดพลาด</h2>
          <p className="text-gray-200 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="bg-white/10 p-6 rounded-xl border border-white/20 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-400 mx-auto mb-4"></div>
        <p>{status}</p>
      </div>
    </div>
  );
}


