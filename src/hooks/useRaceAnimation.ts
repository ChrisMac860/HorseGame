import { useEffect, useRef, useState } from 'react';

export const useRaceAnimation = (
  durationSeconds: number,
  shouldRun = true
) => {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (!shouldRun) {
      setProgress(0);
      startedAtRef.current = null;
      return;
    }

    setProgress(0);
    startedAtRef.current = null;

    const animate = (timestamp: number) => {
      if (startedAtRef.current === null) {
        startedAtRef.current = timestamp;
      }

      const elapsed = timestamp - startedAtRef.current;
      const nextProgress = Math.min(elapsed / (durationSeconds * 1000), 1);
      setProgress(nextProgress);

      if (nextProgress < 1) {
        frameRef.current = window.requestAnimationFrame(animate);
      }
    };

    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [durationSeconds, shouldRun]);

  return {
    progress,
    isFinished: shouldRun && progress >= 1,
    skipToFinish: () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      setProgress(1);
    }
  };
};
