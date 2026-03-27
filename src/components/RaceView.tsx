import { useEffect, useState } from 'react';
import { RaceHorseSprite } from './RaceHorseSprite';
import { getCurrentRound, getHorseById, getPlayerById } from '../lib/game';
import {
  getRaceFinishLeft,
  getRaceHorseVisuals,
  getRaceStandings
} from '../lib/race';
import type { SessionState } from '../lib/types';
import { useRaceAnimation } from '../hooks/useRaceAnimation';

interface RaceViewProps {
  session: SessionState;
  onRevealResults: () => void;
}

const COUNTDOWN_STEPS = ['3', '2', '1', 'go'] as const;
const COUNTDOWN_INTERVAL_MS = 700;
const GO_HOLD_MS = 220;
const WINNER_PAUSE_MS = 1700;

const formatRaceClock = (durationSeconds: number, progress: number) => {
  const remainingSeconds = Math.max(0, durationSeconds * (1 - progress));

  if (remainingSeconds >= 10) {
    return `${Math.ceil(remainingSeconds)}s left`;
  }

  return `${remainingSeconds.toFixed(1)}s left`;
};

const formatStanding = (position: number) => {
  if (position === 1) {
    return '1st';
  }

  if (position === 2) {
    return '2nd';
  }

  if (position === 3) {
    return '3rd';
  }

  return `${position}th`;
};

export function RaceView({ session, onRevealResults }: RaceViewProps) {
  const round = getCurrentRound(session);
  const [countdownLabel, setCountdownLabel] = useState<(typeof COUNTDOWN_STEPS)[number] | null>(
    COUNTDOWN_STEPS[0]
  );
  const [raceStarted, setRaceStarted] = useState(false);
  const { progress, isFinished, skipToFinish } = useRaceAnimation(
    round.raceLengthSeconds,
    raceStarted
  );
  const winnerHorse = getHorseById(round, round.winnerHorseId);
  const motionMultiplier = session.hostSettings.reducedRaceMotion ? 0.45 : 1;
  const standings = getRaceStandings(round, progress);
  const standingMap = new Map(
    standings.map((standing, index) => [standing.horseId, index + 1])
  );
  const finishLineLeft = getRaceFinishLeft();
  const backersByHorse = Object.fromEntries(
    round.horses.map((horse) => [
      horse.id,
      round.bets
        .filter((bet) => bet.horseId === horse.id)
        .map((bet) => getPlayerById(session, bet.playerId)?.name ?? 'Unknown')
    ])
  ) as Record<string, string[]>;
  const isCountdownActive = countdownLabel !== null;
  const raceClockLabel = isCountdownActive
    ? countdownLabel === 'go'
      ? 'go'
      : `starts in ${countdownLabel}`
    : formatRaceClock(round.raceLengthSeconds, progress);

  useEffect(() => {
    setCountdownLabel(COUNTDOWN_STEPS[0]);
    setRaceStarted(false);

    const timeoutIds = COUNTDOWN_STEPS.map((step, index) =>
      window.setTimeout(() => {
        setCountdownLabel(step);

        if (step === 'go') {
          setRaceStarted(true);
        }
      }, index * COUNTDOWN_INTERVAL_MS)
    );
    const clearCountdownId = window.setTimeout(() => {
      setCountdownLabel(null);
    }, (COUNTDOWN_STEPS.length - 1) * COUNTDOWN_INTERVAL_MS + GO_HOLD_MS);

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      window.clearTimeout(clearCountdownId);
    };
  }, [round.id]);

  useEffect(() => {
    if (!isFinished) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onRevealResults();
    }, WINNER_PAUSE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isFinished, onRevealResults]);

  return (
    <section className="phase-shell">
      <div className="panel panel--hero race-panel">
        <div className="panel__header">
          <p className="eyebrow">Round {round.roundNumber}</p>
          <h1>the race is on</h1>
        </div>

        <div className="race-topline">
          <div className="race-progress">
            <span>race progress</span>
            <div
              className="race-progress__track"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              role="progressbar"
            >
              <div
                className="race-progress__fill"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>

          <div className="race-topline__meta">
            <span className="status-chip">
              {raceClockLabel}
            </span>
            <div className="race-leaderboard-strip" aria-label="Live race order">
              {standings.slice(0, 3).map((standing, index) => (
                <span
                  key={standing.horseId}
                  className={`race-leaderboard-strip__entry ${
                    index === 0 ? 'is-front' : ''
                  }`}
                >
                  {formatStanding(index + 1)} {standing.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="race-stage">
          {isCountdownActive ? (
            <div className="race-countdown" aria-live="polite">
              <span
                className={`race-countdown__value ${
                  countdownLabel === 'go' ? 'is-go' : ''
                }`}
              >
                {countdownLabel}
              </span>
              <span className="race-countdown__copy">
                {countdownLabel === 'go' ? 'they are off' : 'get ready'}
              </span>
            </div>
          ) : null}
          <div className="race-stage__background race-stage__background--far" />
          <div className="race-stage__background race-stage__background--near" />
          <div
            className="race-stage__finish-marker"
            style={{ left: `${finishLineLeft}%` }}
          >
            <span className="race-stage__finish-flag">finish</span>
            <span className="race-stage__finish-pole" />
          </div>
          <div
            className="race-stage__finish-line"
            style={{ left: `${finishLineLeft}%` }}
            aria-hidden="true"
          >
            <span className="race-stage__finish-line-strip" />
          </div>

          {round.horses.map((horse) => {
            const raceVisuals = getRaceHorseVisuals(round, horse, progress);
            const position = standingMap.get(horse.id) ?? round.horses.length;
            const supporters = backersByHorse[horse.id] ?? [];

            return (
              <div
                className={`lane ${position === 1 ? 'is-leading' : ''} ${
                  isFinished && horse.id === round.winnerHorseId ? 'is-winner' : ''
                }`}
                key={horse.id}
              >
                <div className="lane__meta">
                  <div className="lane__meta-copy">
                    <div className="lane__label">{horse.name}</div>
                    <div className="lane__supporters">
                      {supporters.length > 0 ? (
                        supporters.map((supporter) => (
                          <span className="lane__supporter" key={`${horse.id}-${supporter}`}>
                            {supporter}
                          </span>
                        ))
                      ) : (
                        <span className="lane__supporter lane__supporter--empty">
                          no backers
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="lane__position">
                    <span className="lane__position-rank">{formatStanding(position)}</span>
                    <div className="lane__mini-meter">
                      <div
                        className="lane__mini-fill"
                        style={{ width: `${Math.round(raceVisuals.trackProgress * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="lane__track">
                  <div className="lane__track-line" />

                  <div
                    className={`horse-rig ${raceVisuals.isFalling ? 'is-falling' : ''}`}
                    style={{
                      left: `${raceVisuals.raceLeft}%`,
                      transform: `translate3d(-50%, ${
                        (raceVisuals.jumpLift * -1 + raceVisuals.bounce) * motionMultiplier
                      }px, 0) scale(${raceVisuals.scale}) rotate(${raceVisuals.leanDegrees}deg)`
                    }}
                  >
                    <div
                      className="horse-rig__dust"
                      style={{
                        opacity:
                          raceStarted && !isFinished
                            ? raceVisuals.dustAmount * motionMultiplier
                            : 0
                      }}
                    />
                    <RaceHorseSprite
                      laneNumber={horse.lane + 1}
                      isWinner={horse.id === round.winnerHorseId}
                      isFalling={raceVisuals.isFalling}
                      isRunning={raceStarted && !isFinished}
                      reducedMotion={session.hostSettings.reducedRaceMotion}
                      speedPulse={raceVisuals.speedPulse}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isFinished ? (
          <div className="winner-banner" aria-live="polite">
            <span>winner</span>
            <strong>{winnerHorse?.name}</strong>
            <small>holding for a beat before results</small>
          </div>
        ) : raceStarted ? (
          <button
            type="button"
            className="button button--secondary"
            onClick={skipToFinish}
          >
            Reveal result now
          </button>
        ) : null}
      </div>
    </section>
  );
}
