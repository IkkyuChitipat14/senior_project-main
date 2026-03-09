"use client";

import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export type FaceScanProps = {
  classifiedType: "campus" | "hospital";
  mode: "scan" | "register";
};

const FaceScanComponent = ({ classifiedType, mode }: FaceScanProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const isVerifyingRef = useRef<boolean>(false);
  const router = useRouter();
  const [citizenID, setCitizenID] = useState<string | null>(null);
  const [showScanSuccessModal, setShowScanSuccessModal] = useState(false);
  const [showRegisterSuccessModal, setShowRegisterSuccessModal] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("กำลังแสกนใบหน้า....");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [showDuplicateCitizenModal, setShowDuplicateCitizenModal] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState("");
  const [showFaceEmbeddingErrorModal, setShowFaceEmbeddingErrorModal] = useState(false);
  const [faceEmbeddingErrorMessage, setFaceEmbeddingErrorMessage] = useState("");
  const [showFaceDuplicateModal, setShowFaceDuplicateModal] = useState(false);
  const [faceDuplicateMessage, setFaceDuplicateMessage] = useState("");
  const maxAttempts = 40;
  const isLoadingModelsRef = useRef<boolean>(false);
  const modelLoadPromiseRef = useRef<Promise<void> | null>(null);
  const [videoKey, setVideoKey] = useState(0);
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = typeof navigator !== 'undefined' && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showInAppWarning, setShowInAppWarning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const searchParams = useSearchParams();

  // Persist mac from query into localStorage on first load/when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const macFromQuery = searchParams.get('mac');
    if (macFromQuery) {
      try {
        localStorage.setItem('mac', macFromQuery);
        console.log('[FRONTEND] saved mac to localStorage =', macFromQuery);
      } catch {}
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
  
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    const appVer = navigator.appVersion || "";
    const ref = document.referrer || "";
    const host = location.hostname || "";
  
    // เบื้องต้น
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    setIsAndroid(isAndroid);
  
    // --- Heuristics หลายชั้น ---
  
    // 1) จับ Cisco กว้างขึ้น + เผื่อกรณี proxy เปลี่ยน UA
    const isCiscoUA =
      /cisco|ciscotest|webex|anyconnect|umbrella|secureclient/i.test(ua) ||
      /cisco|ciscotest|webex/i.test(appVer);
  
    // 2) จับ iOS WebView: iOS แต่ไม่มี Safari ใน UA (in-app iOS มักตัด Safari ทิ้ง)
    const isiOSWebView = isIOS && !/Safari/i.test(ua);
  
    // 3) จับ Android WebView: ; wv) หรือ pattern ที่ไม่มี Safari
    const isAndroidWebView =
      /;\s?wv\)/i.test(ua) ||
      (/Version\/\d+(?:\.\d+)?\sChrome\/\d+/i.test(ua) && !/Safari\/\d+/i.test(ua));
  
    // 4) ฟีเจอร์เบส (เชื่อถือได้กว่าดู UA)
    const hasWKHandler = !!(window as any).webkit?.messageHandlers; // iOS WKWebView
    const hasRNWebView = !!(window as any).ReactNativeWebView;      // React Native WebView
  
    // 5) referrer มาจาก in-app ยอดนิยม
    const referrerInApp = /(instagram|facebook|fb\.com|line|messenger|tiktok|twitter|x\.com|whatsapp|pinterest|snapchat|telegram|quora)/i.test(ref);
  
    // 6) captive portal / sandbox ของ Cisco มักมีโฮสต์เฉพาะ
    const isCiscoHost = /(ciscotest|umbrella|anyconnect|webex)/i.test(host);
  
    // 7) ถ้าไม่ใช่เบราว์เซอร์หลักที่รู้จัก อาจเป็น in-app
    const knownFullBrowsers = /(Chrome|CriOS|Firefox|FxiOS|Safari|Edg|EdgiOS|OPR|SamsungBrowser)/i;
    const isKnownFullBrowser = knownFullBrowsers.test(ua);
  
    const detected =
      isCiscoUA ||
      isCiscoHost ||
      isiOSWebView ||
      isAndroidWebView ||
      hasWKHandler ||
      hasRNWebView ||
      referrerInApp ||
      !isKnownFullBrowser;
  
    // ดีบักให้เห็นว่าแมตช์เพราะอะไร
    console.log("[FaceScan] UA:", ua);
    console.log("[FaceScan] appVersion:", appVer);
    console.log("[FaceScan] host:", host);
    console.log("[FaceScan] referrer:", ref);
    console.log("[FaceScan] InApp?", detected, {
      isCiscoUA, isCiscoHost, isiOSWebView, isAndroidWebView,
      hasWKHandler, hasRNWebView, referrerInApp, isKnownFullBrowser,
    });
  
    setIsInAppBrowser(detected);
  }, []);

  const handleOpenExternal = (path: string) => {
    try {
      const origin = `${window.location.protocol}//${window.location.host}`;
      const absoluteUrl = path.startsWith("http") ? path : `${origin}${path}`;
      const url = new URL(absoluteUrl);
      const hostAndPath = `${url.host}${url.pathname}${url.search}${url.hash || ""}`;
  
      if (isAndroid) {
        // NOTE: ตั้ง package เป็น Chrome; fallback เป็นลิงค์ปกติ
        const intentUrl =
          `intent://${hostAndPath}` +
          `#Intent;scheme=${url.protocol.replace(":", "")};` +
          `package=com.android.chrome;` +
          `S.browser_fallback_url=${encodeURIComponent(absoluteUrl)};end`;
        window.location.href = intentUrl;
        return;
      }
  
      if (isIOS) {
        // iOS: ลองเปิด Chrome scheme ถ้ามี
        const chromeScheme = url.protocol === "https:" ? "googlechromes" : "googlechrome";
        const chromeUrl = `${chromeScheme}://${hostAndPath}`;
        const newWin = window.open(chromeUrl, "_blank");
        if (!newWin) {
          alert("กรุณาเปิดหน้านี้ใน Safari หรือใช้เมนู 'เปิดในเบราว์เซอร์' ของแอป");
        }
        return;
      }
  
      window.open(absoluteUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      window.open(path, "_blank", "noopener,noreferrer");
    }
  };

  // ✅ Enhanced Stop Camera Function with Safari-specific handling
  const stopCameraStream = () => {
    console.log("🛑 Stopping camera stream...", { isSafari, isIOS });
    
    // อัปเดตสถานะกล้อง
    setIsCameraActive(false);
    
    // หยุด tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        if (track.readyState === 'live') {
          track.stop();
          console.log("Track stopped:", track.kind, track.id);
        }
      });
      streamRef.current = null;
    }

    // ล้าง video element
    if (videoRef.current) {
      const video = videoRef.current;
      video.pause();
      video.srcObject = null;
      video.src = '';
      
      // Safari-specific cleanup
      if (isSafari) {
        try {
          // บังคับให้ Safari ปล่อยกล้องอย่างสมบูรณ์
          video.removeAttribute('src');
          video.removeAttribute('autoplay');
          video.removeAttribute('playsinline');
          video.removeAttribute('muted');
          video.removeAttribute('controls');
          video.removeAttribute('loop');
          
          // ล้าง event listeners ทั้งหมด
          video.onloadstart = null;
          video.onloadedmetadata = null;
          video.onloadeddata = null;
          video.oncanplay = null;
          video.oncanplaythrough = null;
          video.onplay = null;
          video.onpause = null;
          video.onended = null;
          video.onerror = null;
          
          // บังคับให้ video element รีเซ็ต
          video.load();
          
          // สร้าง video element ใหม่สำหรับ Safari
          const parent = video.parentNode;
          if (parent) {
            const newVideo = video.cloneNode(false) as HTMLVideoElement;
            parent.replaceChild(newVideo, video);
            videoRef.current = newVideo;
          }
          
          console.log("✅ Safari: Video element completely reset");
        } catch (e) {
          console.warn("Safari-specific cleanup error:", e);
        }
      } else {
        // บังคับให้ video element รีเซ็ต
        try {
          video.load();
          video.removeAttribute('src');
        } catch (e) {
          console.warn("Error during video cleanup:", e);
        }
      }
    }
    
    // Safari-specific: บังคับให้ปล่อยกล้องทั้งหมดในหน้า
    if (isSafari) {
      try {
        // หยุด video elements ทั้งหมดในหน้า
        const allVideos = document.querySelectorAll('video');
        allVideos.forEach(video => {
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            if (stream && stream.getTracks) {
              stream.getTracks().forEach(track => {
                if (track.readyState === 'live') {
                  track.stop();
                  console.log("Safari: Stopped additional track:", track.kind, track.id);
                }
              });
            }
            video.srcObject = null;
            video.src = '';
            video.pause();
            video.removeAttribute('src');
            video.removeAttribute('autoplay');
            video.removeAttribute('playsinline');
            video.removeAttribute('muted');
          }
        });
        
        // บังคับให้ Safari ปล่อยกล้องโดยการเรียก getUserMedia แล้วหยุดทันที
        setTimeout(() => {
          navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
              console.log("Safari: Force releasing camera...");
              stream.getTracks().forEach(track => track.stop());
            })
            .catch(() => {
              console.log("Safari: Camera already released or permission denied");
            });
        }, 100);
      } catch (e) {
        console.warn("Safari force release error:", e);
      }
    }
    
    // รีเซ็ต scan states
    resetScanStates();
  };

  // Reset scan state
  const resetScanStates = () => {
    setScanProgress(0);
    setScanStatus("กำลังแสกนใบหน้า....");
    setShowScanSuccessModal(false);
    setCitizenID(null);
    setShowDuplicateCitizenModal(false);
    setShowFaceEmbeddingErrorModal(false);
    setShowFaceDuplicateModal(false);
  };

  // Start new scan after camera is ready
  const startNewScan = () => {
    resetScanStates();
    setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState >= 3) {
        verifyFace();
      } else {
        setTimeout(() => {
          if (videoRef.current) {
            verifyFace();
          }
        }, 1000);
      }
    }, 800);
  };

  // ✅ Enhanced Navigate to Success Function with Safari handling
  const navigateToSuccess = (citizenID: string, mode: string, classifiedType: string) => {
    console.log("🚀 Navigating to success, stopping camera first...", { isSafari });
    
    // หยุดกล้องทันทีและรอให้หยุดสมบูรณ์
    stopCameraStream();
    
    // Safari ต้องการเวลานานกว่าในการปล่อยกล้อง
    const delay = isSafari ? 800 : 300;
    
    // รอให้กล้องหยุดสมบูรณ์แล้วค่อย navigate
    setTimeout(() => {
      console.log("✅ Camera stopped, navigating to success page");
      
      // Safari-specific: บังคับให้ปล่อยกล้องก่อน navigate
      if (isSafari) {
        try {
          // ล้าง video elements ทั้งหมดในหน้า
          const videos = document.querySelectorAll('video');
          videos.forEach(video => {
            video.pause();
            video.srcObject = null;
            video.src = '';
            video.removeAttribute('src');
            video.removeAttribute('autoplay');
            video.removeAttribute('playsinline');
            video.removeAttribute('muted');
          });
        } catch (e) {
          console.warn("Safari pre-navigation cleanup error:", e);
        }
      }
      
      router.push(`/success?citizenID=${citizenID}&mode=${mode}&classifiedType=${classifiedType}`);
    }, delay);
  };

  // ✅ Enhanced Reinitialize Camera with Safari handling
  const reinitializeCamera = async () => {
    if (isInitializingRef.current) {
      console.log("⏳ Camera already initializing, skipping...");
      return;
    }
    
    console.log("♻️ Reinitializing camera...", { isSafari });
    setScanStatus("กำลังเริ่มต้นกล้องใหม่...");
    
    // หยุดกล้องและรอให้หยุดสมบูรณ์
    stopCameraStream();
    
    // Safari ต้องการเวลานานกว่าในการปล่อยกล้อง
    const cleanupDelay = isSafari ? 1200 : 800;
    await new Promise((r) => setTimeout(r, cleanupDelay));
    
    // Force remount video element
    setVideoKey((k) => k + 1);
    
    // Safari ต้องการเวลานานกว่าในการสร้าง video element ใหม่
    const mountDelay = isSafari ? 500 : 300;
    await new Promise((r) => setTimeout(r, mountDelay));
    
    await initCamera();
  };

  // Component mount/unmount management
  useEffect(() => {
    initCamera();
    
    const handleBeforeUnload = () => {
      console.log("🚪 Before unload, stopping camera", { isSafari });
      stopCameraStream();
      
      // Safari-specific: บังคับให้ปล่อยกล้องก่อน unload
      if (isSafari) {
        try {
          navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
              stream.getTracks().forEach(track => track.stop());
            })
            .catch(() => {});
        } catch (e) {}
      }
    };
    
    const handlePopState = () => {
      console.log("🔙 Pop state, stopping camera", { isSafari });
      stopCameraStream();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      console.log("🧹 Component unmounting, cleaning up camera...", { isSafari });
      stopCameraStream();
      
      // Safari-specific: บังคับให้ปล่อยกล้องเมื่อ unmount
      if (isSafari) {
        setTimeout(() => {
          try {
            navigator.mediaDevices.getUserMedia({ video: true })
              .then(stream => {
                stream.getTracks().forEach(track => track.stop());
              })
              .catch(() => {});
          } catch (e) {}
        }, 50);
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isSafari]);

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (modelsLoaded && videoRef.current) {
      if (videoRef.current.readyState >= 3) {
        verifyFace();
      } else {
        const onCanPlay = () => {
          verifyFace();
          videoRef.current?.removeEventListener("canplay", onCanPlay);
        };
        videoRef.current.addEventListener("canplay", onCanPlay);
      }
    }
  }, [modelsLoaded]);

  // ✅ Enhanced Init Camera Function
  const initCamera = async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    
    try {
      setScanStatus("กำลังเริ่มต้นกล้อง...");
      
      // หยุดกล้องเก่าและรอให้หยุดสมบูรณ์
      stopCameraStream();
      await new Promise((resolve) => setTimeout(resolve, 300));

      const getStream = async (): Promise<MediaStream> => {
        try {
          return await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            },
          });
        } catch (e1) {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videos = devices.filter((d) => d.kind === 'videoinput');
            const front = videos.find((d) => /front|wide|ultra|trueDepth/i.test(d.label)) || videos[0];
            if (!front) throw e1;
            return await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                deviceId: { exact: front.deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            });
          } catch (e2) {
            return await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: { width: 640, height: 480 },
            });
          }
        }
      };

      const stream = await getStream();
      
      if (!stream || stream.getTracks().length === 0) {
        console.error("❌ ไม่พบ stream หลัง getUserMedia");
        setScanStatus("ไม่สามารถเข้าถึงกล้องได้");
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        // รอให้ video element พร้อม
        await new Promise(resolve => {
          if (videoRef.current) {
            const checkReady = () => {
              if (videoRef.current && document.contains(videoRef.current)) {
                resolve(void 0);
              } else {
                setTimeout(checkReady, 50);
              }
            };
            checkReady();
          } else {
            resolve(void 0);
          }
        });

        // ตั้งค่า attributes
        const video = videoRef.current;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.preload = 'auto';
        
        // กำหนด stream
        video.srcObject = stream;
        
        // รอให้ video load metadata
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video metadata timeout'));
          }, 5000);
          
          const onLoadedMetadata = () => {
            clearTimeout(timeout);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            resolve(void 0);
          };
          
          const onError = (e: any) => {
            clearTimeout(timeout);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            reject(e);
          };
          
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
          
          // ถ้า metadata โหลดแล้ว
          if (video.readyState >= 1) {
            onLoadedMetadata();
          }
        });
        
        // เล่น video
        try {
          await video.play();
        } catch (playError) {
          console.warn("Play rejected, trying again...", playError);
          // รอแล้วลองใหม่
          await new Promise(r => setTimeout(r, 500));
          try {
            await video.play();
          } catch (secondPlayError) {
            console.error("Failed to play video twice:", secondPlayError);
            throw secondPlayError;
          }
        }
        
        // ตรวจสอบว่า video กำลังเล่นจริง ๆ
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video not producing frames'));
          }, 3000);
          
          const checkFrames = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0 && !video.paused) {
              clearTimeout(timeout);
              resolve(void 0);
            } else {
              setTimeout(checkFrames, 100);
            }
          };
          checkFrames();
        });

        console.log("✅ Camera initialized successfully:", {
          width: video.videoWidth,
          height: video.videoHeight,
          readyState: video.readyState
        });

        // อัปเดตสถานะกล้อง
        setIsCameraActive(true);

        // Track recovery
        stream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            console.warn('Video track ended, restarting...');
            setIsCameraActive(false);
            setTimeout(() => reinitializeCamera(), 100);
          };
        });
        
        setScanStatus("กล้องพร้อมใช้งาน");
      }

    } catch (err) {
      console.error("Camera initialization failed:", err);
      setScanStatus("ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้อง");
      // แจ้งให้ผู้ใช้รีเฟรช
      setTimeout(() => {
        if (confirm("ไม่สามารถเปิดกล้องได้ ต้องการรีเฟรชหน้าเพื่อลองใหม่หรือไม่?")) {
          window.location.reload();
        }
      }, 2000);
    } finally {
      isInitializingRef.current = false;
    }
  };

  const loadModels = async (forceReload: boolean = false) => {
    const resolveModelBase = (): string => {
      try {
        // Use absolute path to avoid nested route issues in static export
        return `${window.location.protocol}//${window.location.host}/models`;
      } catch {
        return "/models";
      }
    };

    const withRetry = async <T,>(fn: () => Promise<T>, retries = 3, baseDelayMs = 400): Promise<T> => {
      let attempt = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          return await fn();
        } catch (error) {
          attempt += 1;
          if (attempt > retries) {
            throw error;
          }
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    };

    const MODEL_URL = resolveModelBase();
    try {
      if (modelsLoaded && !forceReload) return;
      if (isLoadingModelsRef.current && modelLoadPromiseRef.current) {
        await modelLoadPromiseRef.current;
        return;
      }
      isLoadingModelsRef.current = true;
      setModelsLoaded(false);
      setScanStatus("กำลังโหลดโมเดล AI...");

      // Select backend with safe fallbacks (skip wasm to avoid iOS stalling)
      try {
        // @ts-ignore faceapi bundles tf
        if (forceReload && faceapi.tf?.engine) {
          try { faceapi.tf.engine().reset(); } catch {}
          try { faceapi.tf.disposeVariables(); } catch {}
        }
        const selectBackend = async () => {
          try {
            // @ts-ignore
            await faceapi.tf.setBackend("webgl");
            // @ts-ignore
            await faceapi.tf.ready();
          } catch (e1) {
            // @ts-ignore
            await faceapi.tf.setBackend("cpu");
            // @ts-ignore
            await faceapi.tf.ready();
          }
        };
        await selectBackend();
      } catch {}

      const loadPromise = withRetry(async () => {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
      }, 2, 700);

      modelLoadPromiseRef.current = loadPromise;
      await loadPromise;

      setModelsLoaded(true);
      setScanStatus("โหลดโมเดลสำเร็จ กำลังเริ่มต้นกล้อง...");
    } catch (err) {
      console.error("Model loading failed:", err);
      setScanStatus("เกิดข้อผิดพลาดในการโหลดโมเดลใบหน้า");
    } finally {
      isLoadingModelsRef.current = false;
      modelLoadPromiseRef.current = null;
    }
  };

  const ensureModelsLoaded = async () => {
    if (!modelsLoaded) {
      await loadModels(false);
    }
  };

  // Basic capability and environment checks for default browser compatibility
  useEffect(() => {
    const issues: string[] = [];
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      issues.push("บราวเซอร์ไม่รองรับกล้อง (getUserMedia)");
    }
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        issues.push("ไม่รองรับ WebGL ซึ่งจำเป็นต่อการทำงานของโมเดล");
      }
    } catch {
      issues.push("ไม่สามารถตรวจสอบ WebGL ได้");
    }
    const isSecure = window.isSecureContext || location.hostname === "localhost";
    if (!isSecure) {
      issues.push("ต้องใช้งานผ่าน HTTPS เพื่อเข้าถึงกล้อง");
    }
    if (issues.length > 0) {
      console.warn("Compatibility issues:", issues.join(", "));
      setScanStatus(issues[0]);
    }
  }, []);

  // iOS/Safari lifecycle handling: free resources on background; reload deterministically on return
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        console.log("📱 Page hidden, stopping camera", { isSafari });
        stopCameraStream();
        
        // Safari-specific: บังคับให้ปล่อยกล้องเมื่อหน้า hidden
        if (isSafari) {
          setTimeout(() => {
            try {
              navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                  stream.getTracks().forEach(track => track.stop());
                })
                .catch(() => {});
            } catch (e) {}
          }, 100);
        }
      } else if (document.visibilityState === "visible") {
        console.log("📱 Page visible, reinitializing camera", { isSafari });
        ensureModelsLoaded().finally(() => {
          // Safari ต้องการเวลานานกว่าในการเริ่มต้นกล้องใหม่
          const delay = isSafari ? 800 : 200;
          setTimeout(() => { reinitializeCamera(); }, delay);
        });
      }
    };
    const onPageHide = () => {
      console.log("📱 Page hide, stopping camera", { isSafari });
      stopCameraStream();
      
      // Safari-specific: บังคับให้ปล่อยกล้องเมื่อ page hide
      if (isSafari) {
        setTimeout(() => {
          try {
            navigator.mediaDevices.getUserMedia({ video: true })
              .then(stream => {
                stream.getTracks().forEach(track => track.stop());
              })
              .catch(() => {});
          } catch (e) {}
        }, 50);
      }
    };
    const onPageShow = (e: PageTransitionEvent) => {
      // @ts-ignore
      if (e.persisted) {
        console.log("📱 Page show (persisted), reinitializing camera", { isSafari });
        ensureModelsLoaded().finally(() => {
          // Safari ต้องการเวลานานกว่าในการเริ่มต้นกล้องใหม่
          const delay = isSafari ? 1000 : 200;
          setTimeout(() => { reinitializeCamera(); }, delay);
        });
      }
    };
    
    // Safari-specific: เพิ่มการจัดการ focus/blur events
    const onFocus = () => {
      if (isSafari) {
        console.log("📱 Safari focus, checking camera state");
        setTimeout(() => {
          if (!isCameraActive) {
            reinitializeCamera();
          }
        }, 500);
      }
    };
    
    const onBlur = () => {
      if (isSafari) {
        console.log("📱 Safari blur, stopping camera");
        stopCameraStream();
        
        // Safari-specific: บังคับให้ปล่อยกล้องเมื่อ blur
        setTimeout(() => {
          try {
            navigator.mediaDevices.getUserMedia({ video: true })
              .then(stream => {
                stream.getTracks().forEach(track => track.stop());
              })
              .catch(() => {});
          } catch (e) {}
        }, 100);
      }
    };
    
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    
    // Safari-specific events
    if (isSafari) {
      window.addEventListener("focus", onFocus);
      window.addEventListener("blur", onBlur);
    }
    
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      
      if (isSafari) {
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("blur", onBlur);
      }
    };
  }, [isSafari, isCameraActive]);

  const captureImageFromVideo = () => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg");
  };

  const verifyFace = async () => {
    if (isVerifyingRef.current) return;
    isVerifyingRef.current = true;
    // Reset progress and status at the beginning of each scan
    setScanProgress(0);
    setScanStatus("กำลังตรวจสอบใบหน้า...");

    // Add a small delay to ensure camera is ready for new scans
    await new Promise((r) => setTimeout(r, 200));

    // Check if camera is ready
    if (!videoRef.current || videoRef.current.readyState < 3) {
      setScanStatus("กำลังรอให้กล้องพร้อมใช้งาน...");
      await new Promise((r) => setTimeout(r, 500));
      if (!videoRef.current || videoRef.current.readyState < 3) {
        setScanStatus("กล้องไม่พร้อมใช้งาน กรุณาลองใหม่");
        isVerifyingRef.current = false;
        return;
      }
    }

    let attempts = 0;
    let detection = null;
    let bestDetection = null;
    let bestScore = 0;

    while (!detection && attempts < maxAttempts) {
      if (!videoRef.current) break;

      detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({
          inputSize: 512,
          scoreThreshold: 0.5
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      attempts++;
      setScanProgress(Math.min(Math.floor((attempts / maxAttempts) * 100), 100));

      // เก็บการตรวจจับที่ดีที่สุด
      if (detection && detection.detection.score > bestScore) {
        bestDetection = detection;
        bestScore = detection.detection.score;
      }

      // หยุดถ้าพบใบหน้าที่มีคะแนนสูงพอ
      if (detection && detection.detection.score > 0.8) {
        detection = bestDetection;
        break;
      }

      await new Promise((r) => setTimeout(r, 200));
    }

    // ใช้การตรวจจับที่ดีที่สุดถ้าไม่พบใบหน้าที่มีคะแนนสูงพอ
    if (!detection && bestDetection) {
      detection = bestDetection;
    }

    if (!detection) {
      setScanStatus("ไม่พบใบหน้า โปรดลองใหม่");
      setScanProgress(0);
      // Add a delay before allowing retry
      setTimeout(() => {
        if (scanStatus === "ไม่พบใบหน้า โปรดลองใหม่") {
          setScanStatus("กำลังแสกนใบหน้า....");
        }
      }, 3000);
      isVerifyingRef.current = false;
      return;
    }

    const descriptorArray = Array.from(detection.descriptor);
    setScanProgress(100);
    setScanStatus(`กำลังส่งข้อมูลเพื่อยืนยัน... (ความแม่นยำ: ${Math.round(bestScore * 100)}%)`);

    // ดึง ภาพ snapshot
    const imageBase64 = captureImageFromVideo();

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      let response, result;
      let mac = searchParams.get("mac") || undefined;
      if (!mac && typeof window !== 'undefined') {
        try {
          mac = localStorage.getItem('mac') || undefined;
        } catch {}
      }
      if (typeof window !== 'undefined') {
        console.log('[FRONTEND] scan request mac (query/localStorage) =', mac ?? '<none>');
        console.log('[FRONTEND] backendUrl =', backendUrl);
      }
      
      if (mode === "scan") {
        response = await fetch(`${backendUrl}/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ faceEmbedding: descriptorArray, classifiedType, image: imageBase64, mac }),
        });
        result = await response.json();

        // เพิ่มการตรวจสอบว่า result.matched เป็น true และมี citizenID หรือไม่
        if (response.ok && result.matched && result.citizenID) {
          // Set citizenID before navigating
          setCitizenID(result.citizenID);
          // Use enhanced navigation function
          navigateToSuccess(result.citizenID, mode, classifiedType);
        } else {
          // แสดงข้อความว่าไม่พบข้อมูลใบหน้าในระบบ
          setScanStatus("ไม่พบข้อมูลใบหน้าในระบบ กรุณาลงทะเบียน");
          setShowScanSuccessModal(true);
        }
      } else if (mode === "register") {
        response = await fetch(`${backendUrl}/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ faceEmbedding: descriptorArray, image: imageBase64, mode: "register", citizenID, mac }),
        });
        result = await response.json();
        
        if (response.ok && result.matched) {
          // Set citizenID before navigating
          setCitizenID(result.citizenID);
          // Use enhanced navigation function
          navigateToSuccess(result.citizenID, mode, classifiedType);
        } else {
          setScanStatus(result.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
          // Show popup if duplicate citizenID error
          if (result.message && result.message.includes("เลขบัตรประชาชนนี้ได้ถูกลงทะเบียนแล้ว")) {
            setDuplicateMessage(result.message);
            setShowDuplicateCitizenModal(true);
          }
          // Show popup if faceEmbedding error
          else if (result.message && (result.message.includes("faceEmbedding") || result.message.includes("Missing or invalid faceEmbedding"))) {
            setFaceEmbeddingErrorMessage(result.message);
            setShowFaceEmbeddingErrorModal(true);
          }
          // Show popup if face duplicate error
          else if (result.message && result.message.includes("ใบหน้านี้ได้ถูกลงทะเบียนแล้ว")) {
            setFaceDuplicateMessage(result.message);
            setShowFaceDuplicateModal(true);
          }
          // Show general error modal for other cases
          else {
            setFaceEmbeddingErrorMessage(result.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
            setShowFaceEmbeddingErrorModal(true);
          }
        }
      }
    } catch (error) {
      console.error("Verification error:", error);
      setScanStatus("เกิดข้อผิดพลาดระหว่างตรวจสอบใบหน้า");
      // Show error modal for network or other errors
      setFaceEmbeddingErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง");
      setShowFaceEmbeddingErrorModal(true);
    }
    isVerifyingRef.current = false;
  };

  // ปรับ UI/ข้อความ/สี ตาม classifiedType และ mode ได้ที่นี่
  const scanTitle = mode === "scan"
    ? "ระบบยืนยันใบหน้า"
    : "ระบบลงทะเบียนใบหน้า";

  // Loader animation component
  const CameraLoader = () => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "2rem 0" }}>
      <div className="modern-loader">
        <div className="modern-loader-inner" />
      </div>
      <style jsx global>{`
        .modern-loader {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #dc2626 40%, #fbbf24 100%);
          border-radius: 50%;
          box-shadow: 0 4px 24px 0 rgba(220,38,38,0.15), 0 1.5px 6px 0 rgba(251,191,36,0.10);
          position: relative;
          margin-bottom: 18px;
        }
        .modern-loader-inner {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 4px solid #fff;
          border-top: 4px solid #dc2626;
          border-bottom: 4px solid #fbbf24;
          animation: modern-spin 1.1s cubic-bezier(.68,-0.55,.27,1.55) infinite;
          box-shadow: 0 0 16px 0 #fbbf24;
          background: rgba(255,255,255,0.15);
        }
        @keyframes modern-spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
        .modern-loader-text {
          color: #fff;
          font-weight: bold;
          font-size: 1.1rem;
          letter-spacing: 0.5px;
          text-shadow: 0 2px 8px rgba(220,38,38,0.18);
          animation: modern-fadein 1.2s ease-in;
        }
        @keyframes modern-fadein {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );

  return (
    // ---- พื้นหลังหลักและ Aurora Effect ----
    <div className="font-sans flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 relative overflow-hidden bg-slate-900">
      <style jsx global>{`
        .camera-container {
          width: 50vw;
          height: 50vw;
          max-width: 350px;
          max-height: 350px;
          min-width: 250px;
          min-height: 250px;
          background-color: black;
          border-radius: 50%;
          overflow: hidden;
          position: relative;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          border: 3px solid rgba(255, 255, 255, 0.2);
          aspect-ratio: 1 / 1;
        }
        
        .camera-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          aspect-ratio: 1 / 1;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          will-change: transform;
        }
        
        .progress-container {
          width: 40vw;
          max-width: 300px;
          height: 12px;
          background-color: rgba(255, 255, 255, 0.3);
          border-radius: 15px;
          overflow: hidden;
          margin-bottom: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #dc2626, #fbbf24);
          transition: width 0.3s ease-in-out;
          border-radius: 15px;
        }
        
        @media (max-width: 640px) {
          .camera-container {
            width: 60vw;
            height: 60vw;
            min-width: 200px;
            min-height: 200px;
          }
          
          .progress-container {
            width: 50vw;
            max-width: 250px;
          }
        }
        
        @media (min-width: 768px) {
          .camera-container {
            width: 45vw;
            height: 45vw;
            max-width: 400px;
            max-height: 400px;
          }
          
          .progress-container {
            width: 35vw;
            max-width: 350px;
          }
        }
      `}</style>

      {/* Aurora Background Blobs */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-25%] w-96 h-96 md:w-[500px] md:h-[500px] bg-red-600 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-25%] w-96 h-96 md:w-[500px] md:h-[500px] bg-rose-700 rounded-full filter blur-3xl opacity-40 animate-pulse animation-delay-4000"></div>
      </div>

      {/* ---- Main Content Card แบบ Glassmorphism ---- */}
      <div className="relative z-10 w-full max-w-md sm:max-w-lg bg-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/20 text-center flex flex-col items-center transform transition-all duration-500 hover:scale-[1.02] shadow-2xl">

        {/* Header - Moved inside the glassmorphism card */}
        <div className="flex items-center justify-between w-full px-4 py-3 border-b border-white/20 mb-4">
          <div className="flex items-center">
            <div className="text-lg font-medium text-white">{scanTitle}</div>
          </div>
          {/* Camera Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isCameraActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-sm text-white/80">
              {isCameraActive ? 'กล้องใช้งาน' : 'กล้องหยุด'}
            </span>
          </div>
        </div>

        {/* Main Content - Camera, Progress, Status */}
        <div className="flex-grow flex flex-col items-center justify-center p-2 sm:p-4 relative w-full">
          {/* Show loader while camera is loading */}
          {["กำลังเริ่มต้นกล้อง...", "กำลังโหลดโมเดล AI..."].includes(scanStatus) ? (
            <CameraLoader />
          ) : (
            <div className="camera-container">
              <video
                key={videoKey}
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video"
              ></video>
            </div>
          )}
          <div className="flex flex-col items-center justify-center text-white mt-4 w-full">
            <h4 className="text-lg sm:text-xl font-bold mb-2">{scanProgress}%</h4>
            <div className="progress-container">
              <div className="progress-fill" style={{ width: `${scanProgress}%` }} />
            </div>
            <p className="text-sm sm:text-base mt-3 px-4 text-center">{scanStatus}</p>
          </div>
        </div>
      </div>

      {/* All Modals remain outside the main content card */}
      
      {/* Register Success Modal */}
      {showRegisterSuccessModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center transform transition-transform duration-300 ease-in-out scale-100">
            <h3 className="text-2xl font-extrabold text-green-700 mb-4">ลงทะเบียนสำเร็จ!</h3>
            <p className="text-gray-600 mb-8">ลงทะเบียนสำเร็จ สามารถใช้งานระบบได้</p>
            <Link href="/">
              <button className="mt-6 px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transition duration-300 ease-in-out">
                กลับหน้าหลัก
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Scan Success Modal */}
      {showScanSuccessModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center transform transition-transform duration-300 ease-in-out scale-100">
            <h3 className="text-2xl font-extrabold text-green-700 mb-4">{scanStatus === 'ไม่พบข้อมูลใบหน้าในระบบ กรุณาลงทะเบียน' ? 'ไม่พบข้อมูลใบหน้าในระบบ' : 'ยืนยันใบหน้าสำเร็จ!'}</h3>
            <p className="text-gray-600 mb-6">
              {scanStatus === 'ไม่พบข้อมูลใบหน้าในระบบ กรุณาลงทะเบียน'
                ? 'กรุณาลงทะเบียนเพื่อใช้งานระบบ'
                : 'หมายเลขบัตรประชาชนของคุณคือ:'}
            </p>
            {scanStatus === 'ไม่พบข้อมูลใบหน้าในระบบ กรุณาลงทะเบียน' ? (
              <>
                <button
                  type="button"
                  className="inline-block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-bold shadow-lg transition flex items-center justify-center gap-2"
                  onClick={(e) => {
                    const targetPath = `/thaid?location=${classifiedType}`;
                    if (isInAppBrowser) {
                      e.preventDefault();
                      setShowInAppWarning(true);
                    } else {
                      router.push(targetPath);
                    }
                  }}
                >
                  <Image src="/img/ThaID.png" alt="ThaID Logo" width={40} height={40} className="w-6 h-6 mr-2 inline-block" />
                  ไปลงทะเบียน
                </button>
                <button
                  type="button"
                  className="w-full mt-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-white font-bold shadow-lg transition"
                  onClick={() => {
                    setShowScanSuccessModal(false);
                    setTimeout(() => {
                      startNewScan();
                    }, 500);
                  }}
                >
                  สแกนใหม่อีกครั้ง
                </button>
                <Link href="/">
                  <button
                    type="button"
                    className="mt-4 px-4 py-2 text-gray-600 hover:text-gray-900 underline transition"
                    onClick={() => {
                      setShowScanSuccessModal(false);
                      stopCameraStream();
                    }}
                  >
                    ยกเลิก
                  </button>
                </Link>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold text-blue-800 mb-8 break-words">{citizenID || "ไม่พบข้อมูล"}</p>
                <Link href="/">
                  <button
                    className="mt-6 px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transition duration-300 ease-in-out"
                    onClick={() => stopCameraStream()}
                  >
                    กลับหน้าหลัก
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Duplicate CitizenID Modal */}
      {showDuplicateCitizenModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center">
            <h3 className="text-2xl font-bold text-red-700 mb-4">ลงทะเบียนไม่สำเร็จ</h3>
            <p className="text-gray-700 mb-6">{duplicateMessage}</p>
            <button
              className="mt-4 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition duration-200"
              onClick={() => {
                stopCameraStream();
                router.push('/');
              }}
            >
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      )}

      {/* FaceEmbedding Error Modal */}
      {showFaceEmbeddingErrorModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center">
            <h3 className="text-2xl font-bold text-red-700 mb-4">เกิดข้อผิดพลาด</h3>
            <p className="text-gray-700 mb-6">{faceEmbeddingErrorMessage}</p>
            <button
              className="mt-4 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition duration-200"
              onClick={() => {
                stopCameraStream();
                router.push('/');
              }}
            >
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      )}

      {/* Face Duplicate Error Modal */}
      {showFaceDuplicateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center">
            <h3 className="text-2xl font-bold text-red-700 mb-4">ลงทะเบียนไม่สำเร็จ</h3>
            <p className="text-gray-700 mb-6">{faceDuplicateMessage}</p>
            <button
              className="mt-4 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition duration-200"
              onClick={() => {
                stopCameraStream();
                router.push('/');
              }}
            >
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      )}

      {/* In-App Browser Warning Modal */}
      {showInAppWarning && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center">
            <h3 className="text-2xl font-bold text-yellow-600 mb-4">ตรวจพบ In-App Browser</h3>
            <p className="text-gray-700 mb-6">กรุณาเปิดหน้านี้ด้วยเบราว์เซอร์หลัก (เช่น Chrome หรือ Safari) เพื่อทำการลงทะเบียน</p>
            <div className="flex flex-col gap-2">
              <button
                className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg shadow-lg hover:bg-yellow-600 transition duration-200"
                onClick={() => {
                  setShowInAppWarning(false);
                  handleOpenExternal(`/thaid?location=${classifiedType}`);
                }}
              >
                เปิดในเบราว์เซอร์หลัก
              </button>
              <button
                className="px-6 py-2 text-gray-600 hover:text-gray-900 underline transition"
                onClick={() => setShowInAppWarning(false)}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceScanComponent;