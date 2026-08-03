import React, { useState } from "react";
import { KintoneApp, KintoneAuth } from "@/types/kintone";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Star,
  Info,
  Calendar,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Code2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cleanAndTruncateText } from "@/utils/text";
import { ModernLoadingSpinner } from "@/components/ui/modern-loading";

interface AppDataTableProps {
  apps: KintoneApp[];
  auth: KintoneAuth;
  onSelectApp: (app: KintoneApp) => void;
  onToggleFavorite: (appId: string) => void;
}

type SortField =
  | "appId"
  | "name"
  | "code"
  | "creator"
  | "modifier"
  | "createdAt"
  | "modifiedAt";
type SortOrder = "asc" | "desc";

export default function AppDataTable({
  apps,
  onSelectApp,
  onToggleFavorite,
}: AppDataTableProps) {
  const [selectedAppInfo, setSelectedAppInfo] = useState<KintoneApp | null>(
    null,
  );
  const [appInfoLoading, setAppInfoLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>("appId");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // ページング状態
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  const sortedApps = [...apps].sort((a, b) => {
    let aValue: string | number, bValue: string | number;

    switch (sortField) {
      case "appId":
        aValue = parseInt(a.appId);
        bValue = parseInt(b.appId);
        break;
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case "code":
        aValue = a.code?.toLowerCase() || "";
        bValue = b.code?.toLowerCase() || "";
        break;
      case "creator":
        aValue = a.creator?.name?.toLowerCase() || "";
        bValue = b.creator?.name?.toLowerCase() || "";
        break;
      case "modifier":
        aValue = a.modifier?.name?.toLowerCase() || "";
        bValue = b.modifier?.name?.toLowerCase() || "";
        break;
      case "createdAt":
        aValue = new Date(a.createdAt || "").getTime();
        bValue = new Date(b.createdAt || "").getTime();
        break;
      case "modifiedAt":
        aValue = new Date(a.modifiedAt || "").getTime();
        bValue = new Date(b.modifiedAt || "").getTime();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // ページング計算
  const totalItems = sortedApps.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedApps = sortedApps.slice(startIndex, endIndex);

  // ページ変更ハンドラー
  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // 最初のページにリセット
  };

  const fetchAppInfo = async (app: KintoneApp) => {
    setAppInfoLoading(true);
    try {
      setSelectedAppInfo({
        appId: app.appId,
        name: app.name,
        description: app.description,
        code: app.code,
        spaceId: app.spaceId,
        threadId: app.threadId,
        creator: app.creator,
        modifier: app.modifier,
        createdAt: app.createdAt,
        modifiedAt: app.modifiedAt,
      });
    } catch (error) {
      alert(
        `エラーが発生しました: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setAppInfoLoading(false);
    }
  };

  return (
    <div className="border-border bg-card rounded-md border shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="bg-muted sticky left-0 w-8 border-r text-center">
                ★
              </TableHead>
              <TableHead className="w-16">
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("appId")}
                >
                  ID
                  {getSortIcon("appId")}
                </Button>
              </TableHead>
              <TableHead className="min-w-[200px]">
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("name")}
                >
                  アプリ名
                  {getSortIcon("name")}
                </Button>
              </TableHead>
              <TableHead className="w-24">
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("code")}
                >
                  コード
                  {getSortIcon("code")}
                </Button>
              </TableHead>
              <TableHead className="min-w-[150px]">説明</TableHead>
              <TableHead className="w-20">スペース</TableHead>
              <TableHead className="w-24">
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("creator")}
                >
                  作成者
                  {getSortIcon("creator")}
                </Button>
              </TableHead>
              <TableHead className="w-20">
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("createdAt")}
                >
                  作成日
                  {getSortIcon("createdAt")}
                </Button>
              </TableHead>
              <TableHead className="w-24">
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("modifier")}
                >
                  更新者
                  {getSortIcon("modifier")}
                </Button>
              </TableHead>
              <TableHead className="w-20">
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("modifiedAt")}
                >
                  更新日
                  {getSortIcon("modifiedAt")}
                </Button>
              </TableHead>
              <TableHead className="bg-muted sticky right-0 w-20 border-l text-right">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedApps.map((app) => (
              <TableRow key={app.appId} className="hover:bg-muted/50">
                <TableCell className="bg-card sticky left-0 border-r text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleFavorite(app.appId)}
                    className="h-6 w-6 p-0"
                  >
                    {app.isFavorite ? (
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ) : (
                      <Star className="text-muted-foreground h-3 w-3 hover:text-yellow-400" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-sm">
                    {app.appId}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="min-w-0">
                    <div
                      className="truncate text-sm font-medium"
                      title={app.name}
                    >
                      {cleanAndTruncateText(app.name, 40)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {app.code ? (
                    <Badge variant="outline" className="text-sm">
                      {app.code}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      未設定
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {app.description ? (
                    <div
                      className="text-muted-foreground max-w-[140px] truncate text-sm"
                      title={cleanAndTruncateText(app.description, 200)}
                    >
                      {cleanAndTruncateText(app.description, 40)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      未設定
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {app.spaceId && app.spaceId !== "null" ? (
                    <Badge variant="outline" className="text-sm">
                      {app.spaceId}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-muted-foreground text-sm">
                    {app.creator?.name || "-"}
                  </div>
                  {app.creator?.code && (
                    <div className="text-muted-foreground text-sm">
                      {app.creator.code}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-muted-foreground text-sm">
                    {app.createdAt
                      ? new Date(app.createdAt).toLocaleDateString("ja-JP")
                      : "-"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-muted-foreground text-sm">
                    {app.modifier?.name || "-"}
                  </div>
                  {app.modifier?.code && (
                    <div className="text-muted-foreground text-sm">
                      {app.modifier.code}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-muted-foreground text-sm">
                    {app.modifiedAt
                      ? new Date(app.modifiedAt).toLocaleDateString("ja-JP")
                      : "-"}
                  </div>
                </TableCell>
                <TableCell className="bg-card sticky right-0 border-l text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      onClick={() => onSelectApp(app)}
                      size="sm"
                      className="h-7 px-2"
                      title="クエリ生成"
                    >
                      <Code2 className="h-3 w-3" />
                    </Button>
                    <Dialog
                      onOpenChange={(open: boolean) => {
                        if (!open) {
                          setSelectedAppInfo(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => fetchAppInfo(app)}
                          title="詳細情報"
                        >
                          <Info className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden">
                        <DialogHeader className="pb-4">
                          <DialogTitle className="flex items-center gap-3 text-xl">
                            <div>
                              <div className="text-foreground text-lg font-bold">
                                アプリ詳細情報
                              </div>
                            </div>
                          </DialogTitle>
                          <DialogDescription className="text-base">
                            {app.name} の詳細情報を表示しています
                          </DialogDescription>
                        </DialogHeader>

                        <div className="scrollbar-thin max-h-[60vh] overflow-y-auto pr-2">
                          {appInfoLoading ? (
                            <ModernLoadingSpinner 
                              message="詳細情報を読み込み中"
                              size="md"
                              variant="minimal"
                            />
                          ) : selectedAppInfo ? (
                            <div className="space-y-6">
                              {/* 基本情報セクション */}
                              <div className="space-y-4">
                                <h3 className="text-foreground border-b pb-2 text-lg font-semibold">
                                  基本情報
                                </h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <label className="text-muted-foreground text-sm font-medium">
                                      アプリ名
                                    </label>
                                    <div className="border-border bg-muted/40 rounded-md border p-3">
                                      <p className="text-sm font-medium">
                                        {selectedAppInfo.name}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-muted-foreground text-sm font-medium">
                                      アプリID
                                    </label>
                                    <div className="bg-muted/30 rounded-md border p-3">
                                      <p className="font-mono text-sm font-medium">
                                        {selectedAppInfo.appId}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-muted-foreground text-sm font-medium">
                                    アプリコード
                                  </label>
                                  <div className="bg-muted/30 rounded-md border p-3">
                                    <p className="font-mono text-sm">
                                      {selectedAppInfo.code || (
                                        <span className="text-muted-foreground italic">
                                          未設定
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* 説明セクション */}
                              <div className="space-y-4">
                                <h3 className="text-foreground border-b pb-2 text-lg font-semibold">
                                  説明
                                </h3>
                                <div className="border-border bg-muted/40 min-h-[100px] rounded-md border p-4 text-sm">
                                  {selectedAppInfo.description ? (
                                    <p className="leading-relaxed whitespace-pre-wrap">
                                      {cleanAndTruncateText(
                                        selectedAppInfo.description,
                                        500,
                                      )}
                                    </p>
                                  ) : (
                                    <p className="text-muted-foreground py-4 text-center italic">
                                      説明が設定されていません
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* 作成・更新情報セクション */}
                              <div className="space-y-4">
                                <h3 className="text-foreground border-b pb-2 text-lg font-semibold">
                                  作成・更新情報
                                </h3>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                  {/* 作成情報 */}
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <User className="text-muted-foreground h-4 w-4" />
                                      <label className="text-muted-foreground text-sm font-medium">
                                        作成者
                                      </label>
                                    </div>
                                    <div className="border-border bg-muted/40 rounded-md border p-4">
                                      <p className="text-sm font-medium">
                                        {(selectedAppInfo.creator?.name &&
                                          selectedAppInfo.creator.name.trim()) ||
                                          "-"}
                                      </p>
                                      {selectedAppInfo.creator?.code &&
                                        selectedAppInfo.creator.code.trim() && (
                                          <p className="text-muted-foreground mt-1 text-xs">
                                            ID:{" "}
                                            {selectedAppInfo.creator.code}
                                          </p>
                                        )}
                                      <div className="mt-3 flex items-center gap-1 border-border border-t pt-2">
                                        <Calendar className="text-muted-foreground h-3 w-3" />
                                        <p className="text-muted-foreground text-xs">
                                          {selectedAppInfo.createdAt
                                            ? new Date(
                                                selectedAppInfo.createdAt,
                                              ).toLocaleString("ja-JP")
                                            : "-"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 更新情報 */}
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <User className="text-muted-foreground h-4 w-4" />
                                      <label className="text-muted-foreground text-sm font-medium">
                                        最終更新者
                                      </label>
                                    </div>
                                    <div className="border-border bg-muted/40 rounded-md border p-4">
                                      <p className="text-sm font-medium">
                                        {(selectedAppInfo.modifier?.name &&
                                          selectedAppInfo.modifier.name.trim()) ||
                                          "-"}
                                      </p>
                                      {selectedAppInfo.modifier?.code &&
                                        selectedAppInfo.modifier.code.trim() && (
                                          <p className="text-muted-foreground mt-1 text-xs">
                                            ID:{" "}
                                            {selectedAppInfo.modifier.code}
                                          </p>
                                        )}
                                      <div className="mt-3 flex items-center gap-1 border-border border-t pt-2">
                                        <Calendar className="text-muted-foreground h-3 w-3" />
                                        <p className="text-muted-foreground text-xs">
                                          {selectedAppInfo.modifiedAt
                                            ? new Date(
                                                selectedAppInfo.modifiedAt,
                                              ).toLocaleString("ja-JP")
                                            : "-"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {sortedApps.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground text-lg">
              条件に一致するアプリが見つかりません
            </p>
          </div>
        )}
      </div>

      {/* ページング コントロール */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {startIndex + 1}～{Math.min(endIndex, totalItems)} / {totalItems}
              件
            </span>
            <div className="ml-4 flex items-center gap-2">
              <span className="text-sm">表示件数:</span>
              <select
                value={itemsPerPage}
                onChange={(e) =>
                  handleItemsPerPageChange(Number(e.target.value))
                }
                className="border-input bg-background rounded border px-2 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="mx-2 flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  // 現在のページの前後2ページずつ表示
                  return (
                    Math.abs(page - currentPage) <= 2 ||
                    page === 1 ||
                    page === totalPages
                  );
                })
                .map((page, index, arr) => (
                  <React.Fragment key={page}>
                    {index > 0 && arr[index - 1] !== page - 1 && (
                      <span className="text-muted-foreground px-1">...</span>
                    )}
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="w-8"
                    >
                      {page}
                    </Button>
                  </React.Fragment>
                ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
