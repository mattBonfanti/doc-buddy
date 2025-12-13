import { useState, useMemo } from 'react';
import { ChevronDown, FileText, Calendar, AlertCircle, HelpCircle } from 'lucide-react';
import { StoredDocument } from '@/hooks/useDocumentStorage';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface DynamicFAQProps {
  documents: StoredDocument[];
}

interface FAQItem {
  id: string;
  question: string;
  getAnswer: (docs: StoredDocument[]) => string;
  icon: React.ReactNode;
  category: 'documents' | 'deadlines' | 'process' | 'general';
}

const faqItems: FAQItem[] = [
  {
    id: 'what-docs',
    question: 'What documents do I have stored?',
    icon: <FileText className="h-4 w-4" />,
    category: 'documents',
    getAnswer: (docs) => {
      if (docs.length === 0) {
        return "You haven't saved any documents yet. Upload and save documents to track your Italian bureaucracy paperwork.";
      }
      const docList = docs.map(d => `• ${d.name} (${d.analysis?.category || d.type})`).join('\n');
      return `You have ${docs.length} document${docs.length > 1 ? 's' : ''} saved:\n\n${docList}`;
    },
  },
  {
    id: 'upcoming-deadlines',
    question: 'What are my upcoming deadlines?',
    icon: <Calendar className="h-4 w-4" />,
    category: 'deadlines',
    getAnswer: (docs) => {
      const allDates: string[] = [];
      docs.forEach(doc => {
        if (doc.analysis?.keyDates) {
          allDates.push(...doc.analysis.keyDates.map(d => `• ${d} (from ${doc.name})`));
        }
        if (doc.timeline) {
          doc.timeline.forEach(step => {
            if (step.status !== 'done') {
              allDates.push(`• ${step.stage}: ${step.estimatedDate} (${doc.name})`);
            }
          });
        }
      });
      
      if (allDates.length === 0) {
        return "No deadlines found in your documents. Upload documents with dates to track your upcoming deadlines.";
      }
      return `Found ${allDates.length} date${allDates.length > 1 ? 's' : ''} across your documents:\n\n${allDates.slice(0, 10).join('\n')}${allDates.length > 10 ? '\n\n...and more' : ''}`;
    },
  },
  {
    id: 'pending-actions',
    question: 'What actions do I need to take?',
    icon: <AlertCircle className="h-4 w-4" />,
    category: 'process',
    getAnswer: (docs) => {
      const allActions: string[] = [];
      docs.forEach(doc => {
        if (doc.analysis?.actionItems) {
          allActions.push(...doc.analysis.actionItems.map(a => `• ${a}`));
        }
        if (doc.timeline) {
          doc.timeline.forEach(step => {
            if (step.status === 'pending' || step.status === 'urgent') {
              allActions.push(`• ${step.stage}${step.tip ? ` - ${step.tip}` : ''}`);
            }
          });
        }
      });
      
      if (allActions.length === 0) {
        return "No pending actions found. Your documents either have no action items or all tasks are completed.";
      }
      const uniqueActions = [...new Set(allActions)];
      return `You have ${uniqueActions.length} action${uniqueActions.length > 1 ? 's' : ''} to complete:\n\n${uniqueActions.slice(0, 8).join('\n')}${uniqueActions.length > 8 ? '\n\n...and more' : ''}`;
    },
  },
  {
    id: 'doc-summaries',
    question: 'Can you summarize my documents?',
    icon: <FileText className="h-4 w-4" />,
    category: 'documents',
    getAnswer: (docs) => {
      if (docs.length === 0) {
        return "No documents to summarize. Upload your Italian bureaucracy documents to get AI-powered summaries.";
      }
      const summaries = docs
        .filter(d => d.analysis?.summary)
        .map(d => `**${d.name}**\n${d.analysis?.summary}`)
        .join('\n\n');
      
      if (!summaries) {
        return "Your documents don't have summaries yet. This may happen with older documents. Try re-uploading them.";
      }
      return summaries;
    },
  },
  {
    id: 'urgent-items',
    question: 'Do I have any urgent items?',
    icon: <AlertCircle className="h-4 w-4" />,
    category: 'deadlines',
    getAnswer: (docs) => {
      const urgentItems: string[] = [];
      docs.forEach(doc => {
        if (doc.timeline) {
          doc.timeline.forEach(step => {
            if (step.status === 'urgent') {
              urgentItems.push(`• ${step.stage} - ${step.estimatedDate} (${doc.name})`);
            }
          });
        }
      });
      
      if (urgentItems.length === 0) {
        return "✓ No urgent items detected. You're on track with your documentation.";
      }
      return `⚠️ You have ${urgentItems.length} urgent item${urgentItems.length > 1 ? 's' : ''}:\n\n${urgentItems.join('\n')}`;
    },
  },
  {
    id: 'permesso-status',
    question: 'What is the status of my Permesso di Soggiorno?',
    icon: <HelpCircle className="h-4 w-4" />,
    category: 'process',
    getAnswer: (docs) => {
      const permessoDocs = docs.filter(d => 
        d.name.toLowerCase().includes('permesso') || 
        d.analysis?.category?.toLowerCase().includes('permesso') ||
        d.analysis?.category?.toLowerCase().includes('residence') ||
        d.type.toLowerCase().includes('permit')
      );
      
      if (permessoDocs.length === 0) {
        return "No Permesso di Soggiorno documents found. Upload your residence permit documents to track their status.";
      }
      
      const latestDoc = permessoDocs[0];
      let status = `Found ${permessoDocs.length} related document${permessoDocs.length > 1 ? 's' : ''}.\n\n`;
      status += `Latest: **${latestDoc.name}**\n`;
      if (latestDoc.analysis?.summary) {
        status += `${latestDoc.analysis.summary}\n`;
      }
      if (latestDoc.timeline?.length) {
        const pending = latestDoc.timeline.filter(s => s.status !== 'done');
        if (pending.length > 0) {
          status += `\nPending steps: ${pending.map(s => s.stage).join(', ')}`;
        }
      }
      return status;
    },
  },
  {
    id: 'visa-info',
    question: 'What visa/permit type do I have?',
    icon: <FileText className="h-4 w-4" />,
    category: 'documents',
    getAnswer: (docs) => {
      const categories = docs
        .map(d => d.analysis?.category || d.type)
        .filter(Boolean);
      
      if (categories.length === 0) {
        return "No visa or permit information found. Upload your visa or permit documents to identify your status.";
      }
      
      const uniqueCategories = [...new Set(categories)];
      return `Based on your documents, you have:\n\n${uniqueCategories.map(c => `• ${c}`).join('\n')}`;
    },
  },
  {
    id: 'how-to-use',
    question: 'How do I use this app?',
    icon: <HelpCircle className="h-4 w-4" />,
    category: 'general',
    getAnswer: () => {
      return `**FitIn helps you navigate Italian bureaucracy:**

1. **Upload documents** - Scan or upload your Italian documents
2. **AI extracts text** - We read and understand your documents
3. **Get timelines** - See deadlines and required steps
4. **Highlight text** - Select confusing legal text for plain English explanations
5. **Save to Vault** - Store documents for quick access
6. **Emergency Mode** - Quick access to critical documents when needed

Your documents are analyzed to provide personalized answers right here in this FAQ!`;
    },
  },
];

const DynamicFAQ = ({ documents }: DynamicFAQProps) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [
    { id: 'documents', label: 'My Documents', count: documents.length },
    { id: 'deadlines', label: 'Deadlines' },
    { id: 'process', label: 'Process' },
    { id: 'general', label: 'Help' },
  ];

  const filteredFAQs = useMemo(() => {
    if (!activeCategory) return faqItems;
    return faqItems.filter(item => item.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="bg-card border-4 border-foreground p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <HelpCircle className="h-5 w-5" />
        <h3 className="font-bold text-lg">Quick Answers</h3>
      </div>
      <p className="text-xs font-mono text-muted-foreground mb-4">
        Personalized based on your {documents.length} document{documents.length !== 1 ? 's' : ''}
      </p>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1 text-xs font-bold border-2 transition-colors ${
            activeCategory === null
              ? 'bg-foreground text-background border-foreground'
              : 'bg-background text-foreground border-foreground hover:bg-muted'
          }`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 text-xs font-bold border-2 transition-colors ${
              activeCategory === cat.id
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-foreground hover:bg-muted'
            }`}
          >
            {cat.label}
            {cat.count !== undefined && ` (${cat.count})`}
          </button>
        ))}
      </div>

      {/* FAQ Accordion */}
      <Accordion type="single" collapsible className="space-y-2">
        {filteredFAQs.map(item => (
          <AccordionItem 
            key={item.id} 
            value={item.id}
            className="border-2 border-border px-4"
          >
            <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
              <span className="flex items-center gap-2">
                {item.icon}
                {item.question}
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap pb-4">
              {item.getAnswer(documents)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default DynamicFAQ;
