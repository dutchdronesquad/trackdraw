import { createTrackDrawWorker } from "./src/lib/server/worker";
// @ts-ignore `.open-next/worker.js` is generated at build time
import handler from "./.open-next/worker.js";

export default createTrackDrawWorker(handler);
