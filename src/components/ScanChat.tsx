'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ScanChatProps {
  scanId: string;
}

export default function ScanChat({ scanId }: ScanChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/v1/scans/${scanId}/chat`)
      .then(res => res.json())
      .then(data => setMessages(data.messages || []))
      .catch(() => {});
  }, [scanId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      const res = await fetch(`/api/v1/scans/${scanId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, ...data.messages]);
      }
    } catch {} finally {
      setSending(false);
    }
  };

  return (
    <div style={{ border: '1px solid var(--ibm-hairline)', display: 'flex', flexDirection: 'column', maxHeight: 400 }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)', textAlign: 'center', padding: 32 }}>
            No messages yet. Send an instruction to the AI scanner.
          </p>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              background: msg.role === 'user' ? 'var(--ibm-primary)' : 'var(--ibm-surface-1)',
              color: msg.role === 'user' ? '#ffffff' : 'var(--ibm-ink)',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '14px',
              lineHeight: 1.5,
              border: msg.role === 'assistant' ? '1px solid var(--ibm-hairline)' : 'none',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid var(--ibm-hairline)' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Type a message..."
          disabled={sending}
          style={{
            flex: 1, background: 'var(--ibm-canvas)', border: 'none',
            padding: '12px 16px', fontSize: '14px', fontFamily: "'IBM Plex Sans', sans-serif",
            color: 'var(--ibm-ink)', outline: 'none', letterSpacing: '0.16px',
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            background: sending || !input.trim() ? 'var(--ibm-surface-2)' : 'var(--ibm-primary)',
            color: sending || !input.trim() ? 'var(--ibm-ink-subtle)' : '#ffffff',
            border: 'none', padding: '12px 20px', fontSize: '14px', cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}