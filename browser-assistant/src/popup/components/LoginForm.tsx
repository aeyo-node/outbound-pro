import React, { useState } from 'react';
import type { PlainCredentials } from '@/types/protocol';

interface Props {
  initial: PlainCredentials | null;
  onSave: (c: PlainCredentials) => void;
  onCancel: () => void;
  editing: boolean;
}

const EMPTY: PlainCredentials = {
  dashboardUrl: 'http://localhost:3000',
  email: '',
  password: '',
  wsUrl: 'ws://localhost:8000/swaram/ws',
  backendToken: '',
  tenantId: '',
};

export function LoginForm({ initial, onSave, onCancel, editing }: Props) {
  const [form, setForm] = useState<PlainCredentials>(initial ?? EMPTY);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof PlainCredentials, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dashboardUrl || !form.email || !form.password || !form.wsUrl) return;
    setSaving(true);
    try {
      onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="text-xs text-white/60">
        {editing ? 'Update your dashboard connection.' : 'Connect the extension to your Swaram dashboard.'}
        <br />
        Credentials are encrypted at rest with AES-GCM.
      </div>

      <div>
        <label className="sw-label">Swaram Dashboard URL</label>
        <input
          className="sw-input"
          value={form.dashboardUrl}
          onChange={(e) => set('dashboardUrl', e.target.value)}
          placeholder="https://app.swaram.io"
        />
      </div>

      <div>
        <label className="sw-label">Email</label>
        <input
          className="sw-input"
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="admin@swaram.io"
        />
      </div>

      <div>
        <label className="sw-label">Password</label>
        <div className="relative">
          <input
            className="sw-input pr-16"
            type={showPass ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder="••••••••"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/50 hover:text-white"
            onClick={() => setShowPass((s) => !s)}
          >
            {showPass ? 'hide' : 'show'}
          </button>
        </div>
      </div>

      <div className="border-t border-white/10 pt-2">
        <label className="sw-label">Backend WebSocket URL</label>
        <input
          className="sw-input"
          value={form.wsUrl}
          onChange={(e) => set('wsUrl', e.target.value)}
          placeholder="ws://localhost:8000/swaram/ws"
        />
      </div>

      <div>
        <label className="sw-label">Tenant / Extension ID (optional)</label>
        <input
          className="sw-input"
          value={form.tenantId}
          onChange={(e) => set('tenantId', e.target.value)}
          placeholder="e.g. tenant_42 — lets the backend target this extension"
        />
      </div>

      <div>
        <label className="sw-label">Backend Auth Token</label>
        <input
          className="sw-input"
          value={form.backendToken}
          onChange={(e) => set('backendToken', e.target.value)}
          placeholder="extension auth token"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="sw-btn-primary flex-1" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Update & Reconnect' : 'Save & Login'}
        </button>
        {editing && (
          <button type="button" className="sw-btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
