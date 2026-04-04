"use client";

import { useEffect, useRef, useState } from "react";

type AuthEmailPreviewFrameProps = {
  html: string;
  title: string;
  className?: string;
};

const MIN_HEIGHT = 520;

export function AuthEmailPreviewFrame({
  html,
  title,
  className,
}: AuthEmailPreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(MIN_HEIGHT);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    let animationFrame = 0;
    let resizeObserver: ResizeObserver | null = null;

    const updateHeight = () => {
      const doc = iframe.contentDocument;
      const body = doc?.body;
      const root = doc?.documentElement;

      if (!body || !root) {
        return;
      }

      const nextHeight = Math.max(
        MIN_HEIGHT,
        body.scrollHeight,
        body.offsetHeight,
        root.scrollHeight,
        root.offsetHeight
      );

      setHeight(nextHeight);
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updateHeight);
    };

    const attachObservers = () => {
      const doc = iframe.contentDocument;
      const body = doc?.body;

      if (!body) {
        return;
      }

      resizeObserver?.disconnect();
      resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(body);
      window.addEventListener("resize", scheduleUpdate);
      scheduleUpdate();
    };

    iframe.addEventListener("load", attachObservers);
    attachObservers();

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      iframe.removeEventListener("load", attachObservers);
    };
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      srcDoc={html}
      style={{ height }}
      className={className}
    />
  );
}
