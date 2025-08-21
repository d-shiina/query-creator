import { useState, useEffect } from 'react';
import { QueryCondition } from '@/types/kintone';

interface SavedQuery {
  id: string;
  name: string;
  conditions: QueryCondition[];
  orderBy: string;
  limit?: number;
  offset?: number;
  createdAt: string;
  appId: string;
}

interface UseQueryGeneratorReturn {
  savedQueries: SavedQuery[];
  saveQuery: (name: string, conditions: QueryCondition[], orderBy: string, limit?: number, offset?: number) => void;
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
    console.error('Error getting query count:', error);
    return 0;
  }
};

export const useQueryGenerator = (appId: string): UseQueryGeneratorReturn => {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [initialized, setInitialized] = useState(false);

  const generateStorageKey = (appId: string) => `kintone_saved_queries_${appId}`;

  // Load saved queries from localStorage on mount
  useEffect(() => {
    const storageKey = generateStorageKey(appId);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsedQueries = JSON.parse(saved);
        setSavedQueries(parsedQueries);
      } catch (error) {
        console.error('Error loading saved queries:', error);
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
    window.dispatchEvent(new CustomEvent('localStorageUpdate', { 
      detail: { key: storageKey, value: savedQueries } 
    }));
  }, [savedQueries, appId, initialized]);

  const saveQuery = (name: string, conditions: QueryCondition[], orderBy: string, limit?: number, offset?: number) => {
    const newQuery: SavedQuery = {
      id: Date.now().toString(),
      name,
      conditions: conditions.filter(c => c.field && c.operator && c.value), // Only save valid conditions
      orderBy,
      limit,
      offset,
      createdAt: new Date().toISOString(),
      appId,
    };

    setSavedQueries(prev => [newQuery, ...prev]);
  };

  const loadQuery = (query: SavedQuery) => {
    // This will be handled in the parent component
    // Return the query data for parent to use
  };

  const deleteQuery = (queryId: string) => {
    setSavedQueries(prev => prev.filter(q => q.id !== queryId));
  };

  return {
    savedQueries,
    saveQuery,
    loadQuery,
    deleteQuery,
    generateStorageKey,
  };
};