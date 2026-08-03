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
import { PageLoading } from "@/components/ui/page-loading";
import { KintoneAuth, KintoneField, KintoneUser } from "@/types/kintone";
import { Lock, User, Globe, AlertCircle, Loader2 } from "lucide-react";
import { AppIcon } from "@/components/ui/app-icon";
import { AppLogo } from "@/components/ui/app-logo";

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
        /** ゲストスペースのアプリの場合に必要なスペースID */
        spaceId?: string | null,
      ) => Promise<{
        success: boolean;
        data?: { fields: KintoneField[] };
        error?: string;
      }>;
      executeQuery: (
        auth: KintoneAuth,
        appId: string,
        query: string,
        /** ゲストスペースのアプリの場合に必要なスペースID */
        spaceId?: string | null,
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberCredentials, setRememberCredentials] = useState(false);

  // スクロール防止
  useEffect(() => {
    // ページマウント時にスクロールを無効化
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // アンマウント時に元に戻す
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

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

        setIsLoading(false);
        setIsTransitioning(true);
        onLogin(formData);
      } else {
        console.error("Login failed:", result.error);
        setError(`${result.error}`);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(
        `エラーが発生しました: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
    <div className="bg-background fixed inset-0 flex items-center justify-center overflow-hidden p-4">
      <div className="absolute top-4 right-4 z-10">
        <ToggleTheme />
      </div>

      <Card className="border-border bg-card w-full max-w-md rounded-md border shadow-sm">
        {/* 上端のコーポレートカラー帯 */}
        <div className="bg-primary -mt-6 h-1 w-full rounded-t-md" />
        <CardHeader className="space-y-3 pt-5 text-center">
          <div className="flex justify-center">
            <div className="border-border bg-background flex h-14 w-14 items-center justify-center rounded-md border p-2">
              <AppLogo size={36} />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-foreground text-lg font-semibold">
              kintone API Query Creator
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              kintoneアカウントでログインしてください
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="border-destructive bg-destructive/5 flex items-start gap-2 border-l-4 p-3 text-sm"
              >
                <AlertCircle className="text-destructive mt-0.5 h-4 w-4 flex-shrink-0" />
                <span className="text-destructive">{error}</span>
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
                  className="pr-20 pl-10"
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
                  className="pl-10"
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
                  className="pl-10"
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
              className="w-full"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>認証中...</span>
                </div>
              ) : (
                "ログイン"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      {isTransitioning && (
        <PageLoading message="アプリ一覧を読み込んでいます..." />
      )}
    </div>
  );
}
