import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BugStatus, type BugReportItem } from '@wh/shared';
import { getBugReports, setBugStatus } from '../lib/api';
import { Badge, Button, Card, Spinner } from '../components/ui';
import { fmtDateTime } from '../lib/format';

export function BugReports() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['bug-reports'], queryFn: getBugReports });

  const mutate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BugStatus }) => setBugStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bug-reports'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });

  const open = data?.filter((b) => b.status === BugStatus.OPEN) ?? [];
  const resolved = data?.filter((b) => b.status === BugStatus.RESOLVED) ?? [];

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Bug reports</h1>
      <p className="mb-6 text-sm text-slate-500">Issues reported from the mobile app.</p>

      {isLoading && <Spinner />}
      {error && <p className="text-sm text-red-600">Failed to load bug reports.</p>}

      {data && (
        <div className="space-y-6">
          <Section title={`Open (${open.length})`}>
            {open.length === 0 ? (
              <p className="text-sm text-slate-500">No open bugs. 🎉</p>
            ) : (
              open.map((b) => (
                <BugCard
                  key={b.id}
                  bug={b}
                  busy={mutate.isPending}
                  onResolve={() => mutate.mutate({ id: b.id, status: BugStatus.RESOLVED })}
                />
              ))
            )}
          </Section>

          {resolved.length > 0 && (
            <Section title={`Resolved (${resolved.length})`}>
              {resolved.map((b) => (
                <BugCard
                  key={b.id}
                  bug={b}
                  busy={mutate.isPending}
                  onReopen={() => mutate.mutate({ id: b.id, status: BugStatus.OPEN })}
                />
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
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function BugCard({
  bug,
  busy,
  onResolve,
  onReopen,
}: {
  bug: BugReportItem;
  busy: boolean;
  onResolve?: () => void;
  onReopen?: () => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-slate-800">{bug.title}</h3>
            <Badge tone={bug.status === BugStatus.OPEN ? 'amber' : 'green'}>{bug.status}</Badge>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{bug.description}</p>
          <p className="mt-2 text-xs text-slate-400">
            {bug.reporterName} · {bug.businessName} · {fmtDateTime(bug.createdAt)}
          </p>
          {bug.screenshotUrl && (
            <a
              href={bug.screenshotUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline"
            >
              📎 View screenshot
            </a>
          )}
        </div>
        <div className="shrink-0">
          {onResolve && (
            <Button size="sm" onClick={onResolve} disabled={busy}>
              Mark resolved
            </Button>
          )}
          {onReopen && (
            <Button size="sm" variant="outline" onClick={onReopen} disabled={busy}>
              Reopen
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
