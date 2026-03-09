"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const LocationSelector: React.FC = () => {
  const externalURL = "https://p-auth-wifi.mfu.ac.th/";
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
  
    // Save mac from query to localStorage, if present
    try {
      const params = new URLSearchParams(window.location.search);
      const mac = params.get('mac');
      if (mac) {
        localStorage.setItem('mac', mac);
        console.log('[LocationSelector] Saved mac to localStorage =', mac);
      } else {
        const existing = localStorage.getItem('mac');
        console.log('[LocationSelector] No mac in query. Existing localStorage mac =', existing ?? '<none>');
      }
    } catch {}

    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    const ref = document.referrer || "";
  
    // ฟังก์ชันช่วยจำแนก
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
  
    // จับกลุ่ม Cisco ให้กว้างขึ้น
    const isCisco =
      /cisco|ciscotest|webex|anyconnect|umbrella|secureclient/i.test(ua) ||
      /cisco|ciscotest/i.test(navigator.appVersion || "");
  
    // iOS WebView มัก "ไม่มี Safari" ใน UA
    const isiOSWebView = isIOS && !/Safari/i.test(ua);
  
    // Android WebView เงื่อนไขยอดนิยม
    const isAndroidWebView =
      /;\s?wv\)/i.test(ua) ||                               // มี ; wv)
      (/Version\/\d+(\.\d+)?\sChrome\/\d+/i.test(ua) &&     // บาง WebView จะมี Version/x.x Chrome/xx
        !/Safari\/\d+/i.test(ua));                          // แต่ไม่มี Safari/xxxx
  
    // สัญญาณจากฟีเจอร์ฝั่ง JS
    const hasWebkitHandler = !!(window as any).webkit?.messageHandlers; // iOS WKWebView
    const hasRNWebView = !!(window as any).ReactNativeWebView;
  
    // referrer มาจาก in-app ยอดนิยม
    const referrerInApp = /(instagram|facebook|fb\.com|line|messenger|tiktok|twitter|x\.com|whatsapp|pinterest|snapchat|telegram|quora)/i.test(ref);
  
    // เบราว์เซอร์หลักที่ "เชื่อใจได้"
    const knownFullBrowsers = /(Chrome|CriOS|Firefox|FxiOS|Safari|Edg|EdgiOS|OPR|SamsungBrowser)/i;
    const isKnownFullBrowser = knownFullBrowsers.test(ua);
  
    const detected =
      isCisco ||
      isiOSWebView ||
      isAndroidWebView ||
      hasWebkitHandler ||
      hasRNWebView ||
      referrerInApp ||
      !isKnownFullBrowser;
  
    console.log("[LocationSelector] UA:", ua);
    console.log("[LocationSelector] Referrer:", ref);
    console.log("[LocationSelector] Detected In-App:", detected, {
      isCisco,
      isiOSWebView,
      isAndroidWebView,
      hasWebkitHandler,
      hasRNWebView,
      referrerInApp,
      isKnownFullBrowser,
    });
  
    setIsInAppBrowser(detected);
  }, []);
  

  return (
    <div
      className="font-sans flex items-center justify-center h-screen overflow-hidden"
      style={{
        background: "radial-gradient(at center, #dc2626, #7f1d1d)",
      }}
    >
      <div className="flex flex-col items-center justify-center py-4 px-4">
        {/* Title */}
        <h1 className="text-white text-3xl sm:text-4xl font-bold mb-8">
          เลือกสถานที่
        </h1>

        {/* In-app browser warning */}
        {isInAppBrowser && (
          <div
            className="mb-6 w-full max-w-md rounded-lg border border-yellow-400 bg-yellow-100 text-yellow-800 text-sm p-3"
            role="status"
            aria-live="polite"
          >
            ตรวจพบว่าเปิดผ่าน In-App Browser ของแอป แนะนำให้กดปุ่มด้านล่างเพื่อเปิดในเบราว์เซอร์หลัก (เช่น Chrome/Safari) เพื่อการทำงานที่สมบูรณ์
          </div>
        )}

        {/* Two Location Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md mb-6">
          <Link
            href="/campus"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-center text-lg transition-colors duration-200 shadow-lg"
          >
            Campus
          </Link>
          <Link
            href="/hospital"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-center text-lg transition-colors duration-200 shadow-lg"
          >
            Hospital
          </Link>
        </div>

        {/* Removed external browser button as requested */}
      </div>
    </div>
  );
};

export default LocationSelector;
