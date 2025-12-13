import { Shield, FileText, X } from 'lucide-react';

interface Document {
  name: string;
  type: string;
}

interface EmergencyModeProps {
  documents: Document[];
  onExit: () => void;
}

const EmergencyMode = ({ documents, onExit }: EmergencyModeProps) => (
  <div className="fixed inset-0 bg-destructive z-50 flex flex-col items-center justify-center p-4">
    <button
      onClick={onExit}
      className="absolute top-6 right-6 p-2 border-2 border-destructive-foreground hover:bg-destructive-foreground hover:text-destructive transition-colors"
    >
      <X className="w-6 h-6" />
    </button>
    
    <Shield className="w-24 h-24 mb-6 animate-pulse text-destructive-foreground" />
    <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight text-destructive-foreground">EMERGENCY ACCESS</h1>
    <p className="mb-8 text-xl font-mono text-destructive-foreground/80">Police Check / Lost Documents Mode</p>
    
    <div className="grid grid-cols-1 gap-4 w-full max-w-md">
      {documents.map((doc, i) => (
        <div
          key={i}
          className="bg-background text-foreground p-4 border-4 border-foreground shadow-md flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <div>
              <span className="font-bold text-lg block">{doc.name}</span>
              <span className="text-sm text-muted-foreground font-mono">{doc.type}</span>
            </div>
          </div>
          <button className="bg-foreground text-background px-4 py-2 font-bold hover:bg-foreground/80 transition-colors border-2 border-foreground">
            SHOW
          </button>
        </div>
      ))}
    </div>
    
    <button
      onClick={onExit}
      className="mt-12 text-destructive-foreground/70 hover:text-destructive-foreground underline font-mono"
    >
      Exit Emergency Mode
    </button>
  </div>
);

export default EmergencyMode;
