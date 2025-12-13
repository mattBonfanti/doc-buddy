import { useMemo } from 'react';
import { differenceInDays, format, addDays, parseISO, isValid } from 'date-fns';
import { it } from 'date-fns/locale';
import { StoredDocument, KeyDate } from '@/hooks/useDocumentStorage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarDays } from 'lucide-react';

interface ScadenzeGanttProps {
  documents: StoredDocument[];
  onSelectDocument?: (id: string) => void;
}

interface ParsedDeadline {
  label: string;
  date: Date;
  type: 'deadline' | 'appointment' | 'expiry';
  documentId: string;
  documentName: string;
  daysUntil: number;
}

const ScadenzeGantt = ({ documents, onSelectDocument }: ScadenzeGanttProps) => {
  const TIMELINE_DAYS = 60;
  const today = new Date();

  const deadlines = useMemo(() => {
    const parsed: ParsedDeadline[] = [];

    documents.forEach((doc) => {
      if (!doc.analysis?.keyDates) return;

      doc.analysis.keyDates.forEach((kd) => {
        let dateObj: Date | null = null;
        let label = '';
        let type: 'deadline' | 'appointment' | 'expiry' = 'deadline';

        if (typeof kd === 'string') {
          // Legacy string format - try to parse
          const match = kd.match(/(\d{4}-\d{2}-\d{2})/);
          if (match) {
            dateObj = parseISO(match[1]);
            label = kd;
          }
        } else {
          // Structured KeyDate format
          dateObj = parseISO(kd.date);
          label = kd.label;
          type = kd.type;
        }

        if (dateObj && isValid(dateObj)) {
          const daysUntil = differenceInDays(dateObj, today);
          // Only include future deadlines within our timeline
          if (daysUntil >= 0 && daysUntil <= TIMELINE_DAYS) {
            parsed.push({
              label,
              date: dateObj,
              type,
              documentId: doc.id,
              documentName: doc.name,
              daysUntil,
            });
          }
        }
      });
    });

    return parsed.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [documents, today]);

  const getDeadlineColor = (daysUntil: number) => {
    if (daysUntil < 7) return 'bg-destructive';
    if (daysUntil < 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getDeadlinePosition = (daysUntil: number) => {
    return (daysUntil / TIMELINE_DAYS) * 100;
  };

  if (deadlines.length === 0) {
    return (
      <div className="p-3 border-2 border-background/20 text-xs font-mono text-background/50">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays size={14} />
          <span>Scadenze</span>
        </div>
        <p className="text-background/40">No upcoming deadlines</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-3 border-2 border-background/20">
        <div className="flex items-center gap-2 mb-2 text-xs font-mono text-background/70">
          <CalendarDays size={14} />
          <span>Scadenze ({deadlines.length})</span>
        </div>

        {/* Timeline bar */}
        <div className="relative h-4 bg-background/10 rounded-sm mb-2">
          {/* Today marker */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-background/40" />
          
          {/* 30-day marker */}
          <div 
            className="absolute top-0 bottom-0 w-px bg-background/20" 
            style={{ left: '50%' }}
          />
          
          {/* Deadline dots */}
          {deadlines.map((dl, idx) => (
            <Tooltip key={`${dl.documentId}-${idx}`}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSelectDocument?.(dl.documentId)}
                  className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${getDeadlineColor(dl.daysUntil)} hover:scale-125 transition-transform cursor-pointer border border-background/20`}
                  style={{ left: `${getDeadlinePosition(dl.daysUntil)}%` }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <p className="font-bold text-xs">{dl.label}</p>
                <p className="text-xs text-muted-foreground">
                  {format(dl.date, 'd MMM yyyy', { locale: it })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dl.daysUntil === 0 ? 'Today!' : `${dl.daysUntil} days`}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  📄 {dl.documentName}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Timeline labels */}
        <div className="flex justify-between text-[10px] font-mono text-background/40">
          <span>Today</span>
          <span>30d</span>
          <span>60d</span>
        </div>

        {/* Legend */}
        <div className="flex gap-3 mt-2 text-[10px] font-mono text-background/50">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-destructive" /> &lt;7d
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> &lt;30d
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> &gt;30d
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ScadenzeGantt;
