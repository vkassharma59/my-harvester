import { useState, type FormEvent } from 'react';
import { ApiError, onboardOwner, type OnboardInput } from '../lib/api';
import { Modal } from './Modal';
import { Button, Field, Input } from './ui';

export function CreateOwnerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<OnboardInput>({ name: '', email: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);

  const set = (k: keyof OnboardInput) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload: OnboardInput = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || undefined,
        businessName: form.businessName?.trim() || undefined,
        region: form.region?.trim() || undefined,
        machineNumber: form.machineNumber?.trim() || undefined,
        soldBy: form.soldBy?.trim() || undefined,
      };
      const res = await onboardOwner(payload);
      setResult({ email: res.owner.email, password: res.password });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create owner');
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <Modal title="Owner created" onClose={onCreated} footer={<Button onClick={onCreated}>Done</Button>}>
        <p className="mb-3 text-sm text-slate-600">
          Share these login details with the owner. The password is shown <strong>only once</strong>.
        </p>
        <Cred label="Email" value={result.email} />
        <Cred label="Password" value={result.password} />
      </Modal>
    );
  }

  return (
    <Modal title="Add owner" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Owner name *">
          <Input value={form.name} onChange={set('name')} autoFocus required />
        </Field>
        <Field label="Email *">
          <Input type="email" value={form.email} onChange={set('email')} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mobile">
            <Input value={form.phone ?? ''} onChange={set('phone')} />
          </Field>
          <Field label="Business name">
            <Input value={form.businessName ?? ''} onChange={set('businessName')} placeholder="defaults to name" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Region / mandi">
            <Input value={form.region ?? ''} onChange={set('region')} />
          </Field>
          <Field label="Machine number">
            <Input value={form.machineNumber ?? ''} onChange={set('machineNumber')} />
          </Field>
        </div>
        <Field label="Sold by (reseller)">
          <Input value={form.soldBy ?? ''} onChange={set('soldBy')} />
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !form.name || !form.email}>
            {busy ? 'Creating…' : 'Create owner'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Cred({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="mb-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="font-mono text-sm text-slate-800">{value}</div>
      </div>
      <Button size="sm" variant="outline" onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}
