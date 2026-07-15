import { useCallback, useEffect, useState } from 'react';
import type { ExtensionState, PlainCredentials } from '@/types/protocol';
import { sendRuntimeMessage } from '@/lib/messaging';
import { loadCredentials, saveCredentials, isConfigured } from '@/lib/storage';
import { LoginForm } from './components/LoginForm';
import { DebugPanel } from './components/DebugPanel';
import { ActionHistory } from './components/ActionHistory';

/**
 * Popup root. Three modes:
 *  - not configured -> LoginForm (collect dashboard URL, email, password, wsUrl, token)
 *  - configured -> DebugPanel (status + controls) + ActionHistory
 *  - editing -> LoginForm again (prefilled)
 */
export default function App() {
  const [state, setState] = useState<ExtensionState | null>(null);
  const [configured, setConfigured] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);
  const [creds, setCreds] = useState<PlainCredentials | null>(null);

  const refresh = useCallback(async () => {
    const s = await sendRuntimeMessage<unknown, ExtensionState>({ type: 'getState' });
    if (s) setState(s);
  }, []);

  useEffect(() => {
    (async () => {
      const ready = await isConfigured();
      setConfigured(ready);
      if (ready) setCreds(await loadCredentials());
      await refresh();
    })();
    const id = setInterval(refresh, 1500);
    return () => clearInterval(id);
  }, [refresh]);

  const handleSave = async (c: PlainCredentials) => {
    await saveCredentials(c);
    setConfigured(true);
    setCreds(c);
    setEditing(false);
    // Trigger a fresh WS connect + login attempt.
    await sendRuntimeMessage({ type: 'reconnect' });
    await sendRuntimeMessage({ type: 'login' });
    await refresh();
  };

  const showForm = !configured || editing;

  return (
    <div className="flex flex-col gap-3 p-3">
      <Header connected={state?.connected ?? false} loggedIn={state?.loggedIn ?? false} />
      {showForm ? (
        <LoginForm initial={creds} onSave={handleSave} onCancel={() => setEditing(false)} editing={editing} />
      ) : (
        <>
          <DebugPanel state={state} onRefresh={refresh} />
          <ActionHistory state={state} />
        </>
      )}
      {configured && !editing && (
        <button className="sw-btn-ghost text-xs" onClick={() => setEditing(true)}>
          Edit configuration
        </button>
      )}
    </div>
  );
}

function Header({ connected, loggedIn }: { connected: boolean; loggedIn: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-swaram-gold flex items-center justify-center text-black font-bold text-sm">
          S
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">Swaram Assistant</div>
          <div className="text-[10px] text-white/40 leading-tight">Browser execution layer</div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <span className="flex items-center gap-1">
          <span className={`sw-dot ${loggedIn ? 'bg-green-400' : 'bg-red-400'}`} />
          {loggedIn ? 'Logged in' : 'Logged out'}
        </span>
        <span className="flex items-center gap-1">
          <span className={`sw-dot ${connected ? 'bg-green-400' : 'bg-yellow-400'}`} />
          {connected ? 'Connected' : 'Offline'}
        </span>
      </div>
    </div>
  );
}
