"use client";
import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/store/editor";
import { useProjectLibrary } from "@/store/project-library";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";
import type { TrackDesign } from "@/lib/types";
import type { TeamSummary } from "@/lib/teams";
import type { ProjectEditor } from "@/lib/team-projects";
import {
  teamEditingRequest,
  teamProjectRequest,
  TeamProjectRequestError,
} from "./team-project-client";

type Loaded = {
  team: TeamSummary;
  project: { design: TrackDesign; revision: number };
  editing: ProjectEditor | null;
};
type Lease = { sessionId: string; expiresAt: string };
type Status =
  | "loading"
  | "viewing"
  | "acquiring"
  | "editing"
  | "saving"
  | "lost"
  | "conflict"
  | "unavailable";
const snapshot = (design: TrackDesign) =>
  JSON.stringify(serializeDesign(design));

// A controller per account/project lifetime fences every late response, including StrictMode cleanup.
export function useTeamProjectEditing(
  userId: string | undefined,
  teamId: string,
  projectId: string
) {
  const [state, setState] = useState<{
    userId?: string;
    loaded: Loaded | null;
    status: Status;
    dirty: boolean;
    recovery: TrackDesign | null;
  }>({ loaded: null, status: "loading", dirty: false, recovery: null });
  const actions = useRef({
    acquire: async () => {},
    release: async () => false,
    save: async () => {},
    reload: async () => {},
  });
  useEffect(() => {
    if (!userId) return;
    let active = true;
    let loaded: Loaded | null = null;
    let lease: Lease | null = null;
    let status: Status = "loading";
    let dirty = false;
    let recovery: TrackDesign | null = null;
    let saved = "";
    let busy = false;
    let renewalDue = false;
    let reading = false;
    let acquiring = false;
    let deadline = 0;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const abort = new AbortController();
    const publish = () => {
      if (active) setState({ userId, loaded, status, dirty, recovery });
    };
    const replace = (design: TrackDesign) => {
      saved = snapshot(design);
      useEditor.getState().replaceDesign(design);
      useEditor.temporal.getState().clear();
      dirty = false;
    };
    const releaseToken = (token: Lease) => {
      void fetch("/api/team-projects/editing", {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "release",
          teamId,
          projectId,
          sessionId: token.sessionId,
        }),
      }).catch(() => {});
    };
    const read = async () => {
      if (!active || reading || lease || acquiring) return;
      reading = true;
      try {
        const result = await teamProjectRequest<Loaded>(
          { teamId, projectId },
          undefined,
          abort.signal
        );
        if (!active || lease || acquiring) return;
        loaded = result;
        if (!recovery) replace(result.project.design);
        useProjectLibrary.getState().select(userId, teamId);
        if (!recovery) status = "viewing";
        publish();
      } catch (error) {
        if (!active || lease || acquiring) return;
        if (
          error instanceof TeamProjectRequestError &&
          ["unauthorized", "not_found"].includes(error.code)
        ) {
          recovery = null;
          useProjectLibrary.getState().forget(userId);
        }
        loaded = null;
        status = "unavailable";
        replace(createDefaultDesign());
        publish();
      } finally {
        reading = false;
      }
    };
    const lose = (error: unknown) => {
      if (!active) return;
      if (dirty) recovery = useEditor.getState().track.design;
      lease = null;
      clearTimeout(debounce);
      status =
        error instanceof TeamProjectRequestError && error.code === "conflict"
          ? "conflict"
          : "lost";
      publish();
      if (error instanceof TeamProjectRequestError) void read();
    };
    const save = async () => {
      if (!active || !lease || busy || !dirty || !loaded) return;
      if (performance.now() >= deadline) {
        lose(new Error("expired"));
        return;
      }
      if (
        useEditor.getState().session.interactionSessionDepth > 0 ||
        useEditor.getState().session.historyPaused
      )
        return;
      const currentLease = lease;
      const design = useEditor.getState().track.design;
      const submitted = snapshot(design);
      busy = true;
      status = "saving";
      publish();
      try {
        const result = await teamEditingRequest<{ revision: number }>(
          {
            action: "save",
            teamId,
            projectId,
            sessionId: currentLease.sessionId,
            revision: loaded.project.revision,
            design: serializeDesign(design),
          },
          abort.signal
        );
        if (!active || lease !== currentLease) return;
        loaded = { ...loaded, project: { design, revision: result.revision } };
        saved = submitted;
        dirty = snapshot(useEditor.getState().track.design) !== saved;
        status = "editing";
        publish();
      } catch (error) {
        lose(error);
      } finally {
        busy = false;
        if (renewalDue && lease) void renew();
      }
    };
    const renew = async () => {
      if (!active || !lease) return;
      if (busy) {
        renewalDue = true;
        return;
      }
      renewalDue = false;
      const currentLease = lease;
      const started = performance.now();
      busy = true;
      try {
        const result = await teamEditingRequest<{ lease: Lease }>(
          {
            action: "renew",
            teamId,
            projectId,
            sessionId: currentLease.sessionId,
          },
          abort.signal
        );
        if (!active || lease !== currentLease) return;
        lease = result.lease;
        deadline = started + 75_000;
      } catch (error) {
        lose(error);
      } finally {
        busy = false;
      }
    };
    actions.current = {
      save,
      reload: async () => {
        if (lease || acquiring || busy) return;
        recovery = null;
        status = "loading";
        publish();
        await read();
      },
      acquire: async () => {
        if (
          !active ||
          lease ||
          busy ||
          acquiring ||
          recovery ||
          !loaded ||
          loaded.team.role === "viewer"
        )
          return;
        acquiring = true;
        status = "acquiring";
        publish();
        const started = performance.now();
        try {
          const result = await teamEditingRequest<{
            lease: Lease;
            project: Loaded["project"];
          }>({ action: "acquire", teamId, projectId }, abort.signal);
          if (!active) {
            releaseToken(result.lease);
            return;
          }
          // Never resume an old draft: acquisition always starts from this server response.
          lease = result.lease;
          deadline = started + 75_000;
          if (performance.now() >= deadline) {
            releaseToken(lease);
            lease = null;
            status = "lost";
            publish();
            return;
          }
          loaded = { ...loaded, project: result.project };
          replace(result.project.design);
          status = "editing";
          publish();
        } catch {
          if (active) {
            status = "viewing";
            publish();
          }
        } finally {
          acquiring = false;
          if (!lease) void read();
        }
      },
      release: async () => {
        if (!lease || busy) return false;
        await save();
        if (!lease || dirty || busy) return false;
        const currentLease = lease;
        lease = null;
        status = "viewing";
        publish();
        try {
          await teamEditingRequest(
            {
              action: "release",
              teamId,
              projectId,
              sessionId: currentLease.sessionId,
            },
            abort.signal
          );
        } catch {
          /* Bounded expiry remains the fallback. */
        }
        await read();
        return true;
      },
    };
    const unsubscribe = useEditor.subscribe((next, previous) => {
      if (!lease || next.track.design === previous.track.design) return;
      dirty = snapshot(next.track.design) !== saved;
      publish();
      clearTimeout(debounce);
      debounce = setTimeout(() => void save(), 750);
    });
    const tick = setInterval(() => {
      if (lease) {
        if (performance.now() >= deadline) {
          lose(new Error("expired"));
          return;
        }
        if (!busy) void save();
      }
    }, 1000);
    const heartbeat = setInterval(() => {
      if (lease) void renew();
      else void read();
    }, 20_000);
    const focus = () => {
      if (lease) void renew();
      else void read();
    };
    const visibility = () => {
      if (document.visibilityState === "visible") focus();
    };
    const offline = () => {
      if (lease) lose(new Error("offline"));
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty || recovery) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      if (!dirty && !recovery) return;
      const target = event.target;
      const anchor =
        target instanceof Element ? target.closest("a[href]") : null;
      if (
        anchor &&
        !anchor.hasAttribute("download") &&
        anchor.getAttribute("target") !== "_blank"
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "s" && lease) {
        event.preventDefault();
        void save();
      }
    };
    const pagehide = () => {
      if (lease) releaseToken(lease);
    };
    document.addEventListener("click", click, true);
    window.addEventListener("keydown", keydown);
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("trackdraw.teams")
        : null;
    if (channel) channel.onmessage = focus;
    window.addEventListener("trackdraw:team-access-changed", focus);
    window.addEventListener("focus", focus);
    window.addEventListener("offline", offline);
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("pagehide", pagehide);
    document.addEventListener("visibilitychange", visibility);
    void read();
    return () => {
      active = false;
      if (lease) releaseToken(lease);
      abort.abort();
      unsubscribe();
      clearTimeout(debounce);
      clearInterval(tick);
      clearInterval(heartbeat);
      document.removeEventListener("click", click, true);
      window.removeEventListener("keydown", keydown);
      channel?.close();
      window.removeEventListener("trackdraw:team-access-changed", focus);
      window.removeEventListener("focus", focus);
      window.removeEventListener("offline", offline);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("pagehide", pagehide);
      document.removeEventListener("visibilitychange", visibility);
      useEditor.getState().replaceDesign(createDefaultDesign());
      useEditor.temporal.getState().clear();
    };
  }, [userId, teamId, projectId]);
  return {
    ...state,
    recovery: state.userId === userId ? state.recovery : null,
    dirty: state.userId === userId && state.dirty,
    loaded: state.userId === userId ? state.loaded : null,
    editing:
      state.userId === userId &&
      (state.status === "editing" || state.status === "saving"),
    acquire: () => actions.current.acquire(),
    release: () => actions.current.release(),
    save: () => actions.current.save(),
    reload: () => actions.current.reload(),
  };
}
