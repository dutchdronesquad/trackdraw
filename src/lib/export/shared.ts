export interface FlythroughProgress {
  progress: number;
  encodedFrames: number;
  totalFrames: number;
  videoDurationSeconds: number;
}

export type FlythroughTheme = "dark" | "light";
