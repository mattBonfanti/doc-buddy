import { useState, useRef } from 'react';
import { Search, Loader2, ExternalLink, BookOpen, Users, Building2, Mail, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchLimit } from '@/hooks/useSearchLimit';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface FindSolutionsProps {
  onVerifyInfo?: (data: { query: string; results: string }) => void;
}

const FindSolutions = ({ onVerifyInfo }: FindSolutionsProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { remainingSearches, canSearch, recordSearch, dailyLimit, isPremium } = useSearchLimit();

  const suggestedSearches = [
    t('findSolutions.suggestions.renewPermesso'),
    t('findSolutions.suggestions.questuraAppointment'),
    t('findSolutions.suggestions.codiceFiscale'),
    t('findSolutions.suggestions.driversLicense'),
    t('findSolutions.suggestions.registerResidence'),
    t('findSolutions.suggestions.healthcareTessera'),
  ];

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    // Check search limit before proceeding
    if (!canSearch) {
      toast({
        title: t('findSolutions.limitReached'),
        description: t('findSolutions.upgradeForUnlimited'),
        variant: 'destructive',
      });
      return;
    }
    
    setQuery(searchQuery);
    setResults('');
    setIsSearching(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-solutions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ query: searchQuery }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      // Record the search after successful initiation
      recordSearch();

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (!line || line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6);
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              setResults(prev => prev + content);
            }
          } catch {
            // Incomplete JSON, continue
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
        setResults(t('findSolutions.searchFailed'));
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-black mb-2">{t('findSolutions.title')}</h2>
          <p className="text-muted-foreground font-mono text-sm">
            {t('findSolutions.subtitle')}
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('findSolutions.searchPlaceholder')}
                className="w-full pl-12 pr-4 py-4 bg-background border-4 border-foreground font-medium text-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !query.trim() || !canSearch}
              className="px-6 py-4 bg-foreground text-background font-black border-4 border-foreground hover:bg-primary hover:border-primary transition-colors disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="animate-spin" size={24} /> : t('findSolutions.searchButton')}
            </button>
          </div>
        </form>

        {/* Search Limit Badge */}
        {!isPremium && (
          <div className="mb-6 flex items-center justify-between p-3 bg-muted/50 border-2 border-border rounded">
            <div className="flex items-center gap-2 text-sm">
              <span className={`font-mono font-bold ${remainingSearches === 0 ? 'text-destructive' : 'text-foreground'}`}>
                {remainingSearches}/{dailyLimit}
              </span>
              <span className="text-muted-foreground">
                {t('findSolutions.searchesRemaining')}
              </span>
            </div>
            <Link 
              to="/subscription" 
              className="flex items-center gap-1 text-sm text-primary hover:underline font-medium"
            >
              <Crown size={14} />
              {t('findSolutions.upgradeForUnlimited')}
            </Link>
          </div>
        )}

        {/* Suggested Searches */}
        {!results && !isSearching && (
          <div className="mb-8">
            <p className="text-sm font-mono text-muted-foreground mb-3">{t('findSolutions.popularSearches')}</p>
            <div className="flex flex-wrap gap-2">
              {suggestedSearches.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSearch(suggestion)}
                  className="px-3 py-2 text-sm border-2 border-border hover:border-foreground hover:bg-accent transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Source Categories */}
        {!results && !isSearching && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 border-4 border-border">
              <Building2 className="mb-2 text-primary" size={24} />
              <h3 className="font-bold mb-1">{t('findSolutions.officialSources')}</h3>
              <p className="text-sm text-muted-foreground">{t('findSolutions.officialSourcesDesc')}</p>
            </div>
            <div className="p-4 border-4 border-border">
              <Users className="mb-2 text-primary" size={24} />
              <h3 className="font-bold mb-1">{t('findSolutions.communityKnowledge')}</h3>
              <p className="text-sm text-muted-foreground">{t('findSolutions.communityKnowledgeDesc')}</p>
            </div>
            <div className="p-4 border-4 border-border">
              <BookOpen className="mb-2 text-primary" size={24} />
              <h3 className="font-bold mb-1">{t('findSolutions.practicalTips')}</h3>
              <p className="text-sm text-muted-foreground">{t('findSolutions.practicalTipsDesc')}</p>
            </div>
          </div>
        )}

        {(results || isSearching) && (
          <div className="bg-card border-4 border-border p-6">
            <div className="flex items-center justify-between gap-2 mb-4 pb-4 border-b-2 border-border">
              <div className="flex items-center gap-2">
                <Search size={18} className="text-primary" />
                <span className="font-bold">{t('findSolutions.resultsFor')} "{query}"</span>
              </div>
              {results && !isSearching && onVerifyInfo && (
                <button
                  onClick={() => onVerifyInfo({ query, results })}
                  className="flex items-center gap-2 px-3 py-2 text-sm border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Mail size={16} />
                  {t('findSolutions.verifyInfo')}
                </button>
              )}
            </div>
            
            {isSearching && !results && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="animate-spin" size={20} />
                <span>{t('findSolutions.searching')}</span>
              </div>
            )}
            
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {results}
                {isSearching && <span className="animate-pulse">▌</span>}
              </div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        {!isSearching && !results && (
          <div className="mt-8 p-4 bg-muted/50 border-2 border-border">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <ExternalLink size={16} />
              {t('findSolutions.officialResources')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <a href="https://www.portaleimmigrazione.it" target="_blank" rel="noopener noreferrer" 
                className="text-primary hover:underline">Portale Immigrazione</a>
              <a href="https://www.poliziadistato.it" target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline">Polizia di Stato</a>
              <a href="https://www.agenziaentrate.gov.it" target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline">Agenzia delle Entrate</a>
              <a href="https://www.esteri.it" target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline">Ministry of Foreign Affairs</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FindSolutions;
