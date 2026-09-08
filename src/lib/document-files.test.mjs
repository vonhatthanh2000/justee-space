import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { listMarkdownFiles } from "./document-files.ts";

test("returns no documents when an optional language directory is missing", () => {
  const missingDirectory = path.join(
    os.tmpdir(),
    `justee-space-missing-language-${process.pid}`,
  );

  assert.equal(fs.existsSync(missingDirectory), false);
  assert.deepEqual(listMarkdownFiles(missingDirectory), []);
});
