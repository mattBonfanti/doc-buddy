import { useState } from 'react';
import { X, Send, Loader2, Mail, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ITALIAN_OFFICES, ItalianOffice, getCategoryLabel } from '@/data/italianOffices';
import { toast } from 'sonner';

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmailSent: (email: {
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
    status: 'sent' | 'failed';
  }) => void;
  initialData?: {
    subject?: string;
    body?: string;
    suggestedOffice?: ItalianOffice | null;
    context: {
      type: 'search' | 'document';
      searchQuery?: string;
      documentId?: string;
      documentName?: string;
    };
  };
}

const EmailComposer = ({ isOpen, onClose, onEmailSent, initialData }: EmailComposerProps) => {
  const { t } = useTranslation();
  const [selectedOffice, setSelectedOffice] = useState<ItalianOffice | null>(
    initialData?.suggestedOffice || null
  );
  const [recipientEmail, setRecipientEmail] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');
  const [subject, setSubject] = useState(initialData?.subject || '');
  const [body, setBody] = useState(initialData?.body || '');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!recipientEmail || !replyToEmail || !subject || !body) {
      toast.error(t('emailComposer.fillAllFields'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail) || !emailRegex.test(replyToEmail)) {
      toast.error(t('emailComposer.invalidEmail'));
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-verification-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            recipientEmail,
            recipientName: selectedOffice?.name || 'Office',
            subject,
            body,
            replyToEmail,
            context: initialData?.context,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      onEmailSent({
        recipientEmail,
        recipientName: selectedOffice?.name || 'Office',
        subject,
        body,
        replyToEmail,
        context: initialData?.context || { type: 'search' },
        status: 'sent',
      });

      toast.success(t('emailComposer.sendSuccess'));
      onClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || t('emailComposer.sendFailed'));
      
      onEmailSent({
        recipientEmail,
        recipientName: selectedOffice?.name || 'Office',
        subject,
        body,
        replyToEmail,
        context: initialData?.context || { type: 'search' },
        status: 'failed',
      });
    } finally {
      setIsSending(false);
    }
  };

  const groupedOffices = ITALIAN_OFFICES.reduce((acc, office) => {
    if (!acc[office.category]) acc[office.category] = [];
    acc[office.category].push(office);
    return acc;
  }, {} as Record<string, ItalianOffice[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border-4 border-foreground w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-4 border-border">
          <div className="flex items-center gap-2">
            <Mail size={20} />
            <h2 className="font-black text-lg">{t('emailComposer.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Context Banner */}
          {initialData?.context && (
            <div className="bg-muted p-3 border-2 border-border text-sm">
              <span className="font-bold">{t('emailComposer.context')} </span>
              {initialData.context.type === 'search' && initialData.context.searchQuery && (
                <span>{t('emailComposer.verifyingSearch')} "{initialData.context.searchQuery}"</span>
              )}
              {initialData.context.type === 'document' && initialData.context.documentName && (
                <span>{t('emailComposer.questionAbout')} {initialData.context.documentName}</span>
              )}
            </div>
          )}

          {/* Office Selection */}
          <div>
            <label className="block font-bold text-sm mb-2">{t('emailComposer.selectOffice')}</label>
            <select
              value={selectedOffice?.id || ''}
              onChange={(e) => {
                const office = ITALIAN_OFFICES.find(o => o.id === e.target.value);
                setSelectedOffice(office || null);
              }}
              className="w-full p-3 border-2 border-border bg-background font-mono text-sm focus:outline-none focus:border-foreground"
            >
              <option value="">{t('emailComposer.chooseOffice')}</option>
              {Object.entries(groupedOffices).map(([category, offices]) => (
                <optgroup key={category} label={getCategoryLabel(category as ItalianOffice['category'])}>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selectedOffice && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {selectedOffice.emailHint}
              </p>
            )}
          </div>

          {/* Recipient Email */}
          <div>
            <label className="block font-bold text-sm mb-2">{t('emailComposer.officeEmail')} *</label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="office@example.it"
              className="w-full p-3 border-2 border-border bg-background font-mono text-sm focus:outline-none focus:border-foreground"
            />
          </div>

          {/* Reply-To Email */}
          <div>
            <label className="block font-bold text-sm mb-2">{t('emailComposer.yourEmail')} *</label>
            <input
              type="email"
              value={replyToEmail}
              onChange={(e) => setReplyToEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full p-3 border-2 border-border bg-background font-mono text-sm focus:outline-none focus:border-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('emailComposer.yourEmailHint')}
            </p>
          </div>

          {/* Subject */}
          <div>
            <label className="block font-bold text-sm mb-2">{t('emailComposer.subject')} *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('emailComposer.subjectPlaceholder')}
              className="w-full p-3 border-2 border-border bg-background font-mono text-sm focus:outline-none focus:border-foreground"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block font-bold text-sm mb-2">{t('emailComposer.message')} *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder={t('emailComposer.messagePlaceholder')}
              className="w-full p-3 border-2 border-border bg-background font-mono text-sm focus:outline-none focus:border-foreground resize-none"
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border-2 border-destructive/20 text-sm">
            <AlertCircle size={16} className="text-destructive mt-0.5 flex-shrink-0" />
            <p>
              <strong>Note:</strong> {t('emailComposer.warning')}
            </p>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isSending || !recipientEmail || !replyToEmail || !subject || !body}
            className="w-full flex items-center justify-center gap-2 bg-foreground text-background p-4 font-bold hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {t('emailComposer.sending')}
              </>
            ) : (
              <>
                <Send size={20} />
                {t('emailComposer.send')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailComposer;
