import { useStore } from "zustand";
import {
  createEditorStore,
  useEditor as browserStore,
} from "../../../../src/store/editor";
import { useDocument } from "../workspace/document-context.jsx";
export { createEditorStore };
let active = browserStore;
export function setActiveEditorStore(store) {
  active = store;
}
export function useEditor(selector = (state) => state) {
  const document = useDocument();
  return useStore(document?.store || active, selector);
}
useEditor.getState = () => active.getState();
useEditor.getInitialState = () => active.getInitialState();
useEditor.setState = (...args) => active.setState(...args);
useEditor.subscribe = (...args) => active.subscribe(...args);
Object.defineProperty(useEditor, "temporal", { get: () => active.temporal });
