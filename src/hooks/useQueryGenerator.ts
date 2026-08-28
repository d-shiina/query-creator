import { useState, useEffect } from "react";
import { QueryCondition } from "@/types/kintone";

export interface SavedQuery {
  id: string;
  name: string;
  memo?: string;
  conditions: QueryCondition[];
  orderBy: string;
  limit?: number;
  offset?: number;
  generatedQuery: string;
  createdAt: string;
  appId: string;
}

interface UseQueryGeneratorReturn {
  savedQueries: SavedQuery[];
  saveQuery: (
    name: string,
    conditions: QueryCondition[],
    orderBy: string,
    generatedQuery: string,
    limit?: number,
    offset?: number,
    editingId?: string,
    memo?: string,
  ) => SavedQuery | void;
  loadQuery: (query: SavedQuery) => void;
  deleteQuery: (queryId: string) => void;
  generateStorageKey: (appId: string) => string;
}

// Utility function to get query count for an app (can be used outside of hooks)
export const getQueryCount = (appId: string): number => {
  try {
    const storageKey = `kintone_saved_queries_${appId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const queries = JSON.parse(saved);
      return Array.isArray(queries) ? queries.length : 0;
    }
    return 0;
  } catch (error) {
    console.error("Error getting query count:", error);
    return 0;
  }
};

export const useQueryGenerator = (appId: string): UseQueryGeneratorReturn => {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [initialized, setInitialized] = useState(false);

  const generateStorageKey = (appId: string) =>
    `kintone_saved_queries_${appId}`;

  // Load saved queries from localStorage on mount
  useEffect(() => {
    const storageKey = generateStorageKey(appId);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsedQueries = JSON.parse(saved);
        setSavedQueries(parsedQueries);
      } catch (error) {
        console.error("Error loading saved queries:", error);
        setSavedQueries([]);
      }
    } else {
      setSavedQueries([]);
    }
    setInitialized(true);
  }, [appId]);

  // Save queries to localStorage whenever savedQueries changes (but not on initial load)
  useEffect(() => {
    if (!initialized) return; // Don't save during initial load

    const storageKey = generateStorageKey(appId);
    localStorage.setItem(storageKey, JSON.stringify(savedQueries));
    // Trigger custom event to notify other components
    window.dispatchEvent(
      new CustomEvent("localStorageUpdate", {
        detail: { key: storageKey, value: savedQueries },
      }),
    );
  }, [savedQueries, appId, initialized]);

  const saveQuery = (
    name: string,
    conditions: QueryCondition[],
    orderBy: string,
    generatedQuery: string,
    limit?: number,
    offset?: number,
    editingId?: string, // 編集中のクエリID
    memo?: string, // メモフィールド
  ): SavedQuery | void => {
    console.log("保存処理開始:", { name, conditions, editingId });
    
    // 各条件の詳細をログ出力
    conditions.forEach((condition, index) => {
      console.log(`条件 ${index}:`, {
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
        values: condition.values,
        logicalOperator: condition.logicalOperator
      });
    });
    
    // 有効な条件のみ保存（fieldが設定されている条件）
    const validConditions = conditions.filter((c) => c.field);
    console.log("保存される条件:", validConditions);
    
    const queryData = {
      name,
      memo: memo || undefined, // 空文字の場合はundefinedにする
      conditions: validConditions,
      orderBy,
      limit,
      offset,
      generatedQuery,
      appId,
    };

    if (editingId) {
      // 上書き保存（既存のクエリを更新）
      console.log("既存クエリを更新:", editingId);
      let updatedQuery: SavedQuery | undefined;
      setSavedQueries((prev) =>
        prev.map((q) => {
          if (q.id === editingId) {
            updatedQuery = {
              ...queryData,
              id: editingId,
              createdAt: q.createdAt, // 作成日は保持
            };
            console.log("更新されたクエリ:", updatedQuery);
            return updatedQuery;
          }
          return q;
        }),
      );
      return updatedQuery;
    } else {
      // 新規保存
      const newQuery: SavedQuery = {
        ...queryData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      setSavedQueries((prev) => [newQuery, ...prev]);
      return newQuery;
    }
  };

  const loadQuery = () => {
    // This will be handled in the parent component
    // Return the query data for parent to use
  };

  const deleteQuery = (queryId: string) => {
    setSavedQueries((prev) => prev.filter((q) => q.id !== queryId));
  };

  return {
    savedQueries,
    saveQuery,
    loadQuery,
    deleteQuery,
    generateStorageKey,
  };
};
