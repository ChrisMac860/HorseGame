import {
  getBetForPlayer,
  getCurrentRound,
  getHorseById,
  getPlayerById,
  getRoundPunishmentTotals
} from '../lib/game';
import type { SessionState } from '../lib/types';

interface RoundSummaryViewProps {
  session: SessionState;
  onContinue: () => void;
}

export function RoundSummaryView({
  session,
  onContinue
}: RoundSummaryViewProps) {
  const round = getCurrentRound(session);
  const winnerHorse = getHorseById(round, round.winnerHorseId);
  const activePlayers = session.players.filter((player) => player.active);

  return (
    <section className="phase-shell">
      <div className="panel panel--hero">
        <div className="panel__header">
          <p className="eyebrow">Round summary</p>
          <h1>{winnerHorse?.name} won round {round.roundNumber}</h1>
        </div>
        <p>Everything is locked for this round. Move on when the group is ready.</p>
        <button type="button" className="button button--primary" onClick={onContinue}>
          {activePlayers.length > 1 ? 'Next round' : 'View final leaderboard'}
        </button>
      </div>

      <div className="summary-grid">
        <div className="panel">
          <div className="panel__header">
            <p className="eyebrow">Bets</p>
            <h2>Every player’s bet</h2>
          </div>
          <div className="summary-list">
            {round.participantIds.map((playerId) => {
              const player = getPlayerById(session, playerId);
              const bet = getBetForPlayer(round, playerId);
              const horse = bet ? getHorseById(round, bet.horseId) : null;

              return (
                <div className="summary-row" key={playerId}>
                  <strong>{player?.name}</strong>
                  <span>{horse?.name}</span>
                  <span>{bet?.segmentStake ?? 0} segments</span>
                  <span>{bet?.shotStake ? 'Shot included' : 'No shot'}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <div className="panel__header">
            <p className="eyebrow">Assignments</p>
            <h2>Who sent what where</h2>
          </div>
          <div className="summary-list">
            {round.assignments.map((assignment, index) => {
              const fromPlayer = getPlayerById(session, assignment.fromPlayerId);
              const toPlayer = getPlayerById(session, assignment.toPlayerId);
              return (
                <div className="summary-row" key={`${assignment.fromPlayerId}-${index}`}>
                  <strong>{fromPlayer?.name}</strong>
                  <span>to {toPlayer?.name}</span>
                  <span>{assignment.segmentCount} segments</span>
                  <span>{assignment.shot ? 'Shot assigned' : 'No shot'}</span>
                </div>
              );
            })}
            {round.assignments.length === 0 ? (
              <p className="muted-copy">No winner assignments were needed this round.</p>
            ) : null}
          </div>
        </div>

        <div className="panel">
          <div className="panel__header">
            <p className="eyebrow">Punishment totals</p>
            <h2>Round damage</h2>
          </div>
          <div className="summary-list">
            {round.participantIds.map((playerId) => {
              const player = getPlayerById(session, playerId);
              const totals = getRoundPunishmentTotals(round, playerId);

              return (
                <div className="summary-row" key={`${playerId}-damage`}>
                  <strong>{player?.name}</strong>
                  <span>{totals.segments} segments</span>
                  <span>{totals.shots} shots</span>
                  <span>
                    {player?.tappedOut && player.tapOutRound === round.roundNumber
                      ? 'Tapped out'
                      : 'Resolved'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
