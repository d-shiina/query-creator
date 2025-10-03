import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/ui/password-input";
import ToggleTheme from "@/components/ToggleTheme";
import { KintoneAuth, KintoneField, KintoneUser } from "@/types/kintone";
import { Lock, User, Globe, AlertCircle } from "lucide-react";
import iconUrl from "/icon.ico?url";

// Window型を拡張
declare global {
  interface Window {
    kintoneAPI: {
      login: (
        auth: KintoneAuth,
      ) => Promise<{ success: boolean; error?: string }>;
      getUsers: (
        auth: KintoneAuth,
      ) => Promise<{ success: boolean; data?: KintoneUser[]; error?: string }>;
      getAppFields: (
        auth: KintoneAuth,
        appId: string,
      ) => Promise<{
        success: boolean;
        data?: { fields: KintoneField[] };
        error?: string;
      }>;
      executeQuery: (
        auth: KintoneAuth,
        appId: string,
        query: string,
      ) => Promise<{
        success: boolean;
        data?: { records: Record<string, unknown>[] };
        error?: string;
      }>;
    };
  }
}

interface LoginPageProps {
  onLogin: (auth: KintoneAuth) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [formData, setFormData] = useState<KintoneAuth>({
    subdomain: "",
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberCredentials, setRememberCredentials] = useState(false);

  // LocalStorageから保存された認証情報を読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kintone-credentials");
      if (saved) {
        const { subdomain, username, password, remember } = JSON.parse(saved);
        setFormData((prev) => ({
          ...prev,
          subdomain: subdomain || "",
          username: username || "",
          password: password || "",
        }));
        setRememberCredentials(remember || false);
      }
    } catch (error) {
      console.error("Failed to load saved credentials:", error);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // 簡単なバリデーション
    if (!formData.subdomain) {
      setError("サブドメインを入力してください");
      setIsLoading(false);
      return;
    }

    if (!formData.username || !formData.password) {
      setError("ログインIDとパスワードを入力してください");
      setIsLoading(false);
      return;
    }

    try {
      // 実際のKintone APIでログイン認証
      console.log("=== Login Form Data ===");
      console.log("Subdomain:", formData.subdomain);
      console.log("Username:", formData.username);
      console.log("Password length:", formData.password.length);
      console.log(
        "Password starts with:",
        formData.password.substring(0, 3) + "...",
      );

      const result = await window.kintoneAPI.login(formData);

      if (result.success) {
        // 認証成功時に認証情報を保存
        if (rememberCredentials) {
          try {
            localStorage.setItem(
              "kintone-credentials",
              JSON.stringify({
                subdomain: formData.subdomain,
                username: formData.username,
                password: formData.password,
                remember: true,
              }),
            );
          } catch (error) {
            console.error("Failed to save credentials:", error);
          }
        } else {
          // チェックボックスがオフの場合は保存された認証情報を削除
          localStorage.removeItem("kintone-credentials");
        }

        onLogin(formData);
      } else {
        console.error("Login failed:", result.error);
        setError(`${result.error}`);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(
        `エラーが発生しました: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange =
    (field: keyof KintoneAuth) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ToggleTheme />
      </div>

      <Card className="border-border bg-card/95 w-full max-w-md shadow-lg backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center">
              <img
                src={iconUrl}
                alt="App Icon"
                className="h-16 w-16 object-contain"
              />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-foreground text-2xl font-bold">
              kintone Query Creator
            </CardTitle>
            <CardDescription>
              kintoneアカウントでログインしてください
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center space-x-3 rounded-lg border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-4 text-sm shadow-sm dark:border-red-800 dark:from-red-950/20 dark:to-orange-950/20">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-slate-500 to-slate-600">
                  <AlertCircle className="h-3 w-3 text-white" />
                </div>
                <span className="text-red-700 dark:text-red-300">{error}</span>
              </div>
            )}

            {/* サブドメイン */}
            <div className="space-y-2">
              <Label htmlFor="subdomain" className="text-sm font-medium">
                サブドメイン
              </Label>
              <div className="relative">
                <Globe className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                <Input
                  id="subdomain"
                  placeholder="your-company"
                  value={formData.subdomain}
                  onChange={handleChange("subdomain")}
                  className="pr-20 pl-10 focus-visible:border-slate-500 focus-visible:ring-slate-500"
                  required
                />
                <div className="text-muted-foreground absolute top-3 right-3 text-sm">
                  .cybozu.com
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                例: https://your-company.cybozu.com の「your-company」部分
              </p>
            </div>

            {/* ログインID */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                ログインID
              </Label>
              <div className="relative">
                <User className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                <Input
                  id="username"
                  placeholder="ログインID"
                  value={formData.username}
                  onChange={handleChange("username")}
                  className="pl-10 focus-visible:border-slate-500 focus-visible:ring-slate-500"
                  required
                />
              </div>
            </div>

            {/* パスワード */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                パスワード
              </Label>
              <div className="relative">
                <Lock className="text-muted-foreground absolute top-3 left-3 z-10 h-4 w-4" />
                <PasswordInput
                  id="password"
                  placeholder="パスワード"
                  value={formData.password}
                  onChange={handleChange("password")}
                  className="pl-10 focus-visible:border-slate-500 focus-visible:ring-slate-500"
                  required
                />
              </div>
            </div>

            {/* 認証情報を保存 */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberCredentials}
                onCheckedChange={(checked: boolean) =>
                  setRememberCredentials(checked)
                }
                className="focus-visible:ring-slate-500 data-[state=checked]:border-slate-600 data-[state=checked]:bg-slate-600"
              />
              <Label
                htmlFor="remember"
                className="cursor-pointer text-sm font-normal"
              >
                認証情報を保存する
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-md transition-all duration-200 hover:from-slate-700 hover:to-slate-800 hover:shadow-lg"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
