import { useState, useEffect } from 'react';

export interface SentEmail {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  replyToEmail: string;
  context: {
    type: 'search' | 'document';
    searchQuery?: string;
    documentId?: string;
    documentName?: string;
  };
  sentAt: string;
  status: 'sent' | 'failed';
}

const STORAGE_KEY = 'fitin-email-history';

export const useEmailHistory = () => {
  const [emails, setEmails] = useState<SentEmail[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setEmails(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse email history:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
  }, [emails]);

  const addEmail = (email: Omit<SentEmail, 'id' | 'sentAt'>) => {
    const newEmail: SentEmail = {
      ...email,
      id: crypto.randomUUID(),
      sentAt: new Date().toISOString(),
    };
    setEmails((prev) => [newEmail, ...prev]);
    return newEmail;
  };

  const deleteEmail = (id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id));
  };

  const clearHistory = () => {
    setEmails([]);
  };

  return {
    emails,
    addEmail,
    deleteEmail,
    clearHistory,
  };
};
