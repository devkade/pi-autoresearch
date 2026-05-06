import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import test from "node:test";
import { tmpdir } from "node:os";

import { commandForExecution, clearAutoresearchScope, resolveArtifactRoot, resolveWorkDir, setAutoresearchScope } from "../extensions/pi-autoresearch/index.ts";

test("artifactRoot defaults to workingDir for backward compatibility", () => {
  const tempDir = fs.mkdtempSync(path.join(tmpdir(), "pi-autoresearch-root-default-"));
  try {
    assert.equal(resolveWorkDir(tempDir), tempDir);
    assert.equal(resolveArtifactRoot(tempDir), tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("artifactRoot separates autoresearch files from command workingDir", () => {
  const tempDir = fs.mkdtempSync(path.join(tmpdir(), "pi-autoresearch-root-split-"));
  try {
    fs.mkdirSync(path.join(tempDir, "project"));
    fs.mkdirSync(path.join(tempDir, "artifacts"));
    fs.writeFileSync(path.join(tempDir, "autoresearch.config.json"), JSON.stringify({
      workingDir: "project",
      artifactRoot: "artifacts",
    }));

    assert.equal(resolveWorkDir(tempDir), path.join(tempDir, "project"));
    assert.equal(resolveArtifactRoot(tempDir), path.join(tempDir, "artifacts"));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("runtime scope can carry Kapi's dynamic artifactRoot without writing slug config", () => {
  const ctx = { cwd: "/tmp/project-root" };

  setAutoresearchScope(ctx, {
    workingDir: "/tmp/project-root",
    artifactRoot: "/tmp/project-root/.kapi/lanes/kapi-autoresearch/example",
  });

  const symbolValues = Object.getOwnPropertySymbols(ctx).map((symbol) => ctx[symbol]);
  assert.deepEqual(symbolValues[0], {
    workingDir: "/tmp/project-root",
    artifactRoot: "/tmp/project-root/.kapi/lanes/kapi-autoresearch/example",
  });

  clearAutoresearchScope(ctx);
  assert.equal(Object.getOwnPropertySymbols(ctx).length, 0);
});

test("autoresearch.sh commands execute the artifactRoot script from workingDir", () => {
  const workDir = "/tmp/project-root";
  const artifactRoot = "/tmp/kapi-artifacts";

  assert.equal(
    commandForExecution("bash autoresearch.sh", artifactRoot, workDir),
    "bash '/tmp/kapi-artifacts/autoresearch.sh'",
  );
  assert.equal(
    commandForExecution("npm test", artifactRoot, workDir),
    "npm test",
  );
});
