import { FileText, Trash2, Eye, Calendar, Tag, AlertCircle, Mail } from 'lucide-react';
import { StoredDocument } from '@/hooks/useDocumentStorage';
import { format } from 'date-fns';

interface DocumentVaultProps {
  documents: StoredDocument[];
  onSelect: (doc: StoredDocument) => void;
  onDelete: (id: string) => void;
  onContactOffice?: (doc: StoredDocument) => void;
}

const DocumentVault = ({ documents, onSelect, onDelete, onContactOffice }: DocumentVaultProps) => {
  if (documents.length === 0) {
    return (
      <div className="border-2 border-dashed border-border p-8 text-center">
        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-bold text-lg mb-2">Your Vault is Empty</h3>
        <p className="text-sm text-muted-foreground font-mono">
          Upload and save documents to build your personal archive
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">
        Saved Documents ({documents.length})
      </h3>
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="bg-card border-2 border-border p-4 hover:border-foreground transition-colors group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold truncate">{doc.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Tag size={12} className="text-primary" />
                <span className="text-xs font-mono text-primary">{doc.type}</span>
              </div>
              
              {/* AI Summary */}
              {doc.analysis?.summary && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {doc.analysis.summary}
                </p>
              )}
              
              {/* Key Dates */}
              {doc.analysis?.keyDates && doc.analysis.keyDates.length > 0 && (
                <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
                  <AlertCircle size={12} />
                  <span className="font-mono">{doc.analysis.keyDates[0]}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Calendar size={12} />
                <span>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onSelect(doc)}
                className="p-2 bg-foreground text-background hover:bg-foreground/80 transition-colors"
                title="View document"
              >
                <Eye size={16} />
              </button>
              {onContactOffice && (
                <button
                  onClick={() => onContactOffice(doc)}
                  className="p-2 bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
                  title="Contact office"
                >
                  <Mail size={16} />
                </button>
              )}
              <button
                onClick={() => onDelete(doc.id)}
                className="p-2 bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors"
                title="Delete document"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          {doc.timeline.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-mono text-muted-foreground">
                {doc.timeline.length} steps extracted
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DocumentVault;
