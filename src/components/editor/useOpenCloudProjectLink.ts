"use client";
import { useEffect, useRef } from "react";

/** Reuse the cloud opener, which snapshots the current design before replacement. */
export function useOpenCloudProjectLink({
  projectId,
  userId,
  ready,
  open,
  onOpened,
}: {
  projectId: string | null;
  userId: string | null;
  ready: boolean;
  open: (id: string) => Promise<boolean>;
  onOpened: () => void;
}) {
  const attempted = useRef<string | null>(null);
  useEffect(() => {
    if (!projectId || !userId || !ready) return;
    const key = `${userId}:${projectId}`;
    if (attempted.current === key) return;
    attempted.current = key;
    void open(projectId).then((opened) => {
      if (opened) onOpened();
    });
  }, [projectId, userId, ready, open, onOpened]);
}
