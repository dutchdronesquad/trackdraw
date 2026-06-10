export const SCENE_3D_THEME = {
  dark: {
    bg: "#2e4870" as `#${string}`,
    fog: "#2e4870" as `#${string}`,
    ambientIntensity: 0.55,
    dirIntensity: 1.6,
    dirColor: "#fff4e6" as `#${string}`,
    groundColor: "#0f1824" as `#${string}`,
    gridCell: "#38587a" as `#${string}`,
    gridSection: "#5a82aa" as `#${string}`,
    skyTop: "#182848" as `#${string}`,
    skyHorizon: "#2e4870" as `#${string}`,
    hemisphereSky: "#203858" as `#${string}`,
    hemisphereGround: "#080e0a" as `#${string}`,
    hemisphereIntensity: 0.3,
  },
  light: {
    bg: "#e4f0fa" as `#${string}`,
    fog: "#e4f0fa" as `#${string}`,
    ambientIntensity: 1.0,
    dirIntensity: 2.0,
    dirColor: "#fffaf5" as `#${string}`,
    groundColor: "#d0d8e4" as `#${string}`,
    gridCell: "#90aac0" as `#${string}`,
    gridSection: "#607e9e" as `#${string}`,
    skyTop: "#68a8de" as `#${string}`,
    skyHorizon: "#e4f0fa" as `#${string}`,
    hemisphereSky: "#90c0e8" as `#${string}`,
    hemisphereGround: "#b0a070" as `#${string}`,
    hemisphereIntensity: 0.2,
  },
} as const;

export type Scene3DTheme = (typeof SCENE_3D_THEME)[keyof typeof SCENE_3D_THEME];
