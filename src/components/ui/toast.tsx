import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

/**
 * 軽量トースト。ブラウザ標準の alert() を置き換える。
 * 依存追加を避けるため自前実装（Provider + useToast + 右下ビューポート）。
 */

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Provider外でも落とさない（開発ミス時のフォールバック）
    return { toast: (message) => console.warn("Toast (no provider):", message) };
  }
  return ctx;
}

const VARIANT_STYLES: Record<ToastVariant, { icon: React.ReactNode; bar: string }> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />,
    bar: "bg-green-500",
  },
  error: {
    icon: <AlertCircle className="text-destructive h-4 w-4" />,
    bar: "bg-destructive",
  },
  info: {
    icon: <Info className="text-primary h-4 w-4" />,
    bar: "bg-primary",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev.slice(-3), { id, message, variant }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* ビューポート（フッターの上・右下） */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-12 z-[100] flex w-80 flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="bg-popover text-popover-foreground border-border animate-in slide-in-from-bottom-2 fade-in pointer-events-auto relative flex items-start gap-2 overflow-hidden rounded-lg border p-3 pr-8 text-sm shadow-lg"
          >
            <span className={`absolute inset-y-0 left-0 w-1 ${VARIANT_STYLES[t.variant].bar}`} />
            <span className="mt-0.5 flex-shrink-0">
              {VARIANT_STYLES[t.variant].icon}
            </span>
            <span className="leading-snug break-words">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="通知を閉じる"
              className="text-muted-foreground hover:text-foreground absolute top-2 right-2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
