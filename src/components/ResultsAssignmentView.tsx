import { useEffect, useState } from 'react';
import {
  getAssignmentRemaining,
  getBetForPlayer,
  getCurrentAssignmentWinnerId,
  getCurrentRound,
  getHorseById,
  getPlayerById,
  getRoundPunishmentTotals,
  validateAssignment
} from '../lib/game';
import { MAX_RECEIVED_SEGMENTS } from '../lib/constants';
import type { Assignment, SessionState } from '../lib/types';

interface ResultsAssignmentViewProps {
  session: SessionState;
  onBeginAssignments: () => void;
  onAddAssignment: (assignment: Assignment) => void;
  onConfirmWinner: () => void;
}

export function ResultsAssignmentView({
  session,
  onBeginAssignments,
  onAddAssignment,
  onConfirmWinner
}: ResultsAssignmentViewProps) {
  const round = getCurrentRound(session);
  const winnerHorse = getHorseById(round, round.winnerHorseId);
  const winnerId = getCurrentAssignmentWinnerId(round);
  const currentWinner = winnerId ? getPlayerById(session, winnerId) : null;
  const [targetId, setTargetId] = useState(round.participantIds[0] ?? '');
  const [segmentCount, setSegmentCount] = useState(0);
  const [shot, setShot] = useState(false);

  useEffect(() => {
    setTargetId(round.participantIds[0] ?? '');
    setSegmentCount(0);
    setShot(false);
  }, [winnerId, round.participantIds]);

  if (round.phase === 'results') {
    return (
      <section className="phase-shell">
        <div className="panel panel--hero">
          <div className="panel__header">
            <p className="eyebrow">Round results</p>
            <h1>{winnerHorse?.name} wins it</h1>
          </div>
          <p>
            Results are locked. Move on to winner assignments when everyone has seen
            the damage.
          </p>
          <button
            type="button"
            className="button button--primary"
            onClick={onBeginAssignments}
          >
            {round.assignmentOrder.length > 0 ? 'Start assignments' : 'Continue to punishment'}
          </button>
        </div>

        <RoundOutcomeBoard session={session} />
      </section>
    );
  }

  if (!currentWinner) {
    return null;
  }

  const remaining = getAssignmentRemaining(round, currentWinner.id);
  const validation = validateAssignment(
    session,
    currentWinner.id,
    targetId,
    segmentCount,
    shot
  );

  return (
    <section className="phase-shell">
      <div className="panel panel--hero">
        <div className="panel__header">
          <p className="eyebrow">Winner assignments</p>
          <h1>{currentWinner.name} is dealing it out</h1>
        </div>

        <div className="assignment-summary-grid">
          <div className="assignment-balance">
            <span>Segments left to assign</span>
            <strong>{remaining.segments}</strong>
          </div>
          <div className="assignment-balance">
            <span>Shot left to assign</span>
            <strong>{remaining.shot ? 'Yes' : 'No'}</strong>
          </div>
        </div>

        <div className="assignment-builder">
          <div className="assignment-target-grid">
            {round.participantIds.map((playerId) => {
              const player = getPlayerById(session, playerId);
              const receivedSegments = round.receivedSegmentsByPlayer[playerId];
              const receivedShot = round.receivedShotsByPlayer[playerId];

              return (
                <button
                  key={playerId}
                  type="button"
                  className={`target-card ${targetId === playerId ? 'is-selected' : ''}`}
                  onClick={() => setTargetId(playerId)}
                >
                  <strong>{player?.name}</strong>
                  <span>{receivedSegments}/{MAX_RECEIVED_SEGMENTS} received segments</span>
                  <span>{receivedShot ? 'Shot already assigned' : 'Can still receive a shot'}</span>
                </button>
              );
            })}
          </div>

          <div className="assignment-controls">
            <div className="stake-group">
              <h2>Segments to assign</h2>
              <div className="segment-chip-row">
                {Array.from({ length: remaining.segments + 1 }, (_, value) => (
                  <button
                    key={value}
                    type="button"
                    className={`chip-button ${
                      value === segmentCount ? 'is-selected' : ''
                    }`}
                    onClick={() => setSegmentCount(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {remaining.shot ? (
              <button
                type="button"
                className={`toggle-row ${shot ? 'is-on' : ''}`}
                onClick={() => setShot((currentValue) => !currentValue)}
                aria-pressed={shot}
              >
                <span>Send the shot too</span>
                <span>{shot ? 'Yes' : 'No'}</span>
              </button>
            ) : null}

            {validation.message ? (
              <div className="validation-list">
                <p>{validation.message}</p>
                {validation.suggestion ? <p>{validation.suggestion}</p> : null}
              </div>
            ) : null}

            <button
              type="button"
              className="button button--primary"
              disabled={!validation.isValid}
              onClick={() => {
                onAddAssignment({
                  fromPlayerId: currentWinner.id,
                  toPlayerId: targetId,
                  segmentCount,
                  shot
                });
                setSegmentCount(0);
                setShot(false);
              }}
            >
              Add assignment
            </button>
          </div>
        </div>

        <div className="action-row">
          <button
            type="button"
            className="button button--secondary"
            disabled={remaining.segments !== 0 || remaining.shot}
            onClick={onConfirmWinner}
          >
            Confirm {currentWinner.name}&apos;s assignments
          </button>
        </div>
      </div>

      <RoundOutcomeBoard session={session} />

      <div className="panel">
        <div className="panel__header">
          <p className="eyebrow">Assignments so far</p>
          <h2>{currentWinner.name}&apos;s ledger</h2>
        </div>
        <div className="summary-list">
          {round.assignments
            .filter((assignment) => assignment.fromPlayerId === currentWinner.id)
            .map((assignment, index) => {
              const targetPlayer = getPlayerById(session, assignment.toPlayerId);
              return (
                <div className="summary-row" key={`${assignment.toPlayerId}-${index}`}>
                  <strong>{targetPlayer?.name}</strong>
                  <span>{assignment.segmentCount} segments</span>
                  <span>{assignment.shot ? 'Shot assigned' : 'No shot'}</span>
                </div>
              );
            })}
          {round.assignments.filter((assignment) => assignment.fromPlayerId === currentWinner.id)
            .length === 0 ? <p className="muted-copy">Nothing assigned yet.</p> : null}
        </div>
      </div>
    </section>
  );
}

function RoundOutcomeBoard({ session }: { session: SessionState }) {
  const round = getCurrentRound(session);
  const winnerHorse = getHorseById(round, round.winnerHorseId);

  return (
    <div className="panel">
      <div className="panel__header">
        <p className="eyebrow">Outcome board</p>
        <h2>{winnerHorse?.name} came home first</h2>
      </div>
      <div className="summary-list">
        {round.participantIds.map((playerId) => {
          const player = getPlayerById(session, playerId);
          const bet = getBetForPlayer(round, playerId);
          const punishment = getRoundPunishmentTotals(round, playerId);
          const won = bet?.horseId === round.winnerHorseId;

          return (
            <div className="summary-row" key={playerId}>
              <strong>{player?.name}</strong>
              <span>{bet ? `${bet.segmentStake} segs${bet.shotStake ? ' + shot' : ''}` : 'No bet'}</span>
              <span>{won ? 'Won the bet' : 'Lost the bet'}</span>
              <span>
                {won
                  ? `${round.outgoingWinnerSegmentsByPlayer[playerId]} segments to assign${
                      round.outgoingWinnerShotsByPlayer[playerId] ? ' + shot' : ''
                    }`
                  : `${punishment.segments} segments${punishment.shots ? ` + ${punishment.shots} shot` : ''}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
