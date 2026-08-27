import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { User } from '../lib/types';

interface UserContextValue {
  users: User[];
  currentUser: User | null;
  loading: boolean;
  selectUser: (id: string) => void;
  verifyPassword: (id: string, password: string) => Promise<void>;
  createUser: (name: string, email: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

const STORAGE_KEY = 'ggi.currentUserId';

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  );
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const list = await api.get<User[]>('/users');
    setUsers(list);
    setCurrentUserId((prev) => {
      if (prev) return prev;
      // Never auto-select a password-protected account (e.g. admin) as the
      // default identity for a first-time visitor — that must be an
      // explicit, password-verified choice.
      return list.find((u) => !u.hasPassword)?.id ?? null;
    });
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentUserId) localStorage.setItem(STORAGE_KEY, currentUserId);
  }, [currentUserId]);

  const selectUser = (id: string) => setCurrentUserId(id);

  const verifyPassword = async (id: string, password: string) => {
    await api.post(`/users/${id}/verify-password`, { password });
  };

  const createUser = async (name: string, email: string) => {
    const user = await api.post<User>('/users', { name, email });
    setUsers((prev) => [...prev, user]);
    setCurrentUserId(user.id);
  };

  const currentUser = users.find((u) => u.id === currentUserId) ?? null;

  return (
    <UserContext.Provider
      value={{ users, currentUser, loading, selectUser, verifyPassword, createUser, refresh }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUsers() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUsers must be used within UserProvider');
  return ctx;
}
