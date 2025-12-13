import { useState } from 'react';
import { Upload, Save } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import EmergencyMode from '@/components/EmergencyMode';
import DocumentViewer from '@/components/DocumentViewer';
import SmartTimeline from '@/components/SmartTimeline';
import CommunityTips from '@/components/CommunityTips';
import ELI5Popover from '@/components/ELI5Popover';
import FindSolutions from '@/components/FindSolutions';
import DocumentVault from '@/components/DocumentVault';
import { useDocumentAnalysis } from '@/hooks/useDocumentAnalysis';
import { useDocumentStorage } from '@/hooks/useDocumentStorage';
import { toast } from 'sonner';

const Index = () => {
  const [mode, setMode] = useState<'normal' | 'emergency' | 'search'>('normal');
  
  const {
    ocrText,
    currentFileName,
    currentFileType,
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
    loadDocument,
  } = useDocumentAnalysis();

  const { documents, saveDocument, deleteDocument } = useDocumentStorage();

  const handleSaveDocument = () => {
    if (!ocrText) {
      toast.error('No document to save');
      return;
    }
    
    saveDocument({
      name: currentFileName || 'Untitled Document',
      type: currentFileType || 'Document',
      ocrText,
      timeline,
      tips: streetTips,
    });
    toast.success('Document saved to vault');
  };

  const handleSelectDocument = (doc: typeof documents[0]) => {
    loadDocument({
      ocrText: doc.ocrText,
      timeline: doc.timeline,
      tips: doc.tips,
      name: doc.name,
      type: doc.type,
    });
  };

  const emergencyDocs = documents.length > 0 
    ? documents.map(doc => ({ name: doc.name, type: doc.type }))
    : [
        { name: 'Passport', type: 'Identity Document' },
        { name: 'Permesso di Soggiorno', type: 'Residence Permit' },
        { name: 'Codice Fiscale', type: 'Tax Code' },
      ];

  if (mode === 'emergency') {
    return <EmergencyMode documents={emergencyDocs} onExit={() => setMode('normal')} />;
  }

  if (mode === 'search') {
    return (
      <main className="min-h-screen bg-background flex flex-col md:flex-row">
        <Sidebar 
          onEmergencyMode={() => setMode('emergency')} 
          activeView="search"
          onNavigate={(view) => setMode(view as 'normal' | 'search')}
        />
        <FindSolutions />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col md:flex-row">
      <Sidebar 
        onEmergencyMode={() => setMode('emergency')} 
        activeView="vault"
        onNavigate={(view) => setMode(view === 'search' ? 'search' : 'normal')}
      />

      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black">Document Scanner</h2>
            <p className="text-muted-foreground font-mono text-sm">AI-powered bureaucracy decoder</p>
          </div>
          
          <div className="flex gap-3">
            {ocrText && (
              <button
                onClick={handleSaveDocument}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 font-bold cursor-pointer hover:bg-primary/90 transition-colors border-4 border-primary"
              >
                <Save size={20} />
                Save to Vault
              </button>
            )}
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

            {/* Document Vault */}
            <div className="bg-card p-6 border-4 border-foreground shadow-sm">
              <h3 className="font-bold text-lg mb-1">Document Vault</h3>
              <p className="text-xs font-mono text-muted-foreground mb-4">Your saved documents</p>
              <DocumentVault
                documents={documents}
                onSelect={handleSelectDocument}
                onDelete={deleteDocument}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Index;
