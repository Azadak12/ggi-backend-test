import { useEffect, useRef, useState } from 'react';
import { useUsers } from '../context/UserContext';
import type { User } from '../lib/types';
import { ChevronDownIcon, PlusIcon, UserIcon } from './icons';
import { Badge, Button } from './ui';

export function UserSwitcher() {
  const { users, currentUser, selectUser, verifyPassword, createUser } = useUsers();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function closeAll() {
    setOpen(false);
    setCreating(false);
    setPendingUser(null);
    setPassword('');
    setPasswordError(null);
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) closeAll();
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function handlePick(u: User) {
    if (u.id === currentUser?.id) {
      closeAll();
      return;
    }
    if (u.hasPassword) {
      setPendingUser(u);
      setPassword('');
      setPasswordError(null);
      return;
    }
    selectUser(u.id);
    closeAll();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingUser) return;
    setPasswordError(null);
    setVerifying(true);
    try {
      await verifyPassword(pendingUser.id, password);
      selectUser(pendingUser.id);
      closeAll();
    } catch {
      setPasswordError('Incorrect password.');
    } finally {
      setVerifying(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await createUser(name.trim(), email.trim());
      setName('');
      setEmail('');
      setCreating(false);
      setOpen(false);
    } catch {
      setError('Could not create user — check the email is valid and unique.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          <UserIcon className="h-3.5 w-3.5" />
        </span>
        {currentUser ? currentUser.name : 'Select user'}
        {currentUser?.role === 'ADMIN' && <Badge tone="violet">ADMIN</Badge>}
        <ChevronDownIcon className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {pendingUser ? (
            <form onSubmit={handleVerify} className="space-y-2 p-2">
              <p className="px-1 text-sm text-slate-600">
                Enter the password for <span className="font-medium">{pendingUser.name}</span>
              </p>
              <input
                autoFocus
                required
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
              />
              {passwordError && <p className="text-xs text-rose-500">{passwordError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="px-2.5 py-1 text-xs"
                  onClick={() => setPendingUser(null)}
                >
                  Back
                </Button>
                <Button type="submit" disabled={verifying} className="px-2.5 py-1 text-xs">
                  {verifying ? 'Checking…' : 'Switch'}
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="max-h-56 overflow-y-auto">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handlePick(u)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                      u.id === currentUser?.id ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <span>
                      <span className="block font-medium text-slate-800">{u.name}</span>
                      <span className="block text-xs text-slate-400">{u.email}</span>
                    </span>
                    {u.role === 'ADMIN' && <Badge tone="violet">ADMIN</Badge>}
                  </button>
                ))}
                {users.length === 0 && (
                  <p className="px-3 py-2 text-sm text-slate-400">No users yet.</p>
                )}
              </div>

              <div className="mt-1 border-t border-slate-100 pt-1.5">
                {!creating ? (
                  <button
                    onClick={() => setCreating(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                  >
                    <PlusIcon className="h-4 w-4" /> New user
                  </button>
                ) : (
                  <form onSubmit={handleCreate} className="space-y-2 p-2">
                    <input
                      autoFocus
                      required
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
                    />
                    <input
                      required
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
                    />
                    {error && <p className="text-xs text-rose-500">{error}</p>}
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2.5 py-1 text-xs"
                        onClick={() => setCreating(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving} className="px-2.5 py-1 text-xs">
                        {saving ? 'Creating…' : 'Create'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
