import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_LAYOUT_MAX_WIDTH = 1023;

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

// Phones can cross the narrow mobile breakpoint in landscape. Keep the mobile
// shell active on coarse-pointer devices until the desktop layout takes over.
export function useIsMobileLayout() {
  const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px), (max-width: ${MOBILE_LAYOUT_MAX_WIDTH}px) and (pointer: coarse)`;
  const [isMobileLayout, setIsMobileLayout] = React.useState<boolean>(
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsMobileLayout(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return isMobileLayout;
}

export function useIsMobileLandscape() {
  const query = `(max-width: ${MOBILE_LAYOUT_MAX_WIDTH}px) and (pointer: coarse) and (orientation: landscape)`;
  const [isMobileLandscape, setIsMobileLandscape] = React.useState<boolean>(
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsMobileLandscape(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return isMobileLandscape;
}
