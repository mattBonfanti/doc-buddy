import { FileText, Trash2, Eye, Calendar, Tag, AlertCircle, Mail, IdCard, Heart, Briefcase, Home, ClipboardList, Scale, Wallet, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StoredDocument, KeyDate } from '@/hooks/useDocumentStorage';
import { format } from 'date-fns';
import { useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const formatKeyDate = (kd: KeyDate | string): string => {
  if (typeof kd === 'string') return kd;
  return `${kd.label} (${kd.date})`;
};

// Category configuration with icons
const CATEGORY_CONFIG = {
  identity: { icon: IdCard, keywords: ['passport', 'id card', 'codice fiscale', 'permesso', 'identity', 'carta d\'identità', 'residence permit'] },
  health: { icon: Heart, keywords: ['tessera sanitaria', 'health', 'medical', 'sanitary', 'hospital', 'doctor'] },
  work: { icon: Briefcase, keywords: ['contract', 'employment', 'pay slip', 'work', 'job', 'salary', 'busta paga'] },
  housing: { icon: Home, keywords: ['utility', 'rental', 'lease', 'housing', 'affitto', 'bolletta', 'electricity', 'gas', 'water'] },
  forms: { icon: ClipboardList, keywords: ['application', 'form', 'request', 'domanda', 'modulo', 'richiesta'] },
  legal: { icon: Scale, keywords: ['fine', 'notice', 'legal', 'multa', 'court', 'tribunal', 'avviso'] },
  financial: { icon: Wallet, keywords: ['bank', 'tax', 'fiscal', 'payment', 'invoice', 'fattura', 'banca'] },
  other: { icon: FileText, keywords: [] },
} as const;

type CategoryKey = keyof typeof CATEGORY_CONFIG;

const getCategoryForDocument = (doc: StoredDocument): CategoryKey => {
  const searchText = `${doc.type} ${doc.name} ${doc.analysis?.summary || ''}`.toLowerCase();
  
  for (const [category, config] of Object.entries(CATEGORY_CONFIG)) {
    if (category === 'other') continue;
    if (config.keywords.some(keyword => searchText.includes(keyword))) {
      return category as CategoryKey;
    }
  }
  return 'other';
};

interface DocumentVaultProps {
  documents: StoredDocument[];
  selectedDocId?: string;
  onSelect: (doc: StoredDocument) => void;
  onDelete: (id: string) => void;
  onContactOffice?: (doc: StoredDocument) => void;
}

const DocumentVault = ({ documents, selectedDocId, onSelect, onDelete, onContactOffice }: DocumentVaultProps) => {
  const { t } = useTranslation();

  const groupedDocuments = useMemo(() => {
    const groups: Record<CategoryKey, StoredDocument[]> = {
      identity: [],
      health: [],
      work: [],
      housing: [],
      forms: [],
      legal: [],
      financial: [],
      other: [],
    };

    documents.forEach(doc => {
      const category = getCategoryForDocument(doc);
      groups[category].push(doc);
    });

    return groups;
  }, [documents]);

  const categoriesWithDocs = useMemo(() => {
    return (Object.keys(CATEGORY_CONFIG) as CategoryKey[]).filter(
      cat => groupedDocuments[cat].length > 0
    );
  }, [groupedDocuments]);

  if (documents.length === 0) {
    return (
      <div className="border-2 border-dashed border-border p-8 text-center">
        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-bold text-lg mb-2">{t('vault.empty')}</h3>
        <p className="text-sm text-muted-foreground font-mono">
          {t('vault.emptyDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Accordion type="multiple" defaultValue={categoriesWithDocs} className="space-y-2">
        {(Object.keys(CATEGORY_CONFIG) as CategoryKey[]).map(categoryKey => {
          const docs = groupedDocuments[categoryKey];
          const config = CATEGORY_CONFIG[categoryKey];
          const Icon = config.icon;
          
          if (docs.length === 0) return null;

          return (
            <AccordionItem 
              key={categoryKey} 
              value={categoryKey}
              className="border-2 border-border bg-card"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <Icon size={18} className="text-primary" />
                  <span className="font-bold">{t(`vault.categories.${categoryKey}`)}</span>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {docs.length}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-2">
                <div className="space-y-1">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-3 cursor-pointer transition-colors border-l-4 ${
                        selectedDocId === doc.id 
                          ? 'bg-primary/10 border-l-primary' 
                          : 'bg-background hover:bg-muted/50 border-l-transparent'
                      }`}
                      onClick={() => onSelect(doc)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm truncate">{doc.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Tag size={10} className="text-muted-foreground" />
                            <span className="text-xs font-mono text-muted-foreground">{doc.type}</span>
                          </div>
                          
                          {doc.analysis?.keyDates && doc.analysis.keyDates.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                              <AlertCircle size={10} />
                              <span className="font-mono truncate">{formatKeyDate(doc.analysis.keyDates[0])}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelect(doc);
                            }}
                            className="p-1.5 bg-foreground text-background hover:bg-foreground/80 transition-colors"
                            title={t('common.show')}
                          >
                            <Eye size={12} />
                          </button>
                          {onContactOffice && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onContactOffice(doc);
                              }}
                              className="p-1.5 bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
                              title={t('emailComposer.title')}
                            >
                              <Mail size={12} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(doc.id);
                            }}
                            className="p-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default DocumentVault;
