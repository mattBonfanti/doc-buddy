import { Loader2, CheckCircle, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DocumentViewerProps {
  isProcessing: boolean;
  ocrText: string;
  onTextSelect: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const DocumentViewer = ({ isProcessing, ocrText, onTextSelect, onUpload }: DocumentViewerProps) => {
  const { t } = useTranslation();

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center flex-col text-muted-foreground h-full min-h-[400px]">
        <Loader2 className="animate-spin w-12 h-12 mb-4" />
        <p className="font-mono text-lg">{t('documentViewer.scanning')}</p>
        <p className="text-sm mt-2">{t('documentViewer.privacyOcr')}</p>
      </div>
    );
  }

  if (ocrText) {
    return (
      <div className="prose max-w-none">
        <div className="bg-secondary p-4 border-4 border-foreground mb-6 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="font-mono text-sm">
            {t('documentViewer.highlightTip')}
          </span>
        </div>
        <div
          className="whitespace-pre-wrap font-serif text-lg leading-relaxed cursor-text selection:bg-accent selection:text-accent-foreground p-4 border-2 border-border bg-card"
          onMouseUp={onTextSelect}
        >
          {ocrText}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-full min-h-[400px]">
      <div className="border-4 border-dashed border-border p-12 w-full max-w-md">
        <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <p className="text-xl font-bold mb-2">{t('documentViewer.noDocument')}</p>
        <p className="text-sm font-mono mb-6">{t('documentViewer.uploadPrompt')}</p>
        <label className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 font-bold cursor-pointer hover:bg-foreground/90 transition-colors border-4 border-foreground shadow-sm">
          <Upload className="w-5 h-5" />
          {t('documentViewer.chooseFile')}
          <input
            type="file"
            className="hidden"
            onChange={onUpload}
            accept="image/*,.pdf"
          />
        </label>
      </div>
    </div>
  );
};

export default DocumentViewer;
