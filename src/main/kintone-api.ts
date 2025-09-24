import { ipcMain, net } from "electron";
import { KintoneAuth, KintoneApp, KintoneField } from "../types/kintone";

// ログイン専用のKintone API呼び出し関数
async function makeKintoneLoginRequest(
  auth: KintoneAuth,
  endpoint: string,
  method: string = "GET",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any,
) {
  const baseUrl = `https://${auth.subdomain}.cybozu.com`;
  const url = `${baseUrl}/k/v1/${endpoint}`;

  // パスワード認証用のBase64エンコード
  const authString = `${auth.username}:${auth.password}`;
  const credentials = Buffer.from(authString, "utf8").toString("base64");

  console.log("Making Kintone login request to:", url);
  console.log("Auth credentials (Base64):", credentials);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Promise<any>((resolve, reject) => {
    // ログイン確認では最小限のヘッダーのみ使用
    const headers: Record<string, string> = {
      "X-Cybozu-Authorization": credentials,
    };

    console.log("Login request headers:", headers);

    const request = net.request({
      method,
      url: url,
      headers,
    });

    let responseData = "";

    request.on("response", (response) => {
      console.log("Login response status:", response.statusCode);
      console.log("Login response headers:", response.headers);

      response.on("data", (chunk) => {
        responseData += chunk.toString();
      });

      response.on("end", () => {
        console.log("Login response body:", responseData);

        const result = {
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          statusText: response.statusMessage || "",
          json: () => {
            try {
              return Promise.resolve(JSON.parse(responseData));
            } catch {
              return Promise.reject(new Error("Invalid JSON response"));
            }
          },
          text: () => Promise.resolve(responseData),
        };

        resolve(result);
      });
    });

    request.on("error", (error) => {
      console.error("Login request error:", error);
      reject(error);
    });

    if (data && method !== "GET") {
      const bodyData = JSON.stringify(data);
      request.write(bodyData);
    }

    request.end();
  });
}

// 通常のKintone API呼び出し用のヘルパー関数
async function makeKintoneRequest(
  auth: KintoneAuth,
  endpoint: string,
  method: string = "GET",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any,
) {
  const baseUrl = `https://${auth.subdomain}.cybozu.com`;
  const url = `${baseUrl}/k/v1/${endpoint}`;

  // パスワード認証用のBase64エンコード
  const authString = `${auth.username}:${auth.password}`;
  const credentials = Buffer.from(authString, "utf8").toString("base64");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Promise<any>((resolve, reject) => {
    const headers: Record<string, string> = {
      "X-Cybozu-Authorization": credentials,
    };

    // POSTリクエストの場合のみContent-Typeを追加
    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
    }

    const request = net.request({
      method,
      url: url,
      headers,
    });

    let responseData = "";

    request.on("response", (response) => {
      response.on("data", (chunk) => {
        responseData += chunk.toString();
      });

      response.on("end", () => {
        const result = {
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          statusText: response.statusMessage || "",
          json: () => {
            try {
              return Promise.resolve(JSON.parse(responseData));
            } catch {
              return Promise.reject(new Error("Invalid JSON response"));
            }
          },
          text: () => Promise.resolve(responseData),
        };

        resolve(result);
      });
    });

    request.on("error", (error) => {
      reject(error);
    });

    if (data && method !== "GET") {
      const bodyData = JSON.stringify(data);
      request.write(bodyData);
    }

    request.end();
  });
}

// User API専用のKintone API呼び出し関数（/v1/エンドポイント用）
async function makeKintoneUserRequest(
  auth: KintoneAuth,
  endpoint: string,
  method: string = "GET",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any,
) {
  const baseUrl = `https://${auth.subdomain}.cybozu.com`;
  const url = `${baseUrl}/v1/${endpoint}`;

  // パスワード認証用のBase64エンコード
  const authString = `${auth.username}:${auth.password}`;
  const credentials = Buffer.from(authString, "utf8").toString("base64");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Promise<any>((resolve, reject) => {
    const headers: Record<string, string> = {
      "X-Cybozu-Authorization": credentials,
    };

    const request = net.request({
      method,
      url: url,
      headers,
    });

    let responseData = "";

    request.on("response", (response) => {
      response.on("data", (chunk) => {
        responseData += chunk.toString();
      });

      response.on("end", () => {
        const result = {
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          statusText: response.statusMessage || "",
          json: () => {
            try {
              return Promise.resolve(JSON.parse(responseData));
            } catch {
              return Promise.reject(new Error("Invalid JSON response"));
            }
          },
          text: () => Promise.resolve(responseData),
        };

        resolve(result);
      });
    });

    request.on("error", (error) => {
      reject(error);
    });

    if (data && method !== "GET") {
      const bodyData = JSON.stringify(data);
      request.write(bodyData);
    }

    request.end();
  });
}

// IPC handlers
export function setupKintoneAPI() {
  // ログイン認証（シンプルな認証）
  ipcMain.handle("kintone:login", async (event, auth: KintoneAuth) => {
    try {
      console.log("=== Kintone Login Attempt ===");
      console.log("Subdomain:", auth.subdomain);
      console.log("Username:", auth.username);

      // パスワード認証用のBase64エンコード
      const authString = `${auth.username}:${auth.password}`;
      const credentials = Buffer.from(authString, "utf8").toString("base64");

      console.log("Auth credentials format check:", {
        "X-Cybozu-Authorization": credentials,
      });

      // シンプルなアプリ一覧取得でログイン確認
      const response = await makeKintoneLoginRequest(auth, "apps.json?limit=1");

      if (response.ok) {
        const data = await response.json();
        console.log("=== Login successful ===");
        return {
          success: true,
          data: {
            subdomain: auth.subdomain,
            username: auth.username,
            appsCount: data.apps ? data.apps.length : 0,
          },
        };
      } else {
        const errorText = await response.text();
        console.error("=== Login failed ===");
        console.error("Status:", response.status);
        console.error("Error Response:", errorText);

        return {
          success: false,
          error: `認証に失敗しました (${response.status}): ${errorText}`,
        };
      }
    } catch (error) {
      console.error("=== Login exception ===", error);
      return {
        success: false,
        error: `ログインエラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
      };
    }
  });

  // アプリ一覧取得（ページネーション対応）
  ipcMain.handle(
    "kintone:getApps",
    async (
      event,
      auth: KintoneAuth,
      options?: { offset?: number; limit?: number },
    ) => {
      try {
        console.log("=== Getting apps list ===");

        const { offset = 0, limit = 100 } = options || {};
        console.log(`Requesting apps with offset: ${offset}, limit: ${limit}`);

        // offsetとlimitパラメータを追加
        let endpoint = `apps.json?limit=${limit}&offset=${offset}`;

        const response = await makeKintoneRequest(auth, endpoint);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to get apps:", response.status, errorText);
          return {
            success: false,
            error: `アプリ一覧の取得に失敗しました (${response.status}): ${errorText}`,
          };
        }

        const responseData = await response.json();
        console.log(
          `Apps response received, count: ${responseData.apps?.length || 0}, offset: ${offset}`,
        );

        // レスポンスデータをKintoneApp型に変換
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apps: KintoneApp[] = responseData.apps.map((app: any) => ({
          appId: app.appId || app.id,
          code: app.code,
          name: app.name,
          description: app.description || "",
          spaceId: app.spaceId,
          threadId: app.threadId,
          createdAt: app.createdAt,
          modifiedAt: app.modifiedAt,
          updatedAt: app.updatedAt,
          creator: app.creator,
          modifier: app.modifier,
        }));

        return {
          success: true,
          data: {
            apps,
            hasMore: apps.length === limit, // 取得件数がlimitと同じ場合、まだデータがある可能性
          },
        };
      } catch (error) {
        console.error("Exception in getApps:", error);
        return {
          success: false,
          error: `アプリ一覧取得エラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
        };
      }
    },
  );

  // アプリのフィールド情報取得（システムフィールド手動追加処理を削除）
  ipcMain.handle(
    "kintone:getAppFields",
    async (event, auth: KintoneAuth, appId: string) => {
      try {
        console.log(`=== Getting fields for app ${appId} ===`);

        const response = await makeKintoneRequest(
          auth,
          `app/form/fields.json?app=${appId}`,
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            "Failed to get app fields:",
            response.status,
            errorText,
          );
          return {
            success: false,
            error: `フィールド情報の取得に失敗しました (${response.status}): ${errorText}`,
          };
        }

        const responseData = await response.json();
        console.log(
          "Fields response received, field count:",
          Object.keys(responseData.properties || {}).length,
        );

        // レスポンスデータをKintoneField型に変換
        const fields: KintoneField[] = Object.entries(
          responseData.properties || {},
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ).map(([code, field]: [string, any]) => {
          console.log(`Field ${code}:`, field); // デバッグ用
          return {
            code,
            label: field.label,
            type: field.type,
            required: field.required || false,
            unique: field.unique || false,
            options: field.options || [],
          };
        });

        console.log(`Total fields: ${fields.length}`);
        console.log(
          "Fields:",
          fields.map((f) => ({ code: f.code, type: f.type, label: f.label })),
        );

        return {
          success: true,
          data: { fields },
        };
      } catch (error) {
        console.error("Exception in getAppFields:", error);
        return {
          success: false,
          error: `フィールド情報取得エラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
        };
      }
    },
  );

  // クエリ実行
  ipcMain.handle(
    "kintone:executeQuery",
    async (event, auth: KintoneAuth, appId: string, query: string) => {
      try {
        console.log(`=== Executing query for app ${appId} ===`);
        console.log("Query:", query);

        let endpoint = `records.json?app=${appId}`;
        if (query.trim()) {
          endpoint += `&query=${encodeURIComponent(query)}`;
        }

        const response = await makeKintoneRequest(auth, endpoint);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to execute query:", response.status, errorText);
          return {
            success: false,
            error: `クエリの実行に失敗しました (${response.status}): ${errorText}`,
          };
        }

        const responseData = await response.json();
        console.log(
          "Query response received, record count:",
          responseData.records?.length || 0,
        );

        return {
          success: true,
          data: responseData,
        };
      } catch (error) {
        console.error("Exception in executeQuery:", error);
        return {
          success: false,
          error: `クエリ実行エラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
        };
      }
    },
  );

  // ユーザー一覧取得
  ipcMain.handle("kintone:getUsers", async (event, auth: KintoneAuth) => {
    try {
      console.log("=== Getting users from kintone ===");

      // User API用のエンドポイント（/v1/users.json）を使用
      const response = await makeKintoneUserRequest(auth, "users.json");

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to get users:", response.status, errorText);
        return {
          success: false,
          error: `ユーザー一覧の取得に失敗しました (${response.status}): ${errorText}`,
        };
      }

      const responseData = await response.json();
      console.log(
        "Users API response received, user count:",
        responseData.users?.length || 0,
      );

      // レスポンスデータをフォーマット
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const users = responseData.users.map((user: any) => ({
        code: user.code,
        name: user.name,
        email: user.email,
      }));

      return { success: true, data: users };
    } catch (error) {
      console.error("Exception in getUsers:", error);
      return {
        success: false,
        error: `ユーザー一覧取得エラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
      };
    }
  });
}
