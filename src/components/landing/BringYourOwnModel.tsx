'use client';

import { useState, useEffect } from 'react';
import { landingTokens, sectionStyles } from './landingStyles';
import { useVisible } from './landingAnimations';

// ─── Responsive hook ──────────────────────────────────────────────
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < landingTokens.md);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

// ─── Pipeline stage data ────────────────────────────────────────────
const pipelineStages = [
  { id: 'discover', label: 'Discovery', description: 'AI-guided file discovery' },
  { id: 'deep-scan', label: 'Deep Scan', description: 'Per-file vulnerability analysis' },
  { id: 'cross-file', label: 'Cross-File', description: 'Business logic inference' },
  { id: 'chat', label: 'Chat', description: 'Conversational AI assistant' },
];

const modelOptions = [
  { id: 'gpt4', label: 'GPT-4', provider: 'OpenAI', color: landingTokens.accentLow },
  { id: 'claude', label: 'Claude', provider: 'Anthropic', color: landingTokens.accentPrimary },
  { id: 'ollama', label: 'Llama 3', provider: 'Ollama', color: landingTokens.accentHigh },
  { id: 'custom', label: 'Custom', provider: 'Any OpenAI-compatible API', color: landingTokens.accentInfo },
];

// ─── Messaging items ─────────────────────────────────────────────────
const messagingPoints = [
  {
    icon: '✨',
    text: 'Model-agnostic — configure any OpenAI-compatible endpoint',
  },
  {
    icon: '⚙️',
    text: 'Per-pipeline-stage model selection — fast model for discovery, powerful model for deep scan',
  },
  {
    icon: '\U0001F310',
    text: 'Supported: OpenAI, Anthropic, Ollama, AWS Bedrock, Azure AI Foundry, LangGraph, any OpenAI-compatible API',
  },
  {
    icon: '\U0001F512',
    text: 'Data never leaves your environment — models run where you choose',
  },
];

// ─── Component ──────────────────────────────────────────────────────
export default function BringYourOwnModel() {
  const { ref, visible } = useVisible(0.1);
  const isMobile = useIsMobile();

  return (
    <section
      className="lp-section lp-section-dark"
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      {/* Section header */}
      <p style={{ ...sectionStyles.eyebrow, textAlign: 'center' }}>
        Bring your own model
      </p>
      <h2
        style={{
          ...sectionStyles.headline,
          textAlign: 'center',
          fontSize: isMobile ? '32px' : '48px',
          maxWidth: '720px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        Your data, your model, your choice
      </h2>

      {/* Messaging points */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: '16px',
          marginTop: '32px',
          maxWidth: '800px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {messagingPoints.map((point, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              transition: `opacity 0.4s ease ${i * 100}ms, transform 0.4s ease ${i * 100}ms`,
            }}
          >
            <span
              style={{
                fontSize: '18px',
                lineHeight: 1.4,
                flexShrink: 0,
                width: '28px',
                textAlign: 'center',
              }}
            >
              {point.icon}
            </span>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 300,
                lineHeight: 1.6,
                color: landingTokens.inkSecondary,
                margin: 0,
              }}
            >
              {point.text}
            </p>
          </div>
        ))}
      </div>

      {/* Pipeline-to-model diagram */}
      <div
        style={{
          marginTop: '48px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: isMobile ? '24px' : '0',
          position: 'relative',
        }}
      >
        {/* Left: Pipeline stages */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: isMobile ? '100%' : '200px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
              color: landingTokens.inkMuted,
              marginBottom: '4px',
            }}
          >
            Pipeline stage
          </div>
          {pipelineStages.map((stage, i) => (
            <div
              key={stage.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                background: landingTokens.bgSurface2,
                borderRadius: '6px',
                border: `1px solid ${landingTokens.borderSubtle}`,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-12px)',
                transition: `opacity 0.3s ease ${i * 120}ms, transform 0.3s ease ${i * 120}ms`,
              }}
            >
              {/* Stage indicator dot */}
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: landingTokens.accentPrimary,
                  flexShrink: 0,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: landingTokens.inkPrimary,
                  }}
                >
                  {stage.label}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 300,
                    color: landingTokens.inkMuted,
                  }}
                >
                  {stage.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Center: Connection lines (desktop only) */}
        {!isMobile && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              width: '80px',
              padding: '28px 0',
              position: 'relative',
            }}
          >
            {/* Horizontal connection lines */}
            {pipelineStages.map((_, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '44px',
                  width: '100%',
                }}
              >
                {/* Multi-line fan-out pattern */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      height: '1px',
                      background: `linear-gradient(90deg, ${landingTokens.accentPrimary}60, ${landingTokens.accentPrimary}20)`,
                      width: '100%',
                    }}
                  />
                  <div
                    style={{
                      height: '1px',
                      background: `linear-gradient(90deg, ${landingTokens.accentPrimary}40, ${landingTokens.accentPrimary}10)`,
                      width: '80%',
                      marginLeft: '10%',
                    }}
                  />
                </div>
              </div>
            ))}
            {/* Arrow indicator */}
            <div
              style={{
                fontSize: '11px',
                color: landingTokens.inkMuted,
                textAlign: 'center',
                marginTop: '-8px',
                fontWeight: 300,
              }}
            >
              config
            </div>
          </div>
        )}

        {/* Right: Model options */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: isMobile ? '100%' : '220px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
              color: landingTokens.inkMuted,
              marginBottom: '4px',
            }}
          >
            Model
          </div>
          {modelOptions.map((model, i) => (
            <div
              key={model.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                background: landingTokens.bgSurface2,
                borderRadius: '6px',
                border: `1px solid ${landingTokens.borderSubtle}`,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(12px)',
                transition: `opacity 0.3s ease ${i * 120 + 200}ms, transform 0.3s ease ${i * 120 + 200}ms, border-color 0.2s ease`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = model.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = landingTokens.borderSubtle;
              }}
            >
              {/* Model color indicator */}
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '3px',
                  background: model.color,
                  flexShrink: 0,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: landingTokens.inkPrimary,
                  }}
                >
                  {model.label}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 300,
                    color: landingTokens.inkMuted,
                  }}
                >
                  {model.provider}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}