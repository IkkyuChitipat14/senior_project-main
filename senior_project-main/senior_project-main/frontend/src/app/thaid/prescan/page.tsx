"use client";

import React, { useState } from "react";
import FaceScanComponent from "../../components/FaceScanComponent";
import Link from "next/link";

export default function RegisterFaceScanPage() {
  const [registerSuccess] = useState(false);
  const [message] = useState("");

  return (
    <div
      className="font-sans flex flex-col h-screen overflow-hidden relative"
      style={{ background: "radial-gradient(at center, #dc2626, #7f1d1d)" }}
    >
      {!registerSuccess ? (
        <FaceScanComponent mode="register" classifiedType="campus" />
      ) : (
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <h2 className="text-3xl font-bold text-green-700 mb-4">register success 🎉</h2>
          <p className="text-lg text-gray-700 mb-6">ลงทะเบียนใบหน้าสำเร็จ</p>
          <Link href="/">
            <button className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transition duration-300 ease-in-out">
              กลับหน้าหลัก
            </button>
          </Link>
        </div>
      )}
      {message && !registerSuccess && (
        <div className="mt-4 text-red-600 font-semibold">{message}</div>
      )}
    </div>
  );
} 