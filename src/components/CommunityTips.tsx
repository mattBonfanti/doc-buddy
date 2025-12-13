import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CommunityTipsProps {
  tips: string;
  isLoading: boolean;
}

const CommunityTips = ({ tips, isLoading }: CommunityTipsProps) => {
  const { t } = useTranslation();

  return (
    <div className="bg-card p-6 border-4 border-foreground shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-accent p-2 border-2 border-foreground">
          <AlertTriangle size={24} className="text-foreground" />
        </div>
        <div>
          <h3 className="font-bold text-lg">{t('communityTips.title')}</h3>
          <p className="text-xs font-mono text-muted-foreground">{t('communityTips.subtitle')}</p>
        </div>
      </div>

      <div className="text-sm space-y-3">
        {isLoading && !tips ? (
          <div className="space-y-2">
            <div className="animate-pulse h-4 bg-muted rounded" />
            <div className="animate-pulse h-4 bg-muted rounded w-5/6" />
            <div className="animate-pulse h-4 bg-muted rounded w-4/6" />
          </div>
        ) : tips ? (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap font-mono text-foreground/80 leading-relaxed">
            {tips}
          </div>
        ) : (
          <p className="text-muted-foreground font-mono">{t('communityTips.waiting')}</p>
        )}
      </div>
    </div>
  );
};

export default CommunityTips;
