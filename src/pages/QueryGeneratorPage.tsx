import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  ChevronsUpDown,
  AlertCircle,
  User,
  Sigma,
  CalendarIcon,
  ChevronRight,
  Clock,
  Clipboard,
  ClipboardCheck,
  FileText,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { ja } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardDescription } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import ToggleTheme from "@/components/ToggleTheme";
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

interface QueryResult {
  records: Record<string, unknown>[];
  error?: string;
}

interface ConditionInputProps {
  condition: QueryCondition;
  index: number;
  onUpdate: (index: number, updates: Partial<QueryCondition>) => void;
  onRemove: (index: number) => void;
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
  // フィールド値のフォーマット
  formatFieldValue: (fieldData: unknown): string => {
    if (!fieldData) return "";

    if (
      typeof fieldData === "object" &&
      fieldData !== null &&
      "value" in fieldData
    ) {
      const data = fieldData as { value: unknown; type?: string };
      const { value } = data;

      if (data.type === "FILE" && Array.isArray(value)) {
        return value
          .map((file: { name?: string }) => file.name || "")
          .join(", ");
      }

      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === "object" &&
        value[0] !== null &&
        "name" in value[0]
      ) {
        return value.map((user: { name: string }) => user.name).join(", ");
      }

      if (typeof value === "object") {
        return JSON.stringify(value);
      }

      return String(value);
    }

    if (Array.isArray(fieldData)) {
      return fieldData.map((item) => String(item)).join(", ");
    }

    if (typeof fieldData === "object") {
      return JSON.stringify(fieldData);
    }

    return String(fieldData);
  },

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
  fields,
  users,
  usersLoaded,
  onFetchUsers,
  canRemove,
}) => {
  const [localValue, setLocalValue] = useState(condition.value);
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

  const isUserField =
    fieldInfo?.type === "CREATOR" || fieldInfo?.type === "MODIFIER";
  const isDateField = fieldInfo?.type === "DATE";
  const isDateTimeField =
    fieldInfo?.type === "DATETIME" ||
    fieldInfo?.type === "CREATED_TIME" ||
    fieldInfo?.type === "UPDATED_TIME";
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
  }, [fieldInfo, isUserField, isDateField, isDateTimeField]);

  return (
    <div className="bg-muted/20 min-w-0 overflow-auto rounded-lg border p-4 break-words">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            条件 {index + 1}
          </Badge>
          {index > 0 && (
            <Select
              value={condition.logicalOperator}
              onValueChange={(value: "and" | "or") =>
                onUpdate(index, { logicalOperator: value })
              }
            >
              <SelectTrigger className="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="and">AND</SelectItem>
                <SelectItem value="or">OR</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="text-destructive hover:text-destructive h-7 w-7 p-0"
          disabled={!canRemove}
          aria-label="条件を削除"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-3">
        {/* フィールド選択と演算子選択を1行に */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          {/* フィールド選択 */}
          <div className="md:col-span-4">
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
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
          <div className="md:col-span-3">
            <Select
              value={condition.operator}
              onValueChange={(value) =>
                onUpdate(index, { operator: value as QueryOperator })
              }
            >
              <SelectTrigger className="w-full" aria-label="演算子を選択">
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
        </div>

        {/* 値入力エリア */}
        {!isNullOperator && (
          <div className="space-y-3">
            {isInOperator ? (
              /* 複数値入力 */
              <div className="space-y-2">
                {(condition.values || [""]).map((value, valueIndex) => (
                  <div key={valueIndex} className="flex gap-2">
                    {/* 入力フィールド */}
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
                                        const newValues = [
                                          ...(condition.values || [""]),
                                        ];
                                        newValues[valueIndex] = user.code;
                                        onUpdate(index, { values: newValues });
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
                              <Sigma className="h-4 w-4" />
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
                                      <div className="mt-1 font-mono text-xs text-blue-600">
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
                  {/* 入力フィールド */}
                  <Input
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    placeholder={getPlaceholder()}
                    className="flex-1"
                    aria-label="値を入力"
                  />

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
                            <Sigma className="h-4 w-4" />
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
                                    <div className="mt-1 font-mono text-xs text-blue-600">
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
        )}
      </div>
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
  // State管理
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<KintoneField[]>([]);
  const [generatedQuery, setGeneratedQuery] = useState("");
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
  const [activeResultTab, setActiveResultTab] = useState("table");
  const [currentQueryName, setCurrentQueryName] = useState("");
  const [currentQueryMemo, setCurrentQueryMemo] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentSavedQueryId, setCurrentSavedQueryId] = useState<string | null>(null);

  // キーボードショートカット for 戻る (Escape キー)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.ctrlKey && !event.metaKey) {
        onBack();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onBack]);

  const [saveAnimating, setSaveAnimating] = useState(false);
  const [clipboardCopied, setClipboardCopied] = useState(false);
  const [queryExecuted, setQueryExecuted] = useState(false);
  const [users, setUsers] = useState<
    Array<{ code: string; name: string; email: string }>
  >([]);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const { savedQueries, saveQuery } = useQueryGenerator(app.appId);

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

  const executeQuery = useCallback(async () => {
    if (!generatedQuery) {
      alert("クエリが生成されていません");
      return;
    }

    try {
      setExecuting(true);
      setError("");
      setQueryResult(null);

      console.log("=== クエリ実行開始 ===");
      console.log("App ID:", app.appId);
      console.log("Query:", generatedQuery);

      const result = await window.kintoneAPI.executeQuery(
        auth,
        app.appId,
        generatedQuery,
      );

      // レスポンス全体をログ出力
      console.log("=== クエリ実行結果 ===");
      console.log("Full Response JSON:", JSON.stringify(result, null, 2));
      console.log("===================");

      if (result.success && result.data) {
        console.log("✅ クエリ実行成功");
        console.log("取得レコード数:", result.data.records?.length || 0);
        setQueryResult({ records: result.data.records });
      } else {
        console.log("❌ クエリ実行エラー");
        console.log("Error Details:", result.error);

        // シンプルなエラー処理：文字列内のJSONを検出して整形
        let errorForDisplay = result.error;

        if (typeof result.error === "string") {
          // 文字列内にJSONが含まれているかチェック
          const jsonMatch = result.error.match(/\{.*\}/);
          if (jsonMatch) {
            try {
              // JSONをパースして整形
              const parsedError = JSON.parse(jsonMatch[0]);
              errorForDisplay = parsedError;
            } catch {
              // パースに失敗した場合は元の文字列をそのまま使用
              errorForDisplay = result.error;
            }
          }
        }

        setQueryResult({
          records: [],
          error: errorForDisplay,
        });
      }
    } catch (err) {
      console.log("❌ クエリ実行例外エラー");
      console.error("Exception Details:", err);
      const errorMessage = `エラーが発生しました: ${err instanceof Error ? err.message : "Unknown error"}`;
      setQueryResult({
        records: [],
        error: errorMessage,
      });
    } finally {
      setExecuting(false);
    }
  }, [generatedQuery, auth, app.appId]);

  const handleSaveQuery = useCallback(async () => {
    if (!generatedQuery || !currentQueryName.trim()) {
      alert("クエリ名とクエリ内容が必要です");
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

      setTimeout(() => {
        setSaveAnimating(false);
      }, 2000);
    } catch (error) {
      console.error("Error saving query:", error);
      setSaveAnimating(false);
      alert("クエリの保存に失敗しました");
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
  ]);





  // Effects - 編集モードの初期化（editingQueryIdがある場合のみ）
  useEffect(() => {
    if (editingQueryId && savedQueries.length > 0) {
      const queryToEdit = savedQueries.find((q) => q.id === editingQueryId);
      if (queryToEdit) {
        setConditions(queryToEdit.conditions);
        setSortField(queryToEdit.orderBy || "none");
        setLimit(queryToEdit.limit);
        setOffset(queryToEdit.offset);
        setCurrentQueryName(queryToEdit.name);
        setCurrentQueryMemo(queryToEdit.memo || "");
        setCurrentSavedQueryId(queryToEdit.id);
        setIsEditMode(true);
      }
    } else if (editingQueryId && savedQueries.length === 0) {
      // savedQueriesがまだ読み込まれていない場合は何もしない
    } else if (!editingQueryId && !currentSavedQueryId) {
      // 新規作成かつまだ保存されていない場合のみリセット
      setIsEditMode(false);
      setCurrentQueryName("");
      setCurrentQueryMemo("");
    }
  }, [editingQueryId, savedQueries, currentSavedQueryId]);

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

        const result = await window.kintoneAPI.getAppFields(auth, app.appId);

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
  }, [auth, app.appId]);

  useEffect(() => {
    const query = queryUtils.generateQuery(conditions, fields, queryOptions);
    setGeneratedQuery(query);
  }, [conditions, fields, queryOptions]);

  if (loading) {
    return <LoadingSpinner message="フィールド情報を読み込んでいます..." />;
  }

  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-border/40 bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-3">
              <BackButton
                onClick={onBack}
                label="クエリ管理に戻る"
              />
              <div>
                <h1 className="text-foreground text-lg font-semibold">
                  {app.name}
                </h1>
                <div className="text-muted-foreground flex items-center space-x-2 text-sm">
                  <Database className="h-3 w-3" />
                  <span>アプリID: {app.appId}</span>
                  <span className="text-muted-foreground/60">•</span>
                  <Settings className="h-3 w-3" />
                  <span className="text-muted-foreground">
                    {isEditMode ? "クエリ編集" : "新規作成"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <ToggleTheme />
              <Button
                variant="outline"
                onClick={onLogout}
                className="hover:bg-muted/60 transition-colors"
              >
                ログアウト
              </Button>
            </div>
          </div>
        </div>

        {/* Query Save Bar - ヘッダー直下 */}
        {generatedQuery && (
          <div className="border-b border-border/50 bg-gradient-to-r from-background via-accent/5 to-background backdrop-blur-md shadow-sm">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="h-3 w-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-sm"></div>
                      <div className="absolute inset-0 h-3 w-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse opacity-75"></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">クエリ生成完了</span>
                      <span className="text-xs text-muted-foreground">保存して後で再利用</span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-accent/30 rounded-full border border-border/40">
                    <Code className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {generatedQuery.length > 40 
                        ? `${generatedQuery.substring(0, 40)}...` 
                        : generatedQuery}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex space-x-3">
                    {/* クエリ名入力 - コードアイコン付き */}
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                        <Code className="h-3.5 w-3.5 text-primary/70" />
                      </div>
                      <Input
                        placeholder="クエリ名を入力"
                        value={currentQueryName}
                        onChange={(e) => setCurrentQueryName(e.target.value)}
                        className="w-52 h-9 pl-10 pr-3 bg-background/95 border border-border/60 focus:border-primary/70 focus:ring-2 focus:ring-primary/20 transition-all duration-300 font-medium shadow-sm hover:shadow-md text-sm"
                        aria-label="クエリ名を入力"
                      />
                    </div>

                    {/* メモ入力 - ファイルテキストアイコン付き */}
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                        <FileText className="h-3.5 w-3.5 text-blue-500/70" />
                      </div>
                      <Input
                        placeholder="メモを入力"
                        value={currentQueryMemo}
                        onChange={(e) => setCurrentQueryMemo(e.target.value)}
                        className="w-48 h-9 pl-10 pr-3 bg-background/95 border border-border/60 focus:border-blue-400/70 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300 text-sm shadow-sm hover:shadow-md"
                        aria-label="メモを入力"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleSaveQuery}
                    disabled={!generatedQuery || !currentQueryName.trim()}
                    className="h-9 px-5 gap-2 rounded-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg flex items-center bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground hover:from-primary/90 hover:via-primary/80 hover:to-primary/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    aria-label={isEditMode || currentSavedQueryId || editingQueryId ? "クエリを更新" : "クエリを保存"}
                  >
                    <div>
                      {saveAnimating ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Save className="h-5 w-5" />
                      )}
                    </div>
                    <span className="font-semibold">
                      {(isEditMode || currentSavedQueryId || editingQueryId) ? "更新" : "保存"}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
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
            {/* Main Layout: Query Builder + Results */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Left: Query Builder */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>検索条件</CardTitle>
                    <CardDescription>
                      フィールドと条件を指定してください
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {conditions.map((condition, index) => (
                        <ConditionInput
                          key={index}
                          condition={condition}
                          index={index}
                          onUpdate={handleConditionUpdate}
                          onRemove={removeCondition}
                          fields={fields}
                          users={users}
                          usersLoaded={usersLoaded}
                          onFetchUsers={fetchUsers}
                          canRemove={conditions.length > 1}
                        />
                      ))}

                      <Button
                        variant="outline"
                        onClick={addCondition}
                        className="w-full"
                        aria-label="条件を追加"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        条件を追加
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Sort and Limit Options */}
                <Card>
                  <CardHeader>
                    <CardTitle>並び替え・制限</CardTitle>
                    <CardDescription>
                      クエリの並び替えと取得件数を設定
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label
                            htmlFor="sortField"
                            className="mb-2 block text-sm font-medium"
                          >
                            並び替えフィールド
                          </Label>
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

                        <div>
                          <Label
                            htmlFor="sortDirection"
                            className="mb-2 block text-sm font-medium"
                          >
                            並び順
                          </Label>
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
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label
                            htmlFor="limit"
                            className="mb-2 block text-sm font-medium"
                          >
                            取得件数 (limit)
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
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor="offset"
                            className="mb-2 block text-sm font-medium"
                          >
                            スキップ件数 (offset)
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
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Generated Query and Results */}
              <div className="space-y-6">
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle>生成されたクエリ</CardTitle>
                    <CardDescription>
                      Kintone REST APIで使用するクエリが表示されます
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {generatedQuery ? (
                      <Tabs defaultValue="query" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="query">クエリ文字列</TabsTrigger>
                          <TabsTrigger value="api">APIプレビュー</TabsTrigger>
                        </TabsList>
                        <TabsContent value="query" className="space-y-4">
                          <div className="bg-muted scrollbar-hover max-h-40 overflow-y-auto rounded-lg p-4 relative">
                            <code className="text-foreground text-sm whitespace-pre-wrap pr-20">
                              {JSON.stringify(generatedQuery).slice(1, -1)}
                            </code>
                            <div className="absolute top-2 right-2 flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  await executeQuery();
                                  setQueryExecuted(true);
                                  setTimeout(() => setQueryExecuted(false), 2000);
                                }}
                                disabled={executing}
                                className={`h-8 w-8 p-0 rounded-md transition-all duration-300 hover:scale-105 ${
                                  executing 
                                    ? 'text-foreground bg-accent shadow-sm' 
                                    : queryExecuted
                                    ? 'text-foreground bg-accent shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                }`}
                                aria-label="クエリを実行"
                              >
                                {executing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className={`h-4 w-4 transition-all duration-300 ${queryExecuted ? 'fill-current scale-110' : ''}`} />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(JSON.stringify(generatedQuery).slice(1, -1));
                                  setClipboardCopied(true);
                                  setTimeout(() => setClipboardCopied(false), 2000);
                                }}
                                className={`h-8 w-8 p-0 rounded-md transition-all duration-300 hover:scale-105 ${
                                  clipboardCopied 
                                    ? 'text-foreground bg-accent shadow-sm' 
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                }`}
                                aria-label="クエリをクリップボードにコピー"
                              >
                                <div className={`transition-all duration-300 ${clipboardCopied ? 'scale-110' : ''}`}>
                                  {clipboardCopied ? (
                                    <ClipboardCheck className="h-4 w-4" />
                                  ) : (
                                    <Clipboard className="h-4 w-4" />
                                  )}
                                </div>
                              </Button>
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="api" className="space-y-4">
                          <div className="bg-muted scrollbar-hover max-h-80 overflow-y-auto rounded-lg p-4">
                            <div className="space-y-6">
                              {/* URL Section */}
                              <div className="space-y-2">
                                <div className="text-foreground border-b pb-1 text-sm font-medium">
                                  リクエストURL
                                </div>
                                <div className="bg-background rounded p-3">
                                  <code className="text-sm break-all">
                                    https://{auth.subdomain}
                                    .cybozu.com/k/v1/records.json
                                  </code>
                                </div>
                              </div>

                              {/* Headers Section */}
                              <div className="space-y-2">
                                <div className="text-foreground border-b pb-1 text-sm font-medium">
                                  リクエストヘッダー
                                </div>
                                <div className="bg-background space-y-2 rounded p-3">
                                  <div className="flex">
                                    <span className="w-32 font-mono text-xs text-blue-600">
                                      Content-Type:
                                    </span>
                                    <span className="font-mono text-xs">
                                      application/json
                                    </span>
                                  </div>
                                  <div className="flex">
                                    <span className="w-32 font-mono text-xs text-blue-600">
                                      X-Cybozu-Authorization:
                                    </span>
                                    <span className="text-muted-foreground font-mono text-xs">
                                      [Base64 encoded credentials]
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* JSON Request Body Section */}
                              <div className="space-y-2">
                                <div className="text-foreground border-b pb-1 text-sm font-medium">
                                  JSONリクエストボディ
                                </div>
                                <div className="bg-background rounded p-3">
                                  <pre className="overflow-x-auto text-xs whitespace-pre">
                                    <code>
                                      {JSON.stringify(
                                        {
                                          app: app.appId,
                                          ...(generatedQuery && {
                                            query: generatedQuery,
                                          }),
                                          ...(limit && {
                                            size: parseInt(limit.toString()),
                                          }),
                                          ...(offset && {
                                            offset: parseInt(offset.toString()),
                                          }),
                                        },
                                        null,
                                        2,
                                      )}
                                    </code>
                                  </pre>
                                </div>

                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <p className="text-muted-foreground text-center">
                        条件を設定してクエリを生成してください
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Query Results */}
                {queryResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle>実行結果</CardTitle>
                      <CardDescription>
                        {queryResult.error
                          ? "クエリの実行中にエラーが発生しました"
                          : `${queryResult.records?.length || 0}件のレコードが見つかりました`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {queryResult.error ? (
                        <div className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-900/50">
                          <div className="mb-3 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500"></div>
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                                      <span className="min-w-[80px] text-xs font-medium text-gray-500 dark:text-gray-400">
                                        エラーコード
                                      </span>
                                      <span className="rounded bg-red-100 px-2 py-1 font-mono text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                        {errorObj.code}
                                      </span>
                                    </div>
                                  )}
                                  {errorObj.message && (
                                    <div className="flex items-start gap-3">
                                      <span className="min-w-[80px] pt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                                        メッセージ
                                      </span>
                                      <span className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                        {errorObj.message}
                                      </span>
                                    </div>
                                  )}
                                  {errorObj.id && (
                                    <div className="flex items-center gap-3">
                                      <span className="min-w-[80px] text-xs font-medium text-gray-500 dark:text-gray-400">
                                        リクエストID
                                      </span>
                                      <span className="rounded bg-gray-200 px-2 py-1 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
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
                                <div className="text-sm text-gray-700 dark:text-gray-300">
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
                          <TabsList className="bg-muted relative grid w-full grid-cols-2 overflow-hidden rounded-lg border-0 p-1">
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
                                className="scrollbar-thin max-h-96 overflow-x-auto"
                                style={{ direction: "ltr" }}
                              >
                                <table
                                  className="w-full border-collapse text-sm"
                                  style={{
                                    writingMode: "horizontal-tb",
                                    textOrientation: "mixed",
                                  }}
                                >
                                  <thead>
                                    <tr className="bg-muted/50 border-b">
                                      {Object.keys(queryResult.records[0]).map(
                                        (fieldCode) => (
                                          <th
                                            key={fieldCode}
                                            className="border-r p-2 text-left font-medium"
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
                                      .slice(0, 10)
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
                                                  className="max-w-48 overflow-hidden border-r p-2 text-ellipsis"
                                                  style={{
                                                    writingMode:
                                                      "horizontal-tb",
                                                  }}
                                                >
                                                  {queryUtils.formatFieldValue(
                                                    fieldData,
                                                  )}
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
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
