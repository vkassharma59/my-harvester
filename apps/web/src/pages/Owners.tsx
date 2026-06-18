import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SubscriptionStatus } from '@wh/shared';
import { listOwners } from '../lib/api';
import { CreateOwnerModal } from '../components/CreateOwnerModal';
import { StatusBadge } from '../components/StatusBadge';
import { Button, Card, Input, Select, Spinner } from '../components/ui';
import { renewLabel } from '../lib/format';

const PAGE_SIZE = 20;

export function Owners() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') || '1');
  const search = params.get('search') || '';
  const status = (params.get('status') || '') as SubscriptionStatus | '';

  const [searchInput, setSearchInput] = useState(search);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['owners', { page, search, status }],
    queryFn: () =>
      listOwners({ page, pageSize: PAGE_SIZE, search: search || undefined, status: status || undefined }),
  });

  const setParam = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next);
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    setParam({ search: searchInput || undefined, page: undefined });
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Owners</h1>
        <Button onClick={() => setShowCreate(true)}>+ Add owner</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form onSubmit={submitSearch} className="flex gap-2">
          <Input
            placeholder="Search business, region, owner…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-72"
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
        <Select value={status} onChange={(e) => setParam({ status: e.target.value || undefined, page: undefined })}>
          <option value="">All statuses</option>
          {Object.values(SubscriptionStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        {isLoading && <Spinner />}
        {error && <p className="px-5 py-6 text-sm text-red-600">Failed to load owners.</p>}
        {data && (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Business / Owner</th>
                  <th className="px-5 py-3 font-medium">District</th>
                  <th className="px-5 py-3 font-medium">State</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Renews</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/owners/${o.id}`)}
                    className="cursor-pointer border-b border-slate-50 hover:bg-slate-50"
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{o.businessName}</div>
                      <div className="text-xs text-slate-500">
                        {o.name} · {o.email}
                        {o.region ? ` · ${o.region}` : ''}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{o.district || '—'}</td>
                    <td className="px-5 py-3 text-slate-600">{o.state || '—'}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-600">{renewLabel(o.daysRemaining)}</td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                      No owners found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
              <span>
                {data.total} owner{data.total === 1 ? '' : 's'} · page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setParam({ page: String(page - 1) })}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setParam({ page: String(page + 1) })}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {showCreate && (
        <CreateOwnerModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
