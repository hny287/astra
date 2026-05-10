'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { bsGet, bsSet } from '@/lib/browser-store';

const TTL_USERS = 5 * 60 * 1000;
const TTL_PREFS = 24 * 60 * 60 * 1000;
const TTL_CHAT_CONFIG = 10 * 60 * 1000;
const TTL_CURRENT_USER = 30 * 60 * 1000;

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ModelOption {
  providerId: string;
  providerName: string;
  modelId: string;
}

export interface ChatConfig {
  current: ModelOption | null;
  models: ModelOption[];
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  githubProfile?: { username: string; avatarUrl?: string } | null;
}

interface AppDataContextValue {
  users: AppUser[];
  preferences: Record<string, string>;
  chatConfig: ChatConfig | null;
  currentUser: CurrentUser | null;
  setPreference: (key: string, value: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshChatConfig: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue>({
  users: [],
  preferences: {},
  chatConfig: null,
  currentUser: null,
  setPreference: async () => {},
  refreshUsers: async () => {},
  refreshChatConfig: async () => {},
});

export function useAppData() {
  return useContext(AppDataContext);
}

async function fetchUsers(): Promise<AppUser[]> {
  try {
    const res = await fetch('/api/v1/users');
    if (!res.ok) return [];
    const data = await res.json();
    return data.users ?? [];
  } catch {
    return [];
  }
}

async function fetchPreferences(): Promise<Record<string, string>> {
  try {
    const res = await fetch('/api/v1/preferences');
    if (!res.ok) return {};
    const data = await res.json();
    const map: Record<string, string> = {};
    for (const p of data.preferences ?? []) map[p.key] = p.value;
    return map;
  } catch {
    return {};
  }
}

async function fetchChatConfig(): Promise<ChatConfig | null> {
  try {
    const res = await fetch('/api/v1/chat/config');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const res = await fetch('/api/v1/auth/me');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(() => bsGet<AppUser[]>('users') ?? []);
  const [preferences, setPreferences] = useState<Record<string, string>>(() => bsGet<Record<string, string>>('preferences') ?? {});
  const [chatConfig, setChatConfig] = useState<ChatConfig | null>(() => bsGet<ChatConfig>('chat-config'));
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => bsGet<CurrentUser>('current-user'));

  const refreshUsers = useCallback(async () => {
    const data = await fetchUsers();
    setUsers(data);
    bsSet('users', data, TTL_USERS);
  }, []);

  const refreshChatConfig = useCallback(async () => {
    const data = await fetchChatConfig();
    if (data) {
      setChatConfig(data);
      bsSet('chat-config', data, TTL_CHAT_CONFIG);
    }
  }, []);

  const setPreference = useCallback(async (key: string, value: string) => {
    setPreferences(prev => {
      const next = { ...prev, [key]: value };
      bsSet('preferences', next, TTL_PREFS);
      return next;
    });
    await fetch('/api/v1/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
  }, []);

  // Background revalidation on mount
  useEffect(() => {
    refreshUsers();

    fetchPreferences().then(data => {
      setPreferences(data);
      bsSet('preferences', data, TTL_PREFS);
    });

    refreshChatConfig();

    fetchCurrentUser().then(data => {
      if (data) {
        setCurrentUser(data);
        bsSet('current-user', data, TTL_CURRENT_USER);
      }
    });
  }, [refreshUsers, refreshChatConfig]);

  return (
    <AppDataContext.Provider value={{ users, preferences, chatConfig, currentUser, setPreference, refreshUsers, refreshChatConfig }}>
      {children}
    </AppDataContext.Provider>
  );
}
