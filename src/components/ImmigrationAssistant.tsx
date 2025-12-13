import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Bot, User, Mail, Check, X, History, Plus, ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  status: string;
}

interface EmailRequest {
  id: string;
  to_email: string;
  subject: string;
  body: string;
  status: string;
}

interface StoredDocument {
  id: string;
  name: string;
  type: string;
  text: string;
  timelineSteps: Array<{ stage: string; estimatedDate?: string; status?: string; tip?: string; description?: string }>;
  createdAt: string;
}

interface ImmigrationAssistantProps {
  storedDocuments?: StoredDocument[];
}

const ImmigrationAssistant = ({ storedDocuments = [] }: ImmigrationAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<EmailRequest | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to realtime message updates
  useEffect(() => {
    if (!currentConversationId) return;

    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${currentConversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentConversationId]);

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    setConversations(data || []);
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    const typedMessages: Message[] = (data || []).map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      created_at: m.created_at,
      metadata: typeof m.metadata === 'object' && m.metadata !== null ? m.metadata as Record<string, any> : undefined,
    }));
    setMessages(typedMessages);
    setCurrentConversationId(conversationId);
    setShowHistory(false);
  };

  const startNewConversation = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ title: 'New conversation', status: 'active' })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start new conversation');
      return;
    }

    setCurrentConversationId(data.id);
    setMessages([]);
    setShowHistory(false);
    loadConversations();
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Create conversation if none exists
    let convId = currentConversationId;
    if (!convId) {
      const { data, error } = await supabase
        .from('conversations')
        .insert({ title: input.slice(0, 50), status: 'active' })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        toast.error('Failed to start conversation');
        return;
      }
      convId = data.id;
      setCurrentConversationId(convId);
      loadConversations();
    }

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    // Save user message to DB
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        role: 'user',
        content: userMessage,
      });

    if (msgError) {
      console.error('Error saving message:', msgError);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Get previous messages for context
      const previousMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/immigration-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            message: userMessage,
            conversation_id: convId,
            previous_messages: previousMessages,
            stored_documents: storedDocuments.map(d => ({
              name: d.name,
              text: d.text.slice(0, 1000), // Limit context
              timeline: d.timelineSteps,
            })),
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error('Failed to get response');
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';
      let tempAssistantId = `temp-assistant-${Date.now()}`;

      // Add placeholder for assistant message
      setMessages((prev) => [...prev, {
        id: tempAssistantId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      }]);

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
            
            // Check for email draft
            if (parsed.type === 'email_draft') {
              setPendingEmail(parsed.email);
              continue;
            }

            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAssistantId
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch {
            // Incomplete JSON
          }
        }
      }

      // Save assistant message to DB
      if (assistantContent) {
        await supabase.from('messages').insert({
          conversation_id: convId,
          role: 'assistant',
          content: assistantContent,
        });
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Chat error:', error);
        toast.error('Failed to get response. Please try again.');
        // Remove optimistic message on error
        setMessages((prev) => prev.filter(m => !m.id.startsWith('temp-')));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailConfirmation = async (confirmed: boolean) => {
    if (!pendingEmail || !currentConversationId) return;

    if (confirmed) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-immigration-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              conversation_id: currentConversationId,
              to_email: pendingEmail.to_email,
              subject: pendingEmail.subject,
              body: pendingEmail.body,
            }),
          }
        );

        if (!response.ok) throw new Error('Failed to send email');

        toast.success('Email sent successfully!');
        
        // Add confirmation message
        setMessages((prev) => [...prev, {
          id: `email-sent-${Date.now()}`,
          role: 'assistant',
          content: `✅ Email sent to ${pendingEmail.to_email}. I'll notify you when we receive a response.`,
          created_at: new Date().toISOString(),
        }]);
      } catch (error) {
        console.error('Error sending email:', error);
        toast.error('Failed to send email');
      }
    } else {
      setMessages((prev) => [...prev, {
        id: `email-cancelled-${Date.now()}`,
        role: 'assistant',
        content: 'Email cancelled. How else can I help you?',
        created_at: new Date().toISOString(),
      }]);
    }

    setPendingEmail(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b-4 border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showHistory && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(false)}
            >
              <ChevronLeft size={20} />
            </Button>
          )}
          <Bot className="text-primary" size={24} />
          <div>
            <h2 className="text-xl font-black">Immigration Assistant</h2>
            <p className="text-xs text-muted-foreground font-mono">
              AI-powered help for Italian immigration
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="border-2"
          >
            <History size={16} className="mr-1" />
            History
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={startNewConversation}
          >
            <Plus size={16} className="mr-1" />
            New
          </Button>
        </div>
      </div>

      {/* Conversation History Sidebar */}
      {showHistory ? (
        <ScrollArea className="flex-1 p-4">
          <h3 className="font-bold mb-4">Conversation History</h3>
          {conversations.length === 0 ? (
            <p className="text-muted-foreground text-sm">No conversations yet</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadMessages(conv.id)}
                  className={`w-full text-left p-3 border-2 hover:border-foreground transition-colors ${
                    currentConversationId === conv.id ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                >
                  <p className="font-medium truncate">{conv.title || 'Untitled'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(conv.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      ) : (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Bot size={48} className="text-muted-foreground mb-4" />
                <h3 className="text-lg font-bold mb-2">How can I help you today?</h3>
                <p className="text-muted-foreground text-sm max-w-md mb-6">
                  Ask me anything about Italian immigration, visas, permits, 
                  or bureaucratic procedures. I can also contact public offices 
                  on your behalf to verify information.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg">
                  {[
                    'How do I renew my permesso di soggiorno?',
                    'What documents do I need for citizenship?',
                    'How to book a Questura appointment?',
                    'Explain the family visa process',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                      }}
                      className="p-3 text-sm text-left border-2 border-border hover:border-foreground transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center border-2 ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-background border-foreground'
                    }`}>
                      {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block p-4 border-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border'
                      }`}>
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Loading indicator */}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 flex items-center justify-center border-2 border-foreground bg-background">
                      <Bot size={16} />
                    </div>
                    <div className="p-4 border-2 border-border bg-card">
                      <Loader2 className="animate-spin" size={16} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Email Confirmation */}
          {pendingEmail && (
            <div className="p-4 border-t-4 border-primary bg-primary/10">
              <div className="flex items-start gap-3">
                <Mail className="text-primary mt-1" size={20} />
                <div className="flex-1">
                  <h4 className="font-bold mb-2">Email Draft Ready</h4>
                  <div className="text-sm space-y-1 mb-3">
                    <p><strong>To:</strong> {pendingEmail.to_email}</p>
                    <p><strong>Subject:</strong> {pendingEmail.subject}</p>
                    <p className="text-muted-foreground mt-2">{pendingEmail.body.slice(0, 200)}...</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleEmailConfirmation(true)}
                      className="gap-1"
                    >
                      <Check size={14} />
                      Send Email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEmailConfirmation(false)}
                      className="gap-1"
                    >
                      <X size={14} />
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t-4 border-border">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about Italian immigration procedures..."
                className="flex-1 px-4 py-3 bg-background border-4 border-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[52px] max-h-32"
                rows={1}
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="h-auto px-6 border-4"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Send size={20} />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ImmigrationAssistant;
