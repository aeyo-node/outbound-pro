import type { ExtensionState } from '@/types/protocol';

interface Props {
  state: ExtensionState | null;
}

export function ActionHistory({ state }: Props) {
  const history = state?.history ?? [];
  return (
    <div className="sw-card flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/80">Action History</span>
        <span className="text-[10px] text-white/40">{history.length}</span>
      </div>
      {history.length === 0 ? (
        <div className="text-[10px] text-white/30 py-2 text-center">No actions yet</div>
      ) : (
        <div className="flex flex-col max-h-48 overflow-auto">
          {history
            .slice()
            .reverse()
            .map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0 text-[10px]"
              >
                <span className={`sw-dot ${h.success ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-white/90 font-mono w-28 truncate">{h.tool}</span>
                <span className="text-white/40">{h.duration}ms</span>
                <span className="text-white/30 ml-auto">{new Date(h.ts).toLocaleTimeString()}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
