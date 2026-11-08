import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Zap, Brain, Flame, Trash2, Copy, Check, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ChatMessage {
  id?: number;
  role: 'user' | 'model';
  content: string;
  modelUsed?: string;
  createdAt?: string;
}

interface GeminiChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({ isOpen, onClose }) => {
  const { user, token, signInWithGoogle } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon'>('gemini-3.8-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from PostgreSQL when user is authenticated
  useEffect(() => {
    if (!token) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/chat/history', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const history = await res.json();
          if (history && history.length > 0) {
            setMessages(
              history.map((h: any) => ({
                id: h.id,
                role: h.role,
                content: h.content,
                modelUsed: h.modelUsed,
                createdAt: h.createdAt,
              }))
            );
          }
        }
      } catch (err) {
        console.error('Error fetching chat history:', err);
      }
    };

    fetchHistory();
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || isLoading) return;

    if (!user || !token) {
      // Require sign-in for authenticated Gemini chat with Cloud SQL persistence
      try {
        await signInWithGoogle();
      } catch {
        return;
      }
    }

    const userMsg: ChatMessage = {
      role: 'user',
      content: promptText,
      modelUsed: selectedModel,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: promptText,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate response');
      }

      const data = await res.json();
      const modelMsg: ChatMessage = {
        id: data.messageRecord?.id,
        role: 'model',
        content: data.reply,
        modelUsed: selectedModel,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: `⚠️ Error: ${err.message || 'Unable to connect to Gemini API. Please verify network or API keys.'}`,
          modelUsed: selectedModel,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    'Explain the MCLLC 1 Loss vs 2 Profits Risk Balancer rule',
    'Analyze current FVG and MSS confluence on Gold (XAUUSD)',
    'Audit lot sizing: 4x 0.05 sub-lots towards 10% equity target',
    'What are optimal entries during Asian Session Open (00:00 UTC)?',
  ];

  return (
    <div className="flex flex-col h-full bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-neutral-950 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-neutral-100 text-sm flex items-center gap-2">
              <span>MCLLC Quant AI Advisor</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800">
                Cloud SQL Synced
              </span>
            </div>
            <div className="text-[11px] text-neutral-400">
              Multi-Turn Strategy, Smart Money Concepts & MT5 Advisor
            </div>
          </div>
        </div>

        {/* Model Selector Tabs */}
        <div className="flex items-center bg-neutral-900 p-0.5 rounded border border-neutral-800 text-xs font-mono">
          <button
            onClick={() => setSelectedModel('gemini-3.8-flash')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              selectedModel === 'gemini-3.8-flash'
                ? 'bg-sky-950 text-sky-300 font-bold border border-sky-800'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="General Tasks - Balanced latency and reasoning depth"
          >
            <Sparkles className="w-3 h-3 text-sky-400" />
            <span>3.8 Flash</span>
          </button>

          <button
            onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              selectedModel === 'gemini-3.1-flash-lite'
                ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Fast Tasks - Minimal latency for rapid queries"
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>3.1 Lite</span>
          </button>

          <button
            onClick={() => setSelectedModel('gemini-4-argon')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              selectedModel === 'gemini-4-argon'
                ? 'bg-purple-950 text-purple-300 font-bold border border-purple-800'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Complex Tasks - Deep mathematical reasoning & quantitative audits"
          >
            <Brain className="w-3 h-3 text-purple-400" />
            <span>4 Argon</span>
          </button>
        </div>
      </div>

      {/* Auth Banner if not signed in */}
      {!user && (
        <div className="px-4 py-2.5 bg-neutral-950/80 border-b border-neutral-800/80 flex items-center justify-between text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <LogIn className="w-4 h-4 text-sky-400" />
            <span>Sign in with Google to persist your conversation history in PostgreSQL.</span>
          </div>
          <button
            onClick={signInWithGoogle}
            className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium transition-colors shrink-0"
          >
            Sign In
          </button>
        </div>
      )}

      {/* Message Thread */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[500px] min-h-[350px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 text-neutral-400 my-auto">
            <div className="p-3 bg-neutral-800 rounded-full text-sky-400">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-100 text-sm">MCLLC Strategy Assistant Ready</h3>
              <p className="text-xs text-neutral-400 max-w-md mt-1">
                Ask about the 4x 0.05 lot execution, 10% equity target balancer, Asian session alerts, or ICT structures (FVG, iFVG, VIMB, MSS, Fib OTE).
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg text-left">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="p-2.5 text-xs bg-neutral-950/80 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg border border-neutral-800 transition-colors text-left"
                >
                  &rarr; {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const msgKey = `msg-${idx}-${msg.id || idx}`;
            return (
              <div
                key={msgKey}
                className={`flex gap-3 text-xs leading-relaxed ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-sky-950 border border-sky-800 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 ${
                    isUser
                      ? 'bg-sky-600 text-white rounded-tr-none'
                      : 'bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-tl-none shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1 text-[10px] font-mono opacity-70">
                    <span>{isUser ? 'You' : `MCLLC (${msg.modelUsed || selectedModel})`}</span>
                    {!isUser && (
                      <button
                        onClick={() => handleCopy(msg.content, msgKey)}
                        className="hover:text-white transition-colors"
                        title="Copy response"
                      >
                        {copiedId === msgKey ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap select-text font-sans">{msg.content}</div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex gap-3 text-xs justify-start">
            <div className="w-7 h-7 rounded-lg bg-sky-950 border border-sky-800 text-sky-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-neutral-950 border border-neutral-800 text-neutral-400 rounded-xl rounded-tl-none px-4 py-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" />
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:0.4s]" />
              <span className="font-mono text-[11px] ml-1">Computing quantitative response via {selectedModel}...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-neutral-950 border-t border-neutral-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              user
                ? `Ask ${selectedModel} about MT5, FVG, MSS, or the 10% target balancer...`
                : 'Sign in with Google to chat and save history...'
            }
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:hover:bg-sky-600 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
