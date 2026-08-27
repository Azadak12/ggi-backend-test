import type { SubscriptionBundle } from '../../lib/types';
import { Badge, Button, Card, ProgressBar } from '../ui';

const TIER_TONE = { BASIC: 'indigo', PRO: 'violet', ENTERPRISE: 'amber' } as const;
const STATUS_TONE = { ACTIVE: 'green', INACTIVE: 'red', EXPIRED: 'slate' } as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  bundle: SubscriptionBundle;
  onCancel: (id: string) => void;
  onToggleAutoRenew: (id: string, autoRenew: boolean) => void;
  busy: boolean;
}

export function BundleCard({ bundle, onCancel, onToggleAutoRenew, busy }: Props) {
  const isUnlimited = bundle.maxMessages === null;
  const canCancel = !bundle.cancelledAt && bundle.status === 'ACTIVE';

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={TIER_TONE[bundle.tier]}>{bundle.tier}</Badge>
            <Badge tone={STATUS_TONE[bundle.status]}>{bundle.status}</Badge>
          </div>
          <p className="mt-1.5 text-lg font-semibold text-slate-800">
            ${bundle.price}
            <span className="text-xs font-normal text-slate-400">
              /{bundle.billingCycle === 'MONTHLY' ? 'mo' : 'yr'}
            </span>
          </p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Responses left</span>
          <span className="font-medium text-slate-700">
            {isUnlimited ? 'Unlimited' : `${bundle.remainingMessages}/${bundle.maxMessages}`}
          </span>
        </div>
        {!isUnlimited && (
          <div className="mt-1.5">
            <ProgressBar value={bundle.remainingMessages ?? 0} max={bundle.maxMessages ?? 1} />
          </div>
        )}
      </div>

      <div className="space-y-1 text-xs text-slate-500">
        <div className="flex justify-between">
          <span>{bundle.status === 'ACTIVE' ? 'Renews' : 'Ended'}</span>
          <span className="text-slate-700">{fmtDate(bundle.endDate)}</span>
        </div>
        {bundle.cancelledAt && (
          <div className="flex justify-between">
            <span>Cancelled</span>
            <span className="text-slate-700">{fmtDate(bundle.cancelledAt)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={bundle.autoRenew}
            disabled={busy || bundle.status !== 'ACTIVE'}
            onChange={(e) => onToggleAutoRenew(bundle.id, e.target.checked)}
            className="h-3.5 w-3.5 accent-indigo-600"
          />
          Auto-renew
        </label>
        {canCancel && (
          <Button
            variant="danger"
            className="px-2.5 py-1 text-xs"
            disabled={busy}
            onClick={() => onCancel(bundle.id)}
          >
            Cancel plan
          </Button>
        )}
      </div>
    </Card>
  );
}
