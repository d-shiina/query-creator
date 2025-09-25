import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Database,
  Settings,
  Code,
  Copy,
  Play,
  Loader2,
  Plus,
  Trash2,
  Save,
  ChevronRight,
  Check,
  ChevronsUpDown,
  Calendar,
  AlertCircle,
  User,
  Sigma,
  CalendarIcon,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import ToggleTheme from "@/components/ToggleTheme";

import { useQueryGenerator } from "@/hooks/useQueryGenerator";
import {
  KintoneAuth,
  KintoneApp,
  KintoneField,
  KintoneUser,
  QueryCondition,
  QueryOperator,
} from "@/types/kintone";

// Window拡張（kintoneAPI型定義）
interface WindowWithKintoneAPI extends Window {
  kintoneAPI: {
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

interface FormattedError {
  title: string;
  message: string;
  suggestions?: string[];
}

interface QueryResult {
  records: Record<string, unknown>[];
  error?: string;
  formattedError?: FormattedError;
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

// ユーティリティ関数
const queryUtils = {
  // エラーメッセージのフォーマット
  formatErrorMessage: (errorMsg: string): FormattedError => {
    const errorPatterns = [
      {
        pattern: /GAIA_IL26/,
        title: "ユーザーが見つかりません",
        getMessage: (msg: string) => {
          const userCode = msg.match(/ユーザー（code：(.+?)）/)?.[1] || "不明";
          return `指定されたユーザー「${userCode}」は存在しないか、権限がありません。`;
        },
        suggestions: [
          "ユーザーコードの入力値を確認してください",
          "該当ユーザーがシステムに登録されているか確認してください",
          '入力値を「"」（ダブルクォート）で囲んでみてください',
        ],
      },
      {
        pattern: /GAIA_IL23/,
        title: "フィールドが見つかりません",
        getMessage: () => "指定されたフィールドが存在しません。",
        suggestions: [
          "フィールドコードが正しいか確認してください",
          "フィールドがアプリに存在するか確認してください",
        ],
      },
      {
        pattern: /GAIA_IL22/,
        title: "クエリの構文エラー",
        getMessage: () => "クエリの記述に誤りがあります。",
        suggestions: [
          "演算子や値の記述を確認してください",
          '特殊文字が含まれる場合は「"」（ダブルクォート）で囲んでください',
        ],
      },
      {
        pattern: /400/,
        title: "リクエストエラー",
        getMessage: () => "クエリの内容に問題があります。",
        suggestions: [
          "検索条件の値や演算子を確認してください",
          '特殊文字を含む値は「"」（ダブルクォート）で囲んでください',
        ],
      },
      {
        pattern: /401|403/,
        title: "認証エラー",
        getMessage: () => "アクセス権限がありません。",
        suggestions: [
          "ログイン情報を確認してください",
          "アプリへのアクセス権限があるか確認してください",
        ],
      },
    ];

    try {
      const jsonMatch = errorMsg.match(/\{.*\}/);
      if (jsonMatch) {
        const errorObj = JSON.parse(jsonMatch[0]);
        const pattern = errorPatterns.find((p) =>
          p.pattern.test(errorObj.code),
        );
        if (pattern) {
          return {
            title: pattern.title,
            message: pattern.getMessage(errorObj.message || errorMsg),
            suggestions: pattern.suggestions,
          };
        }
      }
    } catch {
      // JSON解析失敗時は通常の処理を続行
    }

    for (const pattern of errorPatterns) {
      if (pattern.pattern.test(errorMsg)) {
        return {
          title: pattern.title,
          message: pattern.getMessage(errorMsg),
          suggestions: pattern.suggestions,
        };
      }
    }

    return {
      title: "エラーが発生しました",
      message: errorMsg,
      suggestions: [
        "入力内容を確認してから再実行してください",
        "問題が継続する場合は管理者にお問い合わせください",
      ],
    };
  },

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

  // クエリ生成（修正版）
  // クエリ生成（修正版）
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
            return `"${v.replace(/"/g, '\\"')}"`;
          }
        });

        value = `(${formattedValues.join(",")})`;
      } else if (operator === "is" || operator === "is not") {
        value = "null";
      } else {
        value = condition.value;
      }

      const fieldInfo = fields.find((f) => f.code === field);

      // システムフィールドの場合は日本語のフィールド名を使用
      let displayFieldName: string;
      if (fieldInfo) {
        // システムフィールドかどうかを判定
        const isSystemField = [
          "CREATOR",
          "MODIFIER",
          "CREATED_TIME",
          "UPDATED_TIME",
          "RECORD_NUMBER",
          "__ID__",
        ].includes(fieldInfo.type);

        if (isSystemField) {
          // システムフィールドは日本語名を使用
          const systemFieldMap: Record<string, string> = {
            Created_by: "作成者",
            Updated_by: "更新者",
            Created_datetime: "作成日時",
            Updated_datetime: "更新日時",
            $id: "レコード番号",
            $revision: "リビジョン",
          };
          displayFieldName = systemFieldMap[field] || fieldInfo.label || field;
        } else {
          // カスタムフィールドはフィールドコードを使用
          displayFieldName = field;
        }
      } else {
        displayFieldName = field;
      }

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

        if (!isFunctionValue && !isNumericField) {
          const escapedValue = value.replace(/"/g, '\\"');
          value = `"${escapedValue}"`;
        }
      }

      query += `${displayFieldName} ${operator} ${value}`;
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

// 安全な日付パース関数
const parseDate = (value: string): Date | undefined => {
  if (!value) return undefined;

  // Kintone関数の場合はundefinedを返す
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

  if (
    kintoneRegex.test(value) ||
    knownFunctions.includes(value) ||
    /^FROM_TODAY\(\d+,\s*(DAYS|WEEKS|MONTHS|YEARS)\)$/.test(value)
  ) {
    return undefined;
  }

  try {
    const date = new Date(value);
    return !isNaN(date.getTime()) ? date : undefined;
  } catch {
    return undefined;
  }
};

// コンポーネント定義
const LoadingSpinner: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-background flex min-h-screen items-center justify-center">
    <div className="flex items-center space-x-3">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span>{message}</span>
    </div>
  </div>
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

      return operators.filter((op) =>
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

      // 重複を避けるためにSetを使用
      const functionsSet = new Set<{
        value: string;
        label: string;
        description: string;
      }>();

      // タイプベースの関数を追加
      if (typeKey && fieldTypeFunctions[typeKey]) {
        fieldTypeFunctions[typeKey].forEach((func) => functionsSet.add(func));
      }

      // フィールドコードベースの関数を追加
      if (fieldCode && fieldTypeFunctions[fieldCode]) {
        fieldTypeFunctions[fieldCode].forEach((func) => functionsSet.add(func));
      }

      return Array.from(functionsSet);
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
                {getAvailableOperators(condition.field).map((op) => (
                  <SelectItem
                    key={op.value}
                    value={op.value}
                    className="whitespace-nowrap"
                  >
                    {op.label}
                  </SelectItem>
                ))}
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
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 w-10 p-0"
                              title="カレンダーから選択"
                              aria-label="カレンダーから選択"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[340px] p-0">
                            <CalendarComponent
                              mode="single"
                              selected={parseDate(value)}
                              onSelect={(date) => {
                                if (date) {
                                  const formattedDate = format(
                                    date,
                                    "yyyy-MM-dd",
                                  );
                                  const newValues = [
                                    ...(condition.values || [""]),
                                  ];
                                  newValues[valueIndex] = formattedDate;
                                  onUpdate(index, { values: newValues });
                                }
                              }}
                              locale={ja}
                            />
                          </PopoverContent>
                        </Popover>
                      )}

                      {/* カレンダー+時刻ボタン（日時フィールドの場合） */}
                      {isDateTimeField && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 w-10 p-0"
                              title="日時を選択"
                              aria-label="日時を選択"
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={parseDate(value)}
                              onSelect={(date) => {
                                if (date) {
                                  // 既存の時刻を保持するか、デフォルト時刻を設定
                                  const existingDate = parseDate(value);
                                  if (
                                    existingDate &&
                                    !isNaN(existingDate.getTime())
                                  ) {
                                    date.setHours(
                                      existingDate.getHours(),
                                      existingDate.getMinutes(),
                                    );
                                  } else {
                                    date.setHours(9, 0); // デフォルト時刻
                                  }
                                  const formattedDateTime = format(
                                    date,
                                    "yyyy-MM-dd'T'HH:mm:ssXXX",
                                  );
                                  const newValues = [
                                    ...(condition.values || [""]),
                                  ];
                                  newValues[valueIndex] = formattedDateTime;
                                  onUpdate(index, { values: newValues });
                                }
                              }}
                              initialFocus
                              locale={ja}
                            />
                            <div className="border-t p-3">
                              <Label
                                htmlFor={`time-${index}-${valueIndex}`}
                                className="text-sm font-medium"
                              >
                                時刻
                              </Label>
                              <Input
                                id={`time-${index}-${valueIndex}`}
                                type="time"
                                value={(() => {
                                  const date = parseDate(value);
                                  return date && !isNaN(date.getTime())
                                    ? format(date, "HH:mm")
                                    : "09:00";
                                })()}
                                onChange={(e) => {
                                  const timeValue = e.target.value;
                                  const [hours, minutes] = timeValue
                                    .split(":")
                                    .map(Number);
                                  if (!isNaN(hours) && !isNaN(minutes)) {
                                    const date = parseDate(value) || new Date();
                                    date.setHours(hours, minutes);
                                    const formattedDateTime = format(
                                      date,
                                      "yyyy-MM-dd'T'HH:mm:ssXXX",
                                    );
                                    const newValues = [
                                      ...(condition.values || [""]),
                                    ];
                                    newValues[valueIndex] = formattedDateTime;
                                    onUpdate(index, { values: newValues });
                                  }
                                }}
                                className="mt-1"
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 w-10 p-0"
                            title="カレンダーから選択"
                            aria-label="カレンダーから選択"
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[340px] p-0">
                          <CalendarComponent
                            mode="single"
                            selected={parseDate(localValue)}
                            onSelect={(date) => {
                              if (date) {
                                const formattedDate = format(
                                  date,
                                  "yyyy-MM-dd",
                                );
                                setLocalValue(formattedDate);
                                onUpdate(index, { value: formattedDate });
                              }
                            }}
                            locale={ja}
                          />
                        </PopoverContent>
                      </Popover>
                    )}

                    {/* カレンダー+時刻ボタン（日時フィールドの場合） */}
                    {isDateTimeField && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 w-10 p-0"
                            title="日時を選択"
                            aria-label="日時を選択"
                          >
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={parseDate(localValue)}
                            onSelect={(date) => {
                              if (date) {
                                // 既存の時刻を保持するか、デフォルト時刻を設定
                                const existingDate = parseDate(localValue);
                                if (
                                  existingDate &&
                                  !isNaN(existingDate.getTime())
                                ) {
                                  date.setHours(
                                    existingDate.getHours(),
                                    existingDate.getMinutes(),
                                  );
                                } else {
                                  date.setHours(9, 0); // デフォルト時刻
                                }
                                const formattedDateTime = format(
                                  date,
                                  "yyyy-MM-dd'T'HH:mm:ssXXX",
                                );
                                setLocalValue(formattedDateTime);
                                onUpdate(index, { value: formattedDateTime });
                              }
                            }}
                            initialFocus
                            locale={ja}
                          />
                          <div className="border-t p-3">
                            <Label
                              htmlFor={`time-single-${index}`}
                              className="text-sm font-medium"
                            >
                              時刻
                            </Label>
                            <Input
                              id={`time-single-${index}`}
                              type="time"
                              value={(() => {
                                const date = parseDate(localValue);
                                return date && !isNaN(date.getTime())
                                  ? format(date, "HH:mm")
                                  : "09:00";
                              })()}
                              onChange={(e) => {
                                const timeValue = e.target.value;
                                const [hours, minutes] = timeValue
                                  .split(":")
                                  .map(Number);
                                if (!isNaN(hours) && !isNaN(minutes)) {
                                  const date =
                                    parseDate(localValue) || new Date();
                                  date.setHours(hours, minutes);
                                  const formattedDateTime = format(
                                    date,
                                    "yyyy-MM-dd'T'HH:mm:ssXXX",
                                  );
                                  setLocalValue(formattedDateTime);
                                  onUpdate(index, { value: formattedDateTime });
                                }
                              }}
                              className="mt-1"
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
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

const AnimatedButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  animating: boolean;
  children: React.ReactNode;
  variant?: "default" | "outline";
  size?: "default" | "sm";
  className?: string;
  "aria-label"?: string;
}> = ({
  onClick,
  disabled,
  animating,
  children,
  variant = "default",
  size = "default",
  className = "",
  "aria-label": ariaLabel,
}) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    variant={variant}
    size={size}
    className={`relative overflow-hidden transition-all duration-300 ${
      animating ? "border-green-500 bg-green-500 text-white shadow-lg" : ""
    } ${className}`}
    aria-label={ariaLabel}
  >
    {animating && (
      <>
        <div className="absolute inset-0 animate-ping rounded bg-green-400 opacity-75" />
        <div className="absolute inset-0 animate-pulse rounded bg-green-300 opacity-50" />
      </>
    )}
    <div className="relative flex items-center justify-center">{children}</div>
  </Button>
);

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [copyAnimating, setCopyAnimating] = useState(false);
  const [saveAnimating, setSaveAnimating] = useState(false);
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

  const fetchUsers = useCallback(async () => {
    if (usersLoaded || users.length > 0) return;

    if (!auth?.subdomain || !auth?.username) {
      console.error("Auth information is missing:", auth);
      return;
    }

    try {
      setUsersLoaded(true);
      const result = await (
        window as unknown as WindowWithKintoneAPI
      ).kintoneAPI.getUsers(auth);

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

      const result = await (
        window as unknown as WindowWithKintoneAPI
      ).kintoneAPI.executeQuery(auth, app.appId, generatedQuery);

      if (result.success && result.data) {
        setQueryResult({ records: result.data.records });
      } else {
        const formattedError = queryUtils.formatErrorMessage(
          result.error || "クエリの実行に失敗しました",
        );
        setQueryResult({
          records: [],
          error: result.error || "クエリの実行に失敗しました",
          formattedError: formattedError,
        });
      }
    } catch (err) {
      console.error("Error executing query:", err);
      const errorMessage = `エラーが発生しました: ${err instanceof Error ? err.message : "Unknown error"}`;
      const formattedError = queryUtils.formatErrorMessage(errorMessage);
      setQueryResult({
        records: [],
        error: errorMessage,
        formattedError: formattedError,
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

      saveQuery(
        currentQueryName.trim(),
        conditions,
        sortField !== "none" ? sortField : "",
        generatedQuery,
        limit,
        offset,
        editingQueryId,
      );

      setTimeout(() => {
        setSaveAnimating(false);
      }, 1200);
    } catch (error) {
      console.error("Error saving query:", error);
      setSaveAnimating(false);
      alert("クエリの保存に失敗しました");
    }
  }, [
    generatedQuery,
    currentQueryName,
    conditions,
    sortField,
    limit,
    offset,
    editingQueryId,
    saveQuery,
  ]);

  const handleCopyQuery = useCallback(async () => {
    setCopyAnimating(true);
    await navigator.clipboard.writeText(
      JSON.stringify(generatedQuery).slice(1, -1),
    );
    setTimeout(() => setCopyAnimating(false), 1200);
  }, [generatedQuery]);

  // Effects
  useEffect(() => {
    if (editingQueryId && savedQueries.length > 0) {
      const queryToEdit = savedQueries.find((q) => q.id === editingQueryId);
      if (queryToEdit) {
        setConditions(queryToEdit.conditions);
        setSortField(queryToEdit.orderBy || "none");
        setLimit(queryToEdit.limit);
        setOffset(queryToEdit.offset);
        setCurrentQueryName(queryToEdit.name);
        setIsEditMode(true);
      }
    } else {
      setIsEditMode(false);
      setCurrentQueryName("");
    }
  }, [editingQueryId, savedQueries]);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        setLoading(true);
        setError("");

        if (!(window as unknown as WindowWithKintoneAPI).kintoneAPI) {
          setError(
            "KintoneAPIが利用できません。アプリケーションを再起動してください。",
          );
          return;
        }

        const result = await (
          window as unknown as WindowWithKintoneAPI
        ).kintoneAPI.getAppFields(auth, app.appId);

        if (result.success && result.data?.fields) {
          setFields(result.data.fields);
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
      <header className="border-border/40 bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-slate-600">
                <Code className="h-4 w-4 text-white" />
              </div>
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
                            onValueChange={setSortField}
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
                            onChange={(e) =>
                              setLimit(
                                e.target.value
                                  ? Math.max(
                                      1,
                                      Math.min(500, Number(e.target.value)),
                                    )
                                  : undefined,
                              )
                            }
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
                            onChange={(e) =>
                              setOffset(
                                e.target.value
                                  ? Math.max(0, Number(e.target.value))
                                  : undefined,
                              )
                            }
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
                          <div className="bg-muted scrollbar-hover max-h-40 overflow-y-auto rounded-lg p-4">
                            <code className="text-foreground text-sm whitespace-pre-wrap">
                              {JSON.stringify(generatedQuery).slice(1, -1)}
                            </code>
                          </div>
                          <div className="flex items-center space-x-2">
                            <AnimatedButton
                              onClick={handleCopyQuery}
                              variant="outline"
                              size="sm"
                              animating={copyAnimating}
                              className="w-[120px]"
                              aria-label="クエリをコピー"
                            >
                              <div
                                className={`mr-2 transition-transform duration-300 ${
                                  copyAnimating ? "scale-110 rotate-12" : ""
                                }`}
                              >
                                {copyAnimating ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </div>
                              <span
                                className={`transition-all duration-300 ${
                                  copyAnimating ? "font-medium" : ""
                                }`}
                              >
                                {copyAnimating ? "完了!" : "コピー"}
                              </span>
                            </AnimatedButton>
                            <Button
                              onClick={executeQuery}
                              size="sm"
                              disabled={executing}
                              className="w-[100px] bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-md transition-all duration-200 hover:from-slate-700 hover:to-slate-800 hover:shadow-lg"
                              aria-label="クエリを実行"
                            >
                              {executing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="mr-2 h-4 w-4" />
                              )}
                              {executing ? "実行中..." : "実行"}
                            </Button>
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
                                <Button
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      JSON.stringify(
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
                                      ),
                                    )
                                  }
                                  variant="outline"
                                  size="sm"
                                  aria-label="JSONをコピー"
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  JSONコピー
                                </Button>
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
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
                          <div className="mb-2 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500"></div>
                            <h3 className="font-medium text-red-800 dark:text-red-200">
                              {queryResult.formattedError?.title || "エラー"}
                            </h3>
                          </div>
                          <p className="mb-3 text-sm text-red-700 dark:text-red-300">
                            {queryResult.formattedError?.message ||
                              queryResult.error}
                          </p>
                          {queryResult.formattedError?.suggestions && (
                            <div className="text-sm text-red-600 dark:text-red-400">
                              <p className="mb-1 font-medium">解決方法:</p>
                              <ul className="list-inside list-disc space-y-1">
                                {queryResult.formattedError.suggestions.map(
                                  (suggestion, index) => (
                                    <li key={index}>{suggestion}</li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}
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

      {/* Fixed Footer for Query Save */}
      <footer className="border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed right-0 bottom-0 left-0 z-40 border-t backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground flex items-center space-x-4 text-sm">
              <span>クエリ: {generatedQuery ? "生成済み" : "未生成"}</span>
              {generatedQuery && (
                <span className="bg-muted/50 rounded-md px-2 py-1 font-mono text-xs">
                  {generatedQuery.length > 50
                    ? `${generatedQuery.substring(0, 50)}...`
                    : generatedQuery}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <Input
                placeholder="クエリ名を入力..."
                value={currentQueryName}
                onChange={(e) => setCurrentQueryName(e.target.value)}
                className="w-64"
                aria-label="クエリ名を入力"
              />
              <AnimatedButton
                onClick={handleSaveQuery}
                disabled={!generatedQuery || !currentQueryName.trim()}
                animating={saveAnimating}
                className={`w-[80px] gap-2 shadow-md ${
                  !saveAnimating
                    ? "bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-700 hover:to-slate-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                    : ""
                }`}
                aria-label={isEditMode ? "クエリを更新" : "クエリを保存"}
              >
                <div
                  className={`mr-2 transition-transform duration-300 ${
                    saveAnimating ? "scale-110 rotate-12" : ""
                  }`}
                >
                  {saveAnimating ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`transition-all duration-300 ${
                    saveAnimating ? "font-medium" : ""
                  }`}
                >
                  {saveAnimating ? "完了!" : isEditMode ? "更新" : "保存"}
                </span>
              </AnimatedButton>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
