import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'fitin_search_usage';
const DAILY_LIMIT = 3;

interface SearchUsage {
  count: number;
  date: string; // YYYY-MM-DD format
}

const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

const getStoredUsage = (): SearchUsage => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const usage: SearchUsage = JSON.parse(stored);
      // Reset if it's a new day
      if (usage.date !== getTodayDate()) {
        return { count: 0, date: getTodayDate() };
      }
      return usage;
    }
  } catch (e) {
    console.error('Error reading search usage:', e);
  }
  return { count: 0, date: getTodayDate() };
};

const saveUsage = (usage: SearchUsage): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch (e) {
    console.error('Error saving search usage:', e);
  }
};

export const useSearchLimit = () => {
  const { isPremium } = useAuth();
  const [usage, setUsage] = useState<SearchUsage>(getStoredUsage);

  // Check and reset on day change
  useEffect(() => {
    const currentUsage = getStoredUsage();
    if (currentUsage.date !== usage.date || currentUsage.count !== usage.count) {
      setUsage(currentUsage);
    }
  }, []);

  const remainingSearches = Math.max(0, DAILY_LIMIT - usage.count);
  const canSearch = isPremium || usage.count < DAILY_LIMIT;

  const recordSearch = useCallback(() => {
    if (isPremium) return; // Don't track for premium users
    
    const newUsage: SearchUsage = {
      count: usage.count + 1,
      date: getTodayDate()
    };
    setUsage(newUsage);
    saveUsage(newUsage);
  }, [isPremium, usage.count]);

  return {
    remainingSearches,
    canSearch,
    recordSearch,
    dailyLimit: DAILY_LIMIT,
    isPremium
  };
};
