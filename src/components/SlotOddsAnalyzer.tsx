import { useEffect, useRef, useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { useDraft } from '../state/DraftContext';
import { useFavorites } from '../state/FavoritesContext';
import { PositionBadge } from './PositionBadge';
import { useIsMobile } from '../hooks/useIsMobile';
import type { OddsDoneMessage, OddsProgressMessage, OddsRequest } from '../workers/oddsWorker';

const TRIALS = 150;

interface OddsResult {
  avgTotalFavorites: number;
  totalFavorites: number;
  perPlayerCaptureRate: { id: string; name: string; rate: number }[];
}

export function SlotOddsAnalyzer({ slot }: { slot: number }) {
  const { state } = useDraft();
  const { favorites } = useFavorites();
  const isMobile = useIsMobile();

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OddsResult | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Any change to slot or your favorites list invalidates a prior result.
  useEffect(() => {
    setResult(null);
  }, [slot, favorites]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const favoriteIds = Array.from(favorites);

  const runAnalysis = () => {
    if (favoriteIds.length === 0) return;
    setRunning(true);
    setProgress(0);
    setResult(null);

    const worker = new Worker(new URL('../workers/oddsWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<OddsProgressMessage | OddsDoneMessage>) => {
      if (e.data.type === 'progress') {
        setProgress(e.data.completed / e.data.total);
      } else {
        setResult({
          avgTotalFavorites: e.data.avgTotalFavorites,
          totalFavorites: favoriteIds.length,
          perPlayerCaptureRate: e.data.perPlayerCaptureRate,
        });
        setRunning(false);
        worker.terminate();
        workerRef.current = null;
      }
    };

    const request: OddsRequest = {
      type: 'run',
      slotIndex: slot - 1,
      allPlayers: state.allPlayers,
      favoriteIds,
      trials: TRIALS,
    };
    worker.postMessage(request);
  };

  const byId = new Map(state.allPlayers.map((p) => [p.id, p]));

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-card)',
        padding: isMobile ? '12px 12px' : '14px 16px',
        marginTop: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <TrendingUp size={15} color="var(--accent)" />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
          Check my odds from slot {slot}
        </span>
      </div>

      {favoriteIds.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-faint)', lineHeight: 1.5 }}>
          Star some players as favorites first (Rankings &amp; Favorites), then come back here to
          see your odds of landing them from this slot.
        </p>
      ) : (
        <>
          <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            Simulates {TRIALS} full mock drafts from slot {slot}, drafting your {favoriteIds.length}{' '}
            favorite{favoriteIds.length === 1 ? '' : 's'} whenever one's available, to estimate how
            many you'd actually land.
          </p>

          {!running && !result && (
            <button
              onClick={runAnalysis}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                border: 'none',
                background: 'var(--accent)',
                color: '#08110b',
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              Run simulation
            </button>
          )}

          {running && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Loader2 size={16} className="spin" color="var(--accent)" />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    height: 6,
                    borderRadius: 999,
                    background: 'var(--bg)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.round(progress * 100)}%`,
                      background: 'var(--accent)',
                      transition: 'width 120ms linear',
                    }}
                  />
                </div>
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                {Math.round(progress * 100)}%
              </span>
            </div>
          )}

          {result && (
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text)',
                  marginBottom: 10,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-glow)',
                  border: '1px solid var(--accent)',
                }}
              >
                On average you'd land <strong>{result.avgTotalFavorites.toFixed(1)}</strong> of your{' '}
                {result.totalFavorites} favorites from slot {slot}.
              </div>

              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {result.perPlayerCaptureRate.map((row) => {
                  const player = byId.get(row.id);
                  return (
                    <div
                      key={row.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 2px',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {player && <PositionBadge position={player.position} />}
                      <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text)', minWidth: 0 }}>
                        {row.name}
                      </span>
                      <div
                        style={{
                          width: 60,
                          height: 6,
                          borderRadius: 999,
                          background: 'var(--bg)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.round(row.rate * 100)}%`,
                            background: row.rate >= 0.5 ? 'var(--accent)' : 'var(--warning)',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          width: 38,
                          textAlign: 'right',
                          fontSize: 11.5,
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-dim)',
                        }}
                      >
                        {Math.round(row.rate * 100)}%
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={runAnalysis}
                style={{
                  marginTop: 10,
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-dim)',
                  fontWeight: 600,
                  fontSize: 11.5,
                  cursor: 'pointer',
                }}
              >
                Re-run
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
