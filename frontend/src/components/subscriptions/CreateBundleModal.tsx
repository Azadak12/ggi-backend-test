import { useState } from 'react';
import type { BillingCycle, BundleTier } from '../../lib/types';
import { Button } from '../ui';
import { XIcon } from '../icons';

const TIERS: { value: BundleTier; label: string; blurb: string; monthly: string; yearly: string }[] = [
  { value: 'BASIC', label: 'Basic', blurb: '10 responses', monthly: '$9.99/mo', yearly: '$99.99/yr' },
  { value: 'PRO', label: 'Pro', blurb: '100 responses', monthly: '$29.99/mo', yearly: '$299.99/yr' },
  {
    value: 'ENTERPRISE',
    label: 'Enterprise',
    blurb: 'Unlimited responses',
    monthly: '$99.99/mo',
    yearly: '$999.99/yr',
  },
];

interface Props {
  onClose: () => void;
  onCreate: (tier: BundleTier, billingCycle: BillingCycle, autoRenew: boolean) => Promise<void>;
  title?: string;
}

export function CreateBundleModal({ onClose, onCreate, title = 'New subscription bundle' }: Props) {
  const [tier, setTier] = useState<BundleTier>('BASIC');
  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY');
  const [autoRenew, setAutoRenew] = useState(true);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreate(tier, cycle, autoRenew);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Tier</label>
            <div className="grid grid-cols-1 gap-2">
              {TIERS.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setTier(t.value)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition ${
                    tier === t.value
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{t.label}</span>
                    <span className="block text-xs text-slate-500">{t.blurb}</span>
                  </span>
                  <span className="text-xs font-medium text-slate-600">
                    {cycle === 'MONTHLY' ? t.monthly : t.yearly}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Billing cycle</label>
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              {(['MONTHLY', 'YEARLY'] as BillingCycle[]).map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCycle(c)}
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
                    cycle === c ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {c === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
            <span className="text-sm text-slate-600">Auto-renew</span>
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create bundle'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
