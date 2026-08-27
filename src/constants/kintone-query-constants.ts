import { QueryOperator } from "@/types/kintone";

/**
 * 利用可能な演算子一覧。
 *
 * ラベルに演算子そのものは書かない（UI側で記号を別に並べて表示するため）。
 * in と like はどちらも日本語にすると「含む」になってしまうので、
 * 判定の違いが分かる言い回しにしている。
 * とくに like は素の部分一致ではなく単語単位の検索なので、
 * 「含む」とだけ書くと期待とずれる。
 */
export const operators: { value: QueryOperator; label: string }[] = [
  { value: "=", label: "等しい" },
  { value: "!=", label: "等しくない" },
  { value: ">", label: "より大きい" },
  { value: "<", label: "より小さい" },
  { value: ">=", label: "以上" },
  { value: "<=", label: "以下" },
  { value: "in", label: "いずれかに一致" },
  { value: "not in", label: "いずれにも一致しない" },
  { value: "like", label: "単語を含む" },
  { value: "not like", label: "単語を含まない" },
  { value: "is", label: "空" },
  { value: "is not", label: "空でない" },
];

// フィールドタイプごとに利用可能な演算子
export const fieldTypeOperators: Record<string, QueryOperator[]> = {
  SINGLE_LINE_TEXT: ["=", "!=", "like", "not like", "in", "not in"],
  MULTI_LINE_TEXT: ["like", "not like", "is", "is not"],
  RICH_TEXT: ["like", "not like"],
  NUMBER: ["=", "!=", ">", "<", ">=", "<=", "in", "not in"],
  CALC: ["=", "!=", ">", "<", ">=", "<=", "in", "not in"],
  RADIO_BUTTON: ["in", "not in"],
  CHECKBOX: ["in", "not in"],
  MULTI_SELECT: ["in", "not in"],
  DROP_DOWN: ["in", "not in"],
  DATE: ["=", "!=", ">", "<", ">=", "<="],
  TIME: ["=", "!=", ">", "<", ">=", "<="],
  DATETIME: ["=", "!=", ">", "<", ">=", "<="],
  LINK: ["=", "!=", "like", "not like", "in", "not in"],
  FILE: ["like", "not like", "is", "is not"],
  USER_SELECT: ["in", "not in"],
  ORGANIZATION_SELECT: ["in", "not in"],
  GROUP_SELECT: ["in", "not in"],
  CREATED_TIME: ["=", "!=", ">", "<", ">=", "<="],
  UPDATED_TIME: ["=", "!=", ">", "<", ">=", "<="],
  CREATOR: ["in", "not in"],
  MODIFIER: ["in", "not in"],
  RECORD_NUMBER: ["=", "!=", ">", "<", ">=", "<=", "in"],
  __ID__: ["=", "!=", ">", "<", ">=", "<=", "in", "not in"],
};

// フィールドタイプごとに利用可能な関数
export const fieldTypeFunctions: Record<
  string,
  Array<{ value: string; label: string; description: string }>
> = {
  DATE: [
    { value: "TODAY()", label: "TODAY()", description: "今日の日付" },
    { value: "YESTERDAY()", label: "YESTERDAY()", description: "昨日の日付" },
    { value: "TOMORROW()", label: "TOMORROW()", description: "明日の日付" },
    { value: "THIS_WEEK()", label: "THIS_WEEK()", description: "今週の開始日" },
    { value: "LAST_WEEK()", label: "LAST_WEEK()", description: "先週の開始日" },
    { value: "NEXT_WEEK()", label: "NEXT_WEEK()", description: "来週の開始日" },
    {
      value: "THIS_MONTH()",
      label: "THIS_MONTH()",
      description: "今月の開始日",
    },
    {
      value: "LAST_MONTH()",
      label: "LAST_MONTH()",
      description: "先月の開始日",
    },
    {
      value: "NEXT_MONTH()",
      label: "NEXT_MONTH()",
      description: "来月の開始日",
    },
    { value: "THIS_YEAR()", label: "THIS_YEAR()", description: "今年の開始日" },
    { value: "LAST_YEAR()", label: "LAST_YEAR()", description: "昨年の開始日" },
    { value: "NEXT_YEAR()", label: "NEXT_YEAR()", description: "来年の開始日" },
  ],
  DATETIME: [
    { value: "NOW()", label: "NOW()", description: "現在日時" },
    { value: "TODAY()", label: "TODAY()", description: "今日の00:00" },
    { value: "YESTERDAY()", label: "YESTERDAY()", description: "昨日の00:00" },
    { value: "TOMORROW()", label: "TOMORROW()", description: "明日の00:00" },
    {
      value: "THIS_WEEK()",
      label: "THIS_WEEK()",
      description: "今週の開始日時",
    },
    {
      value: "LAST_WEEK()",
      label: "LAST_WEEK()",
      description: "先週の開始日時",
    },
    {
      value: "NEXT_WEEK()",
      label: "NEXT_WEEK()",
      description: "来週の開始日時",
    },
    {
      value: "THIS_MONTH()",
      label: "THIS_MONTH()",
      description: "今月の開始日時",
    },
    {
      value: "LAST_MONTH()",
      label: "LAST_MONTH()",
      description: "先月の開始日時",
    },
    {
      value: "NEXT_MONTH()",
      label: "NEXT_MONTH()",
      description: "来月の開始日時",
    },
    {
      value: "THIS_YEAR()",
      label: "THIS_YEAR()",
      description: "今年の開始日時",
    },
    {
      value: "LAST_YEAR()",
      label: "LAST_YEAR()",
      description: "昨年の開始日時",
    },
    {
      value: "NEXT_YEAR()",
      label: "NEXT_YEAR()",
      description: "来年の開始日時",
    },
  ],
  CREATED_TIME: [
    { value: "NOW()", label: "NOW()", description: "現在日時" },
    { value: "TODAY()", label: "TODAY()", description: "今日の00:00" },
    { value: "YESTERDAY()", label: "YESTERDAY()", description: "昨日の00:00" },
    { value: "TOMORROW()", label: "TOMORROW()", description: "明日の00:00" },
    {
      value: "THIS_WEEK()",
      label: "THIS_WEEK()",
      description: "今週の開始日時",
    },
    {
      value: "LAST_WEEK()",
      label: "LAST_WEEK()",
      description: "先週の開始日時",
    },
    {
      value: "NEXT_WEEK()",
      label: "NEXT_WEEK()",
      description: "来週の開始日時",
    },
    {
      value: "THIS_MONTH()",
      label: "THIS_MONTH()",
      description: "今月の開始日時",
    },
    {
      value: "LAST_MONTH()",
      label: "LAST_MONTH()",
      description: "先月の開始日時",
    },
    {
      value: "NEXT_MONTH()",
      label: "NEXT_MONTH()",
      description: "来月の開始日時",
    },
    {
      value: "THIS_YEAR()",
      label: "THIS_YEAR()",
      description: "今年の開始日時",
    },
    {
      value: "LAST_YEAR()",
      label: "LAST_YEAR()",
      description: "昨年の開始日時",
    },
    {
      value: "NEXT_YEAR()",
      label: "NEXT_YEAR()",
      description: "来年の開始日時",
    },
  ],
  UPDATED_TIME: [
    { value: "NOW()", label: "NOW()", description: "現在日時" },
    { value: "TODAY()", label: "TODAY()", description: "今日の00:00" },
    { value: "YESTERDAY()", label: "YESTERDAY()", description: "昨日の00:00" },
    { value: "TOMORROW()", label: "TOMORROW()", description: "明日の00:00" },
    {
      value: "THIS_WEEK()",
      label: "THIS_WEEK()",
      description: "今週の開始日時",
    },
    {
      value: "LAST_WEEK()",
      label: "LAST_WEEK()",
      description: "先週の開始日時",
    },
    {
      value: "NEXT_WEEK()",
      label: "NEXT_WEEK()",
      description: "来週の開始日時",
    },
    {
      value: "THIS_MONTH()",
      label: "THIS_MONTH()",
      description: "今月の開始日時",
    },
    {
      value: "LAST_MONTH()",
      label: "LAST_MONTH()",
      description: "先月の開始日時",
    },
    {
      value: "NEXT_MONTH()",
      label: "NEXT_MONTH()",
      description: "来月の開始日時",
    },
    {
      value: "THIS_YEAR()",
      label: "THIS_YEAR()",
      description: "今年の開始日時",
    },
    {
      value: "LAST_YEAR()",
      label: "LAST_YEAR()",
      description: "昨年の開始日時",
    },
    {
      value: "NEXT_YEAR()",
      label: "NEXT_YEAR()",
      description: "来年の開始日時",
    },
  ],
  USER_SELECT: [
    {
      value: "LOGINUSER()",
      label: "LOGINUSER()",
      description: "ログインユーザー",
    },
  ],
  CREATOR: [
    {
      value: "LOGINUSER()",
      label: "LOGINUSER()",
      description: "ログインユーザー",
    },
  ],
  MODIFIER: [
    {
      value: "LOGINUSER()",
      label: "LOGINUSER()",
      description: "ログインユーザー",
    },
  ],
  ORGANIZATION_SELECT: [
    {
      value: "PRIMARY_ORGANIZATION()",
      label: "PRIMARY_ORGANIZATION()",
      description: "ログインユーザーの優先組織",
    },
  ],
};
