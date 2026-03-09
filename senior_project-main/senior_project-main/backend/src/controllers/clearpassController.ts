import { Request, Response } from "express";
import { allowInternetForMac } from "../services/clearpassService";

const CLEARPASS_BASE_URL = "https://clearpass.mfu.ac.th:443/api";

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const clearpassAllowInternet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mac } = req.body as { mac?: string };
    if (!mac) {
      res.status(400).json({ error: "Missing 'mac' in request body" });
      return;
    }
    const result = await allowInternetForMac(mac, 1);
    res.status(200).json(result ?? { ok: true });
    return;
  } catch (err: any) {
    const status = err?.status ?? 500;
    const message = err?.message ?? "Internal Server Error";
    res.status(status).json({ error: message });
    return;
  }
};


