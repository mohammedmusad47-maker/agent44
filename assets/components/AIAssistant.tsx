import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Minus, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useConversation } from '@11labs/react';
import { supabase } from '@/integrations/supabase/client';
import { useAIOrderDetection } from '@/hooks/useAIOrderDetection';
import { useAINavigationDetection } from '@/hooks/useAINavigationDetection';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationText, setConversationText] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Use AI order detection hook - pass both user transcript and full messages
  const { clearDetectedOrders } = useAIOrderDetection(userTranscript, messages);
  
  // Use AI navigation detection hook
  useAINavigationDetection(userTranscript);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Connected to ElevenLabs agent');
      toast({ title: 'Connected!', description: 'Start speaking to place your order.' });
      setIsActive(true);
    },
    onDisconnect: () => {
      console.log('❌ Disconnected from ElevenLabs agent');
      toast({ title: 'Disconnected', description: 'Conversation ended.' });
      setIsActive(false);
    },
    onError: (error: unknown) => {
      console.error('❌ ElevenLabs error:', error);
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      setIsActive(false);
    },
    onMessage: (message: any) => {
      console.log('📨 Message received:', message);
      console.log('📨 Full message object:', JSON.stringify(message, null, 2));
      
      // Primary handler for ElevenLabs messages: { source: 'user'|'ai', message: string }
      if ((message?.source === 'user' || message?.source === 'ai') && typeof message?.message === 'string') {
        const content = message.message.trim();
        if (content) {
          const role: 'user' | 'assistant' = message.source === 'user' ? 'user' : 'assistant';
          const entry: Message = { role, content, timestamp: new Date() };
          setMessages(prev => [...prev, entry]);
          setConversationText(prev => prev + ` ${role === 'user' ? 'User' : 'AI'}: ${content}`);
          if (role === 'user') {
            setUserTranscript(prev => (prev ? prev + ' ' + content : content));
          }
        }
        return; // already handled
      }

      // Handle user transcript - alternative shapes
      if (message.type === 'user_transcript' || message.message?.role === 'user') {
        const transcript = message.transcript || message.message?.message || message.user_transcript || message.text;
        if (transcript) {
          const userMessage: Message = {
            role: 'user',
            content: transcript,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, userMessage]);
          setConversationText(prev => prev + ' User: ' + transcript);
          setUserTranscript(prev => (prev ? prev + ' ' + transcript : transcript));
        }
      }
      
      // Handle AI response - alternative shapes
      if (message.type === 'agent_response' || message.type === 'assistant' || message.message?.role === 'assistant') {
        const response = message.response || message.message?.message || message.agent_response || message.text || message.content;
        if (response) {
          const aiMessage: Message = {
            role: 'assistant',
            content: response,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
          setConversationText(prev => prev + ' AI: ' + response);
        }
      }
      
      // Catch-all for any message with text content
      if (message.text && !message.type) {
        const genericMessage: Message = {
          role: 'assistant',
          content: message.text,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, genericMessage]);
        setConversationText(prev => prev + ' ' + message.text);
      }
    },
  });

  const startConversation = async () => {
    try {
      // Clear previous conversation data when starting new call
      setMessages([]);
      setConversationText('');
      setUserTranscript('');
      clearDetectedOrders();
      
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const { data, error } = await supabase.functions.invoke('elevenlabs-signed-url');
      
      if (error || !data?.signedUrl) {
        throw new Error('Failed to get session URL');
      }
      
      await conversation.startSession({
        signedUrl: data.signedUrl,
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast({ title: 'Error', description: 'Microphone access is required', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to connect. Please try again.', variant: 'destructive' });
      }
    }
  };

  const endConversation = async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
  };

  const handleClose = () => {
    if (isActive) {
      endConversation();
    }
    setIsOpen(false);
    setMessages([]);
    setConversationText('');
    setUserTranscript('');
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-50"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <Card className="fixed bottom-24 right-6 w-72 shadow-xl z-50 border-2 border-primary">
        <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground rounded-t-lg">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <span className="font-medium">AI Assistant</span>
            {isActive && (
              <span className="flex items-center gap-1 text-xs bg-green-500 px-2 py-0.5 rounded-full">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                Active
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMinimize}
              className="h-8 w-8 p-0 hover:bg-primary-foreground/20"
              title="Expand"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 hover:bg-primary-foreground/20"
              title="End conversation"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {isActive && (
          <div className="p-3 bg-background/95 border-t">
            <div className="flex items-center gap-2 text-sm">
              {conversation.isSpeaking ? (
                <>
                  <Mic className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-muted-foreground">AI is speaking...</span>
                </>
              ) : (
                <>
                  <MicOff className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Listening...</span>
                </>
              )}
            </div>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-24 right-6 w-96 h-[600px] shadow-xl flex flex-col z-50">
      <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <span className="font-medium">AI Assistant</span>
          {conversation.isSpeaking && (
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMinimize}
            className="h-8 w-8 p-0 hover:bg-primary-foreground/20"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0 hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isActive ? (
        <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">Voice Order Assistant</h3>
            <p className="text-sm text-muted-foreground">
              Click to start ordering by voice
            </p>
          </div>
          <Button
            onClick={startConversation}
            disabled={conversation.status === "connecting"}
            size="lg"
            className="w-full h-14 text-lg font-semibold"
          >
            <Mic className="mr-2 h-5 w-5" />
            {conversation.status === "connecting" ? "Connecting..." : "Start Voice Order"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Microphone access required
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-sm">Start speaking to begin your order...</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t space-y-4">
            <div className="flex items-center justify-center">
              <div className={`flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 ${
                conversation.isSpeaking 
                  ? "bg-primary animate-pulse scale-110" 
                  : "bg-muted scale-100"
              }`}>
                {conversation.isSpeaking ? (
                  <Mic className="h-8 w-8 text-primary-foreground" />
                ) : (
                  <MicOff className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium">
                {conversation.isSpeaking ? "AI is speaking..." : "Listening..."}
              </p>
            </div>

            <Button
              onClick={endConversation}
              variant="destructive"
              size="lg"
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              End Conversation
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
