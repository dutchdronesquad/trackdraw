import { useMemo, useSyncExternalStore } from "react";
import { toast } from "sonner";

const eventName = "desktop-poc:navigation";
for (const method of ["pushState", "replaceState"]) {
  const original = window.history[method].bind(window.history);
  window.history[method] = (...args) => {
    if (args[2]) {
      const url = new URL(args[2], window.location.href);
      const requested = url.searchParams.get("dialog");
      if (["import", "new-project"].includes(requested)) {
        url.searchParams.delete("dialog");
        original(args[0], args[1], `${url.pathname}${url.search}${url.hash}`);
        window.dispatchEvent(new Event(eventName));
        window.dispatchEvent(
          new CustomEvent("desktop:action", {
            detail: requested === "import" ? "import" : "new",
          })
        );
        return;
      }
      if (
        ["account", "share", "feedback"].includes(
          url.searchParams.get("dialog")
        )
      ) {
        toast.info(
          "Cloud, account and website functions are outside this offline POC."
        );
        return;
      }
    }
    original(...args);
    window.dispatchEvent(new Event(eventName));
  };
}

function subscribe(callback) {
  window.addEventListener(eventName, callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener("popstate", callback);
  };
}

function snapshot() {
  return window.location.href;
}

export function navigate(href, replace = false) {
  const url = new URL(href, window.location.href);
  const dialog = url.searchParams.get("dialog");
  if (
    url.protocol !== "trackdraw-poc:" ||
    url.hostname !== "desktop" ||
    url.pathname !== "/studio" ||
    ["account", "share", "feedback"].includes(dialog)
  ) {
    toast.info(
      "Cloud, account and website functions are outside this offline POC."
    );
    return;
  }
  window.history[replace ? "replaceState" : "pushState"](null, "", url);
}

const router = {
  push: (href) => navigate(href),
  replace: (href) => navigate(href, true),
  refresh: () => {},
  prefetch: () => {},
  back: () => window.history.back(),
  forward: () => window.history.forward(),
};

export function useRouter() {
  return router;
}
export function usePathname() {
  return new URL(useSyncExternalStore(subscribe, snapshot)).pathname;
}
export function useSearchParams() {
  const href = useSyncExternalStore(subscribe, snapshot);
  return useMemo(() => new URL(href).searchParams, [href]);
}
export function useParams() {
  return {};
}
