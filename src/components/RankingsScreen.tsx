import { useMemo, useState, useEffect } from 'react';
import { X, ChevronUp, ChevronDown, Star, Upload, RotateCcw, Check, AlertTriangle } from 'lucide-react';
import { useDraft } from '../state/DraftContext';
import { useFavorites } from '../state/FavoritesContext';
import { useRankingsUI } from '../state/RankingsUIContext';
import { PositionBadge, POSITION_COLORS } from './PositionBadge';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Position, RankedPlayer } from '../types';
import { players as rawPlayers } from '../data/players';
import {
  loadBaseOverrides,
  saveBaseOverrides,
  clearBaseOverrides,
  saveCustomOrder,
  clearCustomOrder,
  parsePastedCheatSheet,
  buildOverridesFromParsedSheet,
  type BaseOverridesData,
} from '../state/preferencesStorage';

type Tab = 'rankings' | 'favorites';
type PosFilter = 'ALL' | Position;

export function RankingsScreen() {
  const { isOpen, initialTab, closeRankings } = useRankingsUI();
  const [tab, setTab] = useState<Tab>(initialTab);
  const isMobile = useIsMobile();

  if (!isOpen) return null;

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
        <div style={{ display: 'flex', gap: 6 }}>
          <TabButton active={tab === 'rankings'} onClick={() => setTab('rankings')}>
            Rankings
          </TabButton>
          <TabButton active={tab === 'favorites'} onClick={() => setTab('favorites')}>
            Favorites
          </TabButton>
        </div>
        <button
          onClick={closeRankings}
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

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {tab === 'rankings' ? <RankingsTab /> : <FavoritesTab />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: 999,
        border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
        background: active ? 'var(--accent-glow)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-dim)',
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

// =============================================================================
// RANKINGS TAB - nudge/reorder + paste an updated cheat sheet
// =============================================================================

function RankingsTab() {
  const { state, refreshRankings } = useDraft();
  const isMobile = useIsMobile();
  const canEdit = state.status === 'setup';

  const [order, setOrder] = useState<RankedPlayer[]>(() => state.allPlayers.slice());
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<PosFilter>('ALL');
  const [dirty, setDirty] = useState(false);
  const [showPaste, setShowPaste] = useState(false);

  // Whenever the underlying rankings change (e.g. after a paste-sheet apply
  // or a reset) and there's no unsaved in-progress edit, re-seed the local
  // working copy so the editor reflects the latest data.
  useEffect(() => {
    if (!dirty) setOrder(state.allPlayers.slice());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.allPlayers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return order.filter((p) => {
      if (posFilter !== 'ALL' && p.position !== posFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    }).map((p) => ({ player: p, index: order.indexOf(p) }));
  }, [order, search, posFilter]);

  if (!canEdit) {
    return (
      <div style={{ padding: 24, maxWidth: 520, margin: '40px auto', textAlign: 'center' }}>
        <AlertTriangle size={28} color="var(--warning)" style={{ marginBottom: 10 }} />
        <p style={{ color: 'var(--text-dim)', lineHeight: 1.6, fontSize: 14 }}>
          Rankings can only be edited before a draft starts. Finish, restart, or reset your
          current draft first, then come back here.
        </p>
      </div>
    );
  }

  function moveBy(id: string, delta: number) {
    setOrder((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const newIdx = Math.max(0, Math.min(prev.length - 1, idx + delta));
      if (newIdx === idx) return prev;
      const next = prev.slice();
      const [item] = next.splice(idx, 1);
      next.splice(newIdx, 0, item);
      return next;
    });
    setDirty(true);
  }

  function moveToRank(id: string, rank: number) {
    setOrder((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const newIdx = Math.max(0, Math.min(prev.length - 1, rank - 1));
      if (newIdx === idx) return prev;
      const next = prev.slice();
      const [item] = next.splice(idx, 1);
      next.splice(newIdx, 0, item);
      return next;
    });
    setDirty(true);
  }

  function handleSave() {
    saveCustomOrder(order.map((p) => p.id));
    setDirty(false);
    refreshRankings();
  }

  function handleResetOrder() {
    clearCustomOrder();
    setDirty(false);
    refreshRankings();
    // allPlayers will update via refreshRankings; re-seed local order once it does.
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: isMobile ? '10px 12px' : '12px 24px', borderBottom: '1px solid var(--border)' }}>
        <PasteSheetPanel
          show={showPaste}
          onToggle={() => setShowPaste((s) => !s)}
          onApplied={() => {
            setDirty(false);
            refreshRankings();
          }}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: showPaste ? 10 : 0, flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search to find a player to nudge..."
            style={{
              flex: '1 1 200px',
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text)',
              fontSize: 14,
            }}
          />
          <select
            value={posFilter}
            onChange={(e) => setPosFilter(e.target.value as PosFilter)}
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text)',
              fontSize: 13,
            }}
          >
            <option value="ALL">All positions</option>
            <option value="QB">QB</option>
            <option value="RB">RB</option>
            <option value="WR">WR</option>
            <option value="TE">TE</option>
          </select>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '4px 8px' : '4px 16px' }}>
        {filtered.map(({ player, index }) => (
          <RankingRow
            key={player.id}
            player={player}
            rank={index + 1}
            onMoveUp={() => moveBy(player.id, -1)}
            onMoveDown={() => moveBy(player.id, 1)}
            onMoveToRank={(rank) => moveToRank(player.id, rank)}
          />
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: isMobile ? '10px 12px' : '12px 24px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleSave}
          disabled={!dirty}
          style={{
            flex: 1,
            padding: '11px 0',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: dirty ? 'var(--accent)' : 'var(--bg-card)',
            color: dirty ? '#08110b' : 'var(--text-faint)',
            fontWeight: 700,
            fontSize: 14,
            cursor: dirty ? 'pointer' : 'not-allowed',
          }}
        >
          <Check size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
          Save order
        </button>
        <button
          onClick={handleResetOrder}
          style={{
            padding: '11px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-dim)',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <RotateCcw size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
          Reset order
        </button>
      </div>
    </div>
  );
}

function RankingRow({
  player,
  rank,
  onMoveUp,
  onMoveDown,
  onMoveToRank,
}: {
  player: RankedPlayer;
  rank: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToRank: (rank: number) => void;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(player.id);
  const [rankInput, setRankInput] = useState(String(rank));
  const isMobile = useIsMobile();

  // Keep the input in sync when the player's rank changes from elsewhere
  // (e.g. another row's move shifted this one), but not while the user is
  // actively typing a new value into it.
  const [focused, setFocused] = useState(false);
  if (!focused && rankInput !== String(rank)) setRankInput(String(rank));

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: isMobile ? '8px 4px' : '7px 6px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <input
        value={rankInput}
        onChange={(e) => setRankInput(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          const n = parseInt(rankInput, 10);
          if (!isNaN(n) && n !== rank) onMoveToRank(n);
          else setRankInput(String(rank));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        style={{
          width: 44,
          padding: '5px 4px',
          textAlign: 'center',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          color: 'var(--text)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12.5,
          flexShrink: 0,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <button
          onClick={onMoveUp}
          aria-label="Move up"
          style={{ border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', padding: 1 }}
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={onMoveDown}
          aria-label="Move down"
          style={{ border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', padding: 1 }}
        >
          <ChevronDown size={14} />
        </button>
      </div>
      <button
        onClick={() => toggleFavorite(player.id)}
        aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
        style={{
          border: 'none',
          background: 'transparent',
          padding: 2,
          cursor: 'pointer',
          display: 'flex',
          flexShrink: 0,
          color: favorited ? 'var(--star)' : 'var(--text-faint)',
        }}
      >
        <Star size={15} fill={favorited ? 'var(--star)' : 'none'} strokeWidth={2} />
      </button>
      <PositionBadge position={player.position} />
      <span style={{ flex: 1, fontSize: isMobile ? 13.5 : 13, color: 'var(--text)', minWidth: 0 }}>
        {player.name}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{player.team}</span>
      {player.bye > 0 && (
        <span style={{ fontSize: 10.5, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
          BYE {player.bye}
        </span>
      )}
    </div>
  );
}

function PasteSheetPanel({
  show,
  onToggle,
  onApplied,
}: {
  show: boolean;
  onToggle: () => void;
  onApplied: () => void;
}) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<{
    overrides: BaseOverridesData;
    addedNames: string[];
    removedNames: string[];
    updatedCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const hasStoredOverrides = loadBaseOverrides().appliedAt !== null;

  function handleParse() {
    setError(null);
    const rows = parsePastedCheatSheet(text);
    if (rows.length === 0) {
      setError("Couldn't find any RB/WR/TE rows in that text. Paste the full cheat sheet text (rows look like \"12. (WR6) Player Name, TEAM $30 7\").");
      setPreview(null);
      return;
    }
    const { overrides, addedNames, removedNames } = buildOverridesFromParsedSheet(rows, rawPlayers);
    setPreview({
      overrides,
      addedNames,
      removedNames,
      updatedCount: Object.keys(overrides.edits).length,
    });
  }

  function handleApply() {
    if (!preview) return;
    saveBaseOverrides(preview.overrides);
    setPreview(null);
    setText('');
    onApplied();
  }

  function handleClearOverrides() {
    clearBaseOverrides();
    setPreview(null);
    setText('');
    onApplied();
  }

  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: 'none',
          background: 'transparent',
          color: 'var(--link)',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
          padding: '4px 0',
        }}
      >
        <Upload size={13} />
        {show ? 'Hide' : 'Paste an updated cheat sheet'}
        {hasStoredOverrides && !show && (
          <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(overrides currently applied)</span>
        )}
      </button>

      {show && (
        <div style={{ marginTop: 8 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.5 }}>
            Copy/paste the raw text of an updated ESPN cheat sheet below. Only RB/WR/TE rows are
            used - QBs use a separate ranking system (see the settings menu). Rows look like{' '}
            <code style={{ fontFamily: 'var(--font-mono)' }}>12. (WR6) Player Name, TEAM $30 7</code>.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste cheat sheet text here..."
            rows={isMobile ? 5 : 7}
            style={{
              width: '100%',
              padding: 8,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text)',
              fontSize: 12.5,
              fontFamily: 'var(--font-mono)',
              resize: 'vertical',
            }}
          />
          {error && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--danger)' }}>{error}</p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleParse}
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                border: 'none',
                background: 'var(--accent)',
                color: '#08110b',
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              Parse &amp; preview
            </button>
            {hasStoredOverrides && (
              <button
                onClick={handleClearOverrides}
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-dim)',
                  fontWeight: 600,
                  fontSize: 12.5,
                  cursor: 'pointer',
                }}
              >
                Clear applied overrides
              </button>
            )}
          </div>

          {preview && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-card)',
                fontSize: 12.5,
              }}
            >
              <div style={{ color: 'var(--text)', marginBottom: 6 }}>
                <strong>{preview.updatedCount}</strong> players updated,{' '}
                <strong>{preview.addedNames.length}</strong> added,{' '}
                <strong>{preview.removedNames.length}</strong> removed.
              </div>
              {preview.addedNames.length > 0 && (
                <div style={{ color: 'var(--text-dim)', marginBottom: 4 }}>
                  Added: {preview.addedNames.join(', ')}
                </div>
              )}
              {preview.removedNames.length > 0 && (
                <div style={{ color: 'var(--text-dim)', marginBottom: 8 }}>
                  Removed: {preview.removedNames.join(', ')}
                </div>
              )}
              <button
                onClick={handleApply}
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#08110b',
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: 'pointer',
                }}
              >
                Apply these rankings
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// FAVORITES TAB - browse/search everyone, star toggle, see your list up top
// =============================================================================

function FavoritesTab() {
  const { state } = useDraft();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<PosFilter>('ALL');
  const isMobile = useIsMobile();

  const favoritedPlayers = useMemo(
    () =>
      state.allPlayers
        .filter((p) => favorites.has(p.id))
        .sort((a, b) => a.twoQbRank - b.twoQbRank),
    [state.allPlayers, favorites]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.allPlayers.filter((p) => {
      if (posFilter !== 'ALL' && p.position !== posFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [state.allPlayers, search, posFilter]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {favoritedPlayers.length > 0 && (
        <div style={{ padding: isMobile ? '10px 12px 0' : '12px 24px 0', flexShrink: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-faint)',
              marginBottom: 8,
            }}
          >
            Your {favoritedPlayers.length} favorite{favoritedPlayers.length === 1 ? '' : 's'}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 12,
              maxHeight: 120,
              overflowY: 'auto',
            }}
          >
            {favoritedPlayers.map((p) => (
              <span
                key={p.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 8px',
                  borderRadius: 999,
                  border: '1px solid var(--star)',
                  background: 'rgba(242, 201, 76, 0.1)',
                  fontSize: 11.5,
                  color: 'var(--text)',
                }}
              >
                <span style={{ color: POSITION_COLORS[p.position], fontWeight: 700 }}>{p.position}</span>
                {p.name}
                <button
                  onClick={() => toggleFavorite(p.id)}
                  aria-label="Remove from favorites"
                  style={{ border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: isMobile ? '10px 12px' : '12px 24px', borderTop: favoritedPlayers.length > 0 ? '1px solid var(--border)' : undefined, borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players to star..."
          style={{
            flex: '1 1 200px',
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text)',
            fontSize: 14,
          }}
        />
        <select
          value={posFilter}
          onChange={(e) => setPosFilter(e.target.value as PosFilter)}
          style={{
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text)',
            fontSize: 13,
          }}
        >
          <option value="ALL">All positions</option>
          <option value="QB">QB</option>
          <option value="RB">RB</option>
          <option value="WR">WR</option>
          <option value="TE">TE</option>
        </select>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '4px 8px' : '4px 16px' }}>
        {filtered.map((p) => {
          const favorited = isFavorite(p.id);
          return (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: isMobile ? '8px 4px' : '7px 6px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ width: 32, fontSize: 11.5, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                {p.twoQbRank}
              </span>
              <button
                onClick={() => toggleFavorite(p.id)}
                aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 2,
                  cursor: 'pointer',
                  display: 'flex',
                  flexShrink: 0,
                  color: favorited ? 'var(--star)' : 'var(--text-faint)',
                }}
              >
                <Star size={15} fill={favorited ? 'var(--star)' : 'none'} strokeWidth={2} />
              </button>
              <PositionBadge position={p.position} />
              <span style={{ flex: 1, fontSize: isMobile ? 13.5 : 13, color: 'var(--text)', minWidth: 0 }}>
                {p.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{p.team}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
