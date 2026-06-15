import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getOverview } from '../lib/api';
import { Card, Spinner, Stat } from '../components/ui';
import { inr } from '../lib/format';

export function Overview() {
  const { data, isLoading, error } = useQuery({ queryKey: ['overview'], queryFn: getOverview });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Overview</h1>
      {isLoading && <Spinner />}
      {error && <p className="text-sm text-red-600">Failed to load overview.</p>}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Total owners" value={data.owners.total} hint={`${data.owners.newThisMonth} new this month`} />
            <Stat
              label="Active"
              value={data.owners.active}
              hint={`${data.owners.dormant} dormant (30d+ idle)`}
            />
            <Stat
              label="Trials expiring"
              value={data.trials.expiringIn7Days}
              hint={`${data.trials.expiringIn30Days} within 30 days`}
            />
            <Stat label="Platform volume" value={inr(data.platformVolume)} hint="Across all tenants" />
          </div>

          {(data.trials.expiringIn30Days > 0 || data.pendingAccountRequests > 0) && (
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Needs attention</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                {data.trials.expiringIn30Days > 0 && (
                  <li>
                    ⏳ {data.trials.expiringIn30Days} trial(s) expiring within 30 days —{' '}
                    <Link to="/owners?status=TRIAL" className="font-medium text-brand-700 hover:underline">
                      review owners
                    </Link>
                  </li>
                )}
                {data.pendingAccountRequests > 0 && (
                  <li>📨 {data.pendingAccountRequests} pending account request(s)</li>
                )}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
