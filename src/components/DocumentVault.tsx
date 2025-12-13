import { FileText, Trash2, Eye, Calendar } from 'lucide-react';
import { StoredDocument } from '@/hooks/useDocumentStorage';
import { format } from 'date-fns';

interface DocumentVaultProps {
  documents: StoredDocument[];
  onSelect: (doc: StoredDocument) => void;
  onDelete: (id: string) => void;
}

const DocumentVault = ({ documents, onSelect, onDelete }: DocumentVaultProps) => {
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
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {doc.type}
              </p>
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
