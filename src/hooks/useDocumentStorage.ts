import { useState, useEffect, useCallback } from 'react';

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
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'fitin_documents';

export const useDocumentStorage = () => {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setDocuments(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored documents:', e);
      }
    }
  }, []);

  const saveDocument = useCallback((doc: Omit<StoredDocument, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newDoc: StoredDocument = {
      ...doc,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setDocuments(prev => {
      const updated = [newDoc, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    
    return newDoc;
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments(prev => {
      const updated = prev.filter(d => d.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getDocument = useCallback((id: string) => {
    return documents.find(d => d.id === id);
  }, [documents]);

  return {
    documents,
    saveDocument,
    deleteDocument,
    getDocument,
  };
};
