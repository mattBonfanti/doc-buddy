import { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import { supabase } from '@/integrations/supabase/client';

export interface TimelineStep {
  stage: string;
  estimatedDate: string;
  status: 'done' | 'pending' | 'urgent';
  tip?: string;
}

export const useDocumentAnalysis = () => {
  const [ocrText, setOcrText] = useState('');
  const [currentFileName, setCurrentFileName] = useState('');
  const [currentFileType, setCurrentFileType] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);
  const [streetTips, setStreetTips] = useState('');
  const [isTipsLoading, setIsTipsLoading] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setTimeline([]);
    setStreetTips('');
    setCurrentFileName(file.name);
    setCurrentFileType(file.type || 'Document');

    try {
      // Convert file to data URL for Tesseract
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Tesseract OCR runs locally in browser
      const { data: { text } } = await Tesseract.recognize(imageUrl, 'ita+eng', {
        logger: (m) => console.log('OCR Progress:', m),
      });
      
      setOcrText(text);
      setIsProcessing(false);

      // Trigger timeline analysis
      const { data: timelineData, error: timelineError } = await supabase.functions.invoke('analyze', {
        body: { command: 'timeline', text: text },
      });

      if (timelineError) {
        console.error('Timeline error:', timelineError);
      } else if (timelineData?.steps) {
        setTimeline(timelineData.steps);
      }

      // Trigger street tips with streaming
      setIsTipsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ command: 'tips', text: text }),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let tips = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices?.[0]?.delta?.content;
                if (content) {
                  tips += content;
                  setStreetTips(tips);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }
      setIsTipsLoading(false);
    } catch (error) {
      console.error('Upload error:', error);
      setIsProcessing(false);
      setIsTipsLoading(false);
    }
  }, []);

  const explainText = useCallback(async (text: string) => {
    if (!text || text.length < 5) return;

    setSelectedText(text);
    setIsExplaining(true);
    setExplanation('');

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ command: 'explain', text: text }),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let exp = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices?.[0]?.delta?.content;
                if (content) {
                  exp += content;
                  setExplanation(exp);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Explain error:', error);
    } finally {
      setIsExplaining(false);
    }
  }, []);

  const handleTextSelect = useCallback(() => {
    const selection = window.getSelection()?.toString();
    if (selection && selection.length > 5) {
      explainText(selection);
    }
  }, [explainText]);

  const clearExplanation = useCallback(() => {
    setSelectedText('');
    setExplanation('');
  }, []);

  const loadDocument = useCallback((doc: {
    ocrText: string;
    timeline: TimelineStep[];
    tips: string;
    name: string;
    type: string;
  }) => {
    setOcrText(doc.ocrText);
    setTimeline(doc.timeline);
    setStreetTips(doc.tips);
    setCurrentFileName(doc.name);
    setCurrentFileType(doc.type);
    setExplanation('');
    setSelectedText('');
  }, []);

  const clearDocument = useCallback(() => {
    setOcrText('');
    setTimeline([]);
    setStreetTips('');
    setCurrentFileName('');
    setCurrentFileType('');
    setExplanation('');
    setSelectedText('');
  }, []);

  return {
    ocrText,
    currentFileName,
    currentFileType,
    isProcessing,
    timeline,
    streetTips,
    isTipsLoading,
    explanation,
    isExplaining,
    selectedText,
    handleUpload,
    handleTextSelect,
    clearExplanation,
    loadDocument,
    clearDocument,
  };
};
