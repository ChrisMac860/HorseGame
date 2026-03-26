import { splitLeaderboard } from '../lib/game';
import type { SessionState } from '../lib/types';

interface FinalLeaderboardViewProps {
  session: SessionState;
  onStartFresh: () => void;
}

export function FinalLeaderboardView({
  session,
  onStartFresh
}: FinalLeaderboardViewProps) {
  const leaderboard = splitLeaderboard(session.players);

  return (
    <section className="phase-shell">
      <div className="panel panel--hero">
        <div className="panel__header">
          <p className="eyebrow">Final leaderboard</p>
          <h1>Session complete</h1>
        </div>
        <p>The active players are ranked from least punished to most punished.</p>
        <button type="button" className="button button--primary" onClick={onStartFresh}>
          Start fresh
        </button>
      </div>

      <div className="summary-grid">
        <div className="panel">
          <div className="panel__header">
            <p className="eyebrow">Active players</p>
            <h2>Still standing</h2>
          </div>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Segments taken</th>
                <th>Shots taken</th>
                <th>Won</th>
                <th>Lost</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.active.map((player) => (
                <tr key={player.id}>
                  <td>{player.name}</td>
                  <td>{player.totalSegmentsTaken}</td>
                  <td>{player.totalShotsTaken}</td>
                  <td>{player.roundsWon}</td>
                  <td>{player.roundsLost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel__header">
            <p className="eyebrow">Tap outs</p>
            <h2>Out of the running</h2>
          </div>
          {leaderboard.tappedOut.length === 0 ? (
            <p className="muted-copy">Nobody tapped out this session.</p>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Segments taken</th>
                  <th>Shots taken</th>
                  <th>Tap-out round</th>
                  <th>Tap-out order</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.tappedOut.map((player) => (
                  <tr key={player.id}>
                    <td>{player.name}</td>
                    <td>{player.totalSegmentsTaken}</td>
                    <td>{player.totalShotsTaken}</td>
                    <td>{player.tapOutRound ?? '-'}</td>
                    <td>{player.tapOutOrder ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
