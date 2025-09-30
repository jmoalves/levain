/**
 * Testes para as funções helper do Deno 2
 */

import {
  assertEquals,
  assertExists,
  assert,
} from "jsr:@std/assert@1.0.0";

import {
  ProcessUtils,
  FileUtils,
  GitUtils,
  NetworkUtils,
} from "./deno2_helpers.ts";

Deno.test("ProcessUtils.runCommand - echo test", async () => {
  const result = await ProcessUtils.runCommand("echo", ["hello", "world"]);
  
  assertEquals(result.success, true);
  assertEquals(result.code, 0);
  assertEquals(result.stdout.trim(), "hello world");
});

Deno.test("ProcessUtils.getCommandOutput - simple command", async () => {
  const output = await ProcessUtils.getCommandOutput("echo", ["test"]);
  assertEquals(output, "test");
});

Deno.test("FileUtils.downloadFile - download text file", async () => {
  const testUrl = "https://raw.githubusercontent.com/denoland/deno/main/README.md";
  const destination = "./test_download.md";
  
  await FileUtils.downloadFile(testUrl, destination);
  
  const exists = await Deno.stat(destination)
    .then(() => true)
    .catch(() => false);
  
  assert(exists, "Downloaded file should exist");
  
  // Cleanup
  if (exists) {
    await Deno.remove(destination);
  }
});

Deno.test("NetworkUtils.fetchWithRetry - successful request", async () => {
  const response = await NetworkUtils.fetchWithRetry(
    "https://api.github.com/zen",
    { maxRetries: 2 }
  );
  
  assertEquals(response.ok, true);
});

// Adicione mais testes conforme necessário
