import { Mail, Trash2, CheckCircle, XCircle, FileText, Search } from 'lucide-react';
import { SentEmail } from '@/hooks/useEmailHistory';
import { format } from 'date-fns';

interface EmailHistoryProps {
  emails: SentEmail[];
  onDelete: (id: string) => void;
}

const EmailHistory = ({ emails, onDelete }: EmailHistoryProps) => {
  if (emails.length === 0) {
    return (
      <div className="border-2 border-dashed border-border p-6 text-center">
        <Mail className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <h4 className="font-bold mb-1">No Emails Sent</h4>
        <p className="text-sm text-muted-foreground font-mono">
          Emails you send to verify information will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {emails.map((email) => (
        <div
          key={email.id}
          className="bg-card border-2 border-border p-4 hover:border-foreground transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {email.status === 'sent' ? (
                  <CheckCircle size={14} className="text-primary flex-shrink-0" />
                ) : (
                  <XCircle size={14} className="text-destructive flex-shrink-0" />
                )}
                <span className="font-bold text-sm truncate">{email.recipientName}</span>
              </div>
              
              <p className="text-xs text-muted-foreground font-mono truncate mb-2">
                {email.recipientEmail}
              </p>
              
              <p className="text-sm font-medium truncate">{email.subject}</p>
              
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                {email.context.type === 'search' ? (
                  <Search size={12} />
                ) : (
                  <FileText size={12} />
                )}
                <span className="truncate">
                  {email.context.type === 'search' 
                    ? `Search: ${email.context.searchQuery}`
                    : `Doc: ${email.context.documentName}`
                  }
                </span>
              </div>
              
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(email.sentAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
            
            <button
              onClick={() => onDelete(email.id)}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmailHistory;
