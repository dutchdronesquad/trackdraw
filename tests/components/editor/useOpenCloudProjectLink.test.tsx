// @vitest-environment happy-dom
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useOpenCloudProjectLink } from "@/components/editor/useOpenCloudProjectLink";
afterEach(cleanup);
it("waits for local persistence and account readiness and opens a cloud project only once", async () => {
  const open = vi.fn(async () => true),
    onOpened = vi.fn();
  const options = {
    projectId: "draft",
    userId: "user",
    ready: false,
    open,
    onOpened,
  };
  const hook = renderHook((props) => useOpenCloudProjectLink(props), {
    initialProps: options,
  });
  expect(open).not.toHaveBeenCalled();
  hook.rerender({ ...options, ready: true });
  await waitFor(() => expect(onOpened).toHaveBeenCalledOnce());
  hook.rerender({ ...options, ready: true, open: vi.fn(async () => true) });
  expect(open).toHaveBeenCalledExactlyOnceWith("draft");
});
it("leaves anonymous and read-only/no-link editing untouched and keeps failed links available", async () => {
  const open = vi.fn(async () => false),
    onOpened = vi.fn();
  const options = {
    projectId: "draft" as string | null,
    userId: null as string | null,
    ready: true,
    open,
    onOpened,
  };
  const hook = renderHook((props) => useOpenCloudProjectLink(props), {
    initialProps: options,
  });
  expect(open).not.toHaveBeenCalled();
  hook.rerender({ ...options, userId: "user", projectId: null });
  expect(open).not.toHaveBeenCalled();
  hook.rerender({ ...options, userId: "user" });
  await waitFor(() => expect(open).toHaveBeenCalledOnce());
  expect(onOpened).not.toHaveBeenCalled();
});
