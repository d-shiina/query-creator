import { contextBridge, ipcRenderer } from "electron";
import { KintoneAuth } from "../../../types/kintone";

export function exposeKintoneAPI() {
  contextBridge.exposeInMainWorld("kintoneAPI", {
    login: async (auth: KintoneAuth) => {
      try {
        console.log("Preload: Calling main process login");
        const result = await ipcRenderer.invoke("kintone:login", auth);
        return result;
      } catch (error) {
        console.error("Preload: Login error:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "ログインエラーが発生しました",
        };
      }
    },

    getApps: async (auth: KintoneAuth) => {
      try {
        console.log("Preload: Calling main process getApps");
        const result = await ipcRenderer.invoke("kintone:getApps", auth);
        return result;
      } catch (error) {
        console.error("Preload: getApps error:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "アプリ一覧取得エラーが発生しました",
        };
      }
    },

    getAppFields: async (auth: KintoneAuth, appId: string) => {
      try {
        console.log(
          "Preload: Calling main process getAppFields for app:",
          appId,
        );
        const result = await ipcRenderer.invoke(
          "kintone:getAppFields",
          auth,
          appId,
        );
        return result;
      } catch (error) {
        console.error("Preload: getAppFields error:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "フィールド取得エラーが発生しました",
        };
      }
    },

    executeQuery: async (auth: KintoneAuth, appId: string, query: string) => {
      try {
        console.log(
          "Preload: Calling main process executeQuery for app:",
          appId,
        );
        const result = await ipcRenderer.invoke(
          "kintone:executeQuery",
          auth,
          appId,
          query,
        );
        return result;
      } catch (error) {
        console.error("Preload: executeQuery error:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "クエリ実行エラーが発生しました",
        };
      }
    },

    getUsers: async (auth: KintoneAuth) => {
      try {
        console.log("Preload: Calling main process getUsers");
        const result = await ipcRenderer.invoke("kintone:getUsers", auth);
        return result;
      } catch (error) {
        console.error("Preload: getUsers error:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "ユーザー一覧取得エラーが発生しました",
        };
      }
    },
  });
}
