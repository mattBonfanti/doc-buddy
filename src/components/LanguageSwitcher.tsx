import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { supportedLanguages } from '@/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    // Update document direction for RTL languages
    const lang = supportedLanguages.find(l => l.code === langCode);
    if (lang) {
      document.documentElement.dir = lang.dir;
      document.documentElement.lang = langCode;
    }
  };

  const currentLang = supportedLanguages.find(l => l.code === i18n.language) || supportedLanguages[0];

  return (
    <div className="flex items-center gap-2">
      <Globe size={14} className="text-background/60" />
      <Select value={i18n.language} onValueChange={handleLanguageChange}>
        <SelectTrigger className="h-8 w-[100px] border-background/30 bg-transparent text-background text-xs font-mono focus:ring-0 focus:ring-offset-0">
          <SelectValue>{currentLang.nativeName}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {supportedLanguages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code} className="text-xs font-mono">
              {lang.nativeName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSwitcher;
