import handler from "vinext/server/fetch-handler";
import { createTrackDrawWorker } from "./src/lib/server/worker";

export default createTrackDrawWorker(
  handler as Parameters<typeof createTrackDrawWorker>[0]
);
