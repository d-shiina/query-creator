import { contextBridge } from 'electron';
import * as https from 'https';
import { KintoneAuth } from '../../../types/kintone';

// CORS対策：preload内でNode.jsのhttpsモジュールを使用してHTTPリクエストを実行
function makeKintoneRequest(auth: KintoneAuth, endpoint: string, method: string = 'GET', data?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const hostname = `${auth.subdomain}.cybozu.com`;
    const path = `/k/v1/${endpoint}`;
    
    // パスワード認証用のBase64エンコード
    const authString = `${auth.username}:${auth.password}`;
    const credentials = Buffer.from(authString, 'utf8').toString('base64');
    
    console.log('Preload: Making Kintone request to:', `https://${hostname}${path}`);
    console.log('Preload: Auth credentials (Base64):', credentials);
    
    // ヘッダーの設定：GETリクエストは認証のみ、POSTリクエストは追加のヘッダーも含める
    const headers: Record<string, string> = {
      'X-Cybozu-Authorization': credentials,
    };
    
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      headers['Accept'] = 'application/json';
      headers['User-Agent'] = 'KintoneQueryCreator/1.0';
    }
    
    const options = {
      hostname,
      path,
      method,
      headers,
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      console.log('Preload: Response status:', res.statusCode);
      console.log('Preload: Response headers:', res.headers);
      
      res.on('data', (chunk) => {
        responseData += chunk.toString();
      });
      
      res.on('end', () => {
        console.log('Preload: Response body:', responseData);
        
        const result = {
          ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
          status: res.statusCode || 0,
          statusText: res.statusMessage || '',
          data: responseData,
          json: () => {
            try {
              return JSON.parse(responseData);
            } catch (error) {
              throw new Error('Invalid JSON response');
            }
          },
          text: () => responseData
        };
        
        resolve(result);
      });
    });
    
    req.on('error', (error) => {
      console.error('Preload: Request error:', error);
      reject(error);
    });
    
    if (data && method !== 'GET') {
      const bodyData = JSON.stringify(data);
      console.log('Preload: Request body:', bodyData);
      req.write(bodyData);
    }
    
    req.end();
  });
}

export function exposeKintoneAPI() {
  contextBridge.exposeInMainWorld('kintoneAPI', {
    login: async (auth: KintoneAuth) => {
      try {
        console.log('Preload: Starting login process');
        const response = await makeKintoneRequest(auth, 'apps.json?limit=1');
        
        if (!response.ok) {
          const errorData = response.json();
          return {
            success: false,
            error: `認証失敗 - ${errorData.message || `${response.status} ${response.statusText}`}`
          };
        }
        
        const responseData = response.json();
        console.log('Preload: Login successful, apps found:', responseData.apps?.length || 0);
        
        return { success: true };
      } catch (error) {
        console.error('Preload: Login error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'ネットワークエラーが発生しました'
        };
      }
    },
    
    getApps: async (auth: KintoneAuth) => {
      try {
        const response = await makeKintoneRequest(auth, 'apps.json');
        
        if (!response.ok) {
          const errorData = response.json();
          return {
            success: false,
            error: errorData.message || `${response.status} ${response.statusText}`
          };
        }
        
        const responseData = response.json();
        const apps = responseData.apps.map((app: any) => ({
          appId: app.appId,
          name: app.name,
          description: app.description || '',
        }));
        
        return { success: true, data: apps };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'アプリ一覧の取得に失敗しました'
        };
      }
    },
    
    getAppFields: async (auth: KintoneAuth, appId: string) => {
      try {
        const response = await makeKintoneRequest(auth, `app/form/fields.json?app=${appId}`);
        
        if (!response.ok) {
          const errorData = response.json();
          return {
            success: false,
            error: errorData.message || `${response.status} ${response.statusText}`
          };
        }
        
        const responseData = response.json();
        const fields = Object.entries(responseData.properties).map(([code, field]: [string, any]) => ({
          code,
          label: field.label,
          type: field.type,
        }));
        
        return { success: true, data: fields };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'フィールド一覧の取得に失敗しました'
        };
      }
    },
    
    executeQuery: async (auth: KintoneAuth, appId: string, query: string) => {
      try {
        const queryParams = new URLSearchParams({
          app: appId,
          query: query,
          totalCount: 'true'
        });
        
        const response = await makeKintoneRequest(auth, `records.json?${queryParams.toString()}`);
        
        if (!response.ok) {
          const errorData = response.json();
          return {
            success: false,
            error: errorData.message || `${response.status} ${response.statusText}`
          };
        }
        
        const responseData = response.json();
        return {
          success: true,
          data: {
            records: responseData.records,
            totalCount: responseData.totalCount
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'クエリの実行に失敗しました'
        };
      }
    },
  });
}
