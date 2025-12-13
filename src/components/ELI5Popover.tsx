import { X } from 'lucide-react';

interface ELI5PopoverProps {
  selectedText: string;
  explanation: string;
  isLoading: boolean;
  onClose: () => void;
}

const ELI5Popover = ({ selectedText, explanation, isLoading, onClose }: ELI5PopoverProps) => {
  if (!selectedText) return null;

  return (
    <div className="absolute bottom-6 left-6 right-6 bg-foreground text-background p-6 border-4 border-foreground shadow-lg animate-in slide-in-from-bottom-5">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 hover:bg-background/20 p-1 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      
      <h4 className="text-xs font-bold mb-2 uppercase tracking-wider font-mono text-background/70">
        Explain Like I'm 5
      </h4>
      
      <p className="text-sm font-medium mb-4 opacity-70 border-l-4 border-background/30 pl-3 italic">
        "{selectedText.substring(0, 80)}{selectedText.length > 80 ? '...' : ''}"
      </p>
      
      <div className="text-base leading-relaxed">
        {isLoading ? (
          <span className="animate-pulse font-mono">Translating legalese...</span>
        ) : (
          <span className="font-sans">{explanation}</span>
        )}
      </div>
    </div>
  );
};

export default ELI5Popover;
