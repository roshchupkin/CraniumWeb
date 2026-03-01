import { useState, useCallback } from 'react';
import type { Landmarks } from '../lib/api';

export function useLandmarkPicker() {
  const [landmarks, setLandmarks] = useState<Landmarks | null>(null);
  const [pickingTarget, setPickingTarget] = useState<'nasion' | 'left_tragus' | 'right_tragus' | null>(null);

  const startPicking = useCallback((target: 'nasion' | 'left_tragus' | 'right_tragus') => {
    setPickingTarget(target);
  }, []);

  const pick = useCallback((point: [number, number, number]) => {
    if (!pickingTarget) return;
    setLandmarks((prev) => {
      const next = prev ? { ...prev } : {} as Landmarks;
      next[pickingTarget] = point;
      return next;
    });
    setPickingTarget(null);
  }, [pickingTarget]);

  const clear = useCallback(() => {
    setLandmarks(null);
    setPickingTarget(null);
  }, []);

  const hasAllThree = !!(
    landmarks &&
    landmarks.nasion &&
    landmarks.left_tragus &&
    landmarks.right_tragus
  );

  return {
    landmarks,
    pickingTarget,
    startPicking,
    pick,
    clear,
    hasAllThree,
  };
}
