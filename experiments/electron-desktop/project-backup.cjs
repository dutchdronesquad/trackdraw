const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

// Do not truncate a previous exported backup if writing its replacement fails.
async function writeProjectBackup(filename, text, files = fs) {
  const temporary = path.join(
    path.dirname(filename),
    `.trackdraw-${randomUUID()}.tmp`
  );
  let handle;
  let created = false;
  try {
    handle = await files.open(temporary, "wx");
    created = true;
    await handle.writeFile(text, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    await files.rename(temporary, filename);
  } finally {
    await handle?.close().catch(() => {});
    if (created) await files.unlink(temporary).catch(() => {});
  }
}

module.exports = { writeProjectBackup };
