'use client';

import React, { useEffect, useState } from 'react';

interface ThaIDConfig {
  clientId: string;
  redirectUri: string;
  authUrl: string;
}

interface ConfigCheckProps {
  onConfigValid?: () => void;
  onConfigInvalid?: () => void;
}

export default function ThaIDConfigCheck({ onConfigValid, onConfigInvalid }: ConfigCheckProps) {
  const [config, setConfig] = useState<ThaIDConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkThaIDConfig();
  }, []);

  const checkThaIDConfig = async () => {
    try {
      // ใช้ relative path เพราะ Nginx จะ proxy ให้
      const response = await fetch('/api/thaid-config');
      
      if (!response.ok) {
        throw new Error('Failed to fetch config');
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        setConfig(data.config);
        onConfigValid?.();
      } else {
        setError(data.message);
        onConfigInvalid?.();
      }
    } catch (error) {
      console.error('Config check error:', error);
      setError('ไม่สามารถตรวจสอบการตั้งค่าได้');
      onConfigInvalid?.();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span>กำลังตรวจสอบการตั้งค่า ThaID...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
        <strong>ข้อผิดพลาด: </strong>
        <span>{error}</span>
      </div>
    );
  }

  if (config) {
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-sm">
        <strong>✓ </strong>
        <span>การตั้งค่า ThaID สมบูรณ์</span>
      </div>
    );
  }

  return null;
}
