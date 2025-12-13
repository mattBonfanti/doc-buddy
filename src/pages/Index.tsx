import { useState } from 'react';
import { Upload, Save, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Sidebar from '@/components/Sidebar';
import EmergencyMode from '@/components/EmergencyMode';
import DocumentViewer from '@/components/DocumentViewer';
import SmartTimeline from '@/components/SmartTimeline';
import CommunityTips from '@/components/CommunityTips';
import ELI5Popover from '@/components/ELI5Popover';
import FindSolutions from '@/components/FindSolutions';
import DocumentVault from '@/components/DocumentVault';
import DynamicFAQ from '@/components/DynamicFAQ';
import EmailComposer from '@/components/EmailComposer';
import EmailHistory from '@/components/EmailHistory';
import MyProfile from '@/components/MyProfile';
import { useDocumentAnalysis } from '@/hooks/useDocumentAnalysis';
import { useDocumentStorage, StoredDocument } from '@/hooks/useDocumentStorage';
import { useEmailHistory } from '@/hooks/useEmailHistory';
import { suggestOfficeByTopic } from '@/data/italianOffices';
import { toast } from 'sonner';

const Index = () => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'normal' | 'emergency' | 'search' | 'profile'>('search');
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [emailInitialData, setEmailInitialData] = useState<{
    subject?: string;
    body?: string;
    suggestedOffice?: ReturnType<typeof suggestOfficeByTopic>;
    context: {
      type: 'search' | 'document';
      searchQuery?: string;
      documentId?: string;
      documentName?: string;
    };
  } | undefined>(undefined);
  
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

  const { documents, saveDocument, deleteDocument, isAnalyzing } = useDocumentStorage();
  const { emails, addEmail, deleteEmail } = useEmailHistory();

  const handleSaveDocument = async () => {
    if (!ocrText) {
      toast.error('No document to save');
      return;
    }
    
    toast.info('Analyzing and saving document...');
    
    await saveDocument({
      name: currentFileName || 'Untitled Document',
      type: currentFileType || 'Document',
      ocrText,
      timeline,
      tips: streetTips,
    });
    toast.success('Document saved and analyzed');
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

  const handleVerifySearchInfo = (data: { query: string; results: string }) => {
    const suggestedOffice = suggestOfficeByTopic(data.query);
    setEmailInitialData({
      subject: `Question about: ${data.query}`,
      body: `Dear Sir/Madam,

I am writing to verify some information I found regarding "${data.query}".

The information states:
${data.results.slice(0, 500)}${data.results.length > 500 ? '...' : ''}

Could you please confirm if this information is current and accurate?

Thank you for your assistance.

Best regards,
[Your Name]
[Your Contact Information]`,
      suggestedOffice,
      context: {
        type: 'search',
        searchQuery: data.query,
      },
    });
    setEmailComposerOpen(true);
  };

  const handleContactOffice = (doc: StoredDocument) => {
    const suggestedOffice = suggestOfficeByTopic(doc.type + ' ' + (doc.analysis?.summary || ''));
    setEmailInitialData({
      subject: `Question about: ${doc.name}`,
      body: `Dear Sir/Madam,

I am writing regarding a document I have: ${doc.name} (${doc.type}).

${doc.analysis?.summary ? `Document summary: ${doc.analysis.summary}` : ''}

${doc.analysis?.keyDates?.length ? `Key dates on the document: ${doc.analysis.keyDates.map(kd => typeof kd === 'string' ? kd : `${kd.label}: ${kd.date}`).join(', ')}` : ''}

I would like to verify the current status and any required actions.

Thank you for your assistance.

Best regards,
[Your Name]
[Your Contact Information]`,
      suggestedOffice,
      context: {
        type: 'document',
        documentId: doc.id,
        documentName: doc.name,
      },
    });
    setEmailComposerOpen(true);
  };

  const handleNavigate = (view: 'vault' | 'search' | 'faq' | 'profile') => {
    if (view === 'vault') {
      setMode('normal');
    } else if (view === 'search') {
      setMode('search');
    } else if (view === 'profile') {
      setMode('profile');
    }
  };

  const emergencyDocs = documents.length > 0 
    ? documents.map(doc => ({ name: doc.name, type: doc.type }))
    : [
        { name: 'Passport', type: 'Identity Document' },
        { name: 'Permesso di Soggiorno', type: 'Residence Permit' },
        { name: 'Codice Fiscale', type: 'Tax Code' },
      ];

  if (mode === 'emergency') {
    return <EmergencyMode documents={emergencyDocs} onExit={() => setMode('search')} />;
  }

  if (mode === 'profile') {
    return (
      <main className="min-h-screen bg-background flex flex-col md:flex-row">
        <Sidebar 
          onEmergencyMode={() => setMode('emergency')} 
          activeView="profile"
          onNavigate={handleNavigate}
          documents={documents}
          onSelectDocument={(id) => {
            const doc = documents.find(d => d.id === id);
            if (doc) {
              handleSelectDocument(doc);
              setMode('normal');
            }
          }}
        />
        <MyProfile documents={documents} />
      </main>
    );
  }

  if (mode === 'search') {
    return (
      <main className="min-h-screen bg-background flex flex-col md:flex-row">
        <Sidebar 
          onEmergencyMode={() => setMode('emergency')} 
          activeView="search"
          onNavigate={handleNavigate}
          documents={documents}
          onSelectDocument={(id) => {
            const doc = documents.find(d => d.id === id);
            if (doc) {
              handleSelectDocument(doc);
              setMode('normal');
            }
          }}
        />
        <FindSolutions onVerifyInfo={handleVerifySearchInfo} />
        <EmailComposer
          isOpen={emailComposerOpen}
          onClose={() => setEmailComposerOpen(false)}
          onEmailSent={addEmail}
          initialData={emailInitialData}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col md:flex-row">
      <Sidebar 
        onEmergencyMode={() => setMode('emergency')} 
        activeView="vault"
        onNavigate={handleNavigate}
        documents={documents}
        onSelectDocument={(id) => {
          const doc = documents.find(d => d.id === id);
          if (doc) handleSelectDocument(doc);
        }}
      />

      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black">{t('vault.documentScanner')}</h2>
            <p className="text-muted-foreground font-mono text-sm">{t('vault.aiDecoder')}</p>
          </div>
          
          <div className="flex gap-3">
            {ocrText && (
              <button
                onClick={handleSaveDocument}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 font-bold cursor-pointer hover:bg-primary/90 transition-colors border-4 border-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                {isAnalyzing ? t('vault.analyzing') : t('vault.saveToVault')}
              </button>
            )}
            <label className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 font-bold cursor-pointer hover:bg-foreground/90 transition-colors border-4 border-foreground shadow-sm">
              <Upload size={20} />
              {t('vault.uploadDocument')}
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
              <h3 className="font-bold text-lg mb-1">{t('vault.deadlinesSteps')}</h3>
              <p className="text-xs font-mono text-muted-foreground mb-4">{t('vault.extractedTimeline')}</p>
              
              {timeline.length > 0 ? (
                <SmartTimeline steps={timeline} />
              ) : (
                <p className="text-sm text-muted-foreground font-mono py-8 text-center border-2 border-dashed border-border">
                  {t('vault.uploadToGenerate')}
                </p>
              )}
            </div>

            {/* Community Tips */}
            <CommunityTips tips={streetTips} isLoading={isTipsLoading} />

            {/* Document Vault */}
            <div className="bg-card p-6 border-4 border-foreground shadow-sm">
              <h3 className="font-bold text-lg mb-1">{t('vault.title')}</h3>
              <p className="text-xs font-mono text-muted-foreground mb-4">{t('vault.subtitle')}</p>
              <DocumentVault
                documents={documents}
                onSelect={handleSelectDocument}
                onDelete={deleteDocument}
                onContactOffice={handleContactOffice}
              />
            </div>

            {/* Email History */}
            {emails.length > 0 && (
              <div className="bg-card p-6 border-4 border-foreground shadow-sm">
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                  <Mail size={18} />
                  {t('emailHistory.title')}
                </h3>
                <p className="text-xs font-mono text-muted-foreground mb-4">{t('emailHistory.subtitle')}</p>
                <EmailHistory emails={emails} onDelete={deleteEmail} />
              </div>
            )}

            {/* Dynamic FAQ */}
            <DynamicFAQ documents={documents} />
          </div>
        </div>
      </div>

      <EmailComposer
        isOpen={emailComposerOpen}
        onClose={() => setEmailComposerOpen(false)}
        onEmailSent={addEmail}
        initialData={emailInitialData}
      />
    </main>
  );
};

export default Index;
