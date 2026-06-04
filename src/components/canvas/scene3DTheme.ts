export const SCENE_3D_THEME = {
  dark: {
    bg: "#0b1018" as `#${string}`,
    fog: "#0b1018" as `#${string}`,
    ambientIntensity: 0.45,
    dirIntensity: 1.6,
    dirColor: "#fff4e6" as `#${string}`,
    groundColor: "#0f1824",
    gridCell: "#28384f",
    gridSection: "#4a6580",
  },
  light: {
    bg: "#e8edf3" as `#${string}`,
    fog: "#e8edf3" as `#${string}`,
    ambientIntensity: 1.0,
    dirIntensity: 2.0,
    dirColor: "#fffaf5" as `#${string}`,
    groundColor: "#d0d8e4",
    gridCell: "#b0bcc8",
    gridSection: "#7a96b0",
  },
} as const;

export type Scene3DTheme = (typeof SCENE_3D_THEME)[keyof typeof SCENE_3D_THEME];
