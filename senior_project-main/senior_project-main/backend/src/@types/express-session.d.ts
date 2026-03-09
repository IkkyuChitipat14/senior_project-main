import "express-session";
import { ThaIDUserInfo } from "../services/thaIDService";

declare module "express-session" {
  interface SessionData {
    citizenID?: string;
    faceEmbedding?: number[];
    userLevel?: number; // 1 = campus, 2 = hospital
    thaidVerified?: boolean;
    thaidUserInfo?: ThaIDUserInfo | {
      id?: string;
      name?: string;
      citizenId?: string;
      sub?: string;
      pid?: string;
      birthdate?: string;
      scope?: string;
      [key: string]: unknown;
    };
    // ThaID specific session data
    thaIDState?: string;
    thaIDAccessToken?: string;
    thaidLocation?: string; // 'campus' | 'hospital'
  }
}