import { FileText, Search, Shield, HelpCircle, User, LogIn, LogOut, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { StoredDocument } from '@/hooks/useDocumentStorage';
import { useAuth } from '@/contexts/AuthContext';
import ScadenzeGantt from './ScadenzeGantt';
import LanguageSwitcher from './LanguageSwitcher';
import { toast } from 'sonner';

interface SidebarProps {
  onEmergencyMode: () => void;
  activeView?: 'vault' | 'search' | 'faq' | 'profile';
  onNavigate?: (view: 'vault' | 'search' | 'faq' | 'profile') => void;
  documents?: StoredDocument[];
  onSelectDocument?: (id: string) => void;
}

const Sidebar = ({ onEmergencyMode, activeView = 'search', onNavigate, documents = [], onSelectDocument }: SidebarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleProtectedNavigation = (view: 'vault' | 'profile') => {
    if (!user) {
      toast.info(t('auth.loginRequired'));
      navigate('/auth');
      return;
    }
    onNavigate?.(view);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success(t('auth.logoutSuccess'));
  };

  return (
    <aside className="w-full md:w-72 bg-foreground text-background p-6 flex flex-col justify-between min-h-screen md:min-h-0">
      <div>
        <h1 className="text-3xl font-black tracking-tighter mb-2">{t('sidebar.title')}</h1>
        <p className="text-sm font-mono text-background/60 mb-8">{t('sidebar.tagline')}</p>
        
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
            {t('sidebar.findSolutions')}
          </button>
          <button 
            onClick={() => handleProtectedNavigation('vault')}
            className={`w-full flex items-center gap-3 p-3 font-bold border-4 transition-colors ${
              activeView === 'vault' 
                ? 'bg-background text-foreground border-background' 
                : 'text-background/70 hover:text-background hover:bg-background/10 border-transparent'
            }`}
          >
            <FileText size={20} />
            {t('sidebar.myVault')}
            {!user && <Lock size={14} className="ml-auto opacity-60" />}
          </button>
          <button 
            onClick={() => handleProtectedNavigation('profile')}
            className={`w-full flex items-center gap-3 p-3 font-bold border-4 transition-colors ${
              activeView === 'profile' 
                ? 'bg-background text-foreground border-background' 
                : 'text-background/70 hover:text-background hover:bg-background/10 border-transparent'
            }`}
          >
            <User size={20} />
            {t('sidebar.myProfile')}
            {!user && <Lock size={14} className="ml-auto opacity-60" />}
          </button>
          <button className="w-full flex items-center gap-3 p-3 font-medium text-background/70 hover:text-background hover:bg-background/10 transition-colors border-4 border-transparent">
            <HelpCircle size={20} />
            {t('sidebar.faq')}
          </button>
        </nav>
      </div>

      <div className="space-y-4 mt-8 md:mt-0">
        <ScadenzeGantt documents={documents} onSelectDocument={onSelectDocument} />
        
        <div className="text-xs font-mono text-background/50 p-3 border-2 border-background/20">
          <p className="mb-1">{t('sidebar.privacyFirst')}</p>
          <p>{t('sidebar.privacyDescription')}</p>
        </div>

        <LanguageSwitcher />

        {/* Auth Button */}
        {user ? (
          <button
            onClick={handleLogout}
            className="w-full bg-muted text-muted-foreground hover:bg-background hover:text-foreground p-3 flex items-center justify-center gap-3 font-bold transition-all border-4 border-background/20"
          >
            <LogOut size={20} />
            {t('auth.logout')}
          </button>
        ) : (
          <button
            onClick={() => navigate('/auth')}
            className="w-full bg-background text-foreground hover:bg-primary hover:text-primary-foreground p-3 flex items-center justify-center gap-3 font-bold transition-all border-4 border-background"
          >
            <LogIn size={20} />
            {t('auth.login')}
          </button>
        )}
        
        <button
          onClick={onEmergencyMode}
          className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground p-4 flex items-center justify-center gap-3 font-black transition-all border-4 border-destructive shadow-sm"
        >
          <Shield size={24} />
          {t('sidebar.emergencyMode')}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
