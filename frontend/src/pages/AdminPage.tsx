import { useEffect, useState } from 'react';
import { useUsers } from '../context/UserContext';
import { api } from '../lib/api';
import type {
  AdminOverview,
  AdminUserRow,
  BillingCycle,
  BillingHistoryEntry,
  BundleTier,
  SubscriptionBundle,
} from '../lib/types';
import { Badge, Button, Card, ProgressBar, Spinner } from '../components/ui';
import { PlusIcon, RefreshIcon } from '../components/icons';
import { AddUserModal } from '../components/admin/AddUserModal';
import { CreateBundleModal } from '../components/subscriptions/CreateBundleModal';

const TIER_TONE = { BASIC: 'indigo', PRO: 'violet', ENTERPRISE: 'amber' } as const;
const STATUS_TONE = { ACTIVE: 'green', INACTIVE: 'red', EXPIRED: 'slate' } as const;
const EVENT_TONE = {
  CREATED: 'indigo',
  RENEWAL_SUCCESS: 'green',
  RENEWAL_FAILED: 'red',
  CANCELLED: 'amber',
  EXPIRED: 'slate',
} as const;

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-slate-800">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </Card>
  );
}

export function AdminPage() {
  const { currentUser } = useUsers();
  const userId = currentUser!.id;

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionBundle[]>([]);
  const [history, setHistory] = useState<BillingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningBilling, setRunningBilling] = useState(false);
  const [billingNote, setBillingNote] = useState<string | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [assignPlanUser, setAssignPlanUser] = useState<AdminUserRow | null>(null);
  const [busyBundleId, setBusyBundleId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const [overviewData, usersData, subsData, historyData] = await Promise.all([
      api.get<AdminOverview>(`/admin/overview?userId=${userId}`),
      api.get<AdminUserRow[]>(`/admin/users?userId=${userId}`),
      api.get<SubscriptionBundle[]>(`/admin/subscriptions?userId=${userId}`),
      api.get<BillingHistoryEntry[]>(`/admin/billing-history?userId=${userId}`),
    ]);
    setOverview(overviewData);
    setUsers(usersData);
    setSubscriptions(subsData);
    setHistory(historyData);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleRunBilling() {
    setRunningBilling(true);
    setBillingNote(null);
    try {
      const result = await api.post<{
        processed: number;
        renewed: number;
        paymentFailed: number;
        expired: number;
      }>(`/subscriptions/billing/run?userId=${userId}`);
      setBillingNote(
        result.processed === 0
          ? 'No bundles were due for billing.'
          : `Processed ${result.processed}: ${result.renewed} renewed, ${result.paymentFailed} payment failed, ${result.expired} expired.`,
      );
      await loadAll();
    } finally {
      setRunningBilling(false);
    }
  }

  async function handleAddUser(name: string, email: string) {
    await api.post('/users', { name, email });
    await loadAll();
  }

  async function handleAssignPlan(
    tier: BundleTier,
    billingCycle: BillingCycle,
    autoRenew: boolean,
  ) {
    if (!assignPlanUser) return;
    await api.post('/subscriptions', { userId: assignPlanUser.id, tier, billingCycle, autoRenew });
    await loadAll();
  }

  async function handleCancelBundle(id: string) {
    setBusyBundleId(id);
    try {
      await api.patch(`/subscriptions/${id}/cancel`);
      await loadAll();
    } finally {
      setBusyBundleId(null);
    }
  }

  if (loading || !overview) {
    return (
      <div className="flex justify-center py-16 text-slate-400">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const tierEntries = Object.entries(overview.subscriptionsByTier) as [BundleTier, number][];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Admin dashboard</h1>
          <p className="text-sm text-slate-500">Platform-wide usage, subscriptions, and billing.</p>
        </div>
        <Button variant="secondary" onClick={handleRunBilling} disabled={runningBilling}>
          {runningBilling ? <Spinner className="h-4 w-4" /> : <RefreshIcon className="h-4 w-4" />}
          Run billing cycle
        </Button>
      </div>

      {billingNote && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-sm text-indigo-800">
          {billingNote}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={String(overview.totalUsers)} />
        <StatCard
          label="Active subscriptions"
          value={String(overview.activeSubscriptions)}
          sub={tierEntries.map(([tier, count]) => `${tier} ${count}`).join(' · ') || 'None yet'}
        />
        <StatCard label="Total revenue" value={`$${overview.totalRevenue.toFixed(2)}`} />
        <StatCard
          label="Messages this month"
          value={String(overview.messagesThisMonth)}
          sub={`${overview.messagesTotal} all-time`}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Users</h2>
          <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAddUserOpen(true)}>
            <PlusIcon className="h-3.5 w-3.5" /> Add user
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Free msgs (mo)</th>
                <th className="px-4 py-2 font-medium">Active bundles</th>
                <th className="px-4 py-2 font-medium">Total msgs</th>
                <th className="px-4 py-2 font-medium">Joined</th>
                <th className="px-4 py-2 font-medium">Plan</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{u.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={u.role === 'ADMIN' ? 'violet' : 'slate'}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-slate-600">{u.freeMessagesUsedThisMonth}/3</span>
                      <div className="w-16">
                        <ProgressBar value={u.freeMessagesUsedThisMonth} max={3} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{u.activeBundles}</td>
                  <td className="px-4 py-2.5 text-slate-600">{u.totalMessages}</td>
                  <td className="px-4 py-2.5 text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <Button
                      variant="secondary"
                      className="px-2.5 py-1 text-xs"
                      onClick={() => setAssignPlanUser(u)}
                    >
                      Assign plan
                    </Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">All subscriptions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Tier</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Cycle</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 font-medium">Auto-renew</th>
                <th className="px-4 py-2 font-medium">Renews / ended</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2.5 text-slate-600">
                    {users.find((u) => u.id === s.userId)?.email ?? s.userId}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={TIER_TONE[s.tier]}>{s.tier}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{s.billingCycle}</td>
                  <td className="px-4 py-2.5 text-slate-600">${s.price}</td>
                  <td className="px-4 py-2.5 text-slate-500">{s.autoRenew ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2.5 text-slate-400">
                    {new Date(s.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5">
                    {s.status === 'ACTIVE' && !s.cancelledAt && (
                      <Button
                        variant="danger"
                        className="px-2.5 py-1 text-xs"
                        disabled={busyBundleId === s.id}
                        onClick={() => handleCancelBundle(s.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                    No subscriptions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Billing history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-medium">Event</th>
                <th className="px-4 py-2 font-medium">Note</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2.5">
                    <Badge tone={EVENT_TONE[h.event]}>{h.event.replaceAll('_', ' ')}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{h.note}</td>
                  <td className="px-4 py-2.5 text-slate-700">{h.amount ? `$${h.amount}` : '—'}</td>
                  <td className="px-4 py-2.5 text-slate-400">
                    {new Date(h.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No billing events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {addUserOpen && (
        <AddUserModal onClose={() => setAddUserOpen(false)} onCreate={handleAddUser} />
      )}

      {assignPlanUser && (
        <CreateBundleModal
          title={`Assign plan to ${assignPlanUser.name}`}
          onClose={() => setAssignPlanUser(null)}
          onCreate={handleAssignPlan}
        />
      )}
    </div>
  );
}
