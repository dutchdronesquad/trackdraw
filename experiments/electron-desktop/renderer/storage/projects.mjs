import { parseDesign, serializeDesign } from "@/lib/track/design";
export {
  hasMeaningfulProjectContent,
  createProjectDuplicate,
  ensureUniqueProjectTitle,
} from "../../../../src/lib/projects";

let state = { designs: [], draft: null, restorePoints: [] };
let queue = Promise.resolve();
let lastError = null;
export function getError() {
  return lastError;
}
const listeners = new Set();
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function accept(next) {
  lastError = null;
  state = next;
  for (const listener of listeners) listener();
  return next;
}
export function getState() {
  return state;
}
export function listProjects() {
  return state.designs
    .map((design) => ({
      id: design.id,
      title: design.title || "Untitled",
      createdAt: design.createdAt,
      updatedAt: design.updatedAt,
      shapeCount: design.shapes.length,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export function loadProject(id) {
  return parseDesign(state.designs.find((design) => design.id === id)) ?? null;
}
export function listRestorePointsForProject(id) {
  return state.restorePoints.filter((point) => point.designId === id);
}
export function loadLocalDraft() {
  return state.draft ? parseDesign(state.draft) : null;
}
export function command(name, payload) {
  const operation = queue
    .then(() => window.trackdrawDesktop.projects(name, payload))
    .then(accept);
  queue = operation.catch((error) => {
    lastError = error;
    for (const listener of listeners) listener();
  });
  return operation;
}
export async function saveDesign(design, restore = false) {
  // Capture the exact design at request time, before another edit changes the store.
  return command("save", { design: serializeDesign(design), restore });
}
export const ready = command("state");
// Shared cloud persistence remains disabled in this offline increment. Never silently
// fall back to a second project store if that boundary is accidentally crossed.
export function saveLocalDraft() {
  throw new Error("Use the awaited desktop project repository.");
}
export const saveProject = saveLocalDraft;

export const deleteProject = saveLocalDraft;

export function saveCopy(design) {
  return command("save-copy", { design: serializeDesign(design) });
}
