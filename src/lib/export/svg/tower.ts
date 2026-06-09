import { getTower2DShape } from "@/lib/track/shape2d";
import type { TowerShape } from "@/lib/types";
import { m } from "./utils";

export function towerToSvg(s: TowerShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const tower = getTower2DShape(s, ppm);
  const { depth, levelCount, radius, width } = tower;
  const stroke =
    tower.variant === "panel-frame" ? tower.frame.color : tower.color;
  const fill =
    tower.variant === "panel-frame" ? tower.panels.topColor : tower.color;

  return `<g transform="translate(${cx},${cy}) rotate(${s.rotation})">
    <rect x="${-width / 2}" y="${-depth / 2}" width="${width}" height="${depth}" fill="${fill}" fill-opacity="0.16" rx="${radius}"/>
    <rect x="${-width / 2}" y="${-depth / 2}" width="${width}" height="${depth}" stroke="${stroke}" stroke-width="2" fill="none" rx="${radius}"/>
    <line x1="${-width / 2}" y1="0" x2="${width / 2}" y2="0" stroke="${stroke}" stroke-width="1" stroke-opacity="${levelCount > 1 ? 0.62 : 0.28}" stroke-dasharray="${levelCount > 1 ? "3 2" : "2 4"}"/>
  </g>`;
}
