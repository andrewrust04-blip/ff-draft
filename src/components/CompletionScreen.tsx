import { useDraft } from '../state/DraftContext';
import { PositionBadge } from './PositionBadge';
import { useIsMobile } from '../hooks/useIsMobile';

export function CompletionScreen() {
  const { state, dispatch } = useDraft();
  const isMobile = useIsMobile();
  const myTeam = state.teams[state.userTeamIndex];
  const myPicks = state.picks
    .filter((p) => p.teamIndex === state.userTeamIndex)
    .sort((a, b) => a.overallPick - b.overallPick);

  return (
    <div
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: isMobile ? '20px 16px' : '28px 30px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? 14 : 0,
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--accent)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Draft complete
          </div>
          <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontSize: 26 }}>
            Your final roster &mdash; {myTeam.name}
          </h2>
        </div>
        <button
          onClick={() => dispatch({ type: 'RESET_TO_SETUP' })}
          style={{
            padding: isMobile ? '13px 20px' : '11px 20px',
            minHeight: isMobile ? 46 : undefined,
            width: isMobile ? '100%' : undefined,
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'var(--accent)',
            color: '#0f1216',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Start new mock draft
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            minWidth: isMobile ? 620 : undefined,
            borderCollapse: 'collapse',
            fontSize: 13.5,
          }}
        >
        <thead>
          <tr>
            <th style={thStyle}>Pick</th>
            <th style={thStyle}>Slot</th>
            <th style={thStyle}>Player</th>
            <th style={thStyle}>Pos</th>
            <th style={thStyle}>Team</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>ESPN Rank</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>2QB Rank</th>
          </tr>
        </thead>
        <tbody>
          {myPicks.map((pick) => (
            <tr key={pick.overallPick} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={tdStyle}>{pick.overallPick}</td>
              <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                {pick.assignedSlot}
              </td>
              <td style={tdStyle}>{pick.player.name}</td>
              <td style={tdStyle}>
                <PositionBadge position={pick.player.position} />
              </td>
              <td style={{ ...tdStyle, color: 'var(--text-dim)' }}>{pick.player.team}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                {pick.player.espnRank}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                {pick.player.twoQbRank}
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 10px',
  fontSize: 11,
  color: 'var(--text-faint)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: '1px solid var(--border)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 10px',
};
