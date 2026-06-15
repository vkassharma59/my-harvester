import { SubscriptionStatus } from '@wh/shared';
import { Badge } from './ui';

const MAP: Record<SubscriptionStatus, { tone: 'green' | 'amber' | 'red' | 'slate'; label: string }> = {
  [SubscriptionStatus.ACTIVE]: { tone: 'green', label: 'Active' },
  [SubscriptionStatus.TRIAL]: { tone: 'amber', label: 'Trial' },
  [SubscriptionStatus.EXPIRED]: { tone: 'red', label: 'Expired' },
  [SubscriptionStatus.SUSPENDED]: { tone: 'slate', label: 'Suspended' },
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const { tone, label } = MAP[status] ?? { tone: 'slate' as const, label: status };
  return <Badge tone={tone}>{label}</Badge>;
}
