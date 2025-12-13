import { useState } from 'react';
import { Upload } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import EmergencyMode from '@/components/EmergencyMode';
import DocumentViewer from '@/components/DocumentViewer';
import SmartTimeline from '@/components/SmartTimeline';
import CommunityTips from '@/components/CommunityTips';
import ELI5Popover from '@/components/ELI5Popover';
import { useDocumentAnalysis } from '@/hooks/useDocumentAnalysis';

const Index = () => {
  const [mode, setMode] = useState<'normal' | 'emergency'>('normal');
  
  const {
    ocrText,
    isProcessing,
    timeline,
    streetTips,
    isTipsLoading,
    explanation,
    isExplaining,
    selectedText,
    handleUpload,
    handleTextSelect,
    clearExplanation,
  } = useDocumentAnalysis();

  const emergencyDocs = [
    { name: 'Passport', type: 'Identity Document' },
    { name: 'Permesso di Soggiorno', type: 'Residence Permit' },
    { name: 'Codice Fiscale', type: 'Tax Code' },
  ];

  if (mode === 'emergency') {
    return <EmergencyMode documents={emergencyDocs} onExit={() => setMode('normal')} />;
  }

  return (
    <main className="min-h-screen bg-background flex flex-col md:flex-row">
      <Sidebar onEmergencyMode={() => setMode('emergency')} />

      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black">Document Scanner</h2>
            <p className="text-muted-foreground font-mono text-sm">AI-powered bureaucracy decoder</p>
          </div>
          
          <label className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 font-bold cursor-pointer hover:bg-foreground/90 transition-colors border-4 border-foreground shadow-sm">
            <Upload size={20} />
            Upload Document
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              accept="image/*,.pdf"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Viewer */}
          <div className="lg:col-span-2 bg-card border-4 border-foreground p-6 relative shadow-md min-h-[500px]">
            <DocumentViewer
              isProcessing={isProcessing}
              ocrText={ocrText}
              onTextSelect={handleTextSelect}
              onUpload={handleUpload}
            />
            
            <ELI5Popover
              selectedText={selectedText}
              explanation={explanation}
              isLoading={isExplaining}
              onClose={clearExplanation}
            />
          </div>

          {/* Intelligence Panel */}
          <div className="space-y-6">
            {/* Timeline */}
            <div className="bg-card p-6 border-4 border-foreground shadow-sm">
              <h3 className="font-bold text-lg mb-1">Deadlines & Steps</h3>
              <p className="text-xs font-mono text-muted-foreground mb-4">Extracted timeline</p>
              
              {timeline.length > 0 ? (
                <SmartTimeline steps={timeline} />
              ) : (
                <p className="text-sm text-muted-foreground font-mono py-8 text-center border-2 border-dashed border-border">
                  Upload a document to generate timeline
                </p>
              )}
            </div>

            {/* Community Tips */}
            <CommunityTips tips={streetTips} isLoading={isTipsLoading} />
          </div>
        </div>
      </div>
    </main>
  );
};

export default Index;
