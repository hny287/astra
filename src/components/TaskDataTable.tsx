'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AlertDetail from './AlertDetail';
import CvssScore from './CvssScore';
import { useAiChat } from './AiChatProvider';
import { useAppData } from './AppDataProvider';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
type ItemStatus = 'OPEN' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'FALSE_POSITIVE' | 'ACCEPTED_RISK' | 'BLOCKED' | 'CANCELLED';
type TaskType = 'FINDING_TRIAGE' | 'REMEDIATION' | 'MANUAL_REVIEW' | 'MANUAL' | 'AI_GENERATED';

interface Finding {
  id: string;
  title: string;
  severity: string;
  file: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  cwe: string[];
  owasp: string[];
  remediation: string;
  description: string;
  category: string;
  exploitationScenario: string | null;
  exploitScore: number | null;
  cvssScore: number | null;
  cvssVector: string | null;
  confidence: number;
  aiExplanation: string | null;
  aiFix: string | null;
}

interface TaskComment {
  id: string;
  text: string;
  userId: string;
  createdAt: string;
}

interface TaskHistory {
  id: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  userId: string;
  createdAt: string;
}

interface ScanSummary {
  id: string;
  repoUrl: string;
  branch: string;
  commitSha: string | null;
  status?: string;
  createdAt?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  severity: Severity;
  status: ItemStatus;
  assignedToId: string | null;
  assignedTo?: { id: string; name: string; email: string } | null;
  scanId: string | null;
  scan?: ScanSummary | null;
  findingId: string | null;
  finding?: Finding | null;
  dueDate: string | null;
  category: string | null;
  scanner: string;
  ruleId: string;
  file: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  language: string;
  cwe: string[];
  owasp: string[];
  aiExplanation: string | null;
  aiFix: string | null;
  exploitationScenario: string | null;
  exploitScore: number | null;
  cvssScore: number | null;
  cvssVector: string | null;
  confidence: number;
  remediation: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const SEVERITY_BADGE: Record<Severity, { bg: string; label: string; textColor: string }> = {
  CRITICAL: { bg: '#da1e28', label: 'C', textColor: '#fff' },
  HIGH: { bg: '#6977e0', label: 'H', textColor: '#fff' },
  MEDIUM: { bg: '#8a8a8a', label: 'M', textColor: '#fff' },
  LOW: { bg: '#5a6986', label: 'L', textColor: '#fff' },
  INFO: { bg: '#0072c3', label: 'I', textColor: '#fff' },
};

const SEVERITY_LABEL: Record<Severity, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  INFO: 'Info',
};

const STATUS_BADGE: Record<ItemStatus, { bg: string; label: string; textColor: string }> = {
  OPEN: { bg: '#198038', label: 'Open', textColor: '#fff' },
  IN_PROGRESS: { bg: '#f1c21b', label: 'In Progress', textColor: '#161616' },
  IN_REVIEW: { bg: '#5a6986', label: 'In Review', textColor: '#fff' },
  COMPLETED: { bg: '#8a8a8a', label: 'Completed', textColor: '#fff' },
  FALSE_POSITIVE: { bg: '#e0e0e0', label: 'False Positive', textColor: '#525252' },
  ACCEPTED_RISK: { bg: '#0072c3', label: 'Accept Risk', textColor: '#fff' },
  BLOCKED: { bg: '#da1e28', label: 'Blocked', textColor: '#fff' },
  CANCELLED: { bg: '#e0e0e0', label: 'Cancelled', textColor: '#525252' },
};

const TYPE_LABEL: Record<TaskType, string> = {
  FINDING_TRIAGE: 'Triage',
  REMEDIATION: 'Remediation',
  MANUAL_REVIEW: 'Review',
  MANUAL: 'Manual',
  AI_GENERATED: '🤖 AI',
};

const TYPE_COLOR: Record<TaskType, string> = {
  FINDING_TRIAGE: 'var(--ibm-ink)',
  REMEDIATION: 'var(--ibm-ink)',
  MANUAL_REVIEW: 'var(--ibm-ink)',
  MANUAL: 'var(--ibm-ink)',
  AI_GENERATED: 'var(--ibm-primary)',
};

const SEVERITIES_LIST: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const STATUSES: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FALSE_POSITIVE', label: 'False Positive' },
  { value: 'ACCEPTED_RISK', label: 'Accepted Risk' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'CANCELLED', label: 'Cancelled' },
];
const TYPES: { value: string; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'FINDING_TRIAGE', label: 'Triage' },
  { value: 'REMEDIATION', label: 'Remediation' },
  { value: 'MANUAL_REVIEW', label: 'Review' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'AI_GENERATED', label: '🤖 AI' },
];
const CATEGORIES = ['SAST', 'SCA', 'SECRETS', 'IAC', 'DATA_FLOW', 'BUSINESS_LOGIC'];
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

type SubTab = 'details' | 'actions' | 'comments';

export default function TaskDataTable() {
  const { users } = useAppData();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [sortField, setSortField] = useState<string>('severity');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [offset, setOffset] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>('details');

  const [expandedTask, setExpandedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [historyEntries, setHistoryEntries] = useState<TaskHistory[]>([]);
  const [commentText, setCommentText] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showAiSuggest, setShowAiSuggest] = useState(false);
  const [rescanning, setRescanning] = useState<Set<string>>(new Set());
  const [rescanResults, setRescanResults] = useState<Record<string, string>>({});
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [showLinkFinding, setShowLinkFinding] = useState<string | null>(null);
  const [linkFindingInput, setLinkFindingInput] = useState('');
  const [showReassignModal, setShowReassignModal] = useState<string | null>(null);
  const [reassignSearch, setReassignSearch] = useState('');

  const [overflowOpen, setOverflowOpen] = useState<string | null>(null);
  const [showBatchBar, setShowBatchBar] = useState(false);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    type: 'MANUAL' as TaskType,
    severity: 'MEDIUM' as Severity,
    assignedToId: '',
    dueDate: '',
    findingId: '',
  });
  const [creating, setCreating] = useState(false);

  const overflowRef = useRef<HTMLDivElement>(null);
  const { openChat } = useAiChat();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);


  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (assigneeFilter) params.set('assignedToId', assigneeFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (severityFilter) params.set('severity', severityFilter);
    params.set('sort', sortField);
    params.set('order', sortDir);
    params.set('limit', String(pageSize));
    params.set('offset', String(offset));

    try {
      const res = await fetch(`/api/v1/tasks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, assigneeFilter, categoryFilter, severityFilter, sortField, sortDir, offset, pageSize]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const fetchDetail = useCallback(async (taskId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setExpandedTask(data);
      }
    } catch {} finally {
      setDetailLoading(false);
    }
  }, []);

  const fetchComments = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments ?? data ?? []);
      }
    } catch {}
  }, []);

  const fetchHistory = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistoryEntries(data.history ?? data ?? []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const expandId = new URLSearchParams(window.location.search).get('expand');
    if (expandId) {
      setExpanded(expandId);
      setSubTab('details');
      fetchDetail(expandId);
      fetchComments(expandId);
      fetchHistory(expandId);
    }
  }, [fetchDetail, fetchComments, fetchHistory]);

  const toggleExpand = (taskId: string) => {
    if (expanded === taskId) {
      setExpanded(null);
      setExpandedTask(null);
      setComments([]);
      setHistoryEntries([]);
    } else {
      setExpanded(taskId);
      setSubTab('details');
      fetchDetail(taskId);
      fetchComments(taskId);
      fetchHistory(taskId);
    }
  };

  const rescanFile = async (taskId: string) => {
    setRescanning(prev => new Set(prev).add(taskId));
    setRescanResults(prev => { const n = { ...prev }; delete n[taskId]; return n; });
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}/rescan`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setRescanResults(prev => ({ ...prev, [taskId]: 'Rescan started — viewing progress...' }));
        setTimeout(() => {
          window.location.href = `/scans/${data.scanId}?tab=nodes`;
        }, 1500);
      } else {
        setRescanResults(prev => ({ ...prev, [taskId]: `Error: ${data.error || 'Rescan failed'}` }));
      }
    } catch (err) {
      setRescanResults(prev => ({ ...prev, [taskId]: `Error: ${err instanceof Error ? err.message : 'Rescan failed'}` }));
    }
    setRescanning(prev => { const n = new Set(prev); n.delete(taskId); return n; });
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setOffset(0);
  };

  const arrow = (field: string) => {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === tasks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tasks.map(t => t.id)));
    }
  };

  useEffect(() => {
    setShowBatchBar(selected.size > 0);
  }, [selected]);

  const addComment = async () => {
    if (!expanded || !commentText.trim()) return;
    await fetch(`/api/v1/tasks/${expanded}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commentText }),
    });
    setCommentText('');
    fetchComments(expanded);
    fetchDetail(expanded);
  };

  const updateTask = async (taskId: string, patch: Record<string, any>) => {
    await fetch(`/api/v1/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    fetchTasks();
    if (expanded === taskId) {
      fetchDetail(taskId);
      fetchHistory(taskId);
    }
  };

  const batchAction = async (action: string, value?: any) => {
    const patch: Record<string, any> = {};
    if (action === 'reassign') patch.assignedToId = value;
    else if (action === 'severity') patch.severity = value;
    else if (action === 'in_progress') patch.status = 'IN_PROGRESS';
    else if (action === 'complete') patch.status = 'COMPLETED';
    else if (action === 'cancel') patch.status = 'CANCELLED';

    await fetch('/api/v1/tasks/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskIds: Array.from(selected), action, ...patch }),
    });
    setSelected(new Set());
    fetchTasks();
    if (expanded) {
      fetchDetail(expanded);
      fetchHistory(expanded);
    }
  };

  const createTask = async () => {
    if (!newTask.title.trim()) return;
    setCreating(true);
    try {
      const body: Record<string, any> = {
        title: newTask.title,
        description: newTask.description,
        type: newTask.type,
        severity: newTask.severity,
        assignedToId: newTask.assignedToId || null,
        dueDate: newTask.dueDate || null,
      };
      if (newTask.findingId) body.findingId = newTask.findingId;

      if (editingTaskId) {
        const res = await fetch(`/api/v1/tasks/${editingTaskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Failed to update task' }));
          alert(err.error || 'Failed to update task');
          return;
        }
        if (expanded === editingTaskId) {
          fetchDetail(editingTaskId);
          fetchHistory(editingTaskId);
        }
      } else {
        const res = await fetch('/api/v1/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Failed to create task' }));
          alert(err.error || 'Failed to create task');
          return;
        }
      }
      setShowCreateModal(false);
      setEditingTaskId(null);
      setNewTask({ title: '', description: '', type: 'MANUAL', severity: 'MEDIUM', assignedToId: '', dueDate: '', findingId: '' });
      fetchTasks();
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTaskId(task.id);
    setNewTask({
      title: task.title,
      description: task.description,
      type: task.type,
      severity: task.severity,
      assignedToId: task.assignedToId ?? '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      findingId: task.findingId ?? '',
    });
    setShowCreateModal(true);
  };

  const duplicateTask = async (task: Task) => {
    await fetch('/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Copy of ${task.title}`,
        description: task.description,
        type: task.type,
        severity: task.severity,
        assignedToId: task.assignedToId ?? null,
      }),
    });
    fetchTasks();
  };

  const linkFinding = async (taskId: string, findingId: string) => {
    if (!findingId.trim()) return;
    await fetch(`/api/v1/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findingId: findingId.trim() }),
    });
    setShowLinkFinding(null);
    setLinkFindingInput('');
    fetchTasks();
    if (expanded === taskId) fetchDetail(taskId);
  };

  const handleAiSuggest = async () => {
    setShowAiSuggest(true);
    setAiLoading(true);
    try {
      const res = await fetch('/api/v1/tasks/ai-suggest', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAiSuggestions(data.suggestions ?? data ?? []);
      }
    } catch {} finally {
      setAiLoading(false);
    }
  };

  const acceptAiSuggestion = async (suggestion: any) => {
    await fetch('/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suggestion),
    });
    setAiSuggestions(prev => prev.filter(s => s !== suggestion));
    fetchTasks();
  };

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('');
    setStatusFilter('');
    setAssigneeFilter('');
    setCategoryFilter('');
    setSeverityFilter('');
    setOffset(0);
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--ibm-canvas)',
    border: '1px solid var(--ibm-hairline)',
    borderBottom: '2px solid var(--ibm-hairline-strong)',
    padding: '8px 12px',
    fontSize: '14px',
    fontFamily: "'IBM Plex Sans', sans-serif",
    letterSpacing: '0.16px',
    color: 'var(--ibm-ink)',
    outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    background: 'var(--ibm-surface-1)',
    border: '1px solid var(--ibm-hairline)',
    borderBottom: '2px solid var(--ibm-primary)',
    padding: '8px 12px',
    fontSize: '14px',
    color: 'var(--ibm-ink)',
    cursor: 'pointer',
    fontFamily: "'IBM Plex Sans', sans-serif",
    letterSpacing: '0.16px',
    appearance: 'none',
    WebkitAppearance: 'none',
  };

  const btnStyle: React.CSSProperties = {
    background: 'var(--ibm-surface-1)',
    border: '1px solid var(--ibm-hairline)',
    padding: '6px 12px',
    fontSize: '13px',
    fontFamily: "'IBM Plex Sans', sans-serif",
    letterSpacing: '0.16px',
    cursor: 'pointer',
    color: 'var(--ibm-ink)',
  };

  const primaryBtnStyle: React.CSSProperties = {
    background: 'var(--ibm-primary)',
    border: 'none',
    padding: '8px 16px',
    fontSize: '14px',
    fontFamily: "'IBM Plex Sans', sans-serif",
    letterSpacing: '0.16px',
    cursor: 'pointer',
    color: 'var(--ibm-on-primary)',
    fontWeight: 400,
  };


  const totalPages = Math.ceil(total / pageSize);
  const startItem = offset + 1;
  const endItem = Math.min(offset + pageSize, total);

  if (loading && tasks.length === 0) {
    return <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)', padding: '32px 0' }}>Loading...</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', background: 'var(--ibm-surface-1)', borderBottom: '1px solid var(--ibm-hairline)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={e => { setSearch(e.target.value); setOffset(0); }}
          style={{ flex: '1 1 200px', ...inputStyle }}
          onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
          onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline-strong)'; }}
        />
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setOffset(0); }} style={selectStyle}>
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setOffset(0); }} style={selectStyle}>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={assigneeFilter} onChange={e => { setAssigneeFilter(e.target.value); setOffset(0); }} style={selectStyle}>
          <option value="">All assigned</option>
          <option value="unassigned">Unassigned</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setOffset(0); }} style={selectStyle}>
          <option value="">All category</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
        <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setOffset(0); }} style={selectStyle}>
          <option value="">All severity</option>
          {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={resetFilters} style={btnStyle}>Reset</button>
        <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>{total} task{total !== 1 ? 's' : ''}</span>
        <div style={{ flex: 1 }} />
        <button onClick={fetchTasks} style={{ ...btnStyle, display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 0 }} title="Refresh">⟳</button>
        <button onClick={() => setShowCreateModal(true)} style={primaryBtnStyle}>+ New task</button>
      </div>

      {showBatchBar && (
        <div style={{ background: '#161616', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="ibm-body-sm" style={{ color: '#fff', fontWeight: 600 }}>{selected.size} selected</span>
          <button onClick={() => batchAction('reassign', '')} style={{ ...btnStyle, background: '#393939', color: '#fff', border: '1px solid #525252' }}>Reassign</button>
          <button onClick={() => batchAction('severity', 'MEDIUM')} style={{ ...btnStyle, background: '#393939', color: '#fff', border: '1px solid #525252' }}>Change Severity</button>
          <button onClick={() => batchAction('in_progress')} style={{ ...btnStyle, background: '#393939', color: '#fff', border: '1px solid #525252' }}>Mark In Progress</button>
          <button onClick={() => batchAction('complete')} style={{ ...btnStyle, background: '#393939', color: '#fff', border: '1px solid #525252' }}>Complete</button>
          <button onClick={() => batchAction('cancel')} style={{ ...btnStyle, background: '#393939', color: '#fff', border: '1px solid #525252' }}>Cancel</button>
          <button onClick={() => setSelected(new Set())} style={{ ...btnStyle, background: '#393939', color: '#fff', border: '1px solid #525252' }}>Deselect All</button>
        </div>
      )}

      <div style={{ border: '1px solid var(--ibm-hairline)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 32px 48px 100px 1fr 90px 100px 100px 90px 120px 100px 32px', padding: '10px 16px', background: 'var(--ibm-surface-1)', borderBottom: '1px solid var(--ibm-hairline)', alignItems: 'center' }}>
          <div>
            <input
              type="checkbox"
              checked={tasks.length > 0 && selected.size === tasks.length}
              onChange={toggleSelectAll}
              style={{ cursor: 'pointer', accentColor: 'var(--ibm-primary)' }}
            />
          </div>
          <span />
          {[
            { field: 'severity', label: '' },
            { field: 'id', label: 'ID' },
            { field: 'title', label: 'Title' },
            { field: 'severity', label: 'Severity' },
            { field: '', label: 'CVSS Score' },
            { field: 'status', label: 'Status' },
            { field: 'type', label: 'Type' },
            { field: 'assignedToId', label: 'Assignee' },
            { field: 'dueDate', label: 'Due' },
            { field: '', label: '' },
          ].map((col, i) => (
            <span
              key={col.field + i}
              onClick={() => col.field && col.field !== 'severity' || col.field === 'severity' && col.label === 'Severity' ? toggleSort(col.field) : undefined}
              className="ibm-label"
              style={{
                color: 'var(--ibm-ink-muted)',
                cursor: col.field && (col.field !== 'severity' || col.label === 'Severity') ? 'pointer' : 'default',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {col.label}{col.field && (col.field !== 'severity' || col.label === 'Severity') ? arrow(col.field) : ''}
            </span>
          ))}
        </div>

        {tasks.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>No tasks found</p>
          </div>
        )}

        {tasks.map(task => {
          const isExpanded = expanded === task.id;
          const pb = SEVERITY_BADGE[task.severity] ?? SEVERITY_BADGE.MEDIUM;
          const sb = STATUS_BADGE[task.status] ?? STATUS_BADGE.OPEN;
          const isSelected = selected.has(task.id);

          return (
            <div key={task.id} style={{ borderBottom: '1px solid var(--ibm-hairline)' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 32px 48px 100px 1fr 90px 100px 100px 90px 120px 100px 32px',
                  padding: '8px 16px',
                  alignItems: 'start',
                  background: isSelected ? 'var(--ibm-blue-10)' : 'var(--ibm-canvas)',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(task.id)}
                  style={{ cursor: 'pointer', accentColor: 'var(--ibm-primary)', marginTop: 3 }}
                />
                <button
                  onClick={() => toggleExpand(task.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--ibm-ink-muted)', padding: 0, lineHeight: 1, marginTop: 2 }}
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
                <div style={{
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: pb.bg, color: pb.textColor, fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.32px', fontFamily: "'IBM Plex Sans', sans-serif",
                }}>
                  {pb.label}
                </div>
                <span className="ibm-caption" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ibm-ink-muted)', fontSize: 12 }} title={task.id}>{task.id.slice(0, 8)}…</span>
                <div style={{ overflow: 'hidden', paddingLeft: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                  {task.scan && (
                    <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.scan.repoUrl.replace(/^https?:\/\//, '').replace(/\.git$/, '')} · {task.scan.branch}
                      {task.scan.commitSha ? ` · ${task.scan.commitSha.slice(0, 7)}` : ''}
                    </span>
                  )}
                </div>
                <span className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)' }}>{SEVERITY_LABEL[task.severity]}</span>
                <CvssScore score={task.cvssScore ?? 0} vector={task.cvssVector} compact />
                <span style={{
                  display: 'inline-block', padding: '2px 8px', fontSize: 12, fontWeight: 600,
                  letterSpacing: '0.32px', background: sb.bg, color: sb.textColor,
                  fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: '20px',
                }}>
                  {sb.label}
                </span>
                <span className="ibm-caption" style={{ color: TYPE_COLOR[task.type] ?? 'var(--ibm-ink-muted)' }}>{TYPE_LABEL[task.type]}</span>
                <span className="ibm-caption" style={{ color: task.assignedToId ? 'var(--ibm-ink)' : 'var(--ibm-ink-subtle)' }}>
                  {task.assignedTo?.name ?? (task.assignedToId ?? 'Unassigned')}
                </span>
                <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </span>
                <div ref={overflowOpen === task.id ? overflowRef : null} style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setOverflowOpen(overflowOpen === task.id ? null : task.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ibm-ink-muted)', fontSize: 18, padding: '2px 4px', lineHeight: 1 }}
                  >
                    ⋯
                  </button>
                  {overflowOpen === task.id && (
                    <div style={{
                      position: 'absolute', right: 0, top: '100%', zIndex: 100,
                      background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)',
                      minWidth: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}>
                      {[
                        { label: 'Edit', action: () => openEditModal(task) },
                        { label: 'Reassign', action: () => { setShowReassignModal(task.id); setReassignSearch(''); } },
                        { label: 'Duplicate', action: () => duplicateTask(task) },
                        { label: 'Link Finding', action: () => { setShowLinkFinding(task.id); setLinkFindingInput(task.findingId ?? ''); } },
                        { label: 'Delete', action: () => updateTask(task.id, { status: 'CANCELLED' }) },
                        { label: 'AI Assist', action: () => openChat(task.findingId ? { findingId: task.findingId, findingTitle: task.finding?.title ?? task.title } : undefined) },
                      ].map(item => (
                        <button
                          key={item.label}
                          onClick={() => { item.action(); setOverflowOpen(null); }}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px',
                            background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
                            fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px',
                            color: item.label === 'Delete' ? 'var(--ibm-semantic-error)' : 'var(--ibm-ink)',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ibm-surface-1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div style={{ background: 'var(--ibm-surface-1)', padding: '0 16px 16px' }}>
                  <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--ibm-hairline)', marginBottom: 16 }}>
                    {(['details', 'actions', 'comments'] as SubTab[]).map(tab => (
                      <button
                        key={tab}
                        onClick={() => {
                          setSubTab(tab);
                          if (tab === 'comments') fetchComments(task.id);
                          if (tab === 'actions') fetchHistory(task.id);
                        }}
                        style={{
                          background: 'none', border: 'none', borderBottom: subTab === tab ? '2px solid var(--ibm-primary)' : '1px solid var(--ibm-hairline)',
                          padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontFamily: "'IBM Plex Sans', sans-serif",
                          letterSpacing: '0.16px', color: subTab === tab ? 'var(--ibm-primary)' : 'var(--ibm-ink-muted)',
                          fontWeight: subTab === tab ? 600 : 400,
                        }}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>

                  {subTab === 'details' && (
                    <div>
                      {detailLoading ? (
                        <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Loading...</p>
                      ) : expandedTask ? (
                        <>
                          {expandedTask.scan && (
                            <div style={{ marginBottom: 16, padding: '10px 12px', background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', borderLeft: '3px solid var(--ibm-primary)' }}>
                              <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 6 }}>Origin</p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 24px', alignItems: 'baseline' }}>
                                <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, wordBreak: 'break-all' }}>
                                  {expandedTask.scan.repoUrl.replace(/^https?:\/\//, '')}
                                </span>
                                <span className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                                  branch: <strong>{expandedTask.scan.branch}</strong>
                                </span>
                                {expandedTask.scan.commitSha && (
                                  <span className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                                    {expandedTask.scan.commitSha.slice(0, 7)}
                                  </span>
                                )}
                                {expandedTask.scan.createdAt && (
                                  <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>
                                    {new Date(expandedTask.scan.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                )}
                                <a
                                  href={`/scans/${expandedTask.scan.id}`}
                                  style={{ color: 'var(--ibm-primary)', fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px', marginLeft: 'auto' }}
                                >
                                  View scan →
                                </a>
                              </div>
                            </div>
                          )}

                          {expandedTask.description && (
                            <div style={{ marginBottom: 16 }}>
                              <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Description</p>
                              <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>{expandedTask.description}</p>
                            </div>
                          )}

                          {expandedTask.finding && (
                            <div style={{ marginBottom: 16 }}>
                              <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Finding</p>
                              <button
                                onClick={() => setSelectedFindingId(expandedTask.findingId)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ibm-primary)', fontSize: 14, letterSpacing: '0.16px', fontFamily: "'IBM Plex Sans', sans-serif", padding: 0, textAlign: 'left', textDecoration: 'underline' }}
                              >
                                {expandedTask.finding.title}
                              </button>
                              <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginLeft: 8 }}>{expandedTask.finding.file}:{expandedTask.finding.lineStart}</span>
                            </div>
                          )}

                          {(() => {
                            const t = expandedTask;
                            const f = t.finding;
                            const file = t.file || f?.file;
                            const lineStart = t.lineStart || f?.lineStart;
                            const codeSnippet = t.codeSnippet || f?.codeSnippet;
                            const exploitationScenario = t.exploitationScenario || f?.exploitationScenario;
                            const remediation = t.remediation || f?.remediation;
                            const cwe = t.cwe.length > 0 ? t.cwe : (f?.cwe ?? []);
                            const owasp = t.owasp.length > 0 ? t.owasp : (f?.owasp ?? []);
                            const exploitScore = t.exploitScore ?? f?.exploitScore ?? null;
                            const cvssScore = t.cvssScore ?? f?.cvssScore ?? null;
                            const cvssVector = t.cvssVector || f?.cvssVector || null;
                            const confidence = t.confidence || f?.confidence || 0;
                            const aiExplanation = t.aiExplanation || f?.aiExplanation;
                            const aiFix = t.aiFix || f?.aiFix;
                            const scanner = t.scanner || f?.category || '';
                            return (
                              <>
                                {file && (
                                  <div style={{ marginBottom: 16 }}>
                                    <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>File location</p>
                                    <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                                      {file}{lineStart ? `:${lineStart}` : ''}
                                    </span>
                                    {scanner && <span className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginLeft: 12 }}>{scanner}</span>}
                                  </div>
                                )}

                                {codeSnippet && (
                                  <div style={{ marginBottom: 20 }}>
                                    <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Code snippet</p>
                                    <pre style={{ padding: 16, background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', overflow: 'auto', maxHeight: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', lineHeight: 1.5 }}>{codeSnippet}</pre>
                                  </div>
                                )}

                                {exploitationScenario && (
                                  <div style={{ marginBottom: 20, borderLeft: '3px solid var(--ibm-semantic-error)', paddingLeft: 12 }}>
                                    <p className="ibm-label" style={{ color: 'var(--ibm-semantic-error)', marginBottom: 4 }}>Proof of Concept</p>
                                    <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>{exploitationScenario}</p>
                                  </div>
                                )}

                                {remediation && (
                                  <div style={{ marginBottom: 20, borderLeft: '3px solid var(--ibm-semantic-success)', paddingLeft: 12 }}>
                                    <p className="ibm-label" style={{ color: 'var(--ibm-semantic-success)', marginBottom: 4 }}>Remediation</p>
                                    <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>{remediation}</p>
                                  </div>
                                )}

                                {aiExplanation && (
                                  <div style={{ marginBottom: 20 }}>
                                    <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>AI Explanation</p>
                                    <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>{aiExplanation}</p>
                                  </div>
                                )}

                                {aiFix && (
                                  <div style={{ marginBottom: 20 }}>
                                    <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>AI Fix Suggestion</p>
                                    <pre style={{ padding: 16, background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', overflow: 'auto', maxHeight: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', lineHeight: 1.5 }}>{aiFix}</pre>
                                  </div>
                                )}

                                {(cwe.length > 0 || owasp.length > 0) && (
                                  <div style={{ marginBottom: 20 }}>
                                    <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>References</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                      {cwe.map(c => (
                                        <a key={c} href={`https://cwe.mitre.org/data/definitions/${c.replace('CWE-', '')}.html`} target="_blank" rel="noopener noreferrer" style={{ background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', color: 'var(--ibm-primary)', padding: '2px 8px', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", textDecoration: 'none', letterSpacing: '0.16px' }}>
                                          {c}
                                        </a>
                                      ))}
                                      {owasp.map(o => (
                                        <a key={o} href={`https://owasp.org/www-project-top-ten/${o}`} target="_blank" rel="noopener noreferrer" style={{ background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', color: 'var(--ibm-primary)', padding: '2px 8px', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", textDecoration: 'none', letterSpacing: '0.16px' }}>
                                          {o}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {exploitScore != null && (
                                  <div style={{ marginBottom: 20 }}>
                                    <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Exploit Score</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{ flex: 1, height: 8, background: 'var(--ibm-surface-2)' }}>
                                        <div style={{
                                          width: `${Math.min(exploitScore / 10, 1) * 100}%`,
                                          height: '100%',
                                          background: exploitScore >= 8 ? 'var(--ibm-semantic-error)' : exploitScore >= 5 ? 'var(--ibm-semantic-warning)' : 'var(--ibm-semantic-success)',
                                        }} />
                                      </div>
                                      <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink)', fontFamily: "'IBM Plex Mono', monospace", minWidth: 28 }}>{exploitScore.toFixed(1)}</span>
                                    </div>
                                  </div>
                                )}

                                {cvssScore != null && (
                                  <CvssScore score={cvssScore} vector={cvssVector} />
                                )}

                                <div style={{ marginBottom: 20 }}>
                                  <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Confidence</p>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ flex: 1, height: 8, background: 'var(--ibm-surface-2)' }}>
                                      <div style={{ width: `${confidence * 100}%`, height: '100%', background: 'var(--ibm-primary)' }} />
                                    </div>
                                    <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink)', fontFamily: "'IBM Plex Mono', monospace", minWidth: 36 }}>{(confidence * 100).toFixed(0)}%</span>
                                  </div>
                                </div>
                              </>
                            );
                          })()}

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--ibm-hairline)' }}>
                            {([
                              { label: 'Confirm',           targetStatus: 'IN_PROGRESS', accent: 'var(--ibm-semantic-warning)',  disabledWhen: ['IN_PROGRESS','IN_REVIEW','COMPLETED','CANCELLED','DUPLICATE'] },
                              { label: 'Submit for Review', targetStatus: 'IN_REVIEW',   accent: 'var(--ibm-primary)',           disabledWhen: ['IN_REVIEW','COMPLETED','CANCELLED','DUPLICATE'] },
                              { label: 'Remediated',        targetStatus: 'COMPLETED',   accent: 'var(--ibm-semantic-success)',  disabledWhen: ['COMPLETED'] },
                              { label: 'False Positive',    targetStatus: 'CANCELLED',   accent: 'var(--ibm-ink-subtle)',        disabledWhen: ['CANCELLED','DUPLICATE'] },
                              { label: 'Accept Risk',       targetStatus: 'CANCELLED',   accent: 'var(--ibm-semantic-warning)', disabledWhen: ['CANCELLED','DUPLICATE'] },
                            ] as const).map(({ label, targetStatus, accent, disabledWhen }) => {
                              const isDisabled = (disabledWhen as readonly string[]).includes(task.status);
                              return (
                                <button
                                  key={label}
                                  onClick={() => !isDisabled && updateTask(task.id, { status: targetStatus })}
                                  disabled={isDisabled}
                                  style={{ ...btnStyle, borderLeft: `3px solid ${accent}`, opacity: isDisabled ? 0.35 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                            <button
                              onClick={() => openChat(expandedTask.findingId ? { findingId: expandedTask.findingId, findingTitle: expandedTask.finding?.title ?? expandedTask.title } : undefined)}
                              style={{ ...btnStyle, borderLeft: '3px solid var(--ibm-primary)', background: 'var(--ibm-surface-2)' }}
                            >
                              AI Assist
                            </button>
                            {expandedTask?.findingId && (
                              <button
                                onClick={() => rescanFile(task.id)}
                                disabled={rescanning.has(task.id)}
                                style={{ ...btnStyle, borderLeft: '3px solid var(--ibm-blue-50)', opacity: rescanning.has(task.id) ? 0.5 : 1 }}
                              >
                                {rescanning.has(task.id) ? 'Rescanning...' : 'Rescan File'}
                              </button>
                            )}
                            {rescanResults[task.id] && (
                              <span className="ibm-caption" style={{ color: rescanResults[task.id].startsWith('Error') ? 'var(--ibm-semantic-error)' : 'var(--ibm-semantic-success)', alignSelf: 'center' }}>
                                {rescanResults[task.id]}
                              </span>
                            )}
                            <button onClick={() => { setShowReassignModal(task.id); setReassignSearch(''); }} style={{ ...btnStyle, borderLeft: '3px solid var(--ibm-ink-subtle)' }}>Reassign</button>
                          </div>
                        </>
                      ) : (
                        <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Failed to load task details.</p>
                      )}
                    </div>
                  )}

                  {subTab === 'actions' && (
                    <div>
                      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 12 }}>History</p>
                      {historyEntries.length === 0 ? (
                        <p className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>No history entries.</p>
                      ) : (
                        historyEntries.map(h => (
                          <div key={h.id} style={{ padding: '6px 0', borderLeft: '2px solid var(--ibm-hairline)', marginLeft: 8, paddingLeft: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span className="ibm-label" style={{ color: 'var(--ibm-ink)' }}>{h.action}</span>
                              <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>{new Date(h.createdAt).toLocaleString()}</span>
                            </div>
                            {(h.oldValue || h.newValue) && (
                              <p className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginTop: 2 }}>
                                {h.oldValue && <span>{h.oldValue}</span>}
                                {h.oldValue && h.newValue && <span> → </span>}
                                {h.newValue && <span style={{ fontWeight: 600 }}>{h.newValue}</span>}
                              </p>
                            )}
                            <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>by {h.userId || 'System'}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {subTab === 'comments' && (
                    <div>
                      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 12 }}>Comments</p>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <input
                          type="text"
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
                          style={{ flex: 1, ...inputStyle }}
                          onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
                          onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline-strong)'; }}
                        />
                        <button
                          onClick={addComment}
                          disabled={!commentText.trim()}
                          style={{ ...primaryBtnStyle, opacity: commentText.trim() ? 1 : 0.5 }}
                        >
                          Add comment
                        </button>
                      </div>
                      {comments.length === 0 ? (
                        <p className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>No comments yet.</p>
                      ) : (
                        comments.map(c => (
                          <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--ibm-hairline)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                              <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>{c.userId}</span>
                              <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>{c.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {total > 0 && (
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--ibm-hairline)' }}>
          <span className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)' }}>
            Showing {startItem}–{endItem} of {total}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setOffset(0); }}
              style={{ ...selectStyle, padding: '4px 8px', fontSize: 12 }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button
              onClick={() => setOffset(Math.max(0, offset - pageSize))}
              disabled={offset === 0}
              style={{ ...btnStyle, opacity: offset === 0 ? 0.5 : 1, cursor: offset === 0 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(Math.min((totalPages - 1) * pageSize, offset + pageSize))}
              disabled={offset + pageSize >= total}
              style={{ ...btnStyle, opacity: offset + pageSize >= total ? 0.5 : 1, cursor: offset + pageSize >= total ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} onClick={() => { setShowCreateModal(false); setEditingTaskId(null); }} />
          <div style={{ width: 480, background: 'var(--ibm-canvas)', borderLeft: '1px solid var(--ibm-hairline)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ibm-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="ibm-headline" style={{ color: 'var(--ibm-ink)', margin: 0 }}>{editingTaskId ? 'Edit task' : 'New task'}</h2>
              <button onClick={() => { setShowCreateModal(false); setEditingTaskId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ibm-ink-muted)', fontSize: 20, lineHeight: 1, padding: 4 }}>&times;</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="ibm-label" style={{ display: 'block', marginBottom: 4, color: 'var(--ibm-ink-muted)' }}>Title</label>
                <input type="text" value={newTask.title} onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))} style={{ width: '100%', ...inputStyle }} />
              </div>
              <div>
                <label className="ibm-label" style={{ display: 'block', marginBottom: 4, color: 'var(--ibm-ink-muted)' }}>Description</label>
                <textarea value={newTask.description} onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))} rows={3} style={{ width: '100%', ...inputStyle, resize: 'vertical', fontFamily: "'IBM Plex Sans', sans-serif" }} />
              </div>
              <div>
                <label className="ibm-label" style={{ display: 'block', marginBottom: 4, color: 'var(--ibm-ink-muted)' }}>Type</label>
                <select value={newTask.type} onChange={e => setNewTask(prev => ({ ...prev, type: e.target.value as TaskType }))} style={{ width: '100%', ...selectStyle }}>
                  {TYPES.filter(t => t.value).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="ibm-label" style={{ display: 'block', marginBottom: 4, color: 'var(--ibm-ink-muted)' }}>Severity</label>
                <select value={newTask.severity} onChange={e => setNewTask(prev => ({ ...prev, severity: e.target.value as Severity }))} style={{ width: '100%', ...selectStyle }}>
                  {SEVERITIES_LIST.map(p => <option key={p} value={p}>{SEVERITY_LABEL[p]}</option>)}
                </select>
              </div>
              <div>
                <label className="ibm-label" style={{ display: 'block', marginBottom: 4, color: 'var(--ibm-ink-muted)' }}>Assignee</label>
                <select value={newTask.assignedToId} onChange={e => setNewTask(prev => ({ ...prev, assignedToId: e.target.value }))} style={{ width: '100%', ...selectStyle }}>
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="ibm-label" style={{ display: 'block', marginBottom: 4, color: 'var(--ibm-ink-muted)' }}>Due date</label>
                <input type="date" value={newTask.dueDate} onChange={e => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))} style={{ width: '100%', ...inputStyle }} />
              </div>
              <div>
                <label className="ibm-label" style={{ display: 'block', marginBottom: 4, color: 'var(--ibm-ink-muted)' }}>Finding ID (optional)</label>
                <input type="text" value={newTask.findingId} onChange={e => setNewTask(prev => ({ ...prev, findingId: e.target.value }))} placeholder="Paste finding ID" style={{ width: '100%', ...inputStyle }} />
              </div>
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--ibm-hairline)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setShowCreateModal(false); setEditingTaskId(null); }} style={btnStyle}>Cancel</button>
              <button onClick={createTask} disabled={creating || !newTask.title.trim()} style={{ ...primaryBtnStyle, opacity: creating || !newTask.title.trim() ? 0.5 : 1 }}>
                {creating ? (editingTaskId ? 'Saving...' : 'Creating...') : (editingTaskId ? 'Save changes' : 'Create task')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAiSuggest && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowAiSuggest(false)} />
          <div style={{ width: 520, background: 'var(--ibm-canvas)', borderLeft: '1px solid var(--ibm-hairline)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ibm-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="ibm-headline" style={{ color: 'var(--ibm-ink)', margin: 0 }}>AI Suggestions</h2>
              <button onClick={() => setShowAiSuggest(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ibm-ink-muted)', fontSize: 20, lineHeight: 1, padding: 4 }}>&times;</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {aiLoading ? (
                <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Loading suggestions...</p>
              ) : aiSuggestions.length === 0 ? (
                <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>No suggestions available.</p>
              ) : (
                aiSuggestions.map((suggestion, idx) => (
                  <div key={idx} style={{ padding: 16, background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', marginBottom: 12 }}>
                    <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', fontWeight: 600, marginBottom: 4 }}>{suggestion.title || suggestion.name || 'Suggested task'}</p>
                    {suggestion.description && <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 8 }}>{suggestion.description}</p>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {suggestion.severity && (
                        <span style={{
                          padding: '2px 8px', fontSize: 11, fontWeight: 600,
                          background: SEVERITY_BADGE[suggestion.severity as Severity]?.bg ?? '#8a8a8a',
                          color: SEVERITY_BADGE[suggestion.severity as Severity]?.textColor ?? '#fff',
                          letterSpacing: '0.32px',
                        }}>
                          {suggestion.severity}
                        </span>
                      )}
                      <button
                        onClick={() => acceptAiSuggestion(suggestion)}
                        style={{ ...primaryBtnStyle, padding: '4px 12px', fontSize: 12 }}
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {selectedFindingId && (
        <AlertDetail findingId={selectedFindingId} onClose={() => setSelectedFindingId(null)} />
      )}

      {showReassignModal && (() => {
        const filtered = users.filter(u =>
          !reassignSearch.trim() ||
          u.name.toLowerCase().includes(reassignSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(reassignSearch.toLowerCase())
        );
        const currentTask = tasks.find(t => t.id === showReassignModal) ?? expandedTask;
        const currentAssigneeId = currentTask?.assignedToId;

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowReassignModal(null)} />
            <div style={{ position: 'relative', width: 420, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ibm-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="ibm-headline" style={{ color: 'var(--ibm-ink)', margin: 0 }}>Reassign task</h2>
                  <p className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginTop: 2 }}>
                    {currentAssigneeId
                      ? `Currently: ${users.find(u => u.id === currentAssigneeId)?.name ?? currentAssigneeId}`
                      : 'Currently unassigned'}
                  </p>
                </div>
                <button onClick={() => setShowReassignModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ibm-ink-muted)', fontSize: 20, lineHeight: 1, padding: 4 }}>&times;</button>
              </div>

              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ibm-hairline)' }}>
                <input
                  type="text"
                  placeholder="Filter by name or email…"
                  value={reassignSearch}
                  autoFocus
                  onChange={e => setReassignSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Escape' && setShowReassignModal(null)}
                  style={{ width: '100%', ...inputStyle, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ overflowY: 'auto', flex: 1 }}>
                <button
                  onClick={() => { updateTask(showReassignModal, { assignedToId: null }); setShowReassignModal(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                    padding: '12px 16px', background: !currentAssigneeId ? 'var(--ibm-blue-10)' : 'none',
                    border: 'none', borderBottom: '1px solid var(--ibm-hairline)', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { if (currentAssigneeId) (e.currentTarget as HTMLElement).style.background = 'var(--ibm-surface-1)'; }}
                  onMouseLeave={e => { if (currentAssigneeId) (e.currentTarget as HTMLElement).style.background = 'none'; }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ibm-surface-2)', border: '1px dashed var(--ibm-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 16, color: 'var(--ibm-ink-subtle)' }}>—</span>
                  </div>
                  <div>
                    <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', margin: 0 }}>Unassigned</p>
                    <p className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', margin: 0 }}>Remove current assignee</p>
                  </div>
                  {!currentAssigneeId && (
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ibm-primary)', fontWeight: 600 }}>Current</span>
                  )}
                </button>

                {filtered.length === 0 && (
                  <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)', padding: '20px 16px' }}>No users match "{reassignSearch}"</p>
                )}

                {filtered.map(u => {
                  const isCurrentAssignee = u.id === currentAssigneeId;
                  const initials = u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <button
                      key={u.id}
                      onClick={() => { updateTask(showReassignModal, { assignedToId: u.id }); setShowReassignModal(null); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                        padding: '12px 16px', background: isCurrentAssignee ? 'var(--ibm-blue-10)' : 'none',
                        border: 'none', borderBottom: '1px solid var(--ibm-hairline)', cursor: isCurrentAssignee ? 'default' : 'pointer',
                      }}
                      onMouseEnter={e => { if (!isCurrentAssignee) (e.currentTarget as HTMLElement).style.background = 'var(--ibm-surface-1)'; }}
                      onMouseLeave={e => { if (!isCurrentAssignee) (e.currentTarget as HTMLElement).style.background = 'none'; }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: 'var(--ibm-primary)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        fontSize: 12, fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.32px',
                      }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                        <p className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                      </div>
                      {isCurrentAssignee && (
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ibm-primary)', fontWeight: 600, flexShrink: 0 }}>Current</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--ibm-hairline)', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowReassignModal(null)} style={btnStyle}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

      {showLinkFinding && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowLinkFinding(null)} />
          <div style={{ position: 'relative', width: 420, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 className="ibm-headline" style={{ color: 'var(--ibm-ink)', margin: 0 }}>Link Finding</h2>
            <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', margin: 0 }}>Paste the finding ID to link it to this task.</p>
            <input
              type="text"
              value={linkFindingInput}
              onChange={e => setLinkFindingInput(e.target.value)}
              placeholder="Finding ID..."
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') linkFinding(showLinkFinding, linkFindingInput); if (e.key === 'Escape') setShowLinkFinding(null); }}
              style={{ ...inputStyle, width: '100%' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowLinkFinding(null)} style={btnStyle}>Cancel</button>
              <button onClick={() => linkFinding(showLinkFinding, linkFindingInput)} disabled={!linkFindingInput.trim()} style={{ ...primaryBtnStyle, opacity: linkFindingInput.trim() ? 1 : 0.5 }}>Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}