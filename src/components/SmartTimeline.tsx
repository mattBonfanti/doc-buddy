import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface TimelineStep {
  stage: string;
  estimatedDate: string;
  status: 'done' | 'pending' | 'urgent';
  tip?: string;
}

interface SmartTimelineProps {
  steps: TimelineStep[];
}

const SmartTimeline = ({ steps }: SmartTimelineProps) => (
  <div className="mt-4 border-l-4 border-border pl-4 space-y-6">
    {steps.map((step, i) => (
      <div key={i} className="relative">
        <div className={`absolute -left-[26px] top-1 w-4 h-4 border-2 border-foreground flex items-center justify-center ${
          step.status === 'done' 
            ? 'bg-foreground' 
            : step.status === 'urgent'
            ? 'bg-destructive'
            : 'bg-background'
        }`}>
          {step.status === 'done' && <CheckCircle className="w-3 h-3 text-background" />}
          {step.status === 'urgent' && <AlertTriangle className="w-3 h-3 text-destructive-foreground" />}
          {step.status === 'pending' && <Clock className="w-3 h-3 text-muted-foreground" />}
        </div>
        
        <div className="bg-secondary p-4 border-2 border-foreground shadow-xs">
          <div className="flex justify-between items-start gap-2 flex-wrap">
            <h4 className="font-bold text-foreground">{step.stage}</h4>
            <span className="text-xs font-mono bg-background px-2 py-1 border border-foreground">
              {step.estimatedDate}
            </span>
          </div>
          
          {step.tip && (
            <div className="mt-3 text-sm bg-accent p-3 border-2 border-foreground flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-foreground" />
              <span className="text-foreground">{step.tip}</span>
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

export default SmartTimeline;
