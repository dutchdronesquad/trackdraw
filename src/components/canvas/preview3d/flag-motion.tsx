"use client";

import { useFrame, useThree } from "@react-three/fiber";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { REDUCED_MOTION_QUERY } from "@/lib/track/beachflag";

type SetFlagTime = (seconds: number | null) => void;

const FlagMotionContext = createContext<
  ((setTime: SetFlagTime) => () => void) | null
>(null);

/** Static scenes omit this provider. A pause holds the current pose. */
export function FlagMotion({
  children,
  playing = true,
}: {
  children: ReactNode;
  playing?: boolean;
}) {
  const [flags] = useState(() => new Set<SetFlagTime>());
  const clock = useRef({ elapsed: 0, reduced: true });
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const updatePreference = () => {
      clock.current.reduced = query.matches;
      for (const setTime of flags)
        setTime(clock.current.reduced ? null : clock.current.elapsed);
      invalidate();
    };
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, [clock, flags, invalidate]);

  useFrame((_, delta) => {
    if (
      !playing ||
      clock.current.reduced ||
      document.hidden ||
      flags.size === 0
    )
      return;
    clock.current.elapsed += Math.min(delta, 0.05);
    for (const setTime of flags) setTime(clock.current.elapsed);
  });

  const register = useCallback(
    (setTime: SetFlagTime) => {
      flags.add(setTime);
      setTime(clock.current.reduced ? null : clock.current.elapsed);
      return () => {
        flags.delete(setTime);
      };
    },
    [flags]
  );

  return (
    <FlagMotionContext.Provider value={register}>
      {children}
    </FlagMotionContext.Provider>
  );
}

export function useFlagMotion(setTime: SetFlagTime) {
  const register = useContext(FlagMotionContext);
  useEffect(() => register?.(setTime), [register, setTime]);
}
