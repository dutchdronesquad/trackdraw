// Mirror Electron's native download boundary for the shared editor exporters,
// including detached anchors and object URLs revoked immediately after click().
export function installNativeDownloads(saveExport, onError) {
  const objects = new Map();
  const create = URL.createObjectURL.bind(URL);
  const revoke = URL.revokeObjectURL.bind(URL);
  const click = HTMLAnchorElement.prototype.click;
  const dispatch = HTMLAnchorElement.prototype.dispatchEvent;
  URL.createObjectURL = (blob) => {
    const url = create(blob);
    objects.set(url, blob);
    return url;
  };
  URL.revokeObjectURL = (url) => {
    objects.delete(url);
    return revoke(url);
  };
  function exportAnchor(anchor) {
    if (!anchor.hasAttribute("download") || !/^(blob:|data:)/.test(anchor.href))
      return false;
    const blob = objects.get(anchor.href);
    const href = anchor.href;
    const name = anchor.download || "trackdraw-export";
    void (async () => {
      const data = blob || (await (await fetch(href)).blob());
      if (data.size > 128 * 1024 * 1024)
        throw new Error("Export exceeds the 128 MiB desktop limit.");
      await saveExport({
        name,
        bytes: Array.from(new Uint8Array(await data.arrayBuffer())),
      });
    })().catch(onError);
    return true;
  }
  HTMLAnchorElement.prototype.click = function () {
    if (!exportAnchor(this)) click.call(this);
  };
  // jsPDF/FileSaver dispatches a MouseEvent on a detached anchor. It never
  // reaches document's capture listener and does not call anchor.click().
  HTMLAnchorElement.prototype.dispatchEvent = function (event) {
    if (event.type === "click" && exportAnchor(this)) {
      event.preventDefault();
      return false;
    }
    return dispatch.call(this, event);
  };
  const capture = (event) => {
    const anchor =
      event.target instanceof Element
        ? event.target.closest("a[download]")
        : null;
    if (anchor && exportAnchor(anchor)) event.preventDefault();
  };
  document.addEventListener("click", capture, true);
  return () => {
    document.removeEventListener("click", capture, true);
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
    HTMLAnchorElement.prototype.click = click;
    HTMLAnchorElement.prototype.dispatchEvent = dispatch;
  };
}
