import { FileText, Search, Shield, HelpCircle, User } from 'lucide-react';
import { StoredDocument } from '@/hooks/useDocumentStorage';
import ScadenzeGantt from './ScadenzeGantt';

interface SidebarProps {
  onEmergencyMode: () => void;
  activeView?: 'vault' | 'search' | 'faq' | 'profile';
  onNavigate?: (view: 'vault' | 'search' | 'faq' | 'profile') => void;
  documents?: StoredDocument[];
  onSelectDocument?: (id: string) => void;
}

const Sidebar = ({ onEmergencyMode, activeView = 'search', onNavigate, documents = [], onSelectDocument }: SidebarProps) => (
  <aside className="w-full md:w-72 bg-foreground text-background p-6 flex flex-col justify-between min-h-screen md:min-h-0">
    <div>
      <h1 className="text-3xl font-black tracking-tighter mb-2">FitIn.</h1>
      <p className="text-sm font-mono text-background/60 mb-8">Navigate Italian Bureaucracy</p>
      
      <nav className="space-y-2">
        <button 
          onClick={() => onNavigate?.('search')}
          className={`w-full flex items-center gap-3 p-3 font-bold border-4 transition-colors ${
            activeView === 'search' 
              ? 'bg-background text-foreground border-background' 
              : 'text-background/70 hover:text-background hover:bg-background/10 border-transparent'
          }`}
        >
          <Search size={20} />
          Find Solutions
        </button>
        <button 
          onClick={() => onNavigate?.('vault')}
          className={`w-full flex items-center gap-3 p-3 font-bold border-4 transition-colors ${
            activeView === 'vault' 
              ? 'bg-background text-foreground border-background' 
              : 'text-background/70 hover:text-background hover:bg-background/10 border-transparent'
          }`}
        >
          <FileText size={20} />
          My Vault
        </button>
        <button 
          onClick={() => onNavigate?.('profile')}
          className={`w-full flex items-center gap-3 p-3 font-bold border-4 transition-colors ${
            activeView === 'profile' 
              ? 'bg-background text-foreground border-background' 
              : 'text-background/70 hover:text-background hover:bg-background/10 border-transparent'
          }`}
        >
          <User size={20} />
          My Profile
        </button>
        <button className="w-full flex items-center gap-3 p-3 font-medium text-background/70 hover:text-background hover:bg-background/10 transition-colors border-4 border-transparent">
          <HelpCircle size={20} />
          FAQ
        </button>
      </nav>
    </div>

    <div className="space-y-4 mt-8 md:mt-0">
      <ScadenzeGantt documents={documents} onSelectDocument={onSelectDocument} />
      
      <div className="text-xs font-mono text-background/50 p-3 border-2 border-background/20">
        <p className="mb-1">Privacy First</p>
        <p>OCR runs locally in your browser. Your documents never leave your device.</p>
      </div>
      
      <button
        onClick={onEmergencyMode}
        className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground p-4 flex items-center justify-center gap-3 font-black transition-all border-4 border-destructive shadow-sm"
      >
        <Shield size={24} />
        EMERGENCY MODE
      </button>
    </div>
  </aside>
);

export default Sidebar;
