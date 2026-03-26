import type { CSSProperties } from 'react';
import { BeerMeter } from './BeerMeter';
import {
  getCurrentAssignmentWinnerId,
  getCurrentBettingPlayerId,
  getCurrentRound
} from '../lib/game';
import type { SessionState } from '../lib/types';

interface SidebarRosterProps {
  session: SessionState;
}

export function SidebarRoster({ session }: SidebarRosterProps) {
  const round = getCurrentRound(session);
  const bettingPlayerId = getCurrentBettingPlayerId(round);
  const assignmentPlayerId = getCurrentAssignmentWinnerId(round);

  return (
    <aside className="sidebar-panel">
      <div className="sidebar-panel__header">
        <p className="eyebrow">Session board</p>
        <h2>Players</h2>
      </div>

      <div className="roster-list">
        {session.players.map((player) => {
          const isCurrentBettor = bettingPlayerId === player.id;
          const isCurrentWinner = assignmentPlayerId === player.id;
          const status = player.tappedOut
            ? 'Tapped out'
            : isCurrentBettor
              ? 'Betting now'
              : isCurrentWinner
                ? 'Assigning now'
                : player.active
                  ? 'Active'
                  : 'Inactive';

          return (
            <article
              key={player.id}
              className={`player-tile ${player.tappedOut ? 'is-out' : ''}`}
              style={{ '--player-accent': player.colour } as CSSProperties}
            >
              <div className="player-tile__header">
                <div>
                  <h3>{player.name}</h3>
                  <span className="status-chip">{status}</span>
                </div>
                <div className="player-tile__totals">
                  <span>{player.totalSegmentsTaken} segs</span>
                  <span>{player.totalShotsTaken} shots</span>
                </div>
              </div>

              <BeerMeter segments={player.currentSegments} compact />

              <div className="player-tile__footer">
                <span>
                  {player.roundsWon} won / {player.roundsLost} lost
                </span>
                {player.tapOutRound ? <span>Out in round {player.tapOutRound}</span> : null}
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
