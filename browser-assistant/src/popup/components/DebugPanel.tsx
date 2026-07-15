import React, { useState } from 'react';
import type { ExtensionState, ToolResponse } from '@/types/protocol';
import { sendRuntimeMessage } from '@/lib/messaging';

interface Props {
  state: ExtensionState | null;
  onRefresh: () => void;
}

export function DebugPanel({ state, onRefresh }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const act = async (kind: 'login' | 'logout' | 'reconnect' | 'screenshot') => {
    setBusy(kind);
    try {
      const res = await sendRuntimeMessage<unknown, unknown>({ type: kind });
      if (kind === 'screenshot') {
        const r = res as ToolResponse<{ screenshot?: string }>;
        if (r?.data?.screenshot) setShot(r.data.screenshot);
        setLastResult(JSON.stringify(r, null, 2).slice(0, 400));
      } else {
        setLastResult(JSON.stringify(res));
      }
      await onRefresh();
    } finally {
      setBusy(null);
    }
  };

  const rows: [string, React.ReactNode][] = [
    ['Status', state ? <StatusBadge state={state} /> : '—'],
    ['WebSocket', state?.wsState ?? '—'],
    ['Logged In', state?.loggedIn ? 'Yes' : 'No'],
    ['Current URL', truncate(state?.currentUrl ?? '—', 48)],
    ['Current Page', state?.currentPage || '—'],
    ['Dashboard', truncate(state?.dashboardUrl ?? '—', 40)],
    ['Last Action', state?.lastAction ?? '—'],
    ['Last Error', state?.lastError ? <span className="text-red-400">{state.lastError}</span> : '—'],
  ];

  return (
    <div className="sw-card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/80">Status</span>
        <button className="text-[10px] text-white/40 hover:text-white" onClick={onRefresh}>
          refresh
        </button>
      </div>
      <div className="flex flex-col gap-1 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <span className="text-white/40">{k}</span>
            <span className="text-white/90 text-right truncate max-w-[230px]">{v}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2">
        <button className="sw-btn-primary text-xs" onClick={() => act('login')} disabled={busy === 'login'}>
          {busy === 'login' ? '…' : 'Relogin'}
        </button>
        <button className="sw-btn-ghost text-xs" onClick={() => act('logout')} disabled={busy === 'logout'}>
          {busy === 'logout' ? '…' : 'Logout'}
        </button>
        <button className="sw-btn-ghost text-xs" onClick={() => act('reconnect')} disabled={busy === 'reconnect'}>
          {busy === 'reconnect' ? '…' : 'Reconnect WS'}
        </button>
        <button className="sw-btn-ghost text-xs" onClick={() => act('screenshot')} disabled={busy === 'screenshot'}>
          {busy === 'screenshot' ? '…' : 'Screenshot'}
        </button>
      </div>

      {shot && (
        <div className="pt-2">
          <div className="text-[10px] text-white/40 mb-1">Last screenshot</div>
          <img src={shot} alt="screenshot" className="w-full rounded-lg border border-white/10" />
        </div>
      )}
      {lastResult && (
        <pre className="text-[9px] text-white/40 bg-black/40 rounded p-2 max-h-24 overflow-auto whitespace-pre-wrap">
          {lastResult}
        </pre>
      )}
    </div>
  );
}

function StatusBadge({ state }: { state: ExtensionState }) {
  const ok = state.connected && state.loggedIn;
  return (
    <span className={`sw-dot ${ok ? 'bg-green-400' : state.connected ? 'bg-yellow-400' : 'bg-red-400'}`} />
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
