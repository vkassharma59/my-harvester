import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  INDIAN_STATES,
  PaymentMethod,
  SubscriptionStatus,
  districtsForState,
  type OwnerDetail as OwnerDetailDto,
} from '@wh/shared';
import {
  extendTrial,
  getOwner,
  reactivateOwner,
  recordPayment,
  resetPassword,
  suspendOwner,
  updateOwner,
} from '../lib/api';
import { Combobox } from '../components/Combobox';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { Button, Card, CardHeader, Field, Input, Select, Spinner } from '../components/ui';
import { fmtDate, inr, renewLabel } from '../lib/format';

export function OwnerDetail() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { data: owner, isLoading, error } = useQuery({ queryKey: ['owner', id], queryFn: () => getOwner(id) });

  const [modal, setModal] = useState<'payment' | 'extend' | 'edit' | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['owner', id] });
    qc.invalidateQueries({ queryKey: ['owners'] });
    qc.invalidateQueries({ queryKey: ['overview'] });
  };

  const suspend = useMutation({ mutationFn: () => suspendOwner(id), onSuccess: invalidate });
  const reactivate = useMutation({ mutationFn: () => reactivateOwner(id), onSuccess: invalidate });
  const reset = useMutation({
    mutationFn: () => resetPassword(id),
    onSuccess: (r) => setNewPassword(r.password),
  });

  if (isLoading) return <Spinner />;
  if (error || !owner) return <p className="text-sm text-red-600">Failed to load owner.</p>;

  const suspended = owner.status === SubscriptionStatus.SUSPENDED;

  return (
    <div>
      <Link to="/owners" className="text-xs text-slate-500 hover:underline">
        ← Owners
      </Link>
      <div className="mb-6 mt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{owner.businessName}</h1>
          <StatusBadge status={owner.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Usage */}
          <Card>
            <CardHeader title="Usage" subtitle="Across this owner's data" />
            <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3">
              <Metric label="Harvesters" value={`${owner.usage.activeHarvesters}/${owner.usage.harvesters}`} />
              <Metric label="Staff users" value={owner.usage.users} />
              <Metric label="Customers" value={owner.usage.customers} />
              <Metric label="Plots" value={owner.usage.plots} />
              <Metric label="Business volume" value={inr(owner.usage.businessVolume)} />
              <Metric label="Last active" value={fmtDate(owner.usage.lastActiveAt)} />
            </div>
          </Card>

          {/* Profile */}
          <Card>
            <CardHeader
              title="Profile"
              action={
                <Button size="sm" variant="outline" onClick={() => setModal('edit')}>
                  Edit
                </Button>
              }
            />
            <dl className="divide-y divide-slate-50 text-sm">
              <Row label="Owner" value={`${owner.name} · ${owner.email}`} />
              <Row label="Mobile" value={owner.phone || '—'} />
              <Row label="State" value={owner.state || '—'} />
              <Row label="District" value={owner.district || '—'} />
              <Row label="Joined" value={fmtDate(owner.createdAt)} />
            </dl>
          </Card>

          {/* Staff users */}
          <Card>
            <CardHeader title={`Staff users (${owner.users.length})`} />
            <SimpleTable
              cols={['Name', 'Mobile', 'Active']}
              rows={owner.users.map((u) => [u.name, u.phone || '—', u.isActive ? 'Yes' : 'No'])}
              empty="No staff users."
            />
          </Card>

          {/* Payment history */}
          <Card>
            <CardHeader title={`Payments (${owner.payments.length})`} />
            <SimpleTable
              cols={['Date', 'Amount', 'Method', 'Covers until']}
              rows={owner.payments.map((p) => [fmtDate(p.paidAt), inr(p.amount), p.method, fmtDate(p.periodEnd)])}
              empty="No payments recorded."
            />
          </Card>
        </div>

        {/* Subscription / actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Subscription" />
            <dl className="divide-y divide-slate-50 text-sm">
              <Row label="Plan" value={owner.plan} />
              <Row label="Status" value={<StatusBadge status={owner.status} />} />
              <Row label="Renews" value={renewLabel(owner.daysRemaining)} />
              <Row label="Trial ends" value={fmtDate(owner.trialEndsAt)} />
              <Row label="Paid until" value={fmtDate(owner.currentPeriodEndsAt)} />
            </dl>
            <div className="space-y-2 p-4">
              <Button className="w-full" onClick={() => setModal('payment')}>
                Record payment
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setModal('extend')}>
                Extend trial
              </Button>
              {suspended ? (
                <Button variant="outline" className="w-full" onClick={() => reactivate.mutate()} disabled={reactivate.isPending}>
                  Reactivate account
                </Button>
              ) : (
                <Button variant="danger" className="w-full" onClick={() => suspend.mutate()} disabled={suspend.isPending}>
                  Suspend account
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => reset.mutate()}
                disabled={reset.isPending}
              >
                Reset password
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {modal === 'edit' && (
        <EditProfileModal owner={owner} onClose={() => setModal(null)} onDone={invalidate} />
      )}
      {modal === 'payment' && (
        <PaymentModal id={id} onClose={() => setModal(null)} onDone={invalidate} />
      )}
      {modal === 'extend' && <ExtendModal id={id} onClose={() => setModal(null)} onDone={invalidate} />}
      {newPassword && (
        <Modal title="Password reset" onClose={() => setNewPassword(null)} footer={<Button onClick={() => setNewPassword(null)}>Done</Button>}>
          <p className="mb-3 text-sm text-slate-600">New password (shown once) — share it with the owner:</p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm">{newPassword}</div>
        </Modal>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function SimpleTable({ cols, rows, empty }: { cols: string[]; rows: ReactNode[][]; empty: string }) {
  if (rows.length === 0) return <p className="px-5 py-6 text-sm text-slate-500">{empty}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
          {cols.map((c) => (
            <th key={c} className="px-5 py-2.5 font-medium">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-slate-50">
            {r.map((cell, j) => (
              <td key={j} className="px-5 py-2.5 text-slate-700">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EditProfileModal({
  owner,
  onClose,
  onDone,
}: {
  owner: OwnerDetailDto;
  onClose: () => void;
  onDone: () => void;
}) {
  const [businessName, setBusinessName] = useState(owner.businessName);
  const [state, setState] = useState(owner.state ?? '');
  const [district, setDistrict] = useState(owner.district ?? '');
  const [error, setError] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: () =>
      updateOwner(owner.id, {
        businessName: businessName.trim(),
        // Send only what's set so an empty field never clears existing data.
        state: state || undefined,
        district: district || undefined,
      }),
    onSuccess: () => {
      onDone();
      onClose();
    },
    onError: () => setError('Could not save changes. Please try again.'),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return setError('Enter the business name.');
    setError(null);
    m.mutate();
  };

  return (
    <Modal title="Edit profile" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Business name *">
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="State">
            <Combobox
              value={state}
              options={INDIAN_STATES}
              placeholder="Select state"
              // changing state invalidates the chosen district
              onChange={(s) => {
                setState(s);
                setDistrict('');
              }}
            />
          </Field>
          <Field label="District">
            <Combobox
              value={district}
              options={districtsForState(state)}
              placeholder={state ? 'Select district' : 'Select a state first'}
              disabled={!state}
              emptyText="No districts"
              onChange={setDistrict}
            />
          </Field>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={m.isPending}>
            {m.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [periodMonths, setPeriodMonths] = useState('12');
  const m = useMutation({
    mutationFn: () =>
      recordPayment(id, { amount: parseFloat(amount), method, periodMonths: parseInt(periodMonths, 10) }),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    m.mutate();
  };
  return (
    <Modal title="Record payment" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Amount (₹)">
          <Input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="w-full">
              {Object.values(PaymentMethod).map((mm) => (
                <option key={mm} value={mm}>
                  {mm}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Covers (months)">
            <Input type="number" min="1" value={periodMonths} onChange={(e) => setPeriodMonths(e.target.value)} />
          </Field>
        </div>
        {m.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">Could not record payment.</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={m.isPending || !amount}>
            {m.isPending ? 'Saving…' : 'Record & mark paid'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ExtendModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [months, setMonths] = useState('1');
  const m = useMutation({
    mutationFn: () => extendTrial(id, parseInt(months, 10)),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });
  return (
    <Modal title="Extend trial" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
        className="space-y-3"
      >
        <Field label="Extend by (months)">
          <Input type="number" min="1" value={months} onChange={(e) => setMonths(e.target.value)} autoFocus />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={m.isPending || !months}>
            {m.isPending ? 'Extending…' : 'Extend trial'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
