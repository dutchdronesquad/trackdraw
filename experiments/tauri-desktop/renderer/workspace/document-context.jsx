import { createContext, useContext } from "react";
export const DocumentContext = createContext(null);
export function useDocument() {
  return useContext(DocumentContext);
}
