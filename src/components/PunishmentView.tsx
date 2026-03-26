import {
  canConfirmPunishment,
  getCurrentRound,
  getPlayerById
} from '../lib/game';
import { formatShotLabel } from '../lib/utils';
import type { SessionState } from '../lib/types';

interface PunishmentViewProps {
  session: SessionState;
  onOpenExtraBeer: (playerId: string) => void;
  onConfirmSegments: (playerId: string) => void;
  onConfirmShots: (playerId: string) => void;
  onTapOut: (playerId: string) => void;
  onConfirmRound: () => void;
}

export function PunishmentView({
  session,
  onOpenExtraBeer,
  onConfirmSegments,
  onConfirmShots,
  onTapOut,
  onConfirmRound
}: PunishmentViewProps) {
  const round = getCurrentRound(session);

  return (
    <section className="phase-shell">
      <div className="panel panel--hero">
        <div className="panel__header">
          <p className="eyebrow">Punishment resolution</p>
          <h1>Clear the round</h1>
        </div>
        <p>Each affected player has to resolve their own punishment before the round can lock.</p>
      </div>

      <div className="punishment-grid">
        {round.participantIds.map((playerId) => {
          const player = getPlayerById(session, playerId);
          const punishment = round.punishmentByPlayer[playerId];

          if (!player || !punishment) {
            return null;
          }

          const isShortOnSegments =
            !punishment.segmentsResolved &&
            punishment.segmentsRequired > player.currentSegments;
          const stillShortAfterExtra =
            isShortOnSegments &&
            player.usedExtraBeerThisRound &&
            punishment.segmentsRequired > player.currentSegments;
          const canUseExtraBeer =
            isShortOnSegments && !player.usedExtraBeerThisRound;

          return (
            <article
              key={playerId}
              className={`panel punishment-card ${punishment.tappedOut ? 'is-out' : ''}`}
            >
              <div className="punishment-card__header">
                <h2>{player.name}</h2>
                <span>{player.currentSegments} segments available</span>
              </div>

              <div className="punishment-card__stats">
                <span>
                  Needs {punishment.segmentsRequired} segments
                </span>
                <span>
                  {punishment.shotCountRequired > 0
                    ? formatShotLabel(punishment.shotCountRequired)
                    : 'No shots'}
                </span>
              </div>

              {isShortOnSegments ? (
                <div className="validation-list">
                  <p>
                    {player.name} is short on segments for this round.
                  </p>
                  {stillShortAfterExtra ? (
                    <p>Even with an extra beer, they cannot cover the total and must tap out.</p>
                  ) : null}
                </div>
              ) : null}

              <div className="punishment-card__actions">
                <button
                  type="button"
                  className="button button--secondary"
                  disabled={
                    punishment.segmentsResolved ||
                    punishment.segmentsRequired === 0 ||
                    isShortOnSegments
                  }
                  onClick={() => onConfirmSegments(playerId)}
                >
                  {punishment.segmentsResolved ? 'Segments cleared' : 'Confirm segments taken'}
                </button>

                <button
                  type="button"
                  className="button button--secondary"
                  disabled={punishment.shotsResolved || punishment.shotCountRequired === 0}
                  onClick={() => onConfirmShots(playerId)}
                >
                  {punishment.shotsResolved
                    ? 'Shots cleared'
                    : `Mark ${formatShotLabel(punishment.shotCountRequired)} taken`}
                </button>

                <button
                  type="button"
                  className="button button--ghost"
                  disabled={!canUseExtraBeer}
                  onClick={() => onOpenExtraBeer(playerId)}
                >
                  Open extra beer (+8)
                </button>

                <button
                  type="button"
                  className="button button--danger"
                  disabled={!isShortOnSegments}
                  onClick={() => onTapOut(playerId)}
                >
                  Tap out
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="action-row">
        <button
          type="button"
          className="button button--primary"
          onClick={onConfirmRound}
          disabled={!canConfirmPunishment(round)}
        >
          Confirm round summary
        </button>
      </div>
    </section>
  );
}
