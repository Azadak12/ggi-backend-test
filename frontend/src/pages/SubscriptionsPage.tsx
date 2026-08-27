import { useEffect, useState } from 'react';
import { useUsers } from '../context/UserContext';
import { api } from '../lib/api';
import type {
  BillingCycle,
  BillingHistoryEntry,
  BundleTier,
  SubscriptionBundle,
} from '../lib/types';
import { Badge, Button, Card, Spinner } from '../components/ui';
import { PlusIcon } from '../components/icons';
import { BundleCard } from '../components/subscriptions/BundleCard';
import { CreateBundleModal } from '../components/subscriptions/CreateBundleModal';

const EVENT_TONE = {
  CREATED: 'indigo',
  RENEWAL_SUCCESS: 'green',
  RENEWAL_FAILED: 'red',
  CANCELLED: 'amber',
  EXPIRED: 'slate',
} as const;

const EVENT_LABEL = {
  CREATED: 'Created',
  RENEWAL_SUCCESS: 'Renewed',
  RENEWAL_FAILED: 'Payment failed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
} as const;

export function SubscriptionsPage() {
  const { currentUser } = useUsers();
  const userId = currentUser!.id;

  const [bundles, setBundles] = useState<SubscriptionBundle[]>([]);
  const [history, setHistory] = useState<BillingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const [bundleList, historyList] = await Promise.all([
      api.get<SubscriptionBundle[]>(`/subscriptions?userId=${userId}`),
      api.get<BillingHistoryEntry[]>(`/subscriptions/history?userId=${userId}`),
    ]);
    setBundles(bundleList);
    setHistory(historyList);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleCreate(tier: BundleTier, billingCycle: BillingCycle, autoRenew: boolean) {
    await api.post('/subscriptions', { userId, tier, billingCycle, autoRenew });
    await loadAll();
  }

  async function handleCancel(id: string) {
    setBusyId(id);
    try {
      await api.patch(`/subscriptions/${id}/cancel`);
      await loadAll();
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleAutoRenew(id: string, autoRenew: boolean) {
    setBusyId(id);
    try {
      await api.patch(`/subscriptions/${id}/auto-renew`, { autoRenew });
      await loadAll();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Subscription bundles</h1>
          <p className="text-sm text-slate-500">
            Basic, Pro, and Enterprise plans with simulated auto-renew billing.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <PlusIcon className="h-4 w-4" /> New bundle
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-slate-400">
          <Spinner className="h-6 w-6" />
        </div>
      ) : bundles.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center text-slate-400">
          <p className="text-sm">No bundles yet — create one to unlock more messages.</p>
          <Button onClick={() => setModalOpen(true)} className="mt-2">
            <PlusIcon className="h-4 w-4" /> New bundle
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bundles.map((b) => (
            <BundleCard
              key={b.id}
              bundle={b}
              onCancel={handleCancel}
              onToggleAutoRenew={handleToggleAutoRenew}
              busy={busyId === b.id}
            />
          ))}
        </div>
      )}

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
                    <Badge tone={EVENT_TONE[h.event]}>{EVENT_LABEL[h.event]}</Badge>
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

      {modalOpen && (
        <CreateBundleModal onClose={() => setModalOpen(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
