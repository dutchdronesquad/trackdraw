// Force the browser bundle because Turbopack can otherwise resolve jsPDF's
// Node entry during client-side SSR analysis.
export { jsPDF } from "jspdf/dist/jspdf.es.min.js";
