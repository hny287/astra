'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PresetSelector from './PresetSelector';
import GitHubLinkPrompt from './GitHubLinkPrompt';

interface PresetConfig {
  [key: string]: unknown;
}

interface CustomRule {
  name: string;
  ruleText: string;
  severity: string;
  category: string;
}

interface NodeConfig {
  provider?: string;
  model?: string;
  temperature?: number;
  thinkingDepth?: string;
}

interface ConfigNodes {
  [key: string]: NodeConfig;
}

interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
}

interface GithubBranch {
  name: string;
  default: boolean;
}

export default function RepoInput() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetConfig, setPresetConfig] = useState<PresetConfig | null>(null);
  const [instructions, setInstructions] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [nodeConfigs, setNodeConfigs] = useState<ConfigNodes>({
    deep_scan: {},
    cross_file: {},
  });
  const [rules, setRules] = useState<CustomRule[]>([]);

  const [githubLinked, setGithubLinked] = useState(false);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [repoSearch, setRepoSearch] = useState('');
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [branches, setBranches] = useState<GithubBranch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const repoDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRepos();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (repoDropdownRef.current && !repoDropdownRef.current.contains(e.target as Node)) {
        setRepoDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRepos = async () => {
    setReposLoading(true);
    try {
      const res = await fetch('/api/v1/github/repos');
      if (res.status === 400 || res.status === 404) {
        setGithubLinked(false);
        setRepos([]);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch repos');
      const data = await res.json();
      setRepos(data.repos ?? []);
      setGithubLinked(true);
    } catch {
      setGithubLinked(false);
      setRepos([]);
    } finally {
      setReposLoading(false);
    }
  };

  const fetchBranches = async (owner: string, repo: string, defaultBranch: string) => {
    setBranchesLoading(true);
    setBranches([]);
    try {
      const res = await fetch(`/api/v1/github/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`);
      if (!res.ok) throw new Error('Failed to fetch branches');
      const data = await res.json();
      setBranches(data.branches ?? []);
      setBranch(defaultBranch);
    } catch {
      setBranches([]);
      setBranch(defaultBranch);
    } finally {
      setBranchesLoading(false);
    }
  };

  const handleRepoSelect = (repo: GithubRepo) => {
    setSelectedRepo(repo);
    setRepoSearch('');
    setRepoDropdownOpen(false);
    const [owner, name] = repo.full_name.split('/');
    setRepoUrl(`https://github.com/${repo.full_name}`);
    fetchBranches(owner, name, repo.default_branch);
  };

  const handleGithubLinked = () => {
    fetchRepos();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        repoUrl: repoUrl.trim(),
        branch: branch.trim() || 'main',
      };
      if (presetConfig) body.preset = presetConfig;
      if (instructions.trim()) body.instructions = instructions.trim();
      const activeNodes: ConfigNodes = {};
      for (const [key, val] of Object.entries(nodeConfigs)) {
        if (Object.keys(val).length > 0) activeNodes[key] = val;
      }
      if (Object.keys(activeNodes).length > 0) {
        body.config = { nodes: activeNodes };
      }
      if (rules.length > 0) {
        body.rules = rules;
      }
      const res = await fetch('/api/v1/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Scan failed to start');
      }
      const data = await res.json();
      router.push(`/scans/${data.scanId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--ibm-surface-1)',
    border: '1px solid var(--ibm-hairline)',
    borderBottom: '1px solid var(--ibm-hairline-strong)',
    padding: '11px 16px',
    fontSize: '16px',
    fontWeight: 400,
    letterSpacing: '0.16px',
    lineHeight: 1.5,
    color: 'var(--ibm-ink)',
    outline: 'none',
    fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--ibm-ink-muted)',
    display: 'block',
    marginBottom: 8,
  };

  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    padding: '12px 0',
    borderBottom: '1px solid var(--ibm-hairline)',
    userSelect: 'none',
  };

  const updateNodeConfig = (node: string, field: string, value: string | number) => {
    setNodeConfigs(prev => {
      const current = prev[node] || ({} as NodeConfig);
      if (value === '' || value === undefined) {
        const copy = { ...current };
        delete (copy as Record<string, unknown>)[field];
        return { ...prev, [node]: copy };
      }
      return { ...prev, [node]: { ...current, [field]: value } };
    });
  };

  const addRule = () => {
    setRules(prev => [...prev, { name: '', ruleText: '', severity: 'MEDIUM', category: 'SAST' }]);
  };

  const removeRule = (index: number) => {
    setRules(prev => prev.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, field: keyof CustomRule, value: string) => {
    setRules(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const renderNodeConfig = (node: string, label: string) => (
    <div key={node} style={{ padding: '12px 0', borderBottom: '1px solid var(--ibm-hairline)' }}>
      <p className="ibm-label" style={{ color: 'var(--ibm-ink)', marginBottom: 8 }}>{label}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label className="ibm-caption" style={labelStyle}>Provider</label>
          <input
            value={nodeConfigs[node]?.provider || ''}
            onChange={e => updateNodeConfig(node, 'provider', e.target.value)}
            placeholder="e.g. openai"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="ibm-caption" style={labelStyle}>Model</label>
          <input
            value={nodeConfigs[node]?.model || ''}
            onChange={e => updateNodeConfig(node, 'model', e.target.value)}
            placeholder="e.g. gpt-4o"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="ibm-caption" style={labelStyle}>Temperature</label>
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={nodeConfigs[node]?.temperature ?? ''}
            onChange={e => updateNodeConfig(node, 'temperature', e.target.value === '' ? '' : parseFloat(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="ibm-caption" style={labelStyle}>Thinking depth</label>
          <select
            value={nodeConfigs[node]?.thinkingDepth || ''}
            onChange={e => updateNodeConfig(node, 'thinkingDepth', e.target.value)}
            style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none' }}
          >
            <option value="">Default</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
    </div>
  );

  const filteredRepos = repos.filter(r =>
    r.full_name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    r.name.toLowerCase().includes(repoSearch.toLowerCase())
  );

  const renderRepoSelector = () => (
    <div style={{ position: 'relative' }} ref={repoDropdownRef}>
      <label htmlFor="repo-search" className="ibm-caption" style={labelStyle}>
        Repository
      </label>
      <div
        style={{
          ...inputStyle,
          padding: 0,
          display: 'flex',
          cursor: 'pointer',
        }}
      >
        <input
          id="repo-search"
          value={selectedRepo ? selectedRepo.full_name : repoSearch}
          onChange={e => {
            setRepoSearch(e.target.value);
            setSelectedRepo(null);
            setRepoUrl('');
            setBranches([]);
            setBranch('main');
            if (!repoDropdownOpen) setRepoDropdownOpen(true);
          }}
          onFocus={() => setRepoDropdownOpen(true)}
          placeholder="Search repositories..."
          disabled={loading}
          style={{
            ...inputStyle,
            border: 'none',
            borderBottom: 'none',
            flex: 1,
            background: 'transparent',
          }}
        />
        <button
          type="button"
          onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
          style={{
            background: 'none',
            border: 'none',
            padding: '0 12px',
            cursor: 'pointer',
            color: 'var(--ibm-ink-subtle)',
            fontSize: 10,
          }}
        >
          {repoDropdownOpen ? '\u25B2' : '\u25BC'}
        </button>
      </div>
      {repoDropdownOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'var(--ibm-canvas)',
          border: '1px solid var(--ibm-hairline)',
          borderTop: 'none',
          maxHeight: 240,
          overflowY: 'auto',
        }}>
          {reposLoading ? (
            <div style={{ padding: '10px 16px' }}>
              <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Loading repos...</span>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div style={{ padding: '10px 16px' }}>
              <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>No repositories found</span>
            </div>
          ) : (
            filteredRepos.map(repo => (
              <div
                key={repo.id}
                onClick={() => handleRepoSelect(repo)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--ibm-hairline)',
                  background: selectedRepo?.id === repo.id ? 'var(--ibm-surface-1)' : 'transparent',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--ibm-surface-1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = selectedRepo?.id === repo.id ? 'var(--ibm-surface-1)' : 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="ibm-body-sm" style={{ color: selectedRepo?.id === repo.id ? 'var(--ibm-primary)' : 'var(--ibm-ink)' }}>
                    {repo.full_name}
                  </span>
                  {repo.private && (
                    <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginLeft: 8 }}>Private</span>
                  )}
                </div>
                {repo.description && (
                  <p className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {repo.description}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  const renderBranchSelector = () => (
    <div>
      <label htmlFor="repo-branch" className="ibm-caption" style={labelStyle}>
        Branch
      </label>
      {branchesLoading ? (
        <div style={{ ...inputStyle, color: 'var(--ibm-ink-subtle)' }}>Loading branches...</div>
      ) : branches.length > 0 ? (
        <select
          id="repo-branch"
          value={branch}
          onChange={e => setBranch(e.target.value)}
          disabled={loading}
          style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none' }}
        >
          {branches.map(b => (
            <option key={b.name} value={b.name}>{b.name}{b.default ? ' (default)' : ''}</option>
          ))}
        </select>
      ) : (
        <input
          id="repo-branch"
          value={branch}
          onChange={e => setBranch(e.target.value)}
          placeholder="main"
          disabled={loading}
          style={inputStyle}
          onFocus={e => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
          onBlur={e => { e.currentTarget.style.borderBottom = '1px solid var(--ibm-hairline-strong)'; }}
        />
      )}
    </div>
  );

  if (!githubLinked && !reposLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <GitHubLinkPrompt onLinked={handleGithubLinked} />
        <div style={{ borderTop: '1px solid var(--ibm-hairline)', paddingTop: 16 }}>
          <p className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginBottom: 12 }}>
            Or enter a repository URL manually
          </p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label htmlFor="repo-url" className="ibm-caption" style={labelStyle}>
              Repository URL
            </label>
            <input
              id="repo-url"
              placeholder="https://github.com/org/repo"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              required
              disabled={loading}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
              onBlur={e => { e.currentTarget.style.borderBottom = '1px solid var(--ibm-hairline-strong)'; }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label htmlFor="repo-branch" className="ibm-caption" style={labelStyle}>
                Branch
              </label>
              <input
                id="repo-branch"
                placeholder="main"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                disabled={loading}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
                onBlur={e => { e.currentTarget.style.borderBottom = '1px solid var(--ibm-hairline-strong)'; }}
              />
            </div>
            <div>
              <label className="ibm-caption" style={labelStyle}>
                Preset
              </label>
              <PresetSelector onChange={setPresetConfig} />
            </div>
          </div>

          <div>
            <label htmlFor="instructions" className="ibm-caption" style={labelStyle}>
              Instructions for AI
            </label>
            <textarea
              id="instructions"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="Provide specific instructions for the AI scanner, e.g., 'Focus on authentication flows' or 'Check for SQL injection in ORM queries'"
              disabled={loading}
              rows={3}
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: 80,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--ibm-hairline)' }}>
            <div onClick={() => setShowConfig(!showConfig)} style={sectionHeaderStyle}>
              <span className="ibm-label" style={{ color: 'var(--ibm-ink)' }}>Custom Configuration</span>
              <span style={{ color: 'var(--ibm-ink-muted)', fontSize: '14px' }}>{showConfig ? '\u25B2' : '\u25BC'}</span>
            </div>
            {showConfig && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {renderNodeConfig('deep_scan', 'Deep Scan')}
                {renderNodeConfig('cross_file', 'Cross File')}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--ibm-hairline)' }}>
            <div onClick={() => setShowRules(!showRules)} style={sectionHeaderStyle}>
              <span className="ibm-label" style={{ color: 'var(--ibm-ink)' }}>Custom Rules</span>
              <span style={{ color: 'var(--ibm-ink-muted)', fontSize: '14px' }}>{showRules ? '\u25B2' : '\u25BC'}</span>
            </div>
            {showRules && (
              <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {rules.map((rule, idx) => (
                  <div key={idx} style={{ padding: 12, border: '1px solid var(--ibm-hairline)', background: 'var(--ibm-surface-1)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)' }}>Rule {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeRule(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--ibm-semantic-error)', cursor: 'pointer', fontSize: '16px', padding: '2px 6px' }}
                      >
                        {'\u00D7'}
                      </button>
                    </div>
                    <input
                      value={rule.name}
                      onChange={e => updateRule(idx, 'name', e.target.value)}
                      placeholder="Rule name"
                      style={inputStyle}
                    />
                    <textarea
                      value={rule.ruleText}
                      onChange={e => updateRule(idx, 'ruleText', e.target.value)}
                      placeholder="Rule description / pattern..."
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical', fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <select
                        value={rule.severity}
                        onChange={e => updateRule(idx, 'severity', e.target.value)}
                        style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none' }}
                      >
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="LOW">LOW</option>
                        <option value="INFO">INFO</option>
                      </select>
                      <select
                        value={rule.category}
                        onChange={e => updateRule(idx, 'category', e.target.value)}
                        style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none' }}
                      >
                        <option value="SAST">SAST</option>
                        <option value="SCA">SCA</option>
                        <option value="SECRETS">SECRETS</option>
                        <option value="IAC">IAC</option>
                        <option value="DATA_FLOW">DATA FLOW</option>
                        <option value="BUSINESS_LOGIC">BUSINESS LOGIC</option>
                      </select>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addRule}
                  style={{
                    background: 'var(--ibm-surface-1)', border: '1px dashed var(--ibm-hairline-strong)',
                    padding: '10px 16px', cursor: 'pointer', fontSize: '14px',
                    color: 'var(--ibm-primary)', fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                >
                  + Add rule
                </button>
              </div>
            )}
          </div>

          {error && (
            <div style={{ padding: 12, background: 'var(--ibm-red-10)', border: '1px solid var(--ibm-semantic-error)', borderLeft: '3px solid var(--ibm-semantic-error)' }}>
              <p className="ibm-body-sm" style={{ color: 'var(--ibm-semantic-error)' }}>{error}</p>
            </div>
          )}
          <div>
            <button
              type="submit"
              disabled={loading || !repoUrl.trim()}
              style={{
                background: loading || !repoUrl.trim() ? 'var(--ibm-surface-2)' : 'var(--ibm-primary)',
                color: loading || !repoUrl.trim() ? 'var(--ibm-ink-subtle)' : '#ffffff',
                fontSize: '14px',
                fontWeight: 400,
                letterSpacing: '0.16px',
                lineHeight: 1.29,
                padding: '12px 16px',
                border: 'none',
                cursor: loading || !repoUrl.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Starting...' : 'Start scan'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {manualMode ? (
        <>
          <div>
            <label htmlFor="repo-url" className="ibm-caption" style={labelStyle}>
              Repository URL
            </label>
            <input
              id="repo-url"
              placeholder="https://github.com/org/repo"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              required
              disabled={loading}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
              onBlur={e => { e.currentTarget.style.borderBottom = '1px solid var(--ibm-hairline-strong)'; }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label htmlFor="repo-branch" className="ibm-caption" style={labelStyle}>
                Branch
              </label>
              <input
                id="repo-branch"
                placeholder="main"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                disabled={loading}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
                onBlur={e => { e.currentTarget.style.borderBottom = '1px solid var(--ibm-hairline-strong)'; }}
              />
            </div>
            <div>
              <label className="ibm-caption" style={labelStyle}>
                Preset
              </label>
              <PresetSelector onChange={setPresetConfig} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setManualMode(false);
              setRepoUrl('');
              setBranch('main');
              setSelectedRepo(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ibm-primary)',
              cursor: 'pointer',
              padding: 0,
              fontSize: '14px',
              fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
              textAlign: 'left',
            }}
          >
            Select from your GitHub repos
          </button>
        </>
      ) : (
        <>
          {renderRepoSelector()}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {renderBranchSelector()}
            <div>
              <label className="ibm-caption" style={labelStyle}>
                Preset
              </label>
              <PresetSelector onChange={setPresetConfig} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setManualMode(true);
              setSelectedRepo(null);
              setBranches([]);
              setBranch('main');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ibm-primary)',
              cursor: 'pointer',
              padding: 0,
              fontSize: '14px',
              fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
              textAlign: 'left',
            }}
          >
            Or enter URL manually
          </button>
        </>
      )}

      <div>
        <label htmlFor="instructions" className="ibm-caption" style={labelStyle}>
          Instructions for AI
        </label>
        <textarea
          id="instructions"
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="Provide specific instructions for the AI scanner, e.g., 'Focus on authentication flows' or 'Check for SQL injection in ORM queries'"
          disabled={loading}
          rows={3}
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: 80,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '14px',
          }}
        />
      </div>

      <div style={{ borderTop: '1px solid var(--ibm-hairline)' }}>
        <div onClick={() => setShowConfig(!showConfig)} style={sectionHeaderStyle}>
          <span className="ibm-label" style={{ color: 'var(--ibm-ink)' }}>Custom Configuration</span>
          <span style={{ color: 'var(--ibm-ink-muted)', fontSize: '14px' }}>{showConfig ? '\u25B2' : '\u25BC'}</span>
        </div>
        {showConfig && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {renderNodeConfig('deep_scan', 'Deep Scan')}
            {renderNodeConfig('cross_file', 'Cross File')}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--ibm-hairline)' }}>
        <div onClick={() => setShowRules(!showRules)} style={sectionHeaderStyle}>
          <span className="ibm-label" style={{ color: 'var(--ibm-ink)' }}>Custom Rules</span>
          <span style={{ color: 'var(--ibm-ink-muted)', fontSize: '14px' }}>{showRules ? '\u25B2' : '\u25BC'}</span>
        </div>
        {showRules && (
          <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rules.map((rule, idx) => (
              <div key={idx} style={{ padding: 12, border: '1px solid var(--ibm-hairline)', background: 'var(--ibm-surface-1)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)' }}>Rule {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeRule(idx)}
                    style={{ background: 'none', border: 'none', color: 'var(--ibm-semantic-error)', cursor: 'pointer', fontSize: '16px', padding: '2px 6px' }}
                  >
                    {'\u00D7'}
                  </button>
                </div>
                <input
                  value={rule.name}
                  onChange={e => updateRule(idx, 'name', e.target.value)}
                  placeholder="Rule name"
                  style={inputStyle}
                />
                <textarea
                  value={rule.ruleText}
                  onChange={e => updateRule(idx, 'ruleText', e.target.value)}
                  placeholder="Rule description / pattern..."
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <select
                    value={rule.severity}
                    onChange={e => updateRule(idx, 'severity', e.target.value)}
                    style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none' }}
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                    <option value="INFO">INFO</option>
                  </select>
                  <select
                    value={rule.category}
                    onChange={e => updateRule(idx, 'category', e.target.value)}
                    style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none' }}
                  >
                    <option value="SAST">SAST</option>
                    <option value="SCA">SCA</option>
                    <option value="SECRETS">SECRETS</option>
                    <option value="IAC">IAC</option>
                    <option value="DATA_FLOW">DATA FLOW</option>
                    <option value="BUSINESS_LOGIC">BUSINESS LOGIC</option>
                  </select>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addRule}
              style={{
                background: 'var(--ibm-surface-1)', border: '1px dashed var(--ibm-hairline-strong)',
                padding: '10px 16px', cursor: 'pointer', fontSize: '14px',
                color: 'var(--ibm-primary)', fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              + Add rule
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: 12, background: 'var(--ibm-red-10)', border: '1px solid var(--ibm-semantic-error)', borderLeft: '3px solid var(--ibm-semantic-error)' }}>
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-semantic-error)' }}>{error}</p>
        </div>
      )}
      <div>
        <button
          type="submit"
          disabled={loading || !repoUrl.trim()}
          style={{
            background: loading || !repoUrl.trim() ? 'var(--ibm-surface-2)' : 'var(--ibm-primary)',
            color: loading || !repoUrl.trim() ? 'var(--ibm-ink-subtle)' : '#ffffff',
            fontSize: '14px',
            fontWeight: 400,
            letterSpacing: '0.16px',
            lineHeight: 1.29,
            padding: '12px 16px',
            border: 'none',
            cursor: loading || !repoUrl.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {loading ? 'Starting...' : 'Start scan'}
        </button>
      </div>
    </form>
  );
}