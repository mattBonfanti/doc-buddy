import { useState, useEffect, useCallback } from 'react';

export interface KeyDate {
  label: string;
  date: string; // ISO format YYYY-MM-DD
  type: 'deadline' | 'appointment' | 'expiry';
}

export interface DocumentAnalysis {
  category: string;
  summary: string;
  keyDates: (KeyDate | string)[]; // Support both new structured and legacy string formats
  actionItems: string[];
}

export interface StoredDocument {
  id: string;
  name: string;
  type: string;
  ocrText: string;
  timeline: Array<{
    stage: string;
    estimatedDate: string;
    status: 'done' | 'pending' | 'urgent';
    tip?: string;
  }>;
  tips: string;
  analysis?: DocumentAnalysis;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'fitin_documents';

export const useDocumentStorage = () => {
  const [documents, setDocuments] = useState<StoredDocument[]>(() => {
    // Initialize from localStorage synchronously
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored documents:', e);
        return [];
      }
    }
    return [];
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Sync to localStorage whenever documents change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  const analyzeDocument = async (text: string): Promise<DocumentAnalysis | undefined> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/categorize-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.error('Failed to analyze document');
        return undefined;
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing document:', error);
      return undefined;
    }
  };

  const saveDocument = useCallback(async (doc: Omit<StoredDocument, 'id' | 'createdAt' | 'updatedAt' | 'analysis'>) => {
    setIsAnalyzing(true);
    
    // Analyze document with LLM
    const analysis = await analyzeDocument(doc.ocrText);
    
    const newDoc: StoredDocument = {
      ...doc,
      id: crypto.randomUUID(),
      type: analysis?.category || doc.type,
      analysis,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setDocuments(prev => [newDoc, ...prev]);
    setIsAnalyzing(false);
    
    return newDoc;
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  const getDocument = useCallback((id: string) => {
    return documents.find(d => d.id === id);
  }, [documents]);

  return {
    documents,
    saveDocument,
    deleteDocument,
    getDocument,
    isAnalyzing,
  };
};
