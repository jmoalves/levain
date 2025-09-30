/**

- Exemplos de Migração Deno 1 → Deno 2
- Referência rápida para padrões comuns
  */

// ============================================
// 1. Deno.run → Deno.Command
// ============================================

// ANTES (Deno 1.x):
const p = Deno.run({
cmd: ["git", "clone", repoUrl],
stdout: "piped",
stderr: "piped"
});
const { success } = await p.status();
const output = await p.output();
p.close();

// DEPOIS (Deno 2.x):
const command = new Deno.Command("git", {
args: ["clone", repoUrl],
stdout: "piped",
stderr: "piped"
});
const { success, stdout, stderr } = await command.output();

// ============================================
// 2. Imports do Standard Library
// ============================================

// ANTES:
import { parse } from "https://deno.land/std@0.200.0/flags/mod.ts";
import { ensureDir } from "https://deno.land/std@0.200.0/fs/mod.ts";

// DEPOIS:
import { parse } from "jsr:@std/flags@1.0.0";
import { ensureDir } from "jsr:@std/fs@1.0.0";

// ============================================
// 3. Permissões mais específicas
// ============================================

// ANTES:
// deno run --allow-run script.ts

// DEPOIS:
// deno run --allow-run=git,npm script.ts

// ============================================
// 4. APIs Removidas/Modificadas
// ============================================

// Deno.metrics() - REMOVIDO
// Deno.resources() - REMOVIDO\
// Deno.serveHttp() - SOFT-DEPRECATED (ainda funciona mas sem suporte)

// ============================================
// 5. Gerenciamento de Dependências
// ============================================

// ANTES:
// deno cache deps.ts

// DEPOIS:
// deno install

// Para adicionar dependências:
// deno add jsr:@std/path jsr:@std/fs
