import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Code2, RotateCw } from "lucide-react";
import { KintoneApp, KintoneAuth } from "@/types/kintone";
import {
  RecordCountResult,
  fetchRecordCount,
  getCachedRecordCount,
} from "@/utils/record-count";
import { formatAbsoluteDateTime } from "@/utils/date-display";
import { stripHtmlTags } from "@/utils/text";

/**
 * アプリ詳細。一覧の行に出すほどではないが、選ぶ前に確かめたい情報を集める。
 *
 * レコード件数はここでだけ取りに行く。一覧の全行で取ると
 * アプリ数ぶんAPIを叩くことになるので、開いたアプリの分だけ払う。
 *
 * 一覧の行ごとにDialogを置くと行数ぶんインスタンスができるので、
 * ダイアログは画面に1つだけ置き、対象アプリを差し替えて使う。
 */

interface AppDetailDialogProps {
  /** null のあいだは閉じている */
  app: KintoneApp | null;
  auth: KintoneAuth;
  onClose: () => void;
  onSelectApp: (app: KintoneApp) => void;
}

type CountState = RecordCountResult | { status: "loading" };

export default function AppDetailDialog({
  app,
  auth,
  onClose,
  onSelectApp,
}: AppDetailDialogProps) {
  const [count, setCount] = useState<CountState>({ status: "loading" });

  useEffect(() => {
    if (!app) return;

    // 取得済みならローディングを挟まずに出す（開き直すたびに点滅させない）
    const cached = getCachedRecordCount(app.appId);
    if (cached !== undefined) {
      setCount({ status: "success", count: cached });
      return;
    }

    let cancelled = false;
    setCount({ status: "loading" });
    fetchRecordCount(auth, app).then((result) => {
      if (!cancelled) setCount(result);
    });

    return () => {
      cancelled = true;
    };
  }, [app, auth]);

  const reloadCount = async () => {
    if (!app) return;
    setCount({ status: "loading" });
    setCount(await fetchRecordCount(auth, app, { force: true }));
  };

  if (!app) return null;

  const description = stripHtmlTags(app.description).trim();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="line-clamp-2 pr-6 text-base leading-snug">
            {app.name}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-muted-foreground flex items-center gap-2 font-mono text-xs">
              <span>ID: {app.appId}</span>
              {app.code && (
                <>
                  <span aria-hidden="true" className="opacity-40">
                    /
                  </span>
                  <span>{app.code}</span>
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* レコード件数：この画面でいちばん知りたい数字なので単独で置く */}
        <div className="border-border bg-muted/40 flex min-h-[3.25rem] items-center justify-between gap-3 rounded-md border px-3 py-2">
          <div className="min-w-0">
            <div className="text-muted-foreground text-xs">レコード件数</div>
            {count.status === "loading" ? (
              <Skeleton className="mt-1 h-6 w-24" />
            ) : count.status === "success" ? (
              <div className="text-foreground text-xl font-semibold tabular-nums">
                {count.count.toLocaleString("ja-JP")}
                <span className="text-muted-foreground ml-1 text-sm font-normal">
                  件
                </span>
              </div>
            ) : (
              <div className="text-muted-foreground mt-0.5 text-sm">
                {count.message}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={reloadCount}
            disabled={count.status === "loading"}
            title="再取得"
            aria-label="レコード件数を再取得"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="scrollbar-thin max-h-[50vh] space-y-4 overflow-y-auto pr-1">
          <section className="space-y-1">
            <h3 className="text-muted-foreground text-xs">説明</h3>
            {description ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
            ) : (
              <p className="text-muted-foreground/70 text-sm">未設定</p>
            )}
          </section>

          <dl className="border-border grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t pt-4 text-sm">
            <DetailRow label="スペース" value={spaceLabel(app)} />
            <DetailRow label="作成者" value={app.creator?.name} />
            <DetailRow
              label="作成日時"
              value={formatAbsoluteDateTime(app.createdAt)}
            />
            <DetailRow label="更新者" value={app.modifier?.name} />
            <DetailRow
              label="更新日時"
              value={formatAbsoluteDateTime(app.modifiedAt)}
            />
          </dl>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            閉じる
          </Button>
          <Button onClick={() => onSelectApp(app)}>
            <Code2 className="h-4 w-4" />
            クエリを作る
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function spaceLabel(app: KintoneApp): string | null {
  if (!app.spaceId || app.spaceId === "null") return null;
  return `スペース ${app.spaceId}`;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <>
      <dt className="text-muted-foreground whitespace-nowrap">{label}</dt>
      <dd className={value ? "" : "text-muted-foreground/70"}>
        {value || "-"}
      </dd>
    </>
  );
}
