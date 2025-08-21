import React, { useState, useEffect } from "react";
import {
  Database,
  Settings,
  Code,
  Copy,
  Play,
  Loader2,
  Plus,
  Minus,
  Save,
  ChevronRight,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

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
import ToggleTheme from "@/components/ToggleTheme";

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
  onBackToAppList?: () => void; // アプリ一覧に戻る関数
  onLogout: () => void;
  editingQueryId?: string; // 編集中のクエリID（オプショナル）
}

const operators = [
  { value: "=", label: "等しい (=)" },
  { value: "!=", label: "等しくない (!=)" },
  { value: ">", label: "より大きい (>)" },
  { value: "<", label: "より小さい (<)" },
  { value: ">=", label: "以上 (>=)" },
  { value: "<=", label: "以下 (<=)" },
  { value: "in", label: "のいずれか (in)" },
  { value: "not in", label: "のいずれでもない (not in)" },
  { value: "like", label: "を含む (like)" },
  { value: "not like", label: "を含まない (not like)" },
  { value: "is", label: "が空 (is)" },
  { value: "is not", label: "が空でない (is not)" },
];

// フィールドタイプごとの利用可能な演算子
const fieldTypeOperators: Record<string, string[]> = {
  RECORD_NUMBER: ["=", "!=", ">", "<", ">=", "<=", "in", "not in"],
  __ID__: ["=", "!=", ">", "<", ">=", "<=", "in", "not in"],
  CREATOR: ["in", "not in"],
  CREATED_TIME: ["=", "!=", ">", "<", ">=", "<="],
  MODIFIER: ["in", "not in"],
  UPDATED_TIME: ["=", "!=", ">", "<", ">=", "<="],
  SINGLE_LINE_TEXT: ["=", "!=", "in", "not in", "like", "not like"],
  LINK: ["=", "!=", "in", "not in", "like", "not like"],
  NUMBER: ["=", "!=", ">", "<", ">=", "<=", "in", "not in"],
  CALC: ["=", "!=", ">", "<", ">=", "<=", "in", "not in"],
  MULTI_LINE_TEXT: ["like", "not like", "is", "is not"],
  RICH_TEXT: ["like", "not like"],
  CHECK_BOX: ["in", "not in"],
  RADIO_BUTTON: ["in", "not in"],
  DROP_DOWN: ["in", "not in"],
  MULTI_SELECT: ["in", "not in"],
  FILE: ["like", "not like"],
  DATE: ["=", "!=", ">", "<", ">=", "<="],
  TIME: ["=", "!=", ">", "<", ">=", "<="],
  DATETIME: ["=", "!=", ">", "<", ">=", "<="],
  USER_SELECT: ["in", "not in"],
  ORGANIZATION_SELECT: ["in", "not in"],
  GROUP_SELECT: ["in", "not in"],
  STATUS: ["=", "!=", "in", "not in"],
  STATUS_ASSIGNEE: ["in", "not in"],
  CATEGORY: ["=", "!=", "in", "not in"],
  REFERENCE_TABLE: ["like", "not like"],
};

// フィールドタイプごとの利用可能な関数
const fieldTypeFunctions: Record<
  string,
  { value: string; label: string; description: string }[]
> = {
  CREATOR: [
    {
      value: "LOGINUSER()",
      label: "ログインユーザー",
      description: "APIを実行したユーザー",
    },
  ],
  MODIFIER: [
    {
      value: "LOGINUSER()",
      label: "ログインユーザー",
      description: "APIを実行したユーザー",
    },
  ],
  STATUS_ASSIGNEE: [
    {
      value: "LOGINUSER()",
      label: "ログインユーザー",
      description: "APIを実行したユーザー",
    },
  ],
  USER_SELECT: [
    {
      value: "LOGINUSER()",
      label: "ログインユーザー",
      description: "APIを実行したユーザー",
    },
  ],
  ORGANIZATION_SELECT: [
    {
      value: "PRIMARY_ORGANIZATION()",
      label: "優先組織",
      description: "APIを実行したユーザーの優先する組織",
    },
  ],
  CREATED_TIME: [
    { value: "NOW()", label: "現在日時", description: "APIを実行した日時" },
    { value: "TODAY()", label: "今日", description: "APIを実行した日" },
    {
      value: "YESTERDAY()",
      label: "昨日",
      description: "APIを実行した日の前日",
    },
    {
      value: "TOMORROW()",
      label: "明日",
      description: "APIを実行した日の翌日",
    },
    {
      value: "FROM_TODAY(1, DAYS)",
      label: "今日から1日後",
      description: "APIを実行した日から起算した期間",
    },
    {
      value: "FROM_TODAY(1, WEEKS)",
      label: "今日から1週間後",
      description: "APIを実行した日から起算した期間",
    },
    {
      value: "FROM_TODAY(1, MONTHS)",
      label: "今日から1ヶ月後",
      description: "APIを実行した日から起算した期間",
    },
    { value: "THIS_WEEK()", label: "今週", description: "APIを実行した週" },
    {
      value: "LAST_WEEK()",
      label: "先週",
      description: "APIを実行した週の前週",
    },
    {
      value: "NEXT_WEEK()",
      label: "来週",
      description: "APIを実行した週の翌週",
    },
    { value: "THIS_MONTH()", label: "今月", description: "APIを実行した月" },
    {
      value: "LAST_MONTH()",
      label: "先月",
      description: "APIを実行した月の前月",
    },
    {
      value: "NEXT_MONTH()",
      label: "来月",
      description: "APIを実行した月の翌月",
    },
    { value: "THIS_YEAR()", label: "今年", description: "APIを実行した年" },
    {
      value: "LAST_YEAR()",
      label: "昨年",
      description: "APIを実行した年の前年",
    },
    {
      value: "NEXT_YEAR()",
      label: "来年",
      description: "APIを実行した年の翌年",
    },
  ],
  UPDATED_TIME: [
    { value: "NOW()", label: "現在日時", description: "APIを実行した日時" },
    { value: "TODAY()", label: "今日", description: "APIを実行した日" },
    {
      value: "YESTERDAY()",
      label: "昨日",
      description: "APIを実行した日の前日",
    },
    {
      value: "TOMORROW()",
      label: "明日",
      description: "APIを実行した日の翌日",
    },
    {
      value: "FROM_TODAY(1, DAYS)",
      label: "今日から1日後",
      description: "APIを実行した日から起算した期間",
    },
    {
      value: "FROM_TODAY(1, WEEKS)",
      label: "今日から1週間後",
      description: "APIを実行した日から起算した期間",
    },
    {
      value: "FROM_TODAY(1, MONTHS)",
      label: "今日から1ヶ月後",
      description: "APIを実行した日から起算した期間",
    },
    { value: "THIS_WEEK()", label: "今週", description: "APIを実行した週" },
    {
      value: "LAST_WEEK()",
      label: "先週",
      description: "APIを実行した週の前週",
    },
    {
      value: "NEXT_WEEK()",
      label: "来週",
      description: "APIを実行した週の翌週",
    },
    { value: "THIS_MONTH()", label: "今月", description: "APIを実行した月" },
    {
      value: "LAST_MONTH()",
      label: "先月",
      description: "APIを実行した月の前月",
    },
    {
      value: "NEXT_MONTH()",
      label: "来月",
      description: "APIを実行した月の翌月",
    },
    { value: "THIS_YEAR()", label: "今年", description: "APIを実行した年" },
    {
      value: "LAST_YEAR()",
      label: "昨年",
      description: "APIを実行した年の前年",
    },
    {
      value: "NEXT_YEAR()",
      label: "来年",
      description: "APIを実行した年の翌年",
    },
  ],
  DATE: [
    { value: "TODAY()", label: "今日", description: "APIを実行した日" },
    {
      value: "YESTERDAY()",
      label: "昨日",
      description: "APIを実行した日の前日",
    },
    {
      value: "TOMORROW()",
      label: "明日",
      description: "APIを実行した日の翌日",
    },
    {
      value: "FROM_TODAY(1, DAYS)",
      label: "今日から1日後",
      description: "APIを実行した日から起算した期間",
    },
    {
      value: "FROM_TODAY(1, WEEKS)",
      label: "今日から1週間後",
      description: "APIを実行した日から起算した期間",
    },
    {
      value: "FROM_TODAY(1, MONTHS)",
      label: "今日から1ヶ月後",
      description: "APIを実行した日から起算した期間",
    },
    { value: "THIS_WEEK()", label: "今週", description: "APIを実行した週" },
    {
      value: "LAST_WEEK()",
      label: "先週",
      description: "APIを実行した週の前週",
    },
    {
      value: "NEXT_WEEK()",
      label: "来週",
      description: "APIを実行した週の翌週",
    },
    { value: "THIS_MONTH()", label: "今月", description: "APIを実行した月" },
    {
      value: "LAST_MONTH()",
      label: "先月",
      description: "APIを実行した月の前月",
    },
    {
      value: "NEXT_MONTH()",
      label: "来月",
      description: "APIを実行した月の翌月",
    },
    { value: "THIS_YEAR()", label: "今年", description: "APIを実行した年" },
    {
      value: "LAST_YEAR()",
      label: "昨年",
      description: "APIを実行した年の前年",
    },
    {
      value: "NEXT_YEAR()",
      label: "来年",
      description: "APIを実行した年の翌年",
    },
  ],
  DATETIME: [
    { value: "NOW()", label: "現在日時", description: "APIを実行した日時" },
    { value: "TODAY()", label: "今日", description: "APIを実行した日" },
    {
      value: "YESTERDAY()",
      label: "昨日",
      description: "APIを実行した日の前日",
    },
    {
      value: "TOMORROW()",
      label: "明日",
      description: "APIを実行した日の翌日",
    },
    {
      value: "FROM_TODAY(1, DAYS)",
      label: "今日から1日後",
      description: "APIを実行した日から起算した期間",
    },
    {
      value: "FROM_TODAY(1, WEEKS)",
      label: "今日から1週間後",
      description: "APIを実行した日から起算した期間",
    },
    {
      value: "FROM_TODAY(1, MONTHS)",
      label: "今日から1ヶ月後",
      description: "APIを実行した日から起算した期間",
    },
    { value: "THIS_WEEK()", label: "今週", description: "APIを実行した週" },
    {
      value: "LAST_WEEK()",
      label: "先週",
      description: "APIを実行した週の前週",
    },
    {
      value: "NEXT_WEEK()",
      label: "来週",
      description: "APIを実行した週の翌週",
    },
    { value: "THIS_MONTH()", label: "今月", description: "APIを実行した月" },
    {
      value: "LAST_MONTH()",
      label: "先月",
      description: "APIを実行した月の前月",
    },
    {
      value: "NEXT_MONTH()",
      label: "来月",
      description: "APIを実行した月の翌月",
    },
    { value: "THIS_YEAR()", label: "今年", description: "APIを実行した年" },
    {
      value: "LAST_YEAR()",
      label: "昨年",
      description: "APIを実行した年の前年",
    },
    {
      value: "NEXT_YEAR()",
      label: "来年",
      description: "APIを実行した年の翌年",
    },
  ],
};

// 並び替えフィールドオプション
const sortFieldOptions = [
  { value: "none", label: "並び替えなし" },
  { value: "$id", label: "レコード番号" },
  { value: "作成日時", label: "作成日時" },
  { value: "更新日時", label: "更新日時" },
];

// ソート方向オプション
const sortDirectionOptions = [
  { value: "asc", label: "昇順" },
  { value: "desc", label: "降順" },
];

export default function QueryGeneratorPage({
  auth,
  app,
  onBack,
  onBackToAppList,
  onLogout,
  editingQueryId,
}: QueryGeneratorPageProps) {
  // Main states
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<KintoneField[]>([]);
  const [generatedQuery, setGeneratedQuery] = useState("");
  const [error, setError] = useState<string>("");
  const [conditions, setConditions] = useState<QueryCondition[]>([
    { field: "", operator: "=", value: "", logicalOperator: "and" },
  ]);
  const [fieldComboboxOpen, setFieldComboboxOpen] = useState<{
    [key: number]: boolean;
  }>({});
  const [orderBy, setOrderBy] = useState("none");
  const [sortField, setSortField] = useState("none");
  const [sortDirection, setSortDirection] = useState("asc");
  const [limit, setLimit] = useState<number>();
  const [offset, setOffset] = useState<number>();
  const [executing, setExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<{
    records: Record<string, unknown>[];
    error?: string;
    formattedError?: { title: string; message: string; suggestion?: string };
  } | null>(null);
  const [activeResultTab, setActiveResultTab] = useState("table");

  // Saved queries
  const { savedQueries, saveQuery } = useQueryGenerator(app.appId);
  const [currentQueryName, setCurrentQueryName] = useState(""); // 現在編集中のクエリ名
  const [isEditMode, setIsEditMode] = useState(false); // 編集モードかどうか
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(""); // 保存成功メッセージ

  // エラーメッセージを親切なメッセージに変換する関数
  const formatErrorMessage = (
    errorMsg: string,
  ): { title: string; message: string; suggestion?: string } => {
    try {
      // JSON形式のエラーを解析
      const jsonMatch = errorMsg.match(/\{.*\}/);
      if (jsonMatch) {
        const errorObj = JSON.parse(jsonMatch[0]);

        switch (errorObj.code) {
          case "GAIA_IL26": {
            // ユーザーが見つからない場合
            const userCodeMatch =
              errorObj.message.match(/ユーザー（code：(.+?)）/);
            const userCode = userCodeMatch ? userCodeMatch[1] : "不明";
            return {
              title: "ユーザーが見つかりません",
              message: `指定されたユーザー「${userCode}」は存在しないか、権限がありません。`,
              suggestion: `・ユーザーコードの入力値を確認してください\n・該当ユーザーがシステムに登録されているか確認してください\n・入力値を「"」（ダブルクォート）で囲んでみてください`,
            };
          }

          case "GAIA_IL23":
            return {
              title: "フィールドが見つかりません",
              message: "指定されたフィールドが存在しません。",
              suggestion: `・フィールドコードが正しいか確認してください\n・フィールドがアプリに存在するか確認してください`,
            };

          case "GAIA_IL22":
            return {
              title: "クエリの構文エラー",
              message: "クエリの記述に誤りがあります。",
              suggestion: `・演算子や値の記述を確認してください\n・特殊文字が含まれる場合は「"」（ダブルクォート）で囲んでください`,
            };

          default:
            return {
              title: "クエリ実行エラー",
              message:
                errorObj.message || "クエリの実行中にエラーが発生しました。",
              suggestion: "・入力内容を確認してから再実行してください",
            };
        }
      }
    } catch {
      // JSON解析に失敗した場合
    }

    // その他のエラーメッセージの処理
    if (errorMsg.includes("400")) {
      return {
        title: "リクエストエラー",
        message: "クエリの内容に問題があります。",
        suggestion: `・検索条件の値や演算子を確認してください\n・特殊文字を含む値は「"」（ダブルクォート）で囲んでください`,
      };
    }

    if (errorMsg.includes("401") || errorMsg.includes("403")) {
      return {
        title: "認証エラー",
        message: "アクセス権限がありません。",
        suggestion: `・ログイン情報を確認してください\n・アプリへのアクセス権限があるか確認してください`,
      };
    }

    // デフォルトのエラーメッセージ
    return {
      title: "エラーが発生しました",
      message: errorMsg,
      suggestion: `・入力内容を確認してから再実行してください\n・問題が継続する場合は管理者にお問い合わせください`,
    };
  };

  // フィールドタイプに基づいて利用可能な演算子を取得
  const getAvailableOperators = (fieldCode: string) => {
    const field = fields.find((f) => f.code === fieldCode);
    console.log("getAvailableOperators - fieldCode:", fieldCode);
    console.log("getAvailableOperators - field found:", field);

    if (!field) {
      console.log(
        "getAvailableOperators - field not found, returning all operators",
      );
      return operators;
    }

    console.log("getAvailableOperators - field.type:", field.type);
    let availableOperatorValues = fieldTypeOperators[field.type] || [];

    // フィールドタイプが見つからない場合、デフォルトの演算子を返す
    if (availableOperatorValues.length === 0) {
      console.log(
        "getAvailableOperators - no operators found for type, using default",
      );
      availableOperatorValues = ["=", "!=", "in", "not in"];
    }

    console.log(
      "getAvailableOperators - availableOperatorValues:",
      availableOperatorValues,
    );

    const filteredOperators = operators.filter((op) =>
      availableOperatorValues.includes(op.value),
    );
    console.log(
      "getAvailableOperators - filtered operators:",
      filteredOperators,
    );

    return filteredOperators;
  };

  // フィールドタイプに基づいて利用可能な関数を取得
  const getAvailableFunctions = (fieldCode: string) => {
    const field = fields.find((f) => f.code === fieldCode);
    console.log("getAvailableFunctions - fieldCode:", fieldCode);
    console.log("getAvailableFunctions - field found:", field);

    if (!field) {
      console.log(
        "getAvailableFunctions - field not found, returning empty array",
      );
      return [];
    }

    console.log("getAvailableFunctions - field.type:", field.type);
    const availableFunctions = fieldTypeFunctions[field.type] || [];
    console.log(
      "getAvailableFunctions - available functions:",
      availableFunctions,
    );

    return availableFunctions;
  };

  // Load editing query if editingQueryId is provided
  useEffect(() => {
    if (editingQueryId && savedQueries.length > 0) {
      const queryToEdit = savedQueries.find((q) => q.id === editingQueryId);
      if (queryToEdit) {
        setConditions(queryToEdit.conditions);
        setOrderBy(queryToEdit.orderBy);
        setLimit(queryToEdit.limit);
        setOffset(queryToEdit.offset);
        setCurrentQueryName(queryToEdit.name);
        setIsEditMode(true);
      }
    } else {
      // 新規作成モード
      setIsEditMode(false);
      setCurrentQueryName("");
    }
  }, [editingQueryId, savedQueries]);

  // Format field value for display
  const formatFieldValue = (fieldData: unknown): string => {
    if (!fieldData) return "";

    // オブジェクトの場合、valueプロパティをチェック
    if (
      typeof fieldData === "object" &&
      fieldData !== null &&
      "value" in fieldData
    ) {
      const data = fieldData as { value: unknown; type?: string };
      const { value } = data;

      // ファイルフィールドの場合
      if (data.type === "FILE" && Array.isArray(value)) {
        return value
          .map((file: { name?: string }) => file.name || "")
          .join(", ");
      }

      // ユーザー選択フィールドの場合
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === "object" &&
        value[0] !== null &&
        "name" in value[0]
      ) {
        return value.map((user: { name: string }) => user.name).join(", ");
      }

      // その他のオブジェクト
      if (typeof value === "object") {
        return JSON.stringify(value);
      }

      return String(value);
    }

    // 配列の場合
    if (Array.isArray(fieldData)) {
      return fieldData.map((item) => String(item)).join(", ");
    }

    // オブジェクトの場合
    if (typeof fieldData === "object") {
      return JSON.stringify(fieldData);
    }

    return String(fieldData);
  };

  // Load app fields
  useEffect(() => {
    const fetchFields = async () => {
      try {
        console.log("Fetching fields for app:", app.appId);
        setLoading(true);
        setError("");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(window as any).kintoneAPI) {
          console.error("window.kintoneAPI is not available");
          setError(
            "KintoneAPIが利用できません。アプリケーションを再起動してください。",
          );
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (window as any).kintoneAPI.getAppFields(
          auth,
          app.appId,
        );
        console.log("Fields result:", result);

        if (result.success && result.data && result.data.fields) {
          console.log("Fields loaded:", result.data.fields.length);
          console.log("First few fields:", result.data.fields.slice(0, 3));
          setFields(result.data.fields);
        } else {
          console.error("Failed to fetch fields:", result.error);
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

  // Auto-generate query when conditions change
  useEffect(() => {
    generateQuery();
  }, [conditions, orderBy, limit, offset]);

  // Handlers
  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: "", operator: "=", value: "", logicalOperator: "and" },
    ]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<QueryCondition>) => {
    setConditions(
      conditions.map((condition, i) =>
        i === index ? { ...condition, ...updates } : condition,
      ),
    );
  };

  const generateQuery = () => {
    const validConditions = conditions.filter((c) => c.field && c.value);

    if (validConditions.length === 0) {
      setGeneratedQuery("");
      return;
    }

    let query = "";

    validConditions.forEach((condition, index) => {
      if (index > 0 && condition.logicalOperator) {
        query += ` ${condition.logicalOperator} `;
      }

      const field = condition.field;
      const operator = condition.operator;
      let value = condition.value;

      console.log("Query generation debug:");
      console.log("  field:", field);
      console.log("  operator:", operator);
      console.log("  value:", value);

      // kintone関数かどうかをチェック
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
      const isKintoneFunction =
        kintoneRegex.test(trimmedValue) ||
        knownFunctions.includes(trimmedValue) ||
        /^FROM_TODAY\(\d+,\s*(DAYS|WEEKS|MONTHS|YEARS)\)$/.test(trimmedValue);
      console.log("  isKintoneFunction:", isKintoneFunction);

      // 値をクォートで囲む（数値フィールドとkintone関数以外）
      const fieldInfo = fields.find((f) => f.code === field);
      console.log("  fieldInfo:", fieldInfo);
      console.log("  fieldType:", fieldInfo?.type);

      if (
        !isKintoneFunction &&
        fieldInfo &&
        fieldInfo.type !== "NUMBER" &&
        fieldInfo.type !== "CALC"
      ) {
        value = `"${value}"`;
        console.log("  value quoted:", value);
      } else {
        console.log("  value not quoted:", value);
      }

      query += `${field} ${operator} ${value}`;
    });

    if (sortField && sortField !== "none") {
      query += ` order by ${sortField} ${sortDirection}`;
    } else if (orderBy && orderBy !== "none") {
      // 後方互換性のため既存のorderByも確認
      query += ` order by ${orderBy}`;
    }

    if (limit) {
      query += ` limit ${limit}`;
    }

    if (offset) {
      query += ` offset ${offset}`;
    }

    setGeneratedQuery(query);
  };

  const executeQuery = async () => {
    if (!generatedQuery) {
      alert("クエリが生成されていません");
      return;
    }

    try {
      setExecuting(true);
      setError("");
      setQueryResult(null); // 前の結果をクリア

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).kintoneAPI.executeQuery(
        auth,
        app.appId,
        generatedQuery,
      );

      if (result.success) {
        setQueryResult(result.data);
      } else {
        // エラーを実行結果として表示
        const formattedError = formatErrorMessage(
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
      // エラーを実行結果として表示
      const errorMessage = `エラーが発生しました: ${err instanceof Error ? err.message : "Unknown error"}`;
      const formattedError = formatErrorMessage(errorMessage);
      setQueryResult({
        records: [],
        error: errorMessage,
        formattedError: formattedError,
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleSaveQuery = () => {
    if (!generatedQuery || !currentQueryName.trim()) {
      alert("クエリ名とクエリ内容が必要です");
      return;
    }

    try {
      saveQuery(
        currentQueryName.trim(),
        conditions,
        orderBy,
        generatedQuery,
        limit,
        offset,
        editingQueryId, // 編集中のクエリIDを渡す
      );

      if (isEditMode) {
        setSaveSuccessMessage("クエリを更新しました");
      } else {
        setSaveSuccessMessage("クエリを保存しました");
      }

      // 3秒後にメッセージを非表示にする
      setTimeout(() => {
        setSaveSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error saving query:", error);
      alert("クエリの保存に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>フィールド情報を読み込んでいます...</span>
        </div>
      </div>
    );
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
          <nav className="mb-6">
            <ol className="text-muted-foreground flex items-center space-x-2 text-sm">
              <li>
                <button
                  onClick={onBackToAppList}
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
                  onClick={onBack}
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

          {error && (
            <div className="bg-destructive/10 border-destructive/20 mb-6 rounded-lg border p-4">
              <p className="text-destructive">{error}</p>
            </div>
          )}

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
                        <div
                          key={index}
                          className="bg-muted/20 rounded-lg border p-4"
                        >
                          <div>
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  条件 {index + 1}
                                </Badge>
                                {index > 0 && (
                                  <Select
                                    value={condition.logicalOperator}
                                    onValueChange={(value: "and" | "or") =>
                                      updateCondition(index, {
                                        logicalOperator: value,
                                      })
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
                                onClick={() => removeCondition(index)}
                                className="h-7 w-7 p-0"
                                disabled={conditions.length === 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                              <div className="md:col-span-4">
                                <Popover
                                  open={fieldComboboxOpen[index] || false}
                                  onOpenChange={(open) =>
                                    setFieldComboboxOpen((prev) => ({
                                      ...prev,
                                      [index]: open,
                                    }))
                                  }
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={
                                        fieldComboboxOpen[index] || false
                                      }
                                      className="w-full justify-between"
                                    >
                                      <span className="truncate">
                                        {condition.field
                                          ? fields.find(
                                              (field) =>
                                                field.code === condition.field,
                                            )?.label
                                          : "フィールドを選択"}
                                      </span>
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                      <CommandInput placeholder="フィールドを検索..." />
                                      <CommandList>
                                        <CommandEmpty>
                                          フィールドが見つかりません。
                                        </CommandEmpty>
                                        <CommandGroup>
                                          {fields.map((field) => (
                                            <CommandItem
                                              key={field.code}
                                              value={field.label}
                                              onSelect={() => {
                                                const availableOps =
                                                  fieldTypeOperators[
                                                    field.type
                                                  ] || [];
                                                const currentOp =
                                                  condition.operator;
                                                const newOperator =
                                                  availableOps.includes(
                                                    currentOp,
                                                  )
                                                    ? currentOp
                                                    : availableOps[0] || "=";

                                                updateCondition(index, {
                                                  field: field.code,
                                                  operator:
                                                    newOperator as QueryOperator,
                                                  value: "", // フィールド変更時に値もクリア
                                                });
                                                setFieldComboboxOpen(
                                                  (prev) => ({
                                                    ...prev,
                                                    [index]: false,
                                                  }),
                                                );
                                              }}
                                            >
                                              <Check
                                                className={`mr-2 h-4 w-4 ${
                                                  condition.field === field.code
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                                }`}
                                              />
                                              {field.label}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div className="md:col-span-3">
                                <Select
                                  value={condition.operator}
                                  onValueChange={(value) =>
                                    updateCondition(index, {
                                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                      operator: value as any,
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue className="truncate" />
                                  </SelectTrigger>
                                  <SelectContent className="min-w-[200px]">
                                    {getAvailableOperators(condition.field).map(
                                      (op) => (
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
                              <div className="md:col-span-5">
                                <div className="flex gap-2">
                                  <Input
                                    value={condition.value}
                                    onChange={(e) =>
                                      updateCondition(index, {
                                        value: e.target.value,
                                      })
                                    }
                                    placeholder="値を入力"
                                    className="flex-1"
                                  />
                                  {condition.field &&
                                    getAvailableFunctions(condition.field)
                                      .length > 0 && (
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="shrink-0 px-3"
                                            title="関数を選択"
                                          >
                                            f(x)
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md">
                                          <DialogHeader>
                                            <DialogTitle>
                                              関数を選択
                                            </DialogTitle>
                                            <DialogDescription>
                                              利用可能な関数から選択してください
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="max-h-60 space-y-2 overflow-y-auto">
                                            {getAvailableFunctions(
                                              condition.field,
                                            ).length > 0 ? (
                                              getAvailableFunctions(
                                                condition.field,
                                              ).map((func) => (
                                                <div
                                                  key={func.value}
                                                  className="hover:bg-muted flex cursor-pointer items-center justify-between rounded p-2"
                                                  onClick={() => {
                                                    updateCondition(index, {
                                                      value: func.value,
                                                    });
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
                                              ))
                                            ) : (
                                              <div className="text-muted-foreground p-4 text-center">
                                                このフィールドタイプでは利用可能な関数はありません
                                              </div>
                                            )}
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                    )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        onClick={addCondition}
                        className="w-full"
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
                            <SelectTrigger className="w-full">
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
                            <SelectTrigger className="w-full">
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
                            value={limit || ""}
                            placeholder="例: 100"
                            onChange={(e) =>
                              setLimit(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              )
                            }
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
                            value={offset || ""}
                            placeholder="例: 0"
                            onChange={(e) =>
                              setOffset(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              )
                            }
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
                            <code className="text-foreground text-sm">
                              {generatedQuery}
                            </code>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() =>
                                navigator.clipboard.writeText(generatedQuery)
                              }
                              variant="outline"
                              size="sm"
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              コピー
                            </Button>
                            <Button
                              onClick={executeQuery}
                              size="sm"
                              disabled={executing}
                              className="bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-md transition-all duration-200 hover:from-slate-700 hover:to-slate-800 hover:shadow-lg"
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

                              {/* Parameters Section */}
                              <div className="space-y-2">
                                <div className="text-foreground border-b pb-1 text-sm font-medium">
                                  リクエストパラメータ
                                </div>
                                <div className="bg-background space-y-3 rounded p-3">
                                  <div className="grid grid-cols-1 gap-3">
                                    <div className="flex flex-col">
                                      <label className="mb-1 font-mono text-xs text-blue-600">
                                        app:
                                      </label>
                                      <code className="bg-muted rounded p-2 text-xs">
                                        {app.appId}
                                      </code>
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="mb-1 font-mono text-xs text-blue-600">
                                        query:
                                      </label>
                                      <code className="bg-muted min-h-[2rem] rounded p-2 text-xs whitespace-pre-wrap">
                                        {generatedQuery || "（条件なし）"}
                                      </code>
                                    </div>
                                    {limit && (
                                      <div className="flex flex-col">
                                        <label className="mb-1 font-mono text-xs text-blue-600">
                                          size:
                                        </label>
                                        <code className="bg-muted rounded p-2 text-xs">
                                          {limit}
                                        </code>
                                      </div>
                                    )}
                                    {offset && (
                                      <div className="flex flex-col">
                                        <label className="mb-1 font-mono text-xs text-blue-600">
                                          offset:
                                        </label>
                                        <code className="bg-muted rounded p-2 text-xs">
                                          {offset}
                                        </code>
                                      </div>
                                    )}
                                  </div>
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
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
                          <div className="mb-2 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500"></div>
                            <h3 className="font-medium text-red-800 dark:text-red-200">
                              エラー
                            </h3>
                          </div>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            {queryResult.formattedError?.message ||
                              queryResult.error}
                          </p>
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
                            {/* スライド背景 */}
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
                                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                      .map((record: any, index: number) => (
                                        <tr
                                          key={index}
                                          className="hover:bg-muted/30 border-b"
                                        >
                                          {Object.entries(record).map(
                                            ([fieldCode, fieldData]: [
                                              string,
                                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                              any,
                                            ]) => (
                                              <td
                                                key={fieldCode}
                                                className="max-w-48 overflow-hidden border-r p-2 text-ellipsis"
                                                style={{
                                                  writingMode: "horizontal-tb",
                                                }}
                                              >
                                                {formatFieldValue(fieldData)}
                                              </td>
                                            ),
                                          )}
                                        </tr>
                                      ))}
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
                                style={tomorrow}
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
              />
              <Button
                onClick={handleSaveQuery}
                disabled={!generatedQuery || !currentQueryName.trim()}
                className="gap-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-md transition-all duration-200 hover:from-slate-700 hover:to-slate-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isEditMode ? "更新" : "保存"}
              </Button>
              {saveSuccessMessage && (
                <div className="animate-in fade-in-0 slide-in-from-right-1 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800 duration-300">
                  <Check className="h-4 w-4" />
                  {saveSuccessMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
