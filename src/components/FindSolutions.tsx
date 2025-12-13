import { useState, useRef } from 'react';
import { Search, Loader2, ExternalLink, BookOpen, Users, Building2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const SUGGESTED_SEARCHES = [
  "How to renew permesso di soggiorno",
  "Questura appointment booking tips",
  "Codice fiscale for foreigners",
  "Convert foreign driver's license",
  "Register residence (residenza)",
  "Healthcare tessera sanitaria",
];

interface FindSolutionsProps {
  onVerifyInfo?: (data: { query: string; results: string }) => void;
}

const FindSolutions = ({ onVerifyInfo }: FindSolutionsProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
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
        setResults('Failed to search. Please try again.');
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
          <h2 className="text-2xl md:text-3xl font-black mb-2">Find Solutions</h2>
          <p className="text-muted-foreground font-mono text-sm">
            Search Italian immigration procedures, community tips & official resources
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search procedures, tips, solutions..."
                className="w-full pl-12 pr-4 py-4 bg-background border-4 border-foreground font-medium text-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="px-6 py-4 bg-foreground text-background font-black border-4 border-foreground hover:bg-primary hover:border-primary transition-colors disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="animate-spin" size={24} /> : 'SEARCH'}
            </button>
          </div>
        </form>

        {/* Suggested Searches */}
        {!results && !isSearching && (
          <div className="mb-8">
            <p className="text-sm font-mono text-muted-foreground mb-3">Popular searches:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_SEARCHES.map((suggestion) => (
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
              <h3 className="font-bold mb-1">Official Sources</h3>
              <p className="text-sm text-muted-foreground">Questura, Prefettura, Portale Immigrazione</p>
            </div>
            <div className="p-4 border-4 border-border">
              <Users className="mb-2 text-primary" size={24} />
              <h3 className="font-bold mb-1">Community Knowledge</h3>
              <p className="text-sm text-muted-foreground">Reddit, Expat Forums, Facebook Groups</p>
            </div>
            <div className="p-4 border-4 border-border">
              <BookOpen className="mb-2 text-primary" size={24} />
              <h3 className="font-bold mb-1">Practical Tips</h3>
              <p className="text-sm text-muted-foreground">Real experiences & street knowledge</p>
            </div>
          </div>
        )}

        {(results || isSearching) && (
          <div className="bg-card border-4 border-border p-6">
            <div className="flex items-center justify-between gap-2 mb-4 pb-4 border-b-2 border-border">
              <div className="flex items-center gap-2">
                <Search size={18} className="text-primary" />
                <span className="font-bold">Results for: "{query}"</span>
              </div>
              {results && !isSearching && onVerifyInfo && (
                <button
                  onClick={() => onVerifyInfo({ query, results })}
                  className="flex items-center gap-2 px-3 py-2 text-sm border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Mail size={16} />
                  Verify Info
                </button>
              )}
            </div>
            
            {isSearching && !results && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="animate-spin" size={20} />
                <span>Searching knowledge base...</span>
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
              Official Resources
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
