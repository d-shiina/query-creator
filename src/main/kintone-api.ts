import { ipcMain, net } from 'electron';
import { KintoneAuth, KintoneApp, KintoneField } from '../types/kintone';

// Kintone API呼び出し用のヘルパー関数（CORS回避のためElectronのnetモジュールを使用）
async function makeKintoneRequest(auth: KintoneAuth, endpoint: string, method: string = 'GET', data?: any) {
  const baseUrl = `https://${auth.subdomain}.cybozu.com`;
  const url = `${baseUrl}/k/v1/${endpoint}`;
  
  // パスワード認証用のBase64エンコード
  const authString = `${auth.username}:${auth.password}`;
  const credentials = Buffer.from(authString, 'utf8').toString('base64');
  
  console.log('Making Kintone request to:', url);
  console.log('Auth string (before base64):', authString);
  console.log('Auth credentials (Base64):', credentials);
  console.log('Request method:', method);

  return new Promise<any>((resolve, reject) => {
    // Kintoneの認証では、ヘッダー名とContent-Typeが重要
    const headers: Record<string, string> = {
      'X-Cybozu-Authorization': credentials,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'KintoneQueryCreator/1.0',
      // 一部のKintone環境ではこのヘッダーも必要な場合があります
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    console.log('Request headers:', headers);

    const request = net.request({
      method,
      url: url,
      headers
    });

    let responseData = '';

    request.on('response', (response) => {
      console.log('Response status:', response.statusCode);
      console.log('Response headers:', response.headers);

      response.on('data', (chunk) => {
        responseData += chunk.toString();
      });

      response.on('end', () => {
        console.log('Response body:', responseData);
        
        const result = {
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          statusText: response.statusMessage || '',
          json: () => {
            try {
              return Promise.resolve(JSON.parse(responseData));
            } catch (error) {
              return Promise.reject(new Error('Invalid JSON response'));
            }
          },
          text: () => Promise.resolve(responseData),
          headers: {
            get: (name: string) => response.headers[name.toLowerCase()]
          }
        };
        
        resolve(result);
      });
    });

    request.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    if (data && method !== 'GET') {
      const bodyData = JSON.stringify(data);
      console.log('Request body:', bodyData);
      request.write(bodyData);
    }

    request.end();
  });
}

// IPC handlers
export function setupKintoneAPI() {
  // ログイン認証（複数の認証方法を試行）
  ipcMain.handle('kintone:login', async (event, auth: KintoneAuth) => {
    try {
      console.log('=== Kintone Login Attempt (Using Electron net module) ===');
      console.log('Subdomain:', auth.subdomain);
      console.log('Username:', auth.username);
      console.log('Password length:', auth.password.length);
      
      // まず標準の認証を試行
      let response = await makeKintoneRequest(auth, 'apps.json?limit=1');
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('=== First attempt failed ===');
        console.error('Status:', response.status);
        console.error('Error Response:', errorText);
        
        // CB_IL02エラーの場合、別の認証形式を試す
        if (errorText.includes('CB_IL02')) {
          console.log('=== Trying alternative authentication methods ===');
          
          try {
            // 方法1: Basic認証も併用
            console.log('Trying with Basic + X-Cybozu-Authorization headers...');
            const basicAuth = Buffer.from(`${auth.username}:${auth.password}`, 'utf8').toString('base64');
            
            const altRequest = net.request({
              method: 'GET',
              url: `https://${auth.subdomain}.cybozu.com/k/v1/apps.json?limit=1`,
              headers: {
                'Authorization': `Basic ${basicAuth}`,
                'X-Cybozu-Authorization': basicAuth,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'KintoneQueryCreator/1.0',
              }
            });
            
            const altResponse = await new Promise<any>((resolve, reject) => {
              let altResponseData = '';
              
              altRequest.on('response', (altResp) => {
                altResp.on('data', (chunk) => {
                  altResponseData += chunk.toString();
                });
                
                altResp.on('end', () => {
                  resolve({
                    ok: altResp.statusCode >= 200 && altResp.statusCode < 300,
                    status: altResp.statusCode,
                    json: () => Promise.resolve(JSON.parse(altResponseData)),
                    text: () => Promise.resolve(altResponseData)
                  });
                });
              });
              
              altRequest.on('error', reject);
              altRequest.end();
            });
            
            console.log('Alternative method status:', altResponse.status);
            
            if (altResponse.ok) {
              const altData = await altResponse.json();
              console.log('=== Alternative method successful ===');
              console.log('Apps found:', altData.apps?.length || 0);
              return { success: true };
            }
            
          } catch (altError) {
            console.error('Alternative method failed:', altError);
          }
          
          // 方法2: URLエンコードされた認証文字列を試す
          try {
            console.log('Trying with URL-encoded credentials...');
            const encodedAuthString = encodeURIComponent(`${auth.username}:${auth.password}`);
            const encodedCredentials = Buffer.from(encodedAuthString, 'utf8').toString('base64');
            
            const urlEncodedRequest = net.request({
              method: 'GET',
              url: `https://${auth.subdomain}.cybozu.com/k/v1/apps.json?limit=1`,
              headers: {
                'X-Cybozu-Authorization': encodedCredentials,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              }
            });
            
            const urlEncodedResponse = await new Promise<any>((resolve, reject) => {
              let urlEncodedResponseData = '';
              
              urlEncodedRequest.on('response', (urlResp) => {
                urlResp.on('data', (chunk) => {
                  urlEncodedResponseData += chunk.toString();
                });
                
                urlResp.on('end', () => {
                  resolve({
                    ok: urlResp.statusCode >= 200 && urlResp.statusCode < 300,
                    status: urlResp.statusCode,
                    json: () => Promise.resolve(JSON.parse(urlEncodedResponseData)),
                    text: () => Promise.resolve(urlEncodedResponseData)
                  });
                });
              });
              
              urlEncodedRequest.on('error', reject);
              urlEncodedRequest.end();
            });
            
            console.log('URL-encoded method status:', urlEncodedResponse.status);
            
            if (urlEncodedResponse.ok) {
              const urlEncodedData = await urlEncodedResponse.json();
              console.log('=== URL-encoded method successful ===');
              console.log('Apps found:', urlEncodedData.apps?.length || 0);
              return { success: true };
            }
            
          } catch (urlEncodedError) {
            console.error('URL-encoded method failed:', urlEncodedError);
          }
        }
        
        // すべての方法が失敗した場合
        try {
          const errorJson = JSON.parse(errorText);
          return { 
            success: false, 
            error: `認証失敗 - ${errorJson.message}。サブドメイン、ログインID、パスワードを確認してください。` 
          };
        } catch (parseError) {
          return { 
            success: false, 
            error: `認証失敗 - ${response.status}。Kintone APIにアクセスできません。` 
          };
        }
      }
      
      const responseData = await response.json();
      console.log('=== Login Successful ===');
      console.log('Apps found:', responseData.apps?.length || 0);
      
      return { success: true };
    } catch (error) {
      console.error('=== Login Error ===');
      console.error('Error:', error);
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'ネットワークエラーが発生しました' 
      };
    }
  });

    // アプリ一覧取得
  ipcMain.handle('kintone:getApps', async (event, auth: KintoneAuth) => {
    try {
      const response = await makeKintoneRequest(auth, 'apps.json');
      
      if (!response.ok) {
        const errorText = await response.text();
        return { 
          success: false, 
          error: `Failed to fetch apps: ${response.status} ${response.statusText} - ${errorText}` 
        };
      }
      
      const responseData = await response.json();
      const apps: KintoneApp[] = responseData.apps.map((app: any) => ({
        appId: app.appId,
        name: app.name,
        description: app.description || '',
      }));

      return { success: true, data: apps };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch apps' 
      };
    }
  });

  // アプリのフィールド情報取得
  ipcMain.handle('kintone:getAppFields', async (event, auth: KintoneAuth, appId: string) => {
    try {
      const response = await makeKintoneRequest(auth, `app/form/fields.json?app=${appId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        return { 
          success: false, 
          error: `Failed to fetch fields: ${response.status} ${response.statusText} - ${errorText}` 
        };
      }
      
      const responseData = await response.json();
      const fields: KintoneField[] = Object.entries(responseData.properties).map(([code, field]: [string, any]) => ({
        code,
        label: field.label,
        type: field.type,
      }));

      return { success: true, data: fields };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch fields' 
      };
    }
  });

  // クエリ実行（テスト用）
  ipcMain.handle('kintone:executeQuery', async (event, auth: KintoneAuth, appId: string, query: string) => {
    try {
      const queryParams = new URLSearchParams({
        app: appId,
        query,
        totalCount: 'true'
      });
      const response = await makeKintoneRequest(auth, `records.json?${queryParams.toString()}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        return { 
          success: false, 
          error: `Failed to execute query: ${response.status} ${response.statusText} - ${errorText}` 
        };
      }
      
      const responseData = await response.json();
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
        error: error instanceof Error ? error.message : 'Failed to execute query' 
      };
    }
  });
}
