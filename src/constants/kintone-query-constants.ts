// kintoneのクエリ生成・UI用定数

export const operators = [
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

export const fieldTypeOperators: Record<string, string[]> = {
  RECORD_NUMBER: ["=", "!=", ">", "<", ">=", "<=", "in", "not in"],
  __ID__: ["=", "!=", ">", "<", ">=", "<=", "in", "not in"],
  CREATOR: ["in", "not in"],
  MODIFIER: ["in", "not in"],
  CREATED_TIME: ["=", "!=", ">", "<", ">=", "<="],
  UPDATED_TIME: ["=", "!=", ">", "<", ">=", "<="],
  SINGLE_LINE_TEXT: ["=", "!=", "in", "not in", "like", "not like"],
  LINK: ["=", "!=", "in", "not in", "like", "not like"],
  MULTI_LINE_TEXT: ["like", "not like", "is", "is not"],
  RICH_TEXT: ["like", "not like"],
  NUMBER: ["=", "!=", ">", "<", ">=", "<=", "in", "not in"],
  CALC: ["=", "!=", ">", "<", ">=", "<=", "in", "not in"],
  CHECK_BOX: ["in", "not in"],
  RADIO_BUTTON: ["in", "not in"],
  DROP_DOWN: ["in", "not in"],
  MULTI_SELECT: ["in", "not in"],
  FILE: ["like", "not like", "is", "is not"],
  DATE: ["=", "!=", ">", "<", ">=", "<="],
  TIME: ["=", "!=", ">", "<", ">=", "<="],
  DATETIME: ["=", "!=", ">", "<", ">=", "<="],
  USER_SELECT: ["in", "not in"],
  ORGANIZATION_SELECT: ["in", "not in"],
  GROUP_SELECT: ["in", "not in"],
  STATUS: ["=", "!=", "in", "not in"],
  STATUS_ASSIGNEE: ["in", "not in"],
};

export const fieldTypeFunctions: Record<
  string,
  { value: string; label: string; description: string }[]
> = {
  RECORD_NUMBER: [],
  __ID__: [],
  $id: [],
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
      value: "FROM_TODAY()",
      label: "今日から指定日数後",
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
      value: "FROM_TODAY()",
      label: "今日から指定日数後",
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
  SINGLE_LINE_TEXT: [],
  LINK: [],
  NUMBER: [],
  CALC: [],
  MULTI_LINE_TEXT: [],
  RICH_TEXT: [],
  CHECK_BOX: [],
  RADIO_BUTTON: [],
  DROP_DOWN: [],
  MULTI_SELECT: [],
  FILE: [],
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
      value: "FROM_TODAY()",
      label: "今日から指定日数後",
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
  TIME: [],
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
      value: "FROM_TODAY()",
      label: "今日から指定日数後",
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
  GROUP_SELECT: [],
  STATUS: [],
  STATUS_ASSIGNEE: [],
  // ルックアップ・関連レコードは参照元のフィールドタイプに依存
};
