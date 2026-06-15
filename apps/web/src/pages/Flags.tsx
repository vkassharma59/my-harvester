import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { AbuseSignal } from '@wh/shared';
import { getFlags } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardHeader, Spinner } from '../components/ui';
import { fmtDate } from '../lib/format';

const SIGNAL_LABEL: Record<AbuseSignal, string> = {
  machineNumber: 'Same machine number',
  verifiedPhone: 'Same verified phone',
  loginPhone: 'Same login mobile',
};

export function Flags() {
  const { data, isLoading, error } = useQuery({ queryKey: ['flags'], queryFn: getFlags });

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Abuse flags</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Tenants sharing a signal that suggests the same business re-claiming a free trial. Review before
        granting or keeping a trial.
      </p>

      {isLoading && <Spinner />}
      {error && <p className="text-sm text-red-600">Failed to load flags.</p>}
      {data && data.length === 0 && (
        <Card className="p-8 text-center text-sm text-slate-500">No duplicate signals found. 🎉</Card>
      )}
      {data && data.length > 0 && (
        <div className="space-y-4">
          {data.map((group, i) => (
            <Card key={`${group.signal}-${group.value}-${i}`}>
              <CardHeader
                title={SIGNAL_LABEL[group.signal]}
                subtitle={`${group.value} · ${group.tenants.length} accounts`}
              />
              <table className="w-full text-sm">
                <tbody>
                  {group.tenants.map((t) => (
                    <tr key={t.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-2.5">
                        <Link to={`/owners/${t.id}`} className="font-medium text-brand-700 hover:underline">
                          {t.businessName}
                        </Link>
                        <span className="text-slate-500"> · {t.name} · {t.email}</span>
                      </td>
                      <td className="px-5 py-2.5">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-5 py-2.5 text-right text-slate-500">joined {fmtDate(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
