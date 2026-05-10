'use client';

import { useState, useEffect, useRef, createContext, useContext, useCallback, useMemo } from 'react';
import { useAppData } from './AppDataProvider';

interface ChatContext {
  openChat: (context?: { findingId?: string; scanId?: string; findingTitle?: string }) => void;
}

const AiChatContext = createContext<ChatContext>({ openChat: () => {} });

export function useAiChat() {
  return useContext(AiChatContext);
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ModelOption {
  providerId: string;
  providerName: string;
  modelId: string;
}

export default function AiChatProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [context, setContext] = useState<{ findingId?: string; scanId?: string; findingTitle?: string } | null>(null);
  const { chatConfig } = useAppData();
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelOption | null>(null);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!chatConfig) return;
    setAvailableModels(chatConfig.models ?? []);
    if (chatConfig.current) setSelectedModel(chatConfig.current);
  }, [chatConfig]);

  useEffect(() => {
    if (!modelSelectorOpen) return;
    const handler = (e: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(e.target as Node)) {
        setModelSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modelSelectorOpen]);

  const fetchMessages = useCallback(async () => {
    if (context?.findingId) {
      const res = await fetch(`/api/v1/findings/${context.findingId}/chat`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    } else {
      const res = await fetch('/api/v1/chat');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    }
  }, [context]);

  useEffect(() => {
    if (open) fetchMessages();
  }, [open, fetchMessages]);

  const openChat = useCallback((ctx?: { findingId?: string; scanId?: string; findingTitle?: string }) => {
    setContext(ctx ?? null);
    setOpen(true);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    const optimisticUser: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticUser]);

    try {
      let res: Response;
      const modelPayload = selectedModel ? { provider: selectedModel.providerId, model: selectedModel.modelId } : {};
      if (context?.findingId) {
        res = await fetch(`/api/v1/findings/${context.findingId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, ...modelPayload }),
        });
      } else if (context?.scanId) {
        res = await fetch(`/api/v1/scans/${context.scanId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, ...modelPayload }),
        });
      } else {
        res = await fetch('/api/v1/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, ...modelPayload }),
        });
      }
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev.slice(0, -1), ...data.messages]);
      } else {
        setMessages(prev => prev.slice(0, -1));
      }
    } catch {
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const contextLabel = context?.findingTitle
    ? `Finding: ${context.findingTitle.substring(0, 40)}${context.findingTitle.length > 40 ? '...' : ''}`
    : 'General';

  const groupedModels = useMemo(() => {
    const q = modelSearch.toLowerCase();
    const filtered = availableModels.filter(m =>
      !q || m.modelId.toLowerCase().includes(q) || m.providerName.toLowerCase().includes(q)
    );
    const groups = new Map<string, { providerName: string; models: ModelOption[] }>();
    for (const m of filtered) {
      if (!groups.has(m.providerId)) groups.set(m.providerId, { providerName: m.providerName, models: [] });
      groups.get(m.providerId)!.models.push(m);
    }
    return [...groups.values()];
  }, [availableModels, modelSearch]);

  return (
    <AiChatContext.Provider value={{ openChat }}>
      {children}

      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            background: 'var(--ibm-primary)',
            color: 'var(--ibm-on-primary)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 9998,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ibm-primary-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ibm-primary)'; }}
          aria-label="Open AI Assistant"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => { setOpen(false); setContext(null); }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 9999,
            }}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 0,
              width: 420,
              background: 'var(--ibm-canvas)',
              borderLeft: '1px solid var(--ibm-hairline)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 10000,
              animation: 'slideInRight 0.2s ease-out',
            }}
          >
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

            {/* Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--ibm-hairline)',
              background: 'var(--ibm-canvas)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>AI Assistant</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {context && (
                    <button
                      onClick={() => { setContext(null); fetchMessages(); }}
                      style={{
                        background: 'transparent', border: '1px solid var(--ibm-hairline)',
                        padding: '3px 8px', fontSize: 11, fontFamily: "'IBM Plex Sans', sans-serif",
                        letterSpacing: '0.16px', color: 'var(--ibm-ink-muted)', cursor: 'pointer',
                      }}
                    >
                      General
                    </button>
                  )}
                  <button
                    onClick={() => { setOpen(false); setContext(null); setModelSelectorOpen(false); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--ibm-ink-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>{contextLabel}</span>
                <div style={{ flex: 1 }} />

                {/* Model selector chip */}
                {selectedModel && (
                  <div ref={modelSelectorRef} style={{ position: 'relative' }}>
                    <button
                      onClick={() => { setModelSelectorOpen(o => !o); setModelSearch(''); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)',
                        borderBottom: '2px solid var(--ibm-primary)', padding: '4px 10px',
                        fontSize: 12, fontFamily: "'IBM Plex Mono', sans-serif", letterSpacing: '0.16px',
                        color: 'var(--ibm-ink)', cursor: 'pointer',
                      }}
                    >
                      <span style={{ color: 'var(--ibm-ink-muted)', fontFamily: "'IBM Plex Sans', sans-serif" }}>{selectedModel.providerName}</span>
                      <span style={{ color: 'var(--ibm-hairline-strong)' }}>·</span>
                      <span>{selectedModel.modelId}</span>
                      <span style={{ fontSize: 9, marginLeft: 2, color: 'var(--ibm-ink-muted)' }}>▾</span>
                    </button>

                    {modelSelectorOpen && (
                      <div style={{
                        position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 200,
                        width: 320, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)', maxHeight: 340, display: 'flex', flexDirection: 'column',
                      }}>
                        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--ibm-hairline)' }}>
                          <input
                            autoFocus
                            type="text"
                            placeholder="Filter models…"
                            value={modelSearch}
                            onChange={e => setModelSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Escape' && setModelSelectorOpen(false)}
                            style={{
                              width: '100%', background: 'var(--ibm-surface-1)', border: 'none',
                              borderBottom: '2px solid var(--ibm-primary)', padding: '6px 8px',
                              fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ibm-ink)',
                              outline: 'none', boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                          {groupedModels.length === 0 && (
                            <p style={{ padding: '16px 12px', margin: 0, fontSize: 13, color: 'var(--ibm-ink-subtle)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                              No models match "{modelSearch}"
                            </p>
                          )}
                          {groupedModels.map(group => (
                            <div key={group.providerName}>
                              <div style={{ padding: '6px 12px 4px', fontSize: 11, fontWeight: 600, letterSpacing: '0.32px', color: 'var(--ibm-ink-muted)', fontFamily: "'IBM Plex Sans', sans-serif", background: 'var(--ibm-surface-1)', borderBottom: '1px solid var(--ibm-hairline)', textTransform: 'uppercase' }}>
                                {group.providerName}
                              </div>
                              {group.models.map(m => {
                                const isActive = m.modelId === selectedModel?.modelId && m.providerId === selectedModel?.providerId;
                                return (
                                  <button
                                    key={m.modelId}
                                    onClick={() => { setSelectedModel(m); setModelSelectorOpen(false); }}
                                    style={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                      width: '100%', textAlign: 'left', padding: '9px 12px',
                                      background: isActive ? 'var(--ibm-blue-10)' : 'none',
                                      border: 'none', borderBottom: '1px solid var(--ibm-hairline)',
                                      cursor: 'pointer', gap: 8,
                                    }}
                                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--ibm-surface-1)'; }}
                                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'none'; }}
                                  >
                                    <span style={{ fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ibm-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.modelId}</span>
                                    {isActive && <span style={{ fontSize: 11, color: 'var(--ibm-primary)', fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif", flexShrink: 0 }}>Active</span>}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: 'var(--ibm-surface-1)',
            }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{
                    width: 48, height: 48, margin: '0 auto 16px',
                    background: 'var(--ibm-blue-10)', border: '1px solid var(--ibm-blue-20)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ibm-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>
                    {context ? `Ask about this finding.` : 'Ask anything about your security scans.'}
                  </p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '12px 16px',
                    background: msg.role === 'user' ? 'var(--ibm-primary)' : 'var(--ibm-canvas)',
                    color: msg.role === 'user' ? 'var(--ibm-on-primary)' : 'var(--ibm-ink)',
                    border: msg.role === 'assistant' ? '1px solid var(--ibm-hairline)' : 'none',
                    fontFamily: msg.role === 'assistant' ? "'IBM Plex Sans', sans-serif" : "'IBM Plex Sans', sans-serif",
                    fontSize: 14,
                    lineHeight: 1.5,
                    letterSpacing: '0.16px',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--ibm-canvas)',
                    border: '1px solid var(--ibm-hairline)',
                    color: 'var(--ibm-ink-subtle)',
                    fontSize: 14,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    letterSpacing: '0.16px',
                  }}>
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              borderTop: '1px solid var(--ibm-hairline)',
              display: 'flex',
              background: 'var(--ibm-canvas)',
            }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
                placeholder={context ? 'Ask about this finding...' : 'Ask a question...'}
                disabled={sending}
                style={{
                  flex: 1,
                  background: 'var(--ibm-surface-1)',
                  border: 'none',
                  borderBottom: '2px solid var(--ibm-primary)',
                  padding: '14px 16px',
                  fontSize: 14,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  letterSpacing: '0.16px',
                  color: 'var(--ibm-ink)',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                style={{
                  background: sending || !input.trim() ? 'var(--ibm-surface-2)' : 'var(--ibm-primary)',
                  color: sending || !input.trim() ? 'var(--ibm-ink-subtle)' : 'var(--ibm-on-primary)',
                  border: 'none',
                  padding: '14px 20px',
                  fontSize: 14,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontWeight: 600,
                  letterSpacing: '0.16px',
                  cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </AiChatContext.Provider>
  );
}