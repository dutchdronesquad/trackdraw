import "server-only";

import { getDatabase } from "@/lib/server/db";
import type {
  LayoutPreset,
  LayoutPresetShapeDraft,
} from "@/lib/planning/layout-presets";

type PresetRow = {
  id: string;
  owner_user_id: string;
  name: string;
  description: string;
  shapes_json: string;
  created_at: string;
  updated_at: string;
};

function rowToPreset(row: PresetRow): LayoutPreset {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    shapes: JSON.parse(row.shapes_json) as LayoutPresetShapeDraft[],
  };
}

export async function listLayoutPresetsForUser(
  ownerUserId: string
): Promise<LayoutPreset[]> {
  const db = await getDatabase();
  const rows = await db
    .prepare(
      `SELECT id, owner_user_id, name, description, shapes_json, created_at, updated_at
       FROM layout_presets
       WHERE owner_user_id = ?
       ORDER BY updated_at DESC`
    )
    .bind(ownerUserId)
    .all<PresetRow>();
  return rows.results.map(rowToPreset);
}

export async function saveLayoutPresetForUser(
  ownerUserId: string,
  preset: LayoutPreset
): Promise<LayoutPreset> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const shapesJson = JSON.stringify(preset.shapes);

  await db
    .prepare(
      `INSERT INTO layout_presets (id, owner_user_id, name, description, shapes_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         shapes_json = excluded.shapes_json,
         updated_at = excluded.updated_at
       WHERE layout_presets.owner_user_id = excluded.owner_user_id`
    )
    .bind(
      preset.id,
      ownerUserId,
      preset.name,
      preset.description ?? "",
      shapesJson,
      now,
      now
    )
    .run();

  return preset;
}

export async function renameLayoutPresetForUser(
  presetId: string,
  ownerUserId: string,
  name: string
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE layout_presets SET name = ?, updated_at = ?
       WHERE id = ? AND owner_user_id = ?`
    )
    .bind(name, now, presetId, ownerUserId)
    .run();
}

export async function deleteLayoutPresetForUser(
  presetId: string,
  ownerUserId: string
): Promise<void> {
  const db = await getDatabase();
  await db
    .prepare(`DELETE FROM layout_presets WHERE id = ? AND owner_user_id = ?`)
    .bind(presetId, ownerUserId)
    .run();
}
