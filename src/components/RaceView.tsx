import { useEffect } from 'react';
import { getCurrentRound, getHorseById } from '../lib/game';
import { getBackgroundShift, getRaceHorseVisuals } from '../lib/race';
import type { SessionState } from '../lib/types';
import { useRaceAnimation } from '../hooks/useRaceAnimation';

interface RaceViewProps {
  session: SessionState;
  onRevealResults: () => void;
}

export function RaceView({ session, onRevealResults }: RaceViewProps) {
  const round = getCurrentRound(session);
  const { progress, isFinished, skipToFinish } = useRaceAnimation(round.raceLengthSeconds);
  const winnerHorse = getHorseById(round, round.winnerHorseId);
  const motionMultiplier = session.hostSettings.reducedRaceMotion ? 0.4 : 1;

  useEffect(() => {
    if (!isFinished) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onRevealResults();
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [isFinished, onRevealResults]);

  return (
    <section className="phase-shell">
      <div className="panel panel--hero race-panel">
        <div className="panel__header">
          <p className="eyebrow">Round {round.roundNumber}</p>
          <h1>The race is on</h1>
        </div>

        <div className="race-progress">
          <span>Finish line</span>
          <div className="race-progress__track">
            <div
              className="race-progress__fill"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>

        <div className="race-stage">
          <div
            className="race-stage__background race-stage__background--far"
            style={{
              transform: `translateX(-${getBackgroundShift(progress) * motionMultiplier}%)`
            }}
          />
          <div
            className="race-stage__background race-stage__background--near"
            style={{
              transform: `translateX(-${getBackgroundShift(progress) * 1.5 * motionMultiplier}%)`
            }}
          />

          {round.horses.map((horse) => {
            const visuals = getRaceHorseVisuals(round, horse, progress);

            return (
              <div className="lane" key={horse.id}>
                <div className="lane__label">{horse.name}</div>
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                  className="lane__hurdle"
                  style={{
                      left: `${
                        36 + index * 24 - getBackgroundShift(progress) * 0.8 * motionMultiplier
                      }%`
                    }}
                  />
                ))}
                <div
                  className={`horse-sprite ${visuals.isFalling ? 'is-falling' : ''}`}
                  style={{
                    left: `${50 + visuals.relativeOffset}%`,
                    transform: `translate(-50%, ${
                      visuals.jumpLift * -1 * motionMultiplier +
                      visuals.bounce * motionMultiplier
                    }px) scale(${visuals.scale})`
                  }}
                >
                  <span className="horse-sprite__body">🐎</span>
                </div>
              </div>
            );
          })}
        </div>

        {isFinished ? (
          <div className="winner-banner">
            <span>Winner</span>
            <strong>{winnerHorse?.name}</strong>
          </div>
        ) : (
          <button
            type="button"
            className="button button--secondary"
            onClick={skipToFinish}
          >
            Reveal result now
          </button>
        )}
      </div>
    </section>
  );
}
