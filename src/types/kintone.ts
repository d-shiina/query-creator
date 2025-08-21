// Kintone関連の型定義

export interface KintoneAuth {
  subdomain: string;
  username: string;
  password: string;
}

export interface KintoneApp {
  appId: string;
  code?: string;
  name: string;
  description?: string;
  isFavorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
  modifiedAt?: string;
  usedApiCount?: number; // API使用回数
  creator?: {
    code: string;
    name: string;
  };
  modifier?: {
    code: string;
    name: string;
  };
}

export interface KintoneField {
  code: string;
  label: string;
  type: KintoneFieldType;
  options?: string[];
}

export type KintoneFieldType =
  | "SINGLE_LINE_TEXT"
  | "MULTI_LINE_TEXT"
  | "RICH_TEXT"
  | "NUMBER"
  | "CALC"
  | "RADIO_BUTTON"
  | "CHECK_BOX"
  | "MULTI_SELECT"
  | "DROP_DOWN"
  | "DATE"
  | "TIME"
  | "DATETIME"
  | "USER_SELECT"
  | "ORGANIZATION_SELECT"
  | "GROUP_SELECT"
  | "FILE"
  | "LINK"
  | "SUBTABLE";

export interface QueryCondition {
  field: string;
  operator: QueryOperator;
  value: string;
  logicalOperator?: "and" | "or";
}

export type QueryOperator =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "in"
  | "not in"
  | "like"
  | "not like";

export interface KintoneQuery {
  conditions: QueryCondition[];
  orderBy?: string;
  limit?: number;
  offset?: number;
}

export interface AppFilter {
  searchTerm: string;
  showFavoritesOnly: boolean;
  appId: string;
  appName: string;
  appCode: string;
  creator: string;
  updatedDate: string;
}
