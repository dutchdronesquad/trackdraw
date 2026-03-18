type JsPdfModule = typeof import("jspdf");

const browserEntry = "jspdf/dist/jspdf.es.min.js";

export async function loadJsPdf(): Promise<JsPdfModule> {
  // Force the browser bundle because Turbopack can otherwise resolve jsPDF's
  // Node entry during client-side SSR analysis.
  const jsPdfModule = await import(browserEntry);
  return jsPdfModule as JsPdfModule;
}
