import { useState, useMemo } from 'react';
import { FileText, Calendar, AlertCircle, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

const DynamicFAQ = ({ documents }: DynamicFAQProps) => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [
    { id: 'documents', label: t('faq.categories.myDocuments'), count: documents.length },
    { id: 'deadlines', label: t('faq.categories.deadlines') },
    { id: 'process', label: t('faq.categories.process') },
    { id: 'general', label: t('faq.categories.help') },
  ];

  const faqItems = useMemo(() => [
    {
      id: 'what-docs',
      question: t('faq.questions.whatDocs'),
      icon: <FileText className="h-4 w-4" />,
      category: 'documents',
      getAnswer: (docs: StoredDocument[]) => {
        if (docs.length === 0) {
          return t('faq.questions.whatDocsEmpty');
        }
        const docList = docs.map(d => `• ${d.name} (${d.analysis?.category || d.type})`).join('\n');
        return `${t('faq.questions.whatDocsAnswer', { count: docs.length })}\n\n${docList}`;
      },
    },
    {
      id: 'upcoming-deadlines',
      question: t('faq.questions.upcomingDeadlines'),
      icon: <Calendar className="h-4 w-4" />,
      category: 'deadlines',
      getAnswer: (docs: StoredDocument[]) => {
        const allDates: string[] = [];
        docs.forEach(doc => {
          if (doc.analysis?.keyDates) {
            allDates.push(...doc.analysis.keyDates.map(d => 
              typeof d === 'string' ? `• ${d} (${doc.name})` : `• ${d.label}: ${d.date} (${doc.name})`
            ));
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
          return t('faq.questions.noDeadlines');
        }
        return `${t('faq.questions.deadlinesFound', { count: allDates.length })}\n\n${allDates.slice(0, 10).join('\n')}${allDates.length > 10 ? '\n\n...' : ''}`;
      },
    },
    {
      id: 'pending-actions',
      question: t('faq.questions.pendingActions'),
      icon: <AlertCircle className="h-4 w-4" />,
      category: 'process',
      getAnswer: (docs: StoredDocument[]) => {
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
          return t('faq.questions.noActions');
        }
        const uniqueActions = [...new Set(allActions)];
        return `${t('faq.questions.actionsFound', { count: uniqueActions.length })}\n\n${uniqueActions.slice(0, 8).join('\n')}${uniqueActions.length > 8 ? '\n\n...' : ''}`;
      },
    },
    {
      id: 'doc-summaries',
      question: t('faq.questions.summarize'),
      icon: <FileText className="h-4 w-4" />,
      category: 'documents',
      getAnswer: (docs: StoredDocument[]) => {
        if (docs.length === 0) {
          return t('faq.questions.noSummaries');
        }
        const summaries = docs
          .filter(d => d.analysis?.summary)
          .map(d => `**${d.name}**\n${d.analysis?.summary}`)
          .join('\n\n');
        
        if (!summaries) {
          return t('faq.questions.noSummariesYet');
        }
        return summaries;
      },
    },
    {
      id: 'urgent-items',
      question: t('faq.questions.urgentItems'),
      icon: <AlertCircle className="h-4 w-4" />,
      category: 'deadlines',
      getAnswer: (docs: StoredDocument[]) => {
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
          return `✓ ${t('faq.questions.noUrgent')}`;
        }
        return `⚠️ ${t('faq.questions.urgentFound', { count: urgentItems.length })}\n\n${urgentItems.join('\n')}`;
      },
    },
    {
      id: 'permesso-status',
      question: t('faq.questions.permessoStatus'),
      icon: <HelpCircle className="h-4 w-4" />,
      category: 'process',
      getAnswer: (docs: StoredDocument[]) => {
        const permessoDocs = docs.filter(d => 
          d.name.toLowerCase().includes('permesso') || 
          d.analysis?.category?.toLowerCase().includes('permesso') ||
          d.analysis?.category?.toLowerCase().includes('residence') ||
          d.type.toLowerCase().includes('permit')
        );
        
        if (permessoDocs.length === 0) {
          return t('faq.questions.noPermesso');
        }
        
        const latestDoc = permessoDocs[0];
        let status = `${t('faq.questions.permessoFound', { count: permessoDocs.length })}\n\n`;
        status += `**${latestDoc.name}**\n`;
        if (latestDoc.analysis?.summary) {
          status += `${latestDoc.analysis.summary}\n`;
        }
        if (latestDoc.timeline?.length) {
          const pending = latestDoc.timeline.filter(s => s.status !== 'done');
          if (pending.length > 0) {
            status += `\nPending: ${pending.map(s => s.stage).join(', ')}`;
          }
        }
        return status;
      },
    },
    {
      id: 'visa-info',
      question: t('faq.questions.visaInfo'),
      icon: <FileText className="h-4 w-4" />,
      category: 'documents',
      getAnswer: (docs: StoredDocument[]) => {
        const categories = docs
          .map(d => d.analysis?.category || d.type)
          .filter(Boolean);
        
        if (categories.length === 0) {
          return t('faq.questions.noVisa');
        }
        
        const uniqueCategories = [...new Set(categories)];
        return `${t('faq.questions.visaAnswer')}\n\n${uniqueCategories.map(c => `• ${c}`).join('\n')}`;
      },
    },
    {
      id: 'how-to-use',
      question: t('faq.questions.howToUse'),
      icon: <HelpCircle className="h-4 w-4" />,
      category: 'general',
      getAnswer: () => t('faq.questions.howToUseAnswer'),
    },
  ], [t]);

  const filteredFAQs = useMemo(() => {
    if (!activeCategory) return faqItems;
    return faqItems.filter(item => item.category === activeCategory);
  }, [activeCategory, faqItems]);

  return (
    <div className="bg-card border-4 border-foreground p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <HelpCircle className="h-5 w-5" />
        <h3 className="font-bold text-lg">{t('faq.title')}</h3>
      </div>
      <p className="text-xs font-mono text-muted-foreground mb-4">
        {t('faq.subtitle', { count: documents.length })}
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
          {t('common.all')}
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
