import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  Database,
  Settings,
  Code,
  Play,
  Loader2,
  Plus,
  Trash2,
  Save,
  Check,
  ChevronDown,
  AlertCircle,
  User,
  CalendarIcon,
  ChevronRight,
  Clock,
  Clipboard,
  ClipboardCheck,
  FileText,
  RotateCcw,
  Copy,
  GripVertical,
  Edit,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { ja } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  formatQueryForOutput,
  QUERY_OUTPUT_FORMATS,
  DEFAULT_QUERY_OUTPUT_FORMAT,
  type QueryOutputFormat,
} from "@/utils/query-format";
import { getOperatorHint } from "@/utils/query-operator-hints";
import { formatFieldValue } from "@/utils/kintone-field-value";
import { useToast } from "@/components/ui/toast";

/** 出力バンドの表示モード（クエリ形式＋生クエリ＋APIプレビュー） */
type OutputView = QueryOutputFormat | "raw" | "api";
const OUTPUT_VIEWS: ReadonlyArray<{ value: OutputView; label: string }> = [
  ...QUERY_OUTPUT_FORMATS,
  { value: "raw", label: "生クエリ" },
  { value: "api", label: "APIプレビュー" },
];
import { Calendar } from "@/components/ui/calendar";
import ToggleTheme from "@/components/ToggleTheme";
import { windowControlsInsetStyle } from "@/components/template/WindowControls";
import { BackButton } from "@/components/ui/back-button";
import { PageLoading } from "@/components/ui/page-loading";

import { useQueryGenerator } from "@/hooks/useQueryGenerator";
import {
  KintoneAuth,
  KintoneApp,
  KintoneField,
  QueryCondition,
  QueryOperator,
} from "@/types/kintone";

interface QueryGeneratorPageProps {
  auth: KintoneAuth;
  app: KintoneApp;
  onBack: () => void;
  onBackToAppList?: () => void;
  onLogout: () => void;
  editingQueryId?: string;
}

interface QueryOptions {
  sortField?: string;
  sortDirection?: string;
  limit?: number;
  offset?: number;
}

interface KintoneErrorResponse {
  code?: string;
  message?: string;
  id?: string;
}

/** プレビューで取得するレコード件数 */
const PREVIEW_SIZE = 20;
/** 入力が落ち着いてからプレビューを取り直すまでの待ち時間 */
const PREVIEW_DEBOUNCE_MS = 500;

interface QueryResult {
  records: Record<string, unknown>[];
  /** 条件に一致した総件数。取得件数(limit)には頭打ちされない。取れなければnull */
  totalCount: number | null;
  /** 自動プレビューの結果か、実行ボタンで取得した結果か */
  source: "preview" | "manual";
  error?: string | KintoneErrorResponse;
}

/** kintoneはtotalCountを文字列で返すので数値に直す */
function parseTotalCount(value?: string | null): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** 実行ボタンの隣に出す一致件数 */
function formatHitCount(result: QueryResult): string {
  return `${(result.totalCount ?? result.records.length).toLocaleString()}件`;
}

/** 結果パネルの見出しに出す説明 */
function describePreview(result: QueryResult): string {
  const shown = result.records.length;
  const total = result.totalCount;
  const prefix = result.source === "manual" ? "実行結果 " : "";

  if (total == null) return `${prefix}${shown}件を取得`;
  if (shown < total) {
    return `${prefix}条件に一致 ${total.toLocaleString()}件（表示は先頭${shown}件）`;
  }
  return `${prefix}条件に一致 ${total.toLocaleString()}件`;
}

/** 文字列中にJSONが埋まっているエラーは、パースして構造化して表示する */
function normalizeQueryError(
  error: unknown,
): string | KintoneErrorResponse | undefined {
  if (typeof error !== "string") {
    return error == null ? undefined : String(error);
  }

  const jsonMatch = error.match(/\{.*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as KintoneErrorResponse;
    } catch {
      return error;
    }
  }
  return error;
}

interface ConditionInputProps {
  condition: QueryCondition;
  index: number;
  onUpdate: (index: number, updates: Partial<QueryCondition>) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  onMove: (from: number, to: number) => void;
  fields: KintoneField[];
  users: Array<{ code: string; name: string; email: string }>;
  usersLoaded: boolean;
  onFetchUsers: () => void;
  canRemove: boolean;
}

// 定数定義
import {
  operators,
  fieldTypeOperators,
  fieldTypeFunctions,
} from "@/constants/kintone-query-constants";

const sortFieldOptions = [
  { value: "none", label: "並び替えなし" },
  { value: "レコード番号", label: "レコード番号" },
  { value: "作成日時", label: "作成日時" },
  { value: "更新日時", label: "更新日時" },
];

const sortDirectionOptions = [
  { value: "asc", label: "昇順" },
  { value: "desc", label: "降順" },
];

// 日時変換ユーティリティ（修正版）
const dateTimeUtils = {
  // 日本時間をUTCに変換
  convertJSTToUTC: (jstDateString: string): string => {
    try {
      // 日付のみの場合（YYYY-MM-DD）
      if (/^\d{4}-\d{2}-\d{2}$/.test(jstDateString)) {
        // 日本時間の日付として解釈し、UTCに変換
        const jstDate = toZonedTime(jstDateString + "T00:00:00", "Asia/Tokyo");
        const utcDate = fromZonedTime(jstDate, "Asia/Tokyo");
        return format(utcDate, "yyyy-MM-dd'T'HH:mm:ss'Z'");
      }

      // 日時の場合
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(jstDateString)) {
        if (jstDateString.includes("+") || jstDateString.includes("Z")) {
          // タイムゾーン情報がある場合、Dateで解析してUTCに変換
          const date = new Date(jstDateString);
          return date.toISOString();
        } else {
          // タイムゾーン情報がない場合は日本時間として扱う
          const jstZonedDate = toZonedTime(jstDateString, "Asia/Tokyo");
          const utcDate = fromZonedTime(jstZonedDate, "Asia/Tokyo");
          return format(utcDate, "yyyy-MM-dd'T'HH:mm:ss'Z'");
        }
      }

      return jstDateString;
    } catch (error) {
      console.error("Date conversion error:", error);
      return jstDateString;
    }
  },

  // UTCから日本時間に変換（表示用）
  convertUTCToJST: (utcDateString: string): string => {
    try {
      const utcDate = new Date(utcDateString);
      const jstDate = toZonedTime(utcDate, "Asia/Tokyo");
      return format(jstDate, "yyyy-MM-dd'T'HH:mm:ssXXX");
    } catch (error) {
      console.error("UTC to JST conversion error:", error);
      return utcDateString;
    }
  },

  // DateオブジェクトをJST形式の文字列に変換してUTCに変換
  toJSTString: (date: Date): string => {
    try {
      if (date instanceof Date && !isNaN(date.getTime())) {
        // JST時刻をUTCに変換してkintone用フォーマットで出力
        const utcDate = fromZonedTime(date, "Asia/Tokyo");
        return format(utcDate, "yyyy-MM-dd'T'HH:mm:ssXXX");
      }
      return "";
    } catch (error) {
      console.error("Date to JST string conversion error:", error);
      return "";
    }
  },
};

// モダンなDateTimePickerコンポーネント（スクロール式時間選択）
const ModernDateTimePicker: React.FC<{
  value?: string;
  onChange: (value: string) => void;
  mode?: "date" | "datetime";
  disabled?: boolean;
}> = ({ value, onChange, mode = "date", disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (value) {
      try {
        return new Date(value);
      } catch {
        return undefined;
      }
    }
    return undefined;
  });
  const [calendarKey, setCalendarKey] = useState(0);

  const [selectedHour, setSelectedHour] = useState<number>(() => {
    if (value && mode === "datetime") {
      try {
        const date = new Date(value);
        const hours = date.getHours();
        // NaNチェックを追加
        if (isNaN(hours)) return 0;
        return hours;
      } catch {
        return 0;
      }
    }
    return 0;
  });
  const [selectedMinute, setSelectedMinute] = useState<number>(() => {
    if (value && mode === "datetime") {
      try {
        const date = new Date(value);
        const minute = date.getMinutes();
        // NaNチェックを追加
        if (isNaN(minute)) return 0;
        // 5分刻みに丸める
        return Math.round(minute / 5) * 5;
      } catch {
        return 0;
      }
    }
    return 0;
  });

  // valueが変更されたときにselectedDateを同期
  useEffect(() => {
    if (value) {
      try {
        const newDate = new Date(value);
        if (!isNaN(newDate.getTime())) {
          setSelectedDate(new Date(newDate));
        }
      } catch {
        // 不正な日付の場合は何もしない
      }
    } else {
      setSelectedDate(undefined);
    }
  }, [value]);

  // 時間・分の選択肢を生成
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 5分刻み（0, 5, 10, ...55）

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    setSelectedDate(date);

    if (mode === "datetime") {
      // datetimeの場合は時刻も含めて更新
      date.setHours(selectedHour, selectedMinute, 0, 0);

      // JST→UTC変換してkintone用フォーマットで出力
      const formattedValue = dateTimeUtils.toJSTString(date);
      onChange(formattedValue);
    } else {
      // dateの場合は日付のみ（UTC変換不要）
      const formattedValue = format(date, "yyyy-MM-dd");
      onChange(formattedValue);
      setOpen(false); // 日付選択後に自動で閉じる
    }
  };

  const handleTimeChange = (hour: number, minute: number) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);

    if (selectedDate && mode === "datetime") {
      const newDate = new Date(selectedDate);
      newDate.setHours(hour, minute, 0, 0);

      // JST→UTC変換してkintone用フォーマットで出力
      const formattedValue = dateTimeUtils.toJSTString(newDate);
      onChange(formattedValue);
    }
  };

  const handleHourChange = (hour: number) => {
    handleTimeChange(hour, selectedMinute);
  };

  const handleMinuteChange = (minute: number) => {
    handleTimeChange(selectedHour, minute);
  };

  const handleToday = () => {
    const today = new Date();
    console.log('Today button clicked:', today);
    setSelectedDate(today);
    handleDateSelect(today);
    // カレンダーの年月ドロップダウンを強制更新するためのキー更新
    setCalendarKey(prev => prev + 1);
  };

  const handleNow = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = Math.round(now.getMinutes() / 5) * 5; // 5分刻みに丸める
    console.log('Now button clicked:', now, 'Time:', currentHour, currentMinute);
    setSelectedHour(currentHour);
    setSelectedMinute(currentMinute);
    setSelectedDate(now);
    handleTimeChange(currentHour, currentMinute);
    handleDateSelect(now);
  };

  const getButtonIcon = () => {
    if (mode === "datetime") {
      return <Clock className="h-4 w-4" />;
    }
    return <CalendarIcon className="h-4 w-4" />;
  };

  const getButtonTitle = () => {
    if (mode === "datetime") {
      return "日時を選択";
    }
    return "日付を選択";
  };

  // スクロール可能な時間選択コンポーネント
  const TimeScrollPicker: React.FC<{
    title: string;
    value: number;
    options: number[];
    onChange: (value: number) => void;
  }> = ({ title, value, options, onChange }) => {
    // NaNチェックを追加
    const safeValue = isNaN(value) ? 0 : value;

    return (
      <div className="flex flex-col items-center h-full min-h-0">
        <label className="text-xs font-medium text-muted-foreground mb-2 flex-shrink-0">{title}</label>
        <div className="flex-1 w-16 min-h-0 overflow-y-auto rounded-md border border-border bg-background shadow-sm">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option}
                className={`w-full py-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground ${
                  safeValue === option
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onChange(option)}
              >
                {option.toString().padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0"
          disabled={disabled}
          title={getButtonTitle()}
          aria-label={getButtonTitle()}
        >
          {getButtonIcon()}
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-[98vw] sm:max-w-fit max-h-[95vh] overflow-auto p-0 border-0 bg-transparent shadow-none"
        showCloseButton={false}
      >
        <div className="bg-background rounded-xl border border-border shadow-lg">
          {/* ダイアログヘッダー */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border">
            <h3 className="text-base sm:text-lg font-semibold">
              {mode === "datetime" ? "日時を選択" : "日付を選択"}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 w-8 p-0 shrink-0"
            >
              ✕
            </Button>
          </div>
          
          <div className="space-y-3 p-3 sm:space-y-4 sm:p-5">
            {/* アクションボタン */}
            <div className="flex justify-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="px-2 text-xs sm:px-4 sm:text-sm border-primary/20 hover:bg-primary/5 hover:border-primary/40 hover:text-primary"
            >
              今日
            </Button>
            {mode === "datetime" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNow}
                className="px-2 text-xs sm:px-4 sm:text-sm border-primary/20 hover:bg-primary/5 hover:border-primary/40 hover:text-primary"
              >
                <Clock className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                現在時刻
              </Button>
            )}
          </div>

          {/* メインコンテンツエリア */}
          <div
            className={`flex ${mode === "datetime" 
              ? "flex-col gap-3 sm:flex-row sm:gap-6 sm:items-start" 
              : "justify-center"
            }`}
          >
            {/* カレンダー */}
            <div className="flex-shrink-0 w-full sm:w-auto overflow-hidden max-w-full">
              <div className="bg-card rounded-lg border border-border shadow-sm p-3 sm:p-4 h-72 sm:h-80 overflow-hidden max-w-full">
                <Calendar
                  key={calendarKey}
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  locale={ja}
                  captionLayout="dropdown"
                  fromYear={2000}
                  toYear={2030}
                  className="w-full max-w-full rounded-md bg-transparent h-full flex flex-col overflow-hidden"
                  formatters={{
                    formatMonthDropdown: (date) => `${date.getMonth() + 1}月`,
                    formatYearDropdown: (date) => `${date.getFullYear()}年`,
                  }}
                  classNames={{
                    months: "flex flex-col gap-2 h-full w-full max-w-full",
                    month: "flex w-full max-w-full flex-col gap-2 h-full",
                    nav: "hidden", // ナビゲーション矢印を非表示
                    month_caption: "flex h-10 w-full items-center justify-center px-2 font-medium text-sm flex-shrink-0",
                    weekdays: "grid grid-cols-7 mb-1 border-b border-border/20 pb-1 w-full flex-shrink-0 gap-0",
                    weekday: "text-muted-foreground select-none text-xs font-medium py-0.5 text-center overflow-hidden text-ellipsis h-5",
                    weeks: "grid grid-rows-6 gap-0 flex-1 min-h-0 w-full",
                    week: "grid grid-cols-7 w-full gap-0 h-full",
                    day: "group/day relative select-none p-0 text-center overflow-hidden flex items-center justify-center aspect-square max-h-7",
                    table: "w-full max-w-full border-collapse flex-1 min-h-0"
                  }}
                />
              </div>
            </div>

            {/* 時刻選択（datetimeモードの場合のみ） */}
            {mode === "datetime" && (
              <div className="bg-card rounded-lg border border-border shadow-sm p-3 sm:p-4 sm:ml-3 h-72 sm:h-80 flex flex-col overflow-hidden w-full sm:w-auto">
                <div className="text-center mb-3 flex-shrink-0">
                  <Label className="text-sm font-medium text-foreground">時刻選択</Label>
                  <div className="mt-2 p-2 bg-accent/30 rounded-md border border-border">
                    <div className="text-lg font-mono font-semibold text-foreground">
                      {(isNaN(selectedHour) ? 0 : selectedHour)
                        .toString()
                        .padStart(2, "0")}
                      <span className="text-muted-foreground mx-1">:</span>
                      {(isNaN(selectedMinute) ? 0 : selectedMinute)
                        .toString()
                        .padStart(2, "0")}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 justify-center flex-1 min-h-0">
                  <TimeScrollPicker
                    title="時"
                    value={selectedHour}
                    options={hours}
                    onChange={handleHourChange}
                  />
                  <TimeScrollPicker
                    title="分"
                    value={selectedMinute}
                    options={minutes}
                    onChange={handleMinuteChange}
                  />
                </div>
              </div>
            )}
          </div>

          </div>
          
          {/* フッター */}
          <div className="flex justify-center border-t border-border p-3 sm:p-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="px-6 sm:px-8 w-full sm:w-auto text-sm border-primary/20 hover:bg-primary/5 hover:border-primary/40 hover:text-primary"
            >
              {mode === "datetime" ? "完了" : "選択"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ユーティリティ関数
const queryUtils = {
  // 条件のバリデーション
  validateCondition: (condition: QueryCondition): string[] => {
    const errors: string[] = [];

    if (!condition.field) {
      errors.push("フィールドを選択してください");
    }

    if (condition.operator === "in" || condition.operator === "not in") {
      if (
        !condition.values ||
        condition.values.length === 0 ||
        !condition.values.some((v) => v.trim())
      ) {
        errors.push("値を1つ以上入力してください");
      }
    } else if (
      !condition.value &&
      condition.operator !== "is" &&
      condition.operator !== "is not"
    ) {
      errors.push("値を入力してください");
    }

    return errors;
  },

  // クエリ生成（日時のUTC変換対応）
  generateQuery: (
    conditions: QueryCondition[],
    fields: KintoneField[],
    options: QueryOptions,
  ): string => {
    const validConditions = conditions.filter((c) => {
      if (c.operator === "in" || c.operator === "not in") {
        return (
          c.field &&
          c.values &&
          c.values.length > 0 &&
          c.values.some((v) => v.trim())
        );
      }
      return (
        c.field && (c.value || c.operator === "is" || c.operator === "is not")
      );
    });

    if (validConditions.length === 0) {
      return "";
    }

    // Kintone関数を判定するヘルパー関数
    const isKintoneFunction = (value: string): boolean => {
      const kintoneRegex = /^[A-Z_]+\([^)]*\)$/;
      const knownFunctions = [
        "LOGINUSER()",
        "TODAY()",
        "NOW()",
        "YESTERDAY()",
        "TOMORROW()",
        "THIS_WEEK()",
        "LAST_WEEK()",
        "NEXT_WEEK()",
        "THIS_MONTH()",
        "LAST_MONTH()",
        "NEXT_MONTH()",
        "THIS_YEAR()",
        "LAST_YEAR()",
        "NEXT_YEAR()",
        "PRIMARY_ORGANIZATION()",
      ];

      const trimmedValue = value.trim();
      return (
        kintoneRegex.test(trimmedValue) ||
        knownFunctions.includes(trimmedValue) ||
        /^FROM_TODAY\(\d+,\s*(DAYS|WEEKS|MONTHS|YEARS)\)$/.test(trimmedValue)
      );
    };

    // 日時フィールドかどうかを判定
    const isDateTimeField = (fieldCode: string): boolean => {
      const field = fields.find((f) => f.code === fieldCode);
      return (
        field?.type === "DATETIME" ||
        field?.type === "CREATED_TIME" ||
        field?.type === "UPDATED_TIME" ||
        fieldCode === "Created_datetime" ||
        fieldCode === "Updated_datetime"
      );
    };

    const isDateField = (fieldCode: string): boolean => {
      const field = fields.find((f) => f.code === fieldCode);
      return field?.type === "DATE";
    };

    let query = "";

    validConditions.forEach((condition, index) => {
      if (index > 0 && condition.logicalOperator) {
        query += ` ${condition.logicalOperator} `;
      }

      const field = condition.field;
      const operator = condition.operator;

      let value: string;
      if (operator === "in" || operator === "not in") {
        const validValues = (condition.values || []).filter((v) => v.trim());
        if (validValues.length === 0) return;

        // 各値に対してKintone関数かどうかを判定してエスケープを決定
        const formattedValues = validValues.map((v) => {
          if (isKintoneFunction(v)) {
            return v; // 関数の場合はエスケープしない
          } else {
            // 日時フィールドの場合はUTCに変換
            let processedValue = v;
            if (isDateTimeField(field) || isDateField(field)) {
              processedValue = dateTimeUtils.convertJSTToUTC(v);
            }
            return `"${processedValue.replace(/"/g, '\\"')}"`;
          }
        });

        value = `(${formattedValues.join(",")})`;
      } else if (operator === "is" || operator === "is not") {
        value = "null";
      } else {
        value = condition.value;
      }

      const fieldInfo = fields.find((f) => f.code === field);

      // クエリでは常にフィールドコードを使用
      const queryFieldCode: string = field;

      const isNumericField =
        fieldInfo?.type === "NUMBER" ||
        fieldInfo?.type === "CALC" ||
        fieldInfo?.type === "RECORD_NUMBER" ||
        fieldInfo?.type === "__ID__" ||
        field === "$id" ||
        field === "$revision" ||
        field === "レコード番号";

      const isInOperator = operator === "in" || operator === "not in";
      const isNullOperator = operator === "is" || operator === "is not";

      // 単一値の場合のエスケープ処理（in/not in演算子以外）
      if (!isInOperator && !isNullOperator) {
        const trimmedValue = value.trim();
        const isFunctionValue = isKintoneFunction(trimmedValue);

        if (!isFunctionValue) {
          // 日時フィールドの場合はUTCに変換
          if (isDateTimeField(field) || isDateField(field)) {
            value = dateTimeUtils.convertJSTToUTC(value);
          }

          if (!isNumericField) {
            const escapedValue = value.replace(/"/g, '\\"');
            value = `"${escapedValue}"`;
          }
        }
      }

      query += `${queryFieldCode} ${operator} ${value}`;
    });

    if (options.sortField && options.sortField !== "none") {
      query += ` order by ${options.sortField} ${options.sortDirection || "asc"}`;
    }

    if (options.limit) {
      query += ` limit ${options.limit}`;
    }

    if (options.offset) {
      query += ` offset ${options.offset}`;
    }

    return query;
  },
};

// コンポーネント定義
const LoadingSpinner: React.FC<{ message: string }> = ({ message }) => (
  <PageLoading message={message} />
);

const ErrorAlert: React.FC<{ error: string }> = ({ error }) => (
  <div className="bg-destructive/10 border-destructive/20 mb-6 rounded-lg border p-4">
    <div className="flex items-center space-x-2">
      <AlertCircle className="text-destructive h-4 w-4" />
      <p className="text-destructive">{error}</p>
    </div>
  </div>
);

const ConditionInput: React.FC<ConditionInputProps> = ({
  condition,
  index,
  onUpdate,
  onRemove,
  onDuplicate,
  onMove,
  fields,
  users,
  usersLoaded,
  onFetchUsers,
  canRemove,
}) => {
  const [localValue, setLocalValue] = useState(condition.value);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fieldComboboxOpen, setFieldComboboxOpen] = useState(false);
  const [functionDialogOpen, setFunctionDialogOpen] = useState(false);

  // デバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== condition.value) {
        onUpdate(index, { value: localValue });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, condition.value, index, onUpdate]);

  // condition.valueが外部から変更された場合にlocalValueを同期
  useEffect(() => {
    setLocalValue(condition.value);
  }, [condition.value]);

  // フィールドタイプに基づく利用可能な演算子を取得
  const getAvailableOperators = useCallback(
    (fieldCode: string) => {
      const field = fields.find((f) => f.code === fieldCode);
      if (!field) return operators;

      const availableOperatorValues = fieldTypeOperators[field.type] || [
        "=",
        "!=",
        "in",
        "not in",
      ];

      return operators.filter((op: { value: QueryOperator; label: string }) =>
        availableOperatorValues.includes(op.value),
      );
    },
    [fields],
  );

  // フィールドタイプに基づく利用可能な関数を取得
  const getAvailableFunctions = useCallback(
    (
      fieldCode: string,
    ): { value: string; label: string; description: string }[] => {
      const field = fields.find((f) => f.code === fieldCode);
      const typeKey = field?.type || "";

      // 重複を避けるためにMap を使用（valueをキーとする）
      const functionsMap = new Map<
        string,
        { value: string; label: string; description: string }
      >();

      // タイプベースの関数を追加
      if (typeKey && fieldTypeFunctions[typeKey]) {
        fieldTypeFunctions[typeKey].forEach(
          (func: { value: string; label: string; description: string }) =>
            functionsMap.set(func.value, func),
        );
      }

      // フィールドコードベースの関数を追加（重複は上書きされる）
      if (fieldCode && fieldTypeFunctions[fieldCode]) {
        fieldTypeFunctions[fieldCode].forEach(
          (func: { value: string; label: string; description: string }) =>
            functionsMap.set(func.value, func),
        );
      }

      return Array.from(functionsMap.values());
    },
    [fields],
  );

  const fieldInfo = useMemo(
    () =>
      fields.find(
        (f) => f.code === condition.field || f.label === condition.field,
      ),
    [fields, condition.field],
  );

  // フィールド名やラベルからユーザー選択フィールドを推測するパターン
  const userFieldPatterns = [
    /^担当者?$/i,
    /^責任者$/i,
    /^管理者$/i,
    /^承認者$/i,
    /^作成者$/i,
    /^更新者$/i,
    /^ユーザー$/i,
    /担当$/i,
    /責任$/i,
    /管理$/i,
    /承認$/i,
    /営業$/i,
    /商談担当$/i,
    /プロジェクト.*担当$/i,
    /^user$/i,
    /^assignee$/i,
    /^owner$/i,
    /^manager$/i,
    /^admin$/i,
    /responsible$/i,
    /creator$/i,
    /modifier$/i
  ];

  const isUserFieldByName = fieldInfo && userFieldPatterns.some(pattern => 
    pattern.test(fieldInfo.code) || pattern.test(fieldInfo.label)
  );

  const isUserField =
    fieldInfo?.type === "CREATOR" || 
    fieldInfo?.type === "MODIFIER" ||
    fieldInfo?.type === "USER_SELECT" ||
    fieldInfo?.type === "ORGANIZATION_SELECT" ||
    fieldInfo?.type === "GROUP_SELECT" ||
    fieldInfo?.type === "STATUS_ASSIGNEE" ||
    isUserFieldByName;

  // デバッグログ：ユーザーフィールド判定の結果
  React.useEffect(() => {
    if (fieldInfo && isUserField) {
      console.log(`🟢 ユーザーフィールド検出:`, {
        code: fieldInfo.code,
        label: fieldInfo.label,
        type: fieldInfo.type,
        byType: fieldInfo.type === "CREATOR" || fieldInfo.type === "MODIFIER" || 
               fieldInfo.type === "USER_SELECT" || fieldInfo.type === "ORGANIZATION_SELECT" ||
               fieldInfo.type === "GROUP_SELECT" || fieldInfo.type === "STATUS_ASSIGNEE",
        byName: isUserFieldByName
      });
    }
  }, [fieldInfo, isUserField, isUserFieldByName]);
  const isDateField = fieldInfo?.type === "DATE";
  const isDateTimeField =
    fieldInfo?.type === "DATETIME" ||
    fieldInfo?.type === "CREATED_TIME" ||
    fieldInfo?.type === "UPDATED_TIME";
  // 選択肢を持つフィールドは自由入力ではなく選択式にする
  const optionChoices = fieldInfo?.options ?? [];
  const isOptionField =
    (fieldInfo?.type === "DROP_DOWN" ||
      fieldInfo?.type === "RADIO_BUTTON" ||
      fieldInfo?.type === "CHECK_BOX" ||
      fieldInfo?.type === "MULTI_SELECT") &&
    optionChoices.length > 0;
  const isInOperator =
    condition.operator === "in" || condition.operator === "not in";
  const isNullOperator =
    condition.operator === "is" || condition.operator === "is not";

  // 安全に関数の存在をチェック
  const hasFunctions = useMemo(() => {
    if (!condition.field) return false;

    const fieldObj = fields.find((f) => f.code === condition.field);
    const typeKey = fieldObj?.type || "";

    const typeFunctions =
      typeKey && fieldTypeFunctions[typeKey]
        ? fieldTypeFunctions[typeKey].length > 0
        : false;
    const codeFunctions = fieldTypeFunctions[condition.field]
      ? fieldTypeFunctions[condition.field].length > 0
      : false;

    return typeFunctions || codeFunctions;
  }, [condition.field, fields]);

  const getPlaceholder = useCallback(() => {
    if (isUserField) {
      return "ユーザーコード または LOGINUSER()";
    }
    if (fieldInfo?.type === "NUMBER" || fieldInfo?.type === "CALC") {
      return "数値を入力 (例: 123)";
    }
    if (isDateTimeField) {
      return '日時を入力 (例: "2024-07-10T08:00:00+09:00") または関数';
    }
    if (isDateField) {
      return '日付を入力 (例: "2024-07-10") または関数';
    }
    return "値を入力";
  }, [fieldInfo, isUserField, isUserFieldByName, isDateField, isDateTimeField]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
        if (!Number.isNaN(from) && from !== index) onMove(from, index);
      }}
      className={`bg-muted/20 min-w-0 rounded-md border p-2.5 break-words transition-shadow ${
        isDragOver ? "ring-primary/60 ring-2" : ""
      }`}
    >
      <div className="flex flex-wrap items-start gap-2">
        {/* 左ガター: グリップ + 条件番号 / AND・OR */}
        <div className="flex w-24 flex-shrink-0 items-center gap-1 self-center">
          <span
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", String(index));
              e.dataTransfer.effectAllowed = "move";
            }}
            title="ドラッグして並び替え"
            aria-label={`条件 ${index + 1} をドラッグして並び替え`}
            className="text-muted-foreground/60 hover:text-muted-foreground -ml-1 cursor-grab p-1 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </span>
          {index === 0 ? (
            <span className="text-muted-foreground text-xs font-medium">
              条件 1
            </span>
          ) : (
            <Select
              value={condition.logicalOperator}
              onValueChange={(value: "and" | "or") =>
                onUpdate(index, { logicalOperator: value })
              }
            >
              <SelectTrigger
                className="h-9 w-full text-xs"
                aria-label="論理演算子を選択"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="and">AND</SelectItem>
                <SelectItem value="or">OR</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

          {/* フィールド選択 */}
          <div className="w-64 min-w-[13rem] flex-shrink-0">
            <Popover
              open={fieldComboboxOpen}
              onOpenChange={setFieldComboboxOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={fieldComboboxOpen}
                  aria-label="フィールドを選択"
                  className="w-full justify-between"
                >
                  <span className="truncate">
                    {condition.field
                      ? fields.find((field) => field.code === condition.field)
                          ?.label
                      : "フィールドを選択"}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0">
                <Command>
                  <CommandInput placeholder="フィールドを検索..." />
                  <CommandList>
                    <CommandEmpty>フィールドが見つかりません。</CommandEmpty>
                    <CommandGroup>
                      {fields.map((field) => (
                        <CommandItem
                          key={field.code}
                          value={field.code}
                          onSelect={() => {
                            const availableOps =
                              fieldTypeOperators[field.type] || [];
                            const currentOp = condition.operator;
                            const newOperator = availableOps.includes(currentOp)
                              ? currentOp
                              : (availableOps[0] as QueryOperator) || "=";

                            onUpdate(index, {
                              field: field.code,
                              operator: newOperator,
                              value: "",
                              values: undefined,
                            });
                            setFieldComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              condition.field === field.code
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                          <div className="flex flex-col">
                            <span>{field.label}</span>
                            <span className="text-muted-foreground text-xs leading-tight">
                              {field.code}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* 演算子選択 */}
          <div className="w-44 flex-shrink-0">
            <Select
              value={condition.operator}
              onValueChange={(value) =>
                onUpdate(index, { operator: value as QueryOperator })
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label="演算子を選択"
                title={getOperatorHint(condition.operator) ?? undefined}
              >
                <SelectValue className="truncate" />
              </SelectTrigger>
              <SelectContent className="min-w-[200px]">
                {getAvailableOperators(condition.field).map(
                  (op: { value: QueryOperator; label: string }) => (
                    <SelectItem
                      key={op.value}
                      value={op.value}
                      className="whitespace-nowrap"
                    >
                      {op.label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

        {/* 値入力エリア */}
        <div className="min-w-[14rem] flex-1">
        {!isNullOperator ? (
          <div className="space-y-2">
            {isInOperator ? (
              /* 複数値入力 */
              <div className="space-y-2">
                {(condition.values || [""]).map((value, valueIndex) => (
                  <div key={valueIndex} className="flex gap-2">
                    {/* 入力フィールド（選択肢フィールドは選択式） */}
                    {isOptionField ? (
                      <Select
                        value={value || undefined}
                        onValueChange={(newValue) => {
                          const newValues = [...(condition.values || [""])];
                          newValues[valueIndex] = newValue;
                          onUpdate(index, { values: newValues });
                        }}
                      >
                        <SelectTrigger
                          className="flex-1"
                          aria-label={`値 ${valueIndex + 1} を選択`}
                        >
                          <SelectValue placeholder="選択肢から選ぶ" />
                        </SelectTrigger>
                        <SelectContent>
                          {optionChoices.map((choice) => (
                            <SelectItem key={choice} value={choice}>
                              {choice}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={value}
                        onChange={(e) => {
                          const newValues = [...(condition.values || [""])];
                          newValues[valueIndex] = e.target.value;
                          onUpdate(index, { values: newValues });
                        }}
                        placeholder={getPlaceholder()}
                        className="flex-1"
                        aria-label={`値 ${valueIndex + 1}`}
                      />
                    )}

                    {/* ボタン群 */}
                    <div className="flex gap-1">
                      {/* カレンダーボタン（日付フィールドの場合） */}
                      {isDateField && (
                        <ModernDateTimePicker
                          mode="date"
                          value={value}
                          onChange={(newValue) => {
                            const newValues = [...(condition.values || [""])];
                            newValues[valueIndex] = newValue;
                            onUpdate(index, { values: newValues });
                          }}
                        />
                      )}

                      {/* カレンダー+時刻ボタン（日時フィールドの場合） */}
                      {isDateTimeField && (
                        <ModernDateTimePicker
                          mode="datetime"
                          value={value}
                          onChange={(newValue) => {
                            const newValues = [...(condition.values || [""])];
                            newValues[valueIndex] = newValue;
                            onUpdate(index, { values: newValues });
                          }}
                        />
                      )}

                      {/* ユーザー選択ボタン */}
                      {isUserField && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 w-10 p-0"
                              onClick={() => {
                                if (!usersLoaded && users.length === 0) {
                                  onFetchUsers();
                                }
                              }}
                              aria-label="ユーザーを選択"
                              title="ユーザーを選択"
                            >
                              <User className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0">
                            <Command>
                              <CommandInput placeholder="ユーザーを検索..." />
                              <CommandList>
                                <CommandEmpty>
                                  {usersLoaded
                                    ? "ユーザーが見つかりません"
                                    : "ユーザー読み込み中..."}
                                </CommandEmpty>
                                <CommandGroup>
                                  {users.map((user) => (
                                    <CommandItem
                                      key={user.code}
                                      value={user.code}
                                      onSelect={() => {
                                        if (isInOperator) {
                                          // 複数値の場合
                                          const newValues = [
                                            ...(condition.values || [""]),
                                          ];
                                          newValues[valueIndex] = user.code;
                                          onUpdate(index, { values: newValues });
                                        } else {
                                          // 単一値の場合
                                          onUpdate(index, { value: user.code });
                                        }
                                      }}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {user.name}
                                        </span>
                                        <span className="text-muted-foreground text-sm">
                                          {user.code} ({user.email})
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}

                      {/* 関数選択ボタン */}
                      {hasFunctions && (
                        <Dialog
                          open={functionDialogOpen}
                          onOpenChange={setFunctionDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 w-10 p-0"
                              title="関数を選択"
                              aria-label="関数を選択"
                            >
                              <span className="text-sm font-semibold italic">
                              fx
                            </span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>関数を選択</DialogTitle>
                              <DialogDescription>
                                利用可能な関数から選択してください
                              </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-60 space-y-2 overflow-y-auto">
                              {getAvailableFunctions(condition.field).map(
                                (func: {
                                  value: string;
                                  label: string;
                                  description: string;
                                }) => (
                                  <div
                                    key={func.value}
                                    className="hover:bg-muted flex cursor-pointer items-center justify-between rounded p-2"
                                    onClick={() => {
                                      const newValues = [
                                        ...(condition.values || [""]),
                                      ];
                                      newValues[valueIndex] = func.value;
                                      onUpdate(index, { values: newValues });
                                      setFunctionDialogOpen(false);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        const newValues = [
                                          ...(condition.values || [""]),
                                        ];
                                        newValues[valueIndex] = func.value;
                                        onUpdate(index, { values: newValues });
                                        setFunctionDialogOpen(false);
                                      }
                                    }}
                                  >
                                    <div className="flex-1">
                                      <div className="text-sm font-medium">
                                        {func.label}
                                      </div>
                                      <div className="text-muted-foreground text-xs">
                                        {func.description}
                                      </div>
                                      <div className="mt-1 text-primary font-mono text-xs">
                                        {func.value}
                                      </div>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>

                    {/* 削除ボタン */}
                    {(condition.values || [""]).length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newValues = [...(condition.values || [""])];
                          newValues.splice(valueIndex, 1);
                          onUpdate(index, { values: newValues });
                        }}
                        className="text-destructive hover:text-destructive h-10 w-10 p-0"
                        aria-label={`値 ${valueIndex + 1} を削除`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newValues = [...(condition.values || [""]), ""];
                    onUpdate(index, { values: newValues });
                  }}
                  className="w-full"
                  aria-label="値を追加"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  値を追加
                </Button>
              </div>
            ) : (
              /* 単一値入力 */
              <div className="space-y-2">
                <div className="flex gap-2">
                  {/* 入力フィールド（選択肢フィールドは選択式） */}
                  {isOptionField ? (
                    <Select
                      value={localValue || undefined}
                      onValueChange={(value) => {
                        setLocalValue(value);
                        onUpdate(index, { value });
                      }}
                    >
                      <SelectTrigger className="flex-1" aria-label="値を選択">
                        <SelectValue placeholder="選択肢から選ぶ" />
                      </SelectTrigger>
                      <SelectContent>
                        {optionChoices.map((choice) => (
                          <SelectItem key={choice} value={choice}>
                            {choice}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={localValue}
                      onChange={(e) => setLocalValue(e.target.value)}
                      placeholder={getPlaceholder()}
                      className="flex-1"
                      aria-label="値を入力"
                    />
                  )}

                  {/* ボタン群 */}
                  <div className="flex gap-1">
                    {/* カレンダーボタン（日付フィールドの場合） */}
                    {isDateField && (
                      <ModernDateTimePicker
                        mode="date"
                        value={localValue}
                        onChange={(newValue) => {
                          setLocalValue(newValue);
                          onUpdate(index, { value: newValue });
                        }}
                      />
                    )}

                    {/* カレンダー+時刻ボタン（日時フィールドの場合） */}
                    {isDateTimeField && (
                      <ModernDateTimePicker
                        mode="datetime"
                        value={localValue}
                        onChange={(newValue) => {
                          setLocalValue(newValue);
                          onUpdate(index, { value: newValue });
                        }}
                      />
                    )}

                    {/* ユーザー選択ボタン */}
                    {isUserField && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 w-10 p-0"
                            onClick={() => {
                              if (!usersLoaded && users.length === 0) {
                                onFetchUsers();
                              }
                            }}
                            aria-label="ユーザーを選択"
                            title="ユーザーを選択"
                          >
                            <User className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Command>
                            <CommandInput placeholder="ユーザーを検索..." />
                            <CommandList>
                              <CommandEmpty>
                                {usersLoaded
                                  ? "ユーザーが見つかりません"
                                  : "ユーザー読み込み中..."}
                              </CommandEmpty>
                              <CommandGroup>
                                {users.map((user) => (
                                  <CommandItem
                                    key={user.code}
                                    value={user.code}
                                    onSelect={() => {
                                      onUpdate(index, { value: user.code });
                                      setLocalValue(user.code);
                                    }}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {user.name}
                                      </span>
                                      <span className="text-muted-foreground text-sm">
                                        {user.code} ({user.email})
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}

                    {/* 関数選択ボタン */}
                    {hasFunctions && (
                      <Dialog
                        open={functionDialogOpen}
                        onOpenChange={setFunctionDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 w-10 p-0"
                            title="関数を選択"
                            aria-label="関数を選択"
                          >
                            <span className="text-sm font-semibold italic">fx</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>関数を選択</DialogTitle>
                            <DialogDescription>
                              利用可能な関数から選択してください
                            </DialogDescription>
                          </DialogHeader>
                          <div className="max-h-60 space-y-2 overflow-y-auto">
                            {getAvailableFunctions(condition.field).map(
                              (func: {
                                value: string;
                                label: string;
                                description: string;
                              }) => (
                                <div
                                  key={func.value}
                                  className="hover:bg-muted flex cursor-pointer items-center justify-between rounded p-2"
                                  onClick={() => {
                                    onUpdate(index, { value: func.value });
                                    setLocalValue(func.value);
                                    setFunctionDialogOpen(false);
                                  }}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      onUpdate(index, { value: func.value });
                                      setLocalValue(func.value);
                                      setFunctionDialogOpen(false);
                                    }
                                  }}
                                >
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">
                                      {func.label}
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                      {func.description}
                                    </div>
                                    <div className="mt-1 text-primary font-mono text-xs">
                                      {func.value}
                                    </div>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground flex h-9 items-center text-sm">
            値の入力は不要です
          </div>
        )}
        </div>

        {/* 行アクション */}
        <div className="flex flex-shrink-0 items-center gap-1 self-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDuplicate(index)}
            className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
            title="この条件を複製"
            aria-label="条件を複製"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-destructive hover:text-destructive h-8 w-8 p-0"
            disabled={!canRemove}
            aria-label="条件を削除"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 未入力の条件はクエリに含まれないことを知らせる */}
      {condition.field &&
        !isNullOperator &&
        (isInOperator
          ? (condition.values || []).every((v) => !v.trim())
          : !localValue.trim()) && (
          <p className="mt-1 pl-24 text-xs text-yellow-700 dark:text-yellow-400">
            値が未入力のため、この条件はクエリに含まれません
          </p>
        )}
    </div>
  );
};

export default function QueryGeneratorPage({
  auth,
  app,
  onBack,
  onBackToAppList,
  onLogout,
  editingQueryId,
}: QueryGeneratorPageProps) {
  const { toast } = useToast();
  // State管理
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<KintoneField[]>([]);
  const [generatedQuery, setGeneratedQuery] = useState("");
  // 出力バンドの表示モード（貼り付け先の環境に合わせて切り替える）
  const [outputView, setOutputView] = useState<OutputView>(
    DEFAULT_QUERY_OUTPUT_FORMAT,
  );
  const [savePopoverOpen, setSavePopoverOpen] = useState(false);
  // 結果パネルは常設（モーダルにしない）。開いた状態で始めるので、
  // 画面を開いた時点でレコードが見えている
  const [resultsPanelExpanded, setResultsPanelExpanded] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  /** 最新リクエストの世代。古いレスポンスの追い越しを捨てるために使う */
  const queryRequestId = useRef(0);
  /** 直前に投げたクエリ。同じ内容なら投げ直さない */
  const lastRequestedQuery = useRef<string | null>(null);
  const [error, setError] = useState<string>("");
  const [conditions, setConditions] = useState<QueryCondition[]>([
    { field: "", operator: "=", value: "", logicalOperator: "and" },
  ]);
  const [sortField, setSortField] = useState("none");
  const [sortDirection, setSortDirection] = useState("asc");
  const [limit, setLimit] = useState<number>();
  const [offset, setOffset] = useState<number>();
  const [executing, setExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState("table");
  const [currentQueryName, setCurrentQueryName] = useState("");
  const [currentQueryMemo, setCurrentQueryMemo] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentSavedQueryId, setCurrentSavedQueryId] = useState<string | null>(null);

  // 編集中の入力があるか（リセット・離脱の確認に使用）
  const hasUnsavedInput = useMemo(
    () =>
      conditions.some(
        (c) =>
          c.field || c.value.trim() || (c.values || []).some((v) => v.trim()),
      ) ||
      sortField !== "none" ||
      limit !== undefined ||
      offset !== undefined,
    [conditions, sortField, limit, offset],
  );

  // キーボードショートカット for 戻る (Escape キー)
  // - ポップオーバーやダイアログが開いている間はRadix側のEscape（閉じる）を優先する
  // - IME変換中のEscapeでは反応しない
  // - 編集中の入力がある場合は即座に離脱せず確認ダイアログを挟む
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.ctrlKey || event.metaKey) return;
      if (event.isComposing) return;
      if (event.defaultPrevented) return;

      const hasOpenLayer = document.querySelector(
        '[data-radix-popper-content-wrapper], [role="dialog"][data-state="open"]',
      );
      if (hasOpenLayer) return;

      if (hasUnsavedInput) {
        setLeaveDialogOpen(true);
      } else {
        onBack();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onBack, hasUnsavedInput]);

  const [saveAnimating, setSaveAnimating] = useState(false);
  const [saveAsAnimating, setSaveAsAnimating] = useState(false);
  const [navigatingToQueryList, setNavigatingToQueryList] = useState(false);
  const [clipboardCopied, setClipboardCopied] = useState(false);
  const [appIdCopied, setAppIdCopied] = useState(false);
  const [spaceIdCopied, setSpaceIdCopied] = useState(false);
  const [queryExecuted, setQueryExecuted] = useState(false);
  const [users, setUsers] = useState<
    Array<{ code: string; name: string; email: string }>
  >([]);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const { savedQueries, saveQuery } = useQueryGenerator(app.appId);

  // kintoneアプリをブラウザで開く関数
  const openAppInBrowser = useCallback(async () => {
    const kintoneAppUrl = `https://${auth.subdomain}.cybozu.com/k/${app.appId}/`;
    
    try {
      // OS既定のブラウザで直接アプリページを開く
      await window.electronAppAPI.openExternalURL(kintoneAppUrl);
    } catch (error) {
      console.error('Failed to open app URL:', error);
      // フォールバック：従来のwindow.openを使用
      window.open(kintoneAppUrl, '_blank');
    }
  }, [auth.subdomain, app.appId]);

  const queryOptions = useMemo(
    (): QueryOptions => ({
      sortField,
      sortDirection,
      limit,
      offset,
    }),
    [sortField, sortDirection, limit, offset],
  );

  // コールバック関数
  const handleConditionUpdate = useCallback(
    (index: number, updates: Partial<QueryCondition>) => {
      setConditions((prev) =>
        prev.map((condition, i) =>
          i === index ? { ...condition, ...updates } : condition,
        ),
      );
    },
    [],
  );

  const addCondition = useCallback(() => {
    setConditions((prev) => [
      ...prev,
      { field: "", operator: "=", value: "", logicalOperator: "and" },
    ]);
  }, []);

  const removeCondition = useCallback((index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const duplicateCondition = useCallback((index: number) => {
    setConditions((prev) => {
      const next = [...prev];
      const source = prev[index];
      next.splice(index + 1, 0, {
        ...source,
        values: source.values ? [...source.values] : undefined,
      });
      return next;
    });
  }, []);

  const moveCondition = useCallback((from: number, to: number) => {
    setConditions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const resetConditions = useCallback(() => {
    setConditions([{ field: "", operator: "=", value: "", logicalOperator: "and" }]);
    setSortField("none");
    setSortDirection("asc");
    setLimit(undefined);
    setOffset(undefined);
  }, []);

  // ソートフィールド変更時の処理
  const handleSortFieldChange = useCallback((value: string) => {
    setSortField(value);
  }, []);

  const fetchUsers = useCallback(async () => {
    if (usersLoaded || users.length > 0) return;

    if (!auth?.subdomain || !auth?.username) {
      console.error("Auth information is missing:", auth);
      return;
    }

    try {
      setUsersLoaded(true);
      const result = await window.kintoneAPI.getUsers(auth);

      if (result.success && result.data) {
        setUsers(result.data);
      } else {
        console.error("Failed to fetch users:", result.error);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [auth, usersLoaded, users.length]);

  /**
   * クエリを投げて結果パネルに反映する。
   * 自動プレビューと実行ボタンで共用し、常に最新のリクエストだけを採用する。
   */
  const runQuery = useCallback(
    async (query: string, source: "preview" | "manual") => {
      const requestId = ++queryRequestId.current;
      if (source === "manual") {
        setExecuting(true);
      } else {
        setPreviewLoading(true);
      }

      try {
        const result = await window.kintoneAPI.executeQuery(
          auth,
          app.appId,
          query,
          app.spaceId,
          { totalCount: true },
        );

        // 入力が進んで後続のリクエストが出ていたら、古いレスポンスは捨てる
        if (requestId !== queryRequestId.current) return;

        if (result.success && result.data) {
          setQueryResult({
            records: result.data.records ?? [],
            totalCount: parseTotalCount(result.data.totalCount),
            source,
          });
        } else {
          setQueryResult({
            records: [],
            totalCount: null,
            source,
            error: normalizeQueryError(result.error),
          });
        }
      } catch (err) {
        if (requestId !== queryRequestId.current) return;
        setQueryResult({
          records: [],
          totalCount: null,
          source,
          error: `エラーが発生しました: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        });
      } finally {
        if (requestId === queryRequestId.current) {
          setExecuting(false);
          setPreviewLoading(false);
        }
      }
    },
    [auth, app.appId, app.spaceId],
  );

  /**
   * プレビュー用のクエリ。条件と並び順はそのまま使い、取得件数と開始位置だけ
   * プレビュー用に固定する（貼り付け用に生成するクエリ文字列とは別物）。
   * 条件が1つもないときは全レコードの先頭を出す。
   */
  const previewQuery = useMemo(() => {
    const built = queryUtils.generateQuery(conditions, fields, {
      ...queryOptions,
      limit: PREVIEW_SIZE,
      offset: undefined,
    });
    return built || `limit ${PREVIEW_SIZE}`;
  }, [conditions, fields, queryOptions]);

  // 条件を編集するたびにプレビューを取り直す。
  // 値の入力途中に連打しないよう待ってから投げ、内容が変わらなければ投げない。
  // （未入力の条件はgenerateQueryが除外するので、組み立て途中で不正クエリにはならない）
  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      if (lastRequestedQuery.current === previewQuery) return;
      lastRequestedQuery.current = previewQuery;
      runQuery(previewQuery, "preview");
    }, PREVIEW_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [previewQuery, loading, runQuery]);

  // 実行ボタンは、取得件数・開始位置の指定も含めた「本番のクエリ」をそのまま叩く
  const executeQuery = useCallback(async () => {
    lastRequestedQuery.current = null;
    await runQuery(generatedQuery || `limit ${PREVIEW_SIZE}`, "manual");
  }, [generatedQuery, runQuery]);


  // APIプレビュー表示・コピーで共用するJSONリクエストボディ
  const apiRequestBodyJson = JSON.stringify(
    {
      app: app.appId,
      ...(generatedQuery && { query: generatedQuery }),
      ...(limit && { size: parseInt(limit.toString()) }),
      ...(offset && { offset: parseInt(offset.toString()) }),
    },
    null,
    2,
  );

  // Ctrl+Enter（macはCmd+Enter）でクエリ実行
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (generatedQuery && !executing) {
          e.preventDefault();
          executeQuery();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [generatedQuery, executing, executeQuery]);

  const handleSaveQuery = useCallback(async () => {
    if (!generatedQuery || !currentQueryName.trim()) {
      toast("クエリ名とクエリ内容が必要です", "error");
      return;
    }

    try {
      setSaveAnimating(true);

      const savedQuery = saveQuery(
        currentQueryName.trim(),
        conditions,
        sortField !== "none" ? sortField : "",
        generatedQuery,
        limit,
        offset,
        currentSavedQueryId || editingQueryId,
        currentQueryMemo.trim()
      );

      // 保存後に更新モードに切り替え
      if (savedQuery) {
        setCurrentSavedQueryId(savedQuery.id);
        setIsEditMode(true);
      }

      // 0.8秒後にローディング状態に切り替え
      setTimeout(() => {
        setSaveAnimating(false);
        setNavigatingToQueryList(true);
        
        // さらに0.5秒後に画面遷移
        setTimeout(() => {
          setNavigatingToQueryList(false);
          onBack();
        }, 500);
      }, 800);
    } catch (error) {
      console.error("Error saving query:", error);
      setSaveAnimating(false);
      setNavigatingToQueryList(false);
      toast("クエリの保存に失敗しました", "error");
    }
  }, [
    generatedQuery,
    currentQueryName,
    currentQueryMemo,
    conditions,
    sortField,
    limit,
    offset,
    currentSavedQueryId,
    editingQueryId,
    saveQuery,
    onBack,
  ]);

  // 別名保存用の関数
  const handleSaveAsQuery = useCallback(async () => {
    if (!generatedQuery || !currentQueryName.trim()) {
      toast("クエリ名とクエリ内容が必要です", "error");
      return;
    }

    try {
      setSaveAsAnimating(true);

      // 別名保存時はeditingIdを渡さない（新規として保存）
      const savedQuery = saveQuery(
        currentQueryName.trim(),
        conditions,
        sortField !== "none" ? sortField : "",
        generatedQuery,
        limit,
        offset,
        undefined, // 新規として保存
        currentQueryMemo.trim()
      );

      // 保存後に新しいクエリを編集モードに切り替え
      if (savedQuery) {
        setCurrentSavedQueryId(savedQuery.id);
        setIsEditMode(true);
      }

      // 0.8秒後にローディング状態に切り替え
      setTimeout(() => {
        setSaveAsAnimating(false);
        setNavigatingToQueryList(true);
        
        // さらに0.5秒後に画面遷移
        setTimeout(() => {
          setNavigatingToQueryList(false);
          onBack();
        }, 500);
      }, 800);
    } catch (error) {
      console.error("Error saving query as new:", error);
      setSaveAsAnimating(false);
      setNavigatingToQueryList(false);
      toast("クエリの別名保存に失敗しました", "error");
    }
  }, [
    generatedQuery,
    currentQueryName,
    currentQueryMemo,
    conditions,
    sortField,
    limit,
    offset,
    saveQuery,
    onBack,
  ]);





  // Effects - 編集モードの初期化（editingQueryIdがある場合のみ）
  useEffect(() => {
    console.log("編集モード初期化:", { 
      editingQueryId, 
      savedQueriesLength: savedQueries.length, 
      fieldsLength: fields.length,
      loading 
    });
    
    // フィールドが読み込まれ、savedQueriesが存在し、編集対象IDがある場合のみ実行
    if (editingQueryId && savedQueries.length > 0 && fields.length > 0 && !loading) {
      const queryToEdit = savedQueries.find((q) => q.id === editingQueryId);
      console.log("編集対象クエリ:", queryToEdit);
      
      if (queryToEdit) {
        console.log("編集クエリの条件:", queryToEdit.conditions);
        
        // 各条件の詳細をログ出力
        queryToEdit.conditions.forEach((condition, index) => {
          console.log(`読み込み条件 ${index}:`, {
            field: condition.field,
            operator: condition.operator,
            value: condition.value,
            values: condition.values,
            logicalOperator: condition.logicalOperator
          });
        });
        
        // 条件が有効かチェック（フィールドが存在するか）
        const validConditions = queryToEdit.conditions.map(condition => {
          const fieldExists = fields.find(f => f.code === condition.field);
          if (!fieldExists && condition.field) {
            console.warn(`フィールド ${condition.field} が見つかりません`);
            return { ...condition, field: "" }; // フィールドが見つからない場合はリセット
          }
          return condition;
        });
        
        console.log("設定される条件:", validConditions);
        setConditions(validConditions);
        setSortField(queryToEdit.orderBy || "none");
        setLimit(queryToEdit.limit);
        setOffset(queryToEdit.offset);
        setCurrentQueryName(queryToEdit.name);
        setCurrentQueryMemo(queryToEdit.memo || "");
        setCurrentSavedQueryId(queryToEdit.id);
        setIsEditMode(true);
        console.log("編集モード設定完了");
      }
    } else if (editingQueryId && (savedQueries.length === 0 || fields.length === 0 || loading)) {
      // データがまだ読み込まれていない場合は何もしない
      console.log("データがまだ読み込まれていません");
    } else if (!editingQueryId && !currentSavedQueryId) {
      // 新規作成かつまだ保存されていない場合のみリセット
      setIsEditMode(false);
      setCurrentQueryName("");
      setCurrentQueryMemo("");
      console.log("新規モードに設定");
    }
  }, [editingQueryId, savedQueries, currentSavedQueryId, fields, loading]);

  // デバッグ用: conditions状態の変化を追跡
  useEffect(() => {
    console.log("条件状態が変更されました:", conditions);
  }, [conditions]);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        setLoading(true);
        setError("");

        if (!window.kintoneAPI) {
          setError(
            "KintoneAPIが利用できません。アプリケーションを再起動してください。",
          );
          return;
        }

        const result = await window.kintoneAPI.getAppFields(
          auth,
          app.appId,
          app.spaceId,
        );

        if (result.success && result.data?.fields) {
          setFields(result.data.fields);

          // フィールドの一覧をログ出力
          console.log("=== フィールド一覧 ===");
          console.log(`総フィールド数: ${result.data.fields.length}`);

          // 基本情報
          result.data.fields.forEach((field: KintoneField, index: number) => {
            console.log(
              `${index + 1}. ${field.label} (${field.code}) - Type: ${field.type}`,
            );
          });

          // 詳細なフィールド情報（JSON形式）
          console.log("\n=== 詳細フィールド情報 ===");
          console.log(JSON.stringify(result.data.fields, null, 2));

          console.log("==================");
        } else {
          setError(result.error || "フィールドの取得に失敗しました");
        }
      } catch (err) {
        console.error("Error fetching fields:", err);
        setError(
          `エラーが発生しました: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, [auth, app.appId, app.spaceId]);

  useEffect(() => {
    const query = queryUtils.generateQuery(conditions, fields, queryOptions);
    setGeneratedQuery(query);
  }, [conditions, fields, queryOptions]);

  if (loading) {
    return <LoadingSpinner message="フィールド情報を読み込んでいます..." />;
  }

  return (
    <div className="bg-background flex min-h-full flex-col">
      {/* Header */}
      {/* ヘッダーとプレビューは上部に固定し、条件の編集は下でスクロールさせる */}
      <div className="sticky top-0 z-40">
        {/* ヘッダーがタイトルバーを兼ねる（バー全体がウィンドウのドラッグ領域） */}
        <header
          className="draglayer border-border bg-card border-b"
          style={windowControlsInsetStyle()}
        >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3">
              <BackButton
                onClick={onBack}
                label="クエリ管理に戻る"
              />
              <div className="flex items-center space-x-3">
                <div>
                  <div className="flex items-center space-x-3">
                    <h1 className="text-foreground text-lg font-semibold">
                      {app.name}
                    </h1>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openAppInBrowser}
                      className="h-8 px-3 text-sm"
                      title={`${app.name}をブラウザで開く`}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      ブラウザで開く
                    </Button>
                  </div>
                  <div className="text-muted-foreground flex items-center space-x-2 text-sm">
                    <Database className="h-3 w-3" />
                    <span>アプリID: {app.appId}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 p-0 ml-1"
                      title="アプリIDをコピー"
                      onClick={async () => {
                        await navigator.clipboard.writeText(app.appId);
                        setAppIdCopied(true);
                        setTimeout(() => setAppIdCopied(false), 1500);
                      }}
                    >
                      {appIdCopied ? (
                        <ClipboardCheck className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clipboard className="h-4 w-4" />
                      )}
                    </Button>
                    {app.spaceId && (
                      <>
                        <span className="text-muted-foreground/60"></span>
                        <span>ゲストスペースID: {app.spaceId}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 p-0 ml-1"
                          title="ゲストスペースIDをコピー"
                          onClick={async () => {
                            await navigator.clipboard.writeText(app.spaceId!);
                            setSpaceIdCopied(true);
                            setTimeout(() => setSpaceIdCopied(false), 1500);
                          }}
                        >
                          {spaceIdCopied ? (
                            <ClipboardCheck className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clipboard className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <ToggleTheme />
              <Button
                variant="outline"
                onClick={onLogout}
                size="sm"
              >
                ログアウト
              </Button>
            </div>
          </div>
        </div>


      </header>

    {/*
      レコードを先に見せ、その下で条件を組み立てる。
      モーダルにしない（背景を敷かない）ので、条件を編集しながら
      結果の変化をそのまま見られる。
    */}
    <div
      aria-label="実行結果"
      className="bg-card border-border flex flex-col border-b"
    >
          <div className="flex items-center gap-3 px-4 py-2">
            <button
              type="button"
              onClick={() => setResultsPanelExpanded((open) => !open)}
              aria-expanded={resultsPanelExpanded}
              className="hover:text-foreground text-muted-foreground flex items-center gap-1.5 text-sm font-medium"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  resultsPanelExpanded ? "" : "-rotate-90"
                }`}
              />
              <span className="text-foreground">プレビュー</span>
            </button>

            <p className="text-muted-foreground truncate text-xs">
              {queryResult?.error
                ? "クエリの実行でエラーが発生しました"
                : queryResult
                  ? describePreview(queryResult)
                  : "レコードを取得しています..."}
            </p>

            {previewLoading && (
              <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
            )}
          </div>

          {resultsPanelExpanded && queryResult && (
              <div className="scrollbar-thin max-h-[32vh] overflow-y-auto px-4 pb-4">
                  {queryResult.error ? (
                    <div className="bg-muted/40 rounded-md border p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                        <h3 className="text-foreground text-sm font-medium">
                          エラー詳細情報
                        </h3>
                      </div>
                      {(() => {
                        // エラーがオブジェクトの場合（JSONパース済み）
                        if (
                          typeof queryResult.error === "object" &&
                          queryResult.error !== null
                        ) {
                          const errorObj =
                            queryResult.error as KintoneErrorResponse;
                          return (
                            <div className="space-y-3">
                              {errorObj.code && (
                                <div className="flex items-center gap-3">
                                  <span className="text-muted-foreground min-w-[80px] text-xs font-medium">
                                    エラーコード
                                  </span>
                                  <span className="rounded bg-red-100 px-2 py-1 font-mono text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                    {errorObj.code}
                                  </span>
                                </div>
                              )}
                              {errorObj.message && (
                                <div className="flex items-start gap-3">
                                  <span className="text-muted-foreground min-w-[80px] pt-1 text-xs font-medium">
                                    メッセージ
                                  </span>
                                  <span className="text-foreground text-sm leading-relaxed">
                                    {errorObj.message}
                                  </span>
                                </div>
                              )}
                              {errorObj.id && (
                                <div className="flex items-center gap-3">
                                  <span className="text-muted-foreground min-w-[80px] text-xs font-medium">
                                    リクエストID
                                  </span>
                                  <span className="bg-muted text-muted-foreground rounded-sm px-2 py-1 font-mono text-xs">
                                    {errorObj.id}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }
                        // エラーが文字列の場合
                        else {
                          return (
                            <div className="text-foreground text-sm">
                              <pre className="font-mono text-xs whitespace-pre-wrap">
                                {String(queryResult.error)}
                              </pre>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  ) : (
                    <Tabs
                      value={activeResultTab}
                      onValueChange={setActiveResultTab}
                      className="w-full"
                    >
                      <TabsList className="bg-muted relative grid w-full max-w-xs grid-cols-2 overflow-hidden rounded-lg border-0 p-1">
                        <TabsTrigger
                          value="table"
                          className="data-[state=active]:text-foreground relative z-10 rounded-md transition-colors duration-300 hover:bg-transparent data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:shadow-none"
                        >
                          テーブル表示
                        </TabsTrigger>
                        <TabsTrigger
                          value="json"
                          className="data-[state=active]:text-foreground relative z-10 rounded-md transition-colors duration-300 hover:bg-transparent data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:shadow-none"
                        >
                          JSON表示
                        </TabsTrigger>
                        <div
                          className={`bg-background border-border absolute top-1 bottom-1 left-1 w-[calc(50%-0.125rem)] rounded-md border shadow-md transition-transform duration-300 ease-out ${
                            activeResultTab === "json"
                              ? "translate-x-full"
                              : "translate-x-0"
                          }`}
                        />
                      </TabsList>

                      <TabsContent value="table" className="space-y-4">
                        {queryResult.records.length > 0 ? (
                          <div
                            className="scrollbar-thin overflow-x-auto rounded-md border"
                            style={{ direction: "ltr" }}
                          >
                            <table
                              className="w-full min-w-max border-collapse text-sm"
                              style={{
                                writingMode: "horizontal-tb",
                                textOrientation: "mixed",
                              }}
                            >
                              <thead>
                                <tr className="bg-muted border-b sticky top-0 z-10">
                                  {Object.keys(queryResult.records[0]).map(
                                    (fieldCode) => (
                                      <th
                                        key={fieldCode}
                                        className="border-r p-2 text-left font-medium whitespace-nowrap min-w-[120px]"
                                        style={{
                                          writingMode: "horizontal-tb",
                                        }}
                                      >
                                        {fields.find(
                                          (f) => f.code === fieldCode,
                                        )?.label || fieldCode}
                                      </th>
                                    ),
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {queryResult.records
                                  .slice(0, 50)
                                  .map(
                                    (
                                      record: Record<string, unknown>,
                                      index: number,
                                    ) => (
                                      <tr
                                        key={index}
                                        className="hover:bg-muted/30 border-b"
                                      >
                                        {Object.entries(record).map(
                                          ([fieldCode, fieldData]) => (
                                            <td
                                              key={fieldCode}
                                              className="border-r p-2 min-w-[120px] max-w-[300px] overflow-hidden text-ellipsis"
                                              style={{
                                                writingMode:
                                                  "horizontal-tb",
                                              }}
                                              title={formatFieldValue(fieldData)}
                                            >
                                              <div className="truncate">
                                                {formatFieldValue(
                                                  fieldData,
                                                )}
                                              </div>
                                            </td>
                                          ),
                                        )}
                                      </tr>
                                    ),
                                  )}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-muted-foreground py-8 text-center">
                            レコードがありません
                          </p>
                        )}
                      </TabsContent>

                      <TabsContent value="json" className="space-y-4">
                        <div className="scrollbar-hover border-border max-h-96 overflow-y-auto rounded-lg border">
                          <SyntaxHighlighter
                            language="json"
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              borderRadius: "0.5rem",
                              fontSize: "0.75rem",
                              lineHeight: "1rem",
                            }}
                            wrapLongLines={true}
                          >
                            {JSON.stringify(queryResult.records, null, 2)}
                          </SyntaxHighlighter>
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
              </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-6" aria-label="パンくずナビゲーション">
            <ol className="text-muted-foreground flex items-center space-x-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof onBackToAppList === "function")
                      onBackToAppList();
                  }}
                  className="hover:text-foreground transition-colors"
                >
                  アプリ一覧
                </button>
              </li>
              <li>
                <ChevronRight className="h-4 w-4" />
              </li>
              <li className="text-foreground font-medium">{app.name}</li>
              <li>
                <ChevronRight className="h-4 w-4" />
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof onBack === "function") onBack();
                  }}
                  className="hover:text-foreground transition-colors"
                >
                  クエリ管理
                </button>
              </li>
              <li>
                <ChevronRight className="h-4 w-4" />
              </li>
              <li className="text-foreground font-medium">
                {isEditMode ? "クエリ編集" : "新規作成"}
              </li>
            </ol>
          </nav>

          {error && <ErrorAlert error={error} />}

          <div className="space-y-6">
            <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>検索条件</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (hasUnsavedInput) {
                            setResetDialogOpen(true);
                          } else {
                            resetConditions();
                          }
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="条件をリセット"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        リセット
                      </Button>
                      <Dialog
                        open={leaveDialogOpen}
                        onOpenChange={setLeaveDialogOpen}
                      >
                        <DialogContent className="sm:max-w-sm">
                          <DialogHeader>
                            <DialogTitle>
                              編集中の内容を破棄して戻りますか？
                            </DialogTitle>
                            <DialogDescription>
                              保存されていない検索条件は失われます。
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLeaveDialogOpen(false)}
                            >
                              キャンセル
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setLeaveDialogOpen(false);
                                onBack();
                              }}
                            >
                              破棄して戻る
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog
                        open={resetDialogOpen}
                        onOpenChange={setResetDialogOpen}
                      >
                        <DialogContent className="sm:max-w-sm">
                          <DialogHeader>
                            <DialogTitle>条件をリセットしますか？</DialogTitle>
                            <DialogDescription>
                              入力中の検索条件と並び替え・件数の設定がすべて消去されます。この操作は元に戻せません。
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setResetDialogOpen(false)}
                            >
                              キャンセル
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                resetConditions();
                                setResetDialogOpen(false);
                              }}
                            >
                              リセットする
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {conditions.map((condition, index) => (
                        <ConditionInput
                          key={index}
                          condition={condition}
                          index={index}
                          onUpdate={handleConditionUpdate}
                          onRemove={removeCondition}
                          onDuplicate={duplicateCondition}
                          onMove={moveCondition}
                          fields={fields}
                          users={users}
                          usersLoaded={usersLoaded}
                          onFetchUsers={fetchUsers}
                          canRemove={conditions.length > 1}
                        />
                      ))}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addCondition}
                        className="text-primary hover:text-primary w-fit"
                        aria-label="条件を追加"
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        条件を追加
                      </Button>
                    </div>
                  </CardContent>

              {/* 並び替え・件数（インライン行） */}
              <div className="border-t px-6 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-muted-foreground w-24 flex-shrink-0 text-sm font-medium">
                    並び替え
                  </Label>
                  <div className="min-w-[12rem] flex-1">
                          <Select
                            value={sortField}
                            onValueChange={handleSortFieldChange}
                          >
                            <SelectTrigger
                              className="w-full"
                              aria-label="並び替えフィールドを選択"
                            >
                              <SelectValue className="truncate" />
                            </SelectTrigger>
                            <SelectContent className="min-w-[180px]">
                              {sortFieldOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                  className="whitespace-nowrap"
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                  </div>
                  <div className="w-28 flex-shrink-0">
                          <Select
                            value={sortDirection}
                            onValueChange={setSortDirection}
                            disabled={sortField === "none"}
                          >
                            <SelectTrigger
                              className="w-full"
                              aria-label="並び順を選択"
                            >
                              <SelectValue className="truncate" />
                            </SelectTrigger>
                            <SelectContent className="min-w-[120px]">
                              {sortDirectionOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                  className="whitespace-nowrap"
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                  </div>
                  <Label
                    htmlFor="limit"
                    className="text-muted-foreground ml-2 text-sm"
                  >
                    件数
                  </Label>
                          <Input
                            id="limit"
                            type="number"
                            min="1"
                            max="500"
                            value={limit || ""}
                            placeholder="例: 100"
                            onChange={(e) => {
                              const value = e.target.value
                                ? Math.max(
                                    1,
                                    Math.min(500, Number(e.target.value)),
                                  )
                                : undefined;
                              setLimit(value);

                            }}
                            aria-label="取得件数を入力"
                            className="w-24"
                          />
                  <Label
                    htmlFor="offset"
                    className="text-muted-foreground ml-2 text-sm"
                  >
                    スキップ
                  </Label>
                          <Input
                            id="offset"
                            type="number"
                            min="0"
                            value={offset || ""}
                            placeholder="例: 0"
                            onChange={(e) => {
                              const value = e.target.value
                                ? Math.max(0, Number(e.target.value))
                                : undefined;
                              setOffset(value);
                              

                            }}
                            aria-label="スキップ件数を入力"
                            className="w-24"
                          />
                </div>
              </div>

              {/* 出力バンド: 形式切替・クエリ・アクションを1か所に集約 */}
              <div className="bg-muted/30 space-y-3 rounded-b-lg border-t px-6 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-muted-foreground w-24 flex-shrink-0 text-sm font-medium">
                    出力
                  </span>
                  <ToggleGroup
                    type="single"
                    value={outputView}
                    onValueChange={(value) => {
                      if (value) setOutputView(value as OutputView);
                    }}
                    className="bg-muted border-border rounded-md border p-0.5"
                  >
                    {OUTPUT_VIEWS.map((view) => (
                      <ToggleGroupItem
                        key={view.value}
                        value={view.value}
                        size="sm"
                        aria-label={`出力を${view.label}にする`}
                        className="data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm h-7 flex-none px-3 text-xs"
                      >
                        {view.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                {/* 表示ボックス */}
                {!generatedQuery ? (
                  <div className="bg-background text-muted-foreground rounded-md border p-3 text-sm">
                    条件を設定するとクエリが表示されます
                  </div>
                ) : outputView === "api" ? (
                  <div className="bg-background scrollbar-hover max-h-80 space-y-4 overflow-y-auto rounded-md border p-3">
                    <div className="space-y-2">
                      <div className="text-foreground border-b pb-1 text-sm font-medium">
                        リクエストURL
                      </div>
                      <code className="block text-sm break-all">
                        https://{auth.subdomain}.cybozu.com/k/v1/records.json
                      </code>
                    </div>
                    <div className="space-y-2">
                      <div className="text-foreground border-b pb-1 text-sm font-medium">
                        リクエストヘッダー
                      </div>
                      <div className="space-y-1">
                        <div className="flex">
                          <span className="text-primary w-48 font-mono text-xs">
                            Content-Type:
                          </span>
                          <span className="font-mono text-xs">
                            application/json
                          </span>
                        </div>
                        <div className="flex">
                          <span className="text-primary w-48 font-mono text-xs">
                            X-Cybozu-Authorization:
                          </span>
                          <span className="text-muted-foreground font-mono text-xs">
                            [Base64 encoded credentials]
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-foreground border-b pb-1 text-sm font-medium">
                        JSONリクエストボディ
                      </div>
                      <pre className="overflow-x-auto text-xs whitespace-pre">
                        <code>{apiRequestBodyJson}</code>
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="bg-background scrollbar-hover max-h-40 overflow-y-auto rounded-md border p-3">
                    <code className="text-foreground font-mono text-sm whitespace-pre-wrap">
                      {formatQueryForOutput(
                        generatedQuery,
                        outputView === "raw" ? "python" : outputView,
                      )}
                    </code>
                  </div>
                )}

                {/* アクション行 */}
                <div className="flex flex-wrap items-center gap-2">
                            <Button
                              onClick={async () => {
                                await executeQuery();
                                setQueryExecuted(true);
                                setTimeout(() => setQueryExecuted(false), 2000);
                              }}
                              disabled={executing || !generatedQuery}
                              title="Ctrl+Enterでも実行できます"
                              size="sm"
                              className={`h-8 px-4 text-sm transition-all duration-300 ${
                                executing 
                                  ? 'bg-primary text-primary-foreground' 
                                  : queryExecuted
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                              }`}
                            >
                              {executing ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  実行中
                                </>
                              ) : (
                                <>
                                  <Play className={`h-3 w-3 mr-1 transition-all duration-300 ${queryExecuted ? 'fill-current' : ''}`} />
                                  実行
                                </>
                              )}
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!generatedQuery}
                              onClick={async () => {
                                const text =
                                  outputView === "api"
                                    ? apiRequestBodyJson
                                    : formatQueryForOutput(
                                        generatedQuery,
                                        outputView === "raw"
                                          ? "python"
                                          : outputView,
                                      );
                                await navigator.clipboard.writeText(text);
                                setClipboardCopied(true);
                                setTimeout(() => setClipboardCopied(false), 2000);
                              }}
                              className={`h-8 px-3 text-sm transition-all duration-300 ${
                                clipboardCopied 
                                  ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300' 
                                  : 'hover:bg-accent'
                              }`}
                            >
                              {clipboardCopied ? (
                                <>
                                  <ClipboardCheck className="h-3 w-3 mr-1" />
                                  完了
                                </>
                              ) : (
                                <>
                                  <Clipboard className="h-3 w-3 mr-1" />
                                  コピー
                                </>
                              )}
                            </Button>

                  {/* 保存（ポップオーバーで名前とメモを入力） */}
                  <Popover
                    open={savePopoverOpen}
                    onOpenChange={setSavePopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!generatedQuery}
                        className="h-8 text-sm"
                      >
                        <Save className="mr-1 h-3 w-3" />
                        保存
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 space-y-3" align="start">
                      <div className="space-y-1.5">
                        <Label htmlFor="save-query-name" className="text-xs">
                          クエリ名（必須）
                        </Label>
                        <Input
                          id="save-query-name"
                          value={currentQueryName}
                          onChange={(e) => setCurrentQueryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              generatedQuery &&
                              currentQueryName.trim() &&
                              !navigatingToQueryList
                            ) {
                              handleSaveQuery();
                            }
                          }}
                          placeholder="例: 未対応の問い合わせ"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="save-query-memo" className="text-xs">
                          メモ（任意）
                        </Label>
                        <Input
                          id="save-query-memo"
                          value={currentQueryMemo}
                          onChange={(e) => setCurrentQueryMemo(e.target.value)}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              generatedQuery &&
                              currentQueryName.trim() &&
                              !navigatingToQueryList
                            ) {
                              handleSaveQuery();
                            }
                          }}
                          className="h-9"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        {isEditMode || currentSavedQueryId || editingQueryId ? (
                          <>
                            <Button
                              size="sm"
                              onClick={handleSaveQuery}
                              disabled={
                                !generatedQuery ||
                                !currentQueryName.trim() ||
                                navigatingToQueryList
                              }
                            >
                              {navigatingToQueryList ? (
                                <>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  移動中
                                </>
                              ) : saveAnimating ? (
                                <>
                                  <Check className="mr-1 h-3 w-3" />
                                  完了
                                </>
                              ) : (
                                <>
                                  <Edit className="mr-1 h-3 w-3" />
                                  上書き
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleSaveAsQuery}
                              disabled={
                                !generatedQuery ||
                                !currentQueryName.trim() ||
                                navigatingToQueryList
                              }
                            >
                              {navigatingToQueryList ? (
                                <>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  移動中
                                </>
                              ) : saveAsAnimating ? (
                                <>
                                  <Check className="mr-1 h-3 w-3" />
                                  完了
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-1 h-3 w-3" />
                                  別名保存
                                </>
                              )}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={handleSaveQuery}
                            disabled={
                              !generatedQuery ||
                              !currentQueryName.trim() ||
                              navigatingToQueryList
                            }
                          >
                            {navigatingToQueryList ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                移動中
                              </>
                            ) : saveAnimating ? (
                              <>
                                <Check className="mr-1 h-3 w-3" />
                                完了
                              </>
                            ) : (
                              <>
                                <Save className="mr-1 h-3 w-3" />
                                保存
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* 一致件数（プレビューは条件を変えるたびに更新される） */}
                  <div className="ml-auto flex items-center gap-2 text-sm">
                    {previewLoading && (
                      <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
                    )}
                    {queryResult?.error != null ? (
                      <span className="text-destructive font-medium">
                        ✗ エラー
                      </span>
                    ) : (
                      queryResult && (
                        <span className="font-medium text-green-600 dark:text-green-400">
                          ✓ {formatHitCount(queryResult)}
                        </span>
                      )
                    )}
                    {!resultsPanelExpanded && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto px-1 text-sm"
                        onClick={() => setResultsPanelExpanded(true)}
                      >
                        明細を表示
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </div>

      {/* ナビゲーション中のローディングオーバーレイ */}
      {navigatingToQueryList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border rounded-lg p-8 shadow-xl max-w-sm w-full mx-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium">クエリ管理画面へ移動中</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  保存したクエリを確認しています...
                </p>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 w-full rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
