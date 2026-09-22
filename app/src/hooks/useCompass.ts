import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  NativeEventEmitter,
  NativeModules,
  Vibration,
} from 'react-native';
import { CompassDirection } from '../api/types';
import { headingToDirection, normalizeHeading } from '../utils/compass.util';

export interface CompassData {
  heading: number;
  direction: CompassDirection;
  isSensorAvailable: boolean;
  setManualHeading: (heading: number) => void;
  setManualDirection: (dir: CompassDirection) => void;
}

export interface UseCompassOptions {
  enabled?: boolean;
}

// Safely access NativeModules without triggering npm package proxy exception
const NativeCompassHeading = NativeModules?.CompassHeading;

/**
 * Checks if current heading crosses a major cardinal direction (0°, 90°, 180°, 270°)
 * and emits a tactile haptic pulse with debounce cooldown.
 * Only vibrates if the application is in the active foreground.
 */
function checkCardinalHaptic(
  heading: number,
  lastCardinalRef: React.MutableRefObject<number | null>,
  lastTimeRef: React.MutableRefObject<number>,
) {
  if (AppState.currentState !== 'active') {
    return;
  }

  const cardinalAngles = [0, 90, 180, 270];
  const tolerance = 2.5; // Snap window degrees
  const now = Date.now();

  const matched = cardinalAngles.find((angle) => {
    if (angle === 0) {
      return heading <= tolerance || heading >= 360 - tolerance;
    }
    return Math.abs(heading - angle) <= tolerance;
  });

  if (matched !== undefined) {
    if (lastCardinalRef.current !== matched || now - lastTimeRef.current > 600) {
      lastCardinalRef.current = matched;
      lastTimeRef.current = now;
      try {
        Vibration.vibrate(18);
      } catch (e) {
        // Silently ignore if vibration not supported
      }
    }
  } else {
    lastCardinalRef.current = null;
  }
}

export function useCompass(options?: UseCompassOptions): CompassData {
  const isEnabled = options?.enabled ?? true;
  const [heading, setHeading] = useState<number>(0);
  const [direction, setDirection] = useState<CompassDirection>('NORTH');
  const [isSensorAvailable, setIsSensorAvailable] = useState<boolean>(false);
  const [appState, setAppState] = useState<AppStateStatus>(() => AppState.currentState);
  const isManualOverride = useRef<boolean>(false);

  const lastCardinalRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Monitor AppState (active, background, inactive)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppState(nextState);
      if (nextState !== 'active') {
        try {
          Vibration.cancel();
        } catch (e) {}
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const shouldRunSensor = isEnabled && appState === 'active';

  useEffect(() => {
    if (!shouldRunSensor) {
      // Screen is not focused or app is backgrounded -> stop sensor immediately & cancel vibrations
      try {
        NativeCompassHeading?.stop?.();
      } catch (e) {}
      try {
        Vibration.cancel();
      } catch (e) {}
      lastCardinalRef.current = null;
      return;
    }

    if (
      !NativeCompassHeading ||
      typeof NativeCompassHeading.start !== 'function'
    ) {
      setIsSensorAvailable(false);
      return;
    }

    let mounted = true;
    let subscription: { remove: () => void } | null = null;
    const degreeUpdateRate = 2;

    try {
      const compassEventEmitter = new NativeEventEmitter(NativeCompassHeading);
      subscription = compassEventEmitter.addListener(
        'HeadingUpdated',
        (data: { heading?: number; accuracy?: number }) => {
          if (!mounted || isManualOverride.current || AppState.currentState !== 'active') return;

          const rawHeading = data?.heading;
          if (typeof rawHeading === 'number' && !isNaN(rawHeading)) {
            const norm = normalizeHeading(Math.round(rawHeading));
            setHeading(norm);
            setDirection(headingToDirection(norm));
            setIsSensorAvailable(true);
            checkCardinalHaptic(norm, lastCardinalRef, lastTimeRef);
          }
        },
      );

      // Start the native sensor updates
      NativeCompassHeading.start(degreeUpdateRate);
      setIsSensorAvailable(true);
    } catch (err) {
      console.warn('[useCompass] Sensor start error:', err);
      setIsSensorAvailable(false);
    }

    return () => {
      mounted = false;
      try {
        subscription?.remove();
      } catch (e) {
        // ignore
      }
      try {
        NativeCompassHeading?.stop?.();
      } catch (e) {
        // ignore
      }
      try {
        Vibration.cancel();
      } catch (e) {}
    };
  }, [shouldRunSensor]);

  const setManualHeading = (newHeading: number) => {
    isManualOverride.current = true;
    const norm = normalizeHeading(newHeading);
    setHeading(norm);
    setDirection(headingToDirection(norm));
    if (isEnabled && appState === 'active') {
      checkCardinalHaptic(norm, lastCardinalRef, lastTimeRef);
    }
  };

  const setManualDirection = (dir: CompassDirection) => {
    isManualOverride.current = true;
    setDirection(dir);
  };

  return {
    heading,
    direction,
    isSensorAvailable,
    setManualHeading,
    setManualDirection,
  };
}

