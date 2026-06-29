"use client";

import { useEffect, useRef, useState } from 'react';
import { MessageSquareText, Send, Menu, X } from 'lucide-react';

import { MessageBubble } from '@/components/message-bubble';
import { DocumentsManager } from '@/components/documents-manager';
import { sendChat } from '@/lib/api';
import type { ChatMessage } from '@/lib/types';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Empty state is rendered when messages are empty.

export function ChatApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
    setMessages([]);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('chat_history', JSON.stringify(messages));
    }
  }, [messages, isMounted]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend() {
    const query = input.trim();
    if (!query || loading) return;

    setInput('');
    setLoading(true);

    const userMessage: ChatMessage = { id: makeId(), role: 'user', content: query };
    setMessages((current) => [...current, userMessage]);

    try {
      const historyPayload = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const result = await sendChat(query, historyPayload);
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: 'assistant',
          content: result.answer,
          sources: result.sources,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Something went wrong.',
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(event: import('react').KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  if (!isMounted) {
    return <div className="min-h-screen bg-bg" />;
  }

  return (
    <div className="flex h-screen flex-col md:flex-row bg-bg text-textPrimary overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar for Document Management */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-4/5 max-w-[320px] transform bg-sidebar-bg border-r border-sidebar-border transition-transform duration-300 ease-in-out md:relative md:w-[320px] lg:w-[320px] md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-sidebar-border p-4 md:hidden">
            <span className="font-medium text-sidebar-textPrimary">Documents</span>
            <button onClick={() => setSidebarOpen(false)} className="rounded-md p-1.5 text-sidebar-textSecondary hover:bg-sidebar-surfaceHover hover:text-sidebar-textPrimary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <DocumentsManager />
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex w-full flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-border bg-surface px-5 py-3.5 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 -ml-1.5 rounded-md text-textSecondary hover:bg-surfaceHover hover:text-textPrimary md:hidden transition-colors"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-accent text-white shadow-sm">
                <MessageSquareText className="h-3 w-3" />
              </span>
              <h1 className="text-sm font-medium tracking-tight text-textPrimary whitespace-nowrap truncate">Conversational Multi-PDF RAG</h1>
            </div>
          </div>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <div className="px-4 py-6 md:px-8 pb-32">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-20 text-center animate-fade-in">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent mb-5">
                  <MessageSquareText className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold text-textPrimary mb-2">How can I help you today?</h2>
                <p className="text-[15px] text-textSecondary max-w-sm mb-8">
                  Upload PDFs from the sidebar and ask questions. I'll search your documents and cite my sources.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  <button 
                    onClick={() => setInput("Summarize the key points of the uploaded documents.")}
                    className="flex flex-col items-start p-4 rounded-xl border border-border bg-surface text-left hover:bg-surfaceHover transition-colors shadow-sm"
                  >
                    <span className="text-[13px] font-medium text-textPrimary">Summarize documents</span>
                    <span className="text-[12px] text-textTertiary mt-1">Get a high-level overview</span>
                  </button>
                  <button 
                    onClick={() => setInput("What are the main conclusions discussed?")}
                    className="flex flex-col items-start p-4 rounded-xl border border-border bg-surface text-left hover:bg-surfaceHover transition-colors shadow-sm"
                  >
                    <span className="text-[13px] font-medium text-textPrimary">Find conclusions</span>
                    <span className="text-[12px] text-textTertiary mt-1">Extract final takeaways</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-8">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} onCopy={handleCopy} />
                ))}

                {loading ? (
                  <div className="flex animate-fade-in justify-start">
                    <div className="flex items-center gap-1.5 py-2">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-textTertiary [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-textTertiary [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-textTertiary" />
                    </div>
                  </div>
                ) : null}

                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="shrink-0 p-4 md:px-8 md:pb-8 relative before:absolute before:inset-x-0 before:bottom-full before:h-8 before:bg-gradient-to-t before:from-bg before:to-transparent before:pointer-events-none">
          <div className="mx-auto max-w-3xl relative">
            <div className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-200 hover:border-borderStrong hover:shadow focus-within:border-accent focus-within:ring-1 focus-within:ring-accent focus-within:shadow-md">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message"
                rows={1}
                className="max-h-[250px] min-h-[56px] w-full resize-none bg-transparent pl-5 pr-14 py-4 text-[15px] leading-relaxed text-textPrimary outline-none placeholder:text-textTertiary"
              />
              <div className="absolute right-3 bottom-3">
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surfaceHover disabled:text-textTertiary disabled:shadow-none"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-3 text-center text-[11px] text-textTertiary min-h-[16px]">
              
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
