import { useMemo, useState } from 'react';
import { X, Trash2, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
import { useDraftHistoryUI } from '../state/DraftHistoryUIContext';
import { loadDraftHistory, clearDraftHistory, type DraftHistoryEntry } from '../state/draftHistoryStorage';
import { summarizeDraftHistory } from '../state/draftHistoryStats';
import { PositionBadge } from './PositionBadge';
import { useIsMobile } from '../hooks/useIsMobile';

export function DraftHistoryScreen() {
  const { isOpen, close } = useDraftHistoryUI();
  const isMobile = useIsMobile();
  // Re-read from storage each time the screen opens rather than keeping this
  // in a context - history only changes on draft completion or "Clear", and
  // this avoids yet another always-mounted provider for something rarely
  // accessed.
  const [historyVersion, setHistoryVersion] = useState(0);
  const entries = useMemo(() => loadDraftHistory(), [isOpen, historyVersion]);
  const summary = useMemo(() => summarizeDraftHistory(entries), [entries]);

  if (!isOpen) return null;

  function handleClearAll() {
    if (!window.confirm('Clear all draft history? This cannot be undone.')) return;
    clearDraftHistory();
    setHistoryVersion((v) => v + 1);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '12px 12px' : '16px 24px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={18} color="var(--accent)" />
          <span style={{ fontSize: 15, fontWeight: 700 }}>Draft History &amp; Stats</span>
        </div>
        <button
          onClick={close}
          aria-label="Close"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-dim)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '20px 24px' }}>
        {summary.totalDrafts === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-faint)' }}>
            <BarChart3 size={32} style={{ marginBottom: 10, opacity: 0.5 }} />
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>
              No completed drafts yet. Finish a mock draft and it'll show up here, along with how
              often you land your favorites over time.
            </p>
          </div>
        ) : (
          <>
            <SummaryCards summary={summary} />
            <SlotBreakdown summary={summary} isMobile={isMobile} />
            {summary.playerStats.length > 0 && <PlayerBreakdown summary={summary} isMobile={isMobile} />}
            <PastDraftsList entries={entries} isMobile={isMobile} />

            <button
              onClick={handleClearAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 20,
                padding: '8px 14px',
                borderRadius: 999,
                border: '1px solid var(--danger)',
                background: 'transparent',
                color: 'var(--danger)',
                fontWeight: 600,
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              <Trash2 size={13} />
              Clear all history
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCards({ summary }: { summary: ReturnType<typeof summarizeDraftHistory> }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
      <Card label="Drafts completed" value={String(summary.totalDrafts)} />
      <Card label="Most drafted slot" value={summary.mostDraftedSlot ? `Slot ${summary.mostDraftedSlot}` : '—'} />
      <Card
        label="Favorites capture rate"
        value={summary.overallCaptureRate !== null ? `${Math.round(summary.overallCaptureRate * 100)}%` : '—'}
      />
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: '1 1 140px',
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--text-faint)',
        margin: '20px 0 8px',
      }}
    >
      {children}
    </div>
  );
}

function SlotBreakdown({
  summary,
  isMobile,
}: {
  summary: ReturnType<typeof summarizeDraftHistory>;
  isMobile: boolean;
}) {
  return (
    <div>
      <SectionHeading>By draft slot</SectionHeading>
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {summary.slotStats.map((s) => (
          <div
            key={s.slot}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: isMobile ? '8px 10px' : '9px 14px',
              borderBottom: '1px solid var(--border)',
              fontSize: 13,
            }}
          >
            <span style={{ width: 56, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>Slot {s.slot}</span>
            <span style={{ width: 70, color: 'var(--text-dim)', fontSize: 12 }}>
              {s.timesDrafted}x drafted
            </span>
            <div style={{ flex: 1 }}>
              {s.avgCaptureRate !== null && (
                <div style={{ height: 6, borderRadius: 999, background: 'var(--bg)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.round(s.avgCaptureRate * 100)}%`,
                      background: 'var(--accent)',
                    }}
                  />
                </div>
              )}
            </div>
            <span style={{ width: 44, textAlign: 'right', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {s.avgCaptureRate !== null ? `${Math.round(s.avgCaptureRate * 100)}%` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerBreakdown({
  summary,
  isMobile,
}: {
  summary: ReturnType<typeof summarizeDraftHistory>;
  isMobile: boolean;
}) {
  return (
    <div>
      <SectionHeading>By favorite player (across all past drafts)</SectionHeading>
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {summary.playerStats.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: isMobile ? '8px 10px' : '9px 14px',
              borderBottom: '1px solid var(--border)',
              fontSize: 13,
            }}
          >
            <span style={{ flex: 1, color: 'var(--text)', minWidth: 0 }}>{p.name}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
              {p.timesLanded}/{p.timesFavorited} drafts
            </span>
            <div style={{ width: 60, height: 6, borderRadius: 999, background: 'var(--bg)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.round(p.rate * 100)}%`,
                  background: p.rate >= 0.5 ? 'var(--accent)' : 'var(--warning)',
                }}
              />
            </div>
            <span style={{ width: 38, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-dim)' }}>
              {Math.round(p.rate * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PastDraftsList({ entries, isMobile }: { entries: DraftHistoryEntry[]; isMobile: boolean }) {
  const sorted = [...entries].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  return (
    <div>
      <SectionHeading>Past drafts</SectionHeading>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((entry) => (
          <PastDraftRow key={entry.id} entry={entry} isMobile={isMobile} />
        ))}
      </div>
    </div>
  );
}

function PastDraftRow({ entry, isMobile }: { entry: DraftHistoryEntry; isMobile: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const rosterIds = new Set(entry.roster.map((p) => p.id));
  const favoritesLanded = entry.favoriteIdsAtCompletion.filter((id) => rosterIds.has(id)).length;
  const date = new Date(entry.completedAt);

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: isMobile ? '10px 12px' : '10px 14px',
          border: 'none',
          background: 'var(--bg-card)',
          color: 'var(--text)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Slot {entry.slot}</span>
        {entry.favoriteIdsAtCompletion.length > 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-faint)', marginLeft: 'auto' }}>
            {favoritesLanded}/{entry.favoriteIdsAtCompletion.length} favorites landed
          </span>
        )}
      </button>
      {expanded && (
        <div style={{ padding: isMobile ? '8px 12px 12px' : '8px 14px 14px', borderTop: '1px solid var(--border)' }}>
          {entry.roster
            .slice()
            .sort((a, b) => a.twoQbRank - b.twoQbRank)
            .map((p) => (
              <div
                key={p.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12.5 }}
              >
                <PositionBadge position={p.position} />
                <span style={{ flex: 1, color: 'var(--text)' }}>{p.name}</span>
                <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>{p.team}</span>
                {entry.favoriteIdsAtCompletion.includes(p.id) && (
                  <span style={{ color: 'var(--star)', fontSize: 11 }}>★</span>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
