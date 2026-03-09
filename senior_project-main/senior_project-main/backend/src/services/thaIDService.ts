import axios from 'axios';

export interface ThaIDConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  introspectUrl: string;
  revokeUrl: string;
}

export interface ThaIDTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

export interface ThaIDUserInfo {
  sub: string;
  pid: string;
  name: string;
  birthdate?: string;
  scope: string;
}

export interface ThaIDIntrospectResponse {
  active: boolean;
  sub?: string;
  scope?: string;
}

export class ThaIDService {
  private config: ThaIDConfig;

  constructor() {
    this.config = {
      clientId: process.env.THAID_CLIENT_ID || process.env.NEXT_PUBLIC_THAID_CLIENT_ID || '',
      clientSecret: process.env.THAID_CLIENT_SECRET || process.env.NEXT_PUBLIC_THAID_CLIENT_SECRET || '',
      redirectUri: process.env.THAID_CALLBACK_URL || process.env.NEXT_PUBLIC_THAID_CALLBACK_URL || '',
      authUrl: 'https://imauth.bora.dopa.go.th/api/v2/oauth2/auth/',
      tokenUrl: 'https://imauth.bora.dopa.go.th/api/v2/oauth2/token/',
      introspectUrl: 'https://imauth.bora.dopa.go.th/api/v2/oauth2/introspect/',
      revokeUrl: 'https://imauth.bora.dopa.go.th/api/v2/oauth2/revoke/'
    };
  }

  /**
   * สร้าง Authorization URL สำหรับ OAuth2 flow
   */
  generateAuthUrl(state: string, scope: string = 'pid'): string {
    console.log('Generating auth URL with config:', {
      clientId: this.config.clientId,
      redirectUri: this.config.redirectUri,
      scope: scope,
      state: state
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: scope,
      state: state
    });

    const authUrl = `${this.config.authUrl}?${params.toString()}`;
    console.log('Generated auth URL:', authUrl);
    return authUrl;
  }

  /**
   * แลกเปลี่ยน Authorization Code เป็น Access Token
   */
  async exchangeCodeForToken(code: string): Promise<ThaIDTokenResponse> {
    try {
      const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      console.log('Token exchange debug:', {
        clientId: this.config.clientId,
        clientSecretLength: this.config.clientSecret?.length || 0,
        redirectUri: this.config.redirectUri,
        tokenUrl: this.config.tokenUrl,
        credentialsLength: credentials.length
      });
      
      const formData = new URLSearchParams();
      formData.append('grant_type', 'authorization_code');
      formData.append('code', code);
      formData.append('redirect_uri', this.config.redirectUri);
      
      console.log('Form data:', formData.toString());
      
      const response = await axios.post<ThaIDTokenResponse>(this.config.tokenUrl, formData, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Token exchange error:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * ตรวจสอบ Access Token
   */
  async introspectToken(token: string): Promise<ThaIDIntrospectResponse> {
    try {
      const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      const formData = new URLSearchParams();
      formData.append('token', token);
      
      const response = await axios.post<ThaIDIntrospectResponse>(this.config.introspectUrl, formData, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Token introspection error:', error);
      throw new Error('Failed to introspect token');
    }
  }

  /**
   * ยกเลิก Access Token
   */
  async revokeToken(token: string): Promise<{ status: string; message: string }> {
    try {
      const formData = new URLSearchParams();
      formData.append('token', token);
      
      const response = await axios.post<{ status: string; message: string }>(this.config.revokeUrl, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Token revocation error:', error);
      throw new Error('Failed to revoke token');
    }
  }

  /**
   * ดึงข้อมูลผู้ใช้จาก ID Token (ถ้ามี)
   */
  parseUserInfoFromToken(idToken: string): ThaIDUserInfo | null {
    try {
      // ในกรณีจริงควรใช้ JWT library เพื่อ verify signature
      const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
      
      return {
        sub: payload.sub,
        pid: payload.pid,
        name: payload.name,
        birthdate: payload.birthdate,
        scope: payload.scope
      };
    } catch (error) {
      console.error('Failed to parse ID token:', error);
      return null;
    }
  }

  /**
   * ตรวจสอบการตั้งค่า
   */
  validateConfig(): boolean {
    return !!(this.config.clientId && this.config.clientSecret && this.config.redirectUri);
  }

  /**
   * รับการตั้งค่า
   */
  getConfig(): ThaIDConfig {
    return { ...this.config };
  }
}
