import { useState, type FormEvent } from 'react';
import { INDIAN_STATES, districtsForState } from '@wh/shared';
import { ApiError, onboardOwner, type OnboardInput } from '../lib/api';
import { Combobox } from './Combobox';
import { Modal } from './Modal';
import { Button, Field, Input } from './ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PWD_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generatePassword(len = 10): string {
  const a = new Uint32Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => PWD_ALPHABET[n % PWD_ALPHABET.length]).join('');
}

export function CreateOwnerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', state: '', district: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string; emailed: boolean } | null>(null);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Enter the owner name.';
    if (!EMAIL_RE.test(form.email.trim())) return 'Enter a valid email address.';
    if (!/^\d{10}$/.test(form.phone.trim())) return 'Enter a valid 10-digit mobile number.';
    if (!form.state) return 'Select the state.';
    if (!form.district) return 'Select the district.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    return null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: OnboardInput = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        state: form.state,
        district: form.district,
        password: form.password,
      };
      const res = await onboardOwner(payload);
      setResult({ email: res.owner.email, password: res.password, emailed: res.emailed });
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
          {result.emailed ? (
            <>The login details were emailed to <strong>{result.email}</strong>.</>
          ) : (
            <>Email isn’t configured — share these login details with the owner (shown once):</>
          )}
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
          <Input value={form.name} onChange={set('name')} autoFocus />
        </Field>
        <Field label="Email *">
          <Input type="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Mobile (10 digits) *">
          <Input value={form.phone} onChange={set('phone')} inputMode="numeric" maxLength={10} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="State *">
            <Combobox
              value={form.state}
              options={INDIAN_STATES}
              placeholder="Select state"
              // changing state invalidates the chosen district
              onChange={(state) => setForm((f) => ({ ...f, state, district: '' }))}
            />
          </Field>
          <Field label="District *">
            <Combobox
              value={form.district}
              options={districtsForState(form.state)}
              placeholder={form.state ? 'Select district' : 'Select a state first'}
              disabled={!form.state}
              emptyText="No districts"
              onChange={(district) => setForm((f) => ({ ...f, district }))}
            />
          </Field>
        </div>
        <Field label="Password *">
          <div className="flex gap-2">
            <Input value={form.password} onChange={set('password')} className="font-mono" />
            <Button type="button" variant="outline" onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}>
              Generate
            </Button>
          </div>
        </Field>
        <p className="text-xs text-slate-500">The password is emailed to the owner (and shown here once).</p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
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
