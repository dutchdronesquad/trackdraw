import { parseDesign, serializeDesign } from "@/lib/track/design";

let storageQueue = Promise.resolve();
let syncing = false;
let activeAccountId = null;
const statuses = new Map();
const listeners = new Set();

function key(accountId, teamId, projectId) {
  return JSON.stringify([accountId, teamId ?? null, projectId]);
}

function publish(record) {
  statuses.set(
    key(record.accountId, record.team?.id, record.projectId),
    record.problem ?? (record.dirty ? "pending" : "synced")
  );
  for (const listener of listeners) listener();
}

export function subscribeCloudStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function cloudStatus(cloud) {
  if (!cloud) return "";
  return (
    statuses.get(key(cloud.accountId, cloud.team?.id, cloud.projectId)) ?? ""
  );
}

export function setSyncAccount(accountId) {
  activeAccountId = accountId;
}

function transaction(operation) {
  const next = storageQueue.then(operation);
  storageQueue = next.catch(() => {});
  return next;
}

export function cachedCloudProjects(accountId) {
  return window.trackdrawDesktop.cloudCache(accountId);
}

export function cachedCloudProject(accountId, projectId, teamId) {
  return window.trackdrawDesktop.cloudCache(accountId, projectId, teamId);
}

async function store(record) {
  await window.trackdrawDesktop.cloudCache(
    record.accountId,
    record.projectId,
    record.team?.id,
    record
  );
  publish(record);
  return record;
}

export function cacheCloudProject(expectedAccountId, projectId, result) {
  return transaction(async () => {
    if (
      result.accountId !== expectedAccountId ||
      result.accountId !== activeAccountId
    )
      throw new Error("Cloud account changed.");
    const design = parseDesign(result.design);
    if (
      !design ||
      design.id !== projectId ||
      !Number.isSafeInteger(result.revision) ||
      result.revision < 1
    )
      throw new Error("Cloud project is invalid.");
    const current = await cachedCloudProject(
      result.accountId,
      projectId,
      result.team?.id
    );
    if (!result.canEdit && !current) return result;
    if (current?.dirty) {
      return store({
        ...current,
        team: result.team,
        canEdit: result.canEdit,
        ...(result.canEdit && current.problem === "permission"
          ? { problem: null }
          : {}),
      });
    }
    return store({
      accountId: result.accountId,
      projectId,
      team: result.team,
      canEdit: result.canEdit,
      design: serializeDesign(design),
      revision: result.revision,
      dirty: false,
      pending: null,
      problem: null,
    });
  });
}

export async function openCachedCloudProject(accountId, projectId, teamId) {
  const record = await cachedCloudProject(accountId, projectId, teamId);
  if (record) publish(record);
  return record;
}

export async function cachedCloudTeams(accountId) {
  const records = await cachedCloudProjects(accountId);
  return {
    teams: [
      ...new Map(
        records
          .filter((record) => record.team)
          .map(({ team }) => [team.id, team])
      ).values(),
    ],
  };
}

export function saveCloudDraft(cloud, design) {
  const serialized = serializeDesign(design);
  return transaction(async () => {
    const record = await cachedCloudProject(
      cloud.accountId,
      cloud.projectId,
      cloud.team?.id
    );
    if (!record) throw new Error("Cloud project storage is unavailable.");
    if (JSON.stringify(record.design) === JSON.stringify(serialized)) return;
    await store({ ...record, design: serialized, dirty: true });
  });
}

const terminal = new Set(["conflict", "permission", "tooLarge", "invalid"]);

async function syncProject(summary, accountId) {
  const teamId = summary.team?.id;
  const pending = await transaction(async () => {
    const record = await cachedCloudProject(
      accountId,
      summary.projectId,
      teamId
    );
    if (
      !record?.dirty ||
      record.problem ||
      !record.canEdit ||
      activeAccountId !== accountId
    )
      return null;
    if (record.pending) return record.pending;
    const next = { revision: record.revision, design: record.design };
    await store({ ...record, pending: next });
    return next;
  });
  if (!pending || activeAccountId !== accountId) return;

  let revision;
  let problem;
  try {
    const saved = await window.trackdrawDesktop.saveCloudProject(accountId, {
      projectId: summary.projectId,
      teamId: teamId ?? null,
      ...pending,
    });
    if (
      !Number.isSafeInteger(saved.revision) ||
      saved.revision < pending.revision
    )
      throw "unavailable";
    revision = saved.revision;
  } catch (reason) {
    if (!terminal.has(reason)) throw reason;
    problem = reason;
  }

  // Edits made while the request was in progress are already durable. Only
  // acknowledge the exact staged payload, and preserve newer local edits.
  if (activeAccountId !== accountId) return;
  await transaction(async () => {
    const current = await cachedCloudProject(
      accountId,
      summary.projectId,
      teamId
    );
    if (JSON.stringify(current?.pending) !== JSON.stringify(pending)) return;
    if (problem) {
      await store({ ...current, problem });
    } else {
      await store({
        ...current,
        revision,
        pending: null,
        dirty:
          JSON.stringify(current.design) !== JSON.stringify(pending.design),
      });
    }
  });
}

export async function syncCloudProjects(accountId) {
  if (syncing || activeAccountId !== accountId || !navigator.onLine) return;
  syncing = true;
  try {
    const records = await cachedCloudProjects(accountId);
    for (const record of records) {
      if (activeAccountId !== accountId) break;
      if (!record.dirty || record.problem || !record.canEdit) continue;
      try {
        await syncProject(record, accountId);
      } catch (reason) {
        if (reason !== "lease") break;
      }
    }
  } finally {
    syncing = false;
  }
}

export async function cachedCloudPage(accountId, teamId) {
  const records = await cachedCloudProjects(accountId);
  const projects = records
    .filter(({ team }) => (team?.id ?? null) === (teamId ?? null))
    .map(({ projectId, title, updatedAt, dirty, problem }) => ({
      id: projectId,
      title,
      updatedAt,
      dirty,
      problem,
    }));
  const team = records.find((item) => teamId && item.team?.id === teamId)?.team;
  return { projects, team, nextCursor: null };
}
