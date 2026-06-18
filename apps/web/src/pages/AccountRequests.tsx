import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AccountRequestStatus, type AccountRequestItem } from '@wh/shared';
import { approveAccountRequest, getAccountRequests, rejectAccountRequest } from '../lib/api';
import { Badge, Button, Card, Spinner } from '../components/ui';
import { fmtDate } from '../lib/format';

const STATUS_TONE: Record<AccountRequestStatus, 'amber' | 'green' | 'red'> = {
  [AccountRequestStatus.PENDING]: 'amber',
  [AccountRequestStatus.APPROVED]: 'green',
  [AccountRequestStatus.REJECTED]: 'red',
};

export function AccountRequests() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ['account-requests'], queryFn: getAccountRequests });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['account-requests'] });
    qc.invalidateQueries({ queryKey: ['owners'] });
    qc.invalidateQueries({ queryKey: ['overview'] });
  };

  const approve = useMutation({
    mutationFn: approveAccountRequest,
    onSuccess: (owner) => {
      invalidate();
      navigate(`/owners/${owner.id}`);
    },
  });
  const reject = useMutation({ mutationFn: rejectAccountRequest, onSuccess: invalidate });

  const pending = data?.filter((r) => r.status === AccountRequestStatus.PENDING) ?? [];
  const processed = data?.filter((r) => r.status !== AccountRequestStatus.PENDING) ?? [];

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Account requests</h1>
      <p className="mb-6 text-sm text-slate-500">Owners who signed up from the app. Approving creates their account.</p>

      {isLoading && <Spinner />}
      {error && <p className="text-sm text-red-600">Failed to load requests.</p>}

      {data && (
        <div className="space-y-6">
          <Section title={`Pending (${pending.length})`}>
            {pending.length === 0 ? (
              <Empty label="No pending requests." />
            ) : (
              pending.map((r) => (
                <Row key={r.id} r={r}>
                  <Button
                    size="sm"
                    onClick={() => approve.mutate(r.id)}
                    disabled={approve.isPending || reject.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reject.mutate(r.id)}
                    disabled={approve.isPending || reject.isPending}
                  >
                    Reject
                  </Button>
                </Row>
              ))
            )}
          </Section>

          {processed.length > 0 && (
            <Section title={`Processed (${processed.length})`}>
              {processed.map((r) => (
                <Row key={r.id} r={r}>
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                </Row>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-slate-700">{title}</h2>
      <Card className="divide-y divide-slate-50">{children}</Card>
    </div>
  );
}

function Row({ r, children }: { r: AccountRequestItem; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <div>
        <div className="font-medium text-slate-800">{r.fullName}</div>
        <div className="text-xs text-slate-500">
          {r.email} · {r.mobile} · {r.harvesterCount} harvester(s)
          {r.district || r.state ? ` · ${[r.district, r.state].filter(Boolean).join(', ')}` : ''} ·{' '}
          {fmtDate(r.createdAt)}
        </div>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="px-5 py-6 text-sm text-slate-500">{label}</p>;
}
