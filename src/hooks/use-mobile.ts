import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    typeof window !== "undefined"
      ? window.innerWidth < MOBILE_BREAKPOINT
      : undefined
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

// Unlike useIsMobile, this stays stable across a device rotation: a phone's
// width can cross the mobile breakpoint in landscape even though it's still
// a touch device, which flips touch-only interaction behavior mid-session.
export function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = React.useState<boolean>(
    typeof window !== "undefined"
      ? window.matchMedia("(pointer: coarse)").matches
      : false
  );

  React.useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)");
    const onChange = () => setIsTouchDevice(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isTouchDevice;
}
