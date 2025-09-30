#!/usr/bin/env deno run --allow-all

/**
 * Script Completo de Migração para Deno 2
 * Processa TODOS os arquivos incluindo bin/gen e src/
 */

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message: string, type: "info" | "success" | "warning" | "error" = "info") {
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
  };
  console.log(`${prefix[type]} ${message}`);
}

// Padrões de substituição mais abrangentes
const REPLACEMENTS = [
  // Deno.run → Deno.Command (versão mais robusta)
  {
    name: "Deno.run simple",
    // Captura Deno.run com qualquer configuração
    pattern: /Deno\.run\s*\(\s*\{([^}]+)\}\s*\)/g,
    replacement: (match: string, args: string) => {
      // Extrair cmd array
      const cmdMatch = args.match(/cmd\s*:\s*\[([^\]]+)\]/);
      if (!cmdMatch) return match; // Se não conseguir parsear, retorna original

      const cmdParts = cmdMatch[1].split(",").map((s) => s.trim());
      if (cmdParts.length === 0) return match;

      const command = cmdParts[0].replace(/["'`]/g, "");
      const cmdArgs = cmdParts.slice(1);

      // Construir novo comando
      let newCmd = `new Deno.Command(${cmdParts[0]}, {\n`;
      if (cmdArgs.length > 0) {
        newCmd += `  args: [${cmdArgs.join(", ")}],\n`;
      }

      // Adicionar stdout/stderr se existir
      if (args.includes("stdout")) {
        const stdoutMatch = args.match(/stdout\s*:\s*["']([^"']+)["']/);
        if (stdoutMatch) {
          newCmd += `  stdout: "${stdoutMatch[1]}",\n`;
        }
      } else {
        newCmd += `  stdout: "inherit",\n`;
      }

      if (args.includes("stderr")) {
        const stderrMatch = args.match(/stderr\s*:\s*["']([^"']+)["']/);
        if (stderrMatch) {
          newCmd += `  stderr: "${stderrMatch[1]}",\n`;
        }
      } else {
        newCmd += `  stderr: "inherit",\n`;
      }

      // Adicionar outras opções
      if (args.includes("cwd")) {
        const cwdMatch = args.match(/cwd\s*:\s*([^,}]+)/);
        if (cwdMatch) {
          newCmd += `  cwd: ${cwdMatch[1].trim()},\n`;
        }
      }

      if (args.includes("env")) {
        const envMatch = args.match(/env\s*:\s*([^,}]+)/);
        if (envMatch) {
          newCmd += `  env: ${envMatch[1].trim()},\n`;
        }
      }

      newCmd = newCmd.replace(/,\n$/, "\n");
      newCmd += "})";

      return newCmd;
    },
  },

  // .output() → .output()
  {
    name: "status to output",
    pattern: /\.status\(\)/g,
    replacement: ".output()",
  },

  // process.close() → comentário
  {
    name: "remove close",
    pattern: /(\w+)\.close\(\);?\s*(\/\/.*)?$/gm,
    replacement: "// $1.close() - not needed with Deno.Command",
  },

  // {} /* Deno.resources() removed in Deno 2 */ → {}
  {
    name: "Deno.resources",
    pattern: /Deno\.resources\(\)/g,
    replacement: "{} /* {} /* Deno.resources() removed in Deno 2 */ removed in Deno 2 */",
  },

  // undefined /* Deno.metrics() removed in Deno 2 */ → undefined
  {
    name: "Deno.metrics",
    pattern: /Deno\.metrics\(\)/g,
    replacement: "undefined /* undefined /* Deno.metrics() removed in Deno 2 */ removed in Deno 2 */",
  },

  // Deno.Buffer → Buffer
  {
    name: "Deno.Buffer",
    pattern: /new\s+Deno\.Buffer/g,
    replacement: "new Uint8Array /* Deno.Buffer removed, use Uint8Array */",
  },

  // globalThis.window. → globalThis.window.
  {
    name: "window global",
    pattern: /(?<!globalThis\.)window\./g,
    replacement: "globalThis.window.",
  },

  // Imports do std
  {
    name: "std imports",
    pattern: /from\s+["']https:\/\/deno\.land\/std@[\d.]+\/([^"']+)["']/g,
    replacement: (match: string, path: string) => {
      const mappings: Record<string, string> = {
        "flags/mod.ts": "jsr:@std/flags@1.0.0",
        "fs/mod.ts": "jsr:@std/fs@1.0.0",
        "fs/ensure_dir.ts": "jsr:@std/fs@1.0.0/ensure-dir",
        "fs/exists.ts": "jsr:@std/fs@1.0.0/exists",
        "fs/walk.ts": "jsr:@std/fs@1.0.0/walk",
        "fs/copy.ts": "jsr:@std/fs@1.0.0/copy",
        "fs/move.ts": "jsr:@std/fs@1.0.0/move",
        "path/mod.ts": "jsr:@std/path@1.0.0",
        "fmt/colors.ts": "jsr:@std/fmt@1.0.0/colors",
        "testing/asserts.ts": "jsr:@std/assert@1.0.0",
        "encoding/yaml.ts": "jsr:@std/yaml@1.0.0",
        "encoding/base64.ts": "jsr:@std/encoding@1.0.0/base64",
        "log/mod.ts": "jsr:@std/log@0.224.0",
        "io/mod.ts": "jsr:@std/io@0.224.0",
        "async/mod.ts": "jsr:@std/async@1.0.0",
        "collections/mod.ts": "jsr:@std/collections@1.0.0",
        "datetime/mod.ts": "jsr:@std/datetime@1.0.0",
        "crypto/mod.ts": "jsr:@std/crypto@1.0.0",
        "http/server.ts": "jsr:@std/http@1.0.0/server",
        "streams/mod.ts": "jsr:@std/streams@1.0.0",
        "uuid/mod.ts": "jsr:@std/uuid@1.0.0",
      };

      const newImport = mappings[path];
      if (newImport) {
        return `from "${newImport}"`;
      }
      // Se não tiver mapeamento, tenta criar um genérico
      const moduleName = path.split("/")[0];
      return `from "jsr:@std/${moduleName}@1.0.0"`;
    },
  },
];

async function processFile(filePath: string): Promise<boolean> {
  try {
    let content = await Deno.readTextFile(filePath);
    const originalContent = content;
    let changed = false;

    for (const replacement of REPLACEMENTS) {
      const before = content;
      if (typeof replacement.replacement === "string") {
        content = content.replace(replacement.pattern, replacement.replacement);
      } else {
        content = content.replace(replacement.pattern, replacement.replacement as any);
      }

      if (content !== before) {
        changed = true;
        log(`  Applied: ${replacement.name}`, "success");
      }
    }

    // Aplicar correções específicas para alguns padrões problemáticos

    // Corrigir pattern: const p = Deno.run(...); const {success} = await p.output();
    const runPattern = /const\s+(\w+)\s*=\s*Deno\.run/g;
    const matches = content.matchAll(runPattern);
    for (const match of matches) {
      const varName = match[1];
      // Procurar por uso dessa variável
      const statusPattern = new RegExp(`await\\s+${varName}\\.status\\(\\)`, "g");
      const outputPattern = new RegExp(`await\\s+${varName}\\.output\\(\\)`, "g");
      const closePattern = new RegExp(`${varName}\\.close\\(\\)`, "g");

      if (statusPattern.test(content) || outputPattern.test(content)) {
        // Este é um caso que precisa de conversão completa
        changed = true;
      }
    }

    if (changed) {
      await Deno.writeTextFile(filePath, content);
      return true;
    }

    return false;
  } catch (error) {
    log(`Error processing ${filePath}: ${error}`, "error");
    return false;
  }
}

async function* walkAllFiles(dir: string): AsyncGenerator<string> {
  try {
    for await (const entry of Deno.readDir(dir)) {
      const path = `${dir}/${entry.name}`;

      // Pular apenas .git e node_modules
      if (entry.name === ".git" || entry.name === "node_modules") {
        continue;
      }

      if (entry.isFile) {
        // Processar arquivos .ts, .js, .jsx, .tsx
        if (path.match(/\.(ts|js|jsx|tsx)$/)) {
          yield path;
        }
      } else if (entry.isDirectory) {
        yield* walkAllFiles(path);
      }
    }
  } catch (error) {
    log(`Cannot access ${dir}: ${error}`, "warning");
  }
}

async function fixSpecificFiles() {
  console.log(`\n${colors.cyan}Fixing specific problematic files...${colors.reset}`);

  // Lista de arquivos com problemas específicos do relatório
  const problematicFiles = [
    "src/action/os/mkdir.ts",
    "src/action/os/killProcess.test.ts",
    "src/lib/fs/file_utils.ts",
    "src/lib/os/powershell.ts",
    "src/lib/os/os_shell.ts",
    "src/lib/os/os_utils.ts",
    "src/lib/extract/untar_extractor.ts",
    "scripts/testWatch.ts",
  ];

  for (const file of problematicFiles) {
    try {
      const exists = await Deno.stat(file).then(() => true).catch(() => false);
      if (exists) {
        log(`Processing ${file}...`, "info");
        await processFile(file);
      }
    } catch (error) {
      log(`Could not process ${file}: ${error}`, "warning");
    }
  }
}

async function main() {
  console.clear();
  console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════╗
║        Complete Deno 2 Migration Fix                    ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

  let totalFiles = 0;
  let updatedFiles = 0;

  // Primeiro, corrigir arquivos específicos conhecidos
  await fixSpecificFiles();

  // Depois, processar todos os arquivos
  console.log(`\n${colors.cyan}Processing all TypeScript/JavaScript files...${colors.reset}\n`);

  for await (const filePath of walkAllFiles(".")) {
    totalFiles++;
    process.stdout.write(`\rProcessing: ${totalFiles} files...`);

    const updated = await processFile(filePath);
    if (updated) {
      updatedFiles++;
      console.log(`\n${colors.green}✓${colors.reset} Updated: ${filePath}`);
    }
  }

  console.log(`\n\n${colors.bright}Summary:${colors.reset}`);
  console.log(`Total files processed: ${totalFiles}`);
  console.log(`Files updated: ${updatedFiles}`);

  // Limpar arquivos bin/gen se existirem (cache antigo)
  try {
    const binGenExists = await Deno.stat("bin/gen").then(() => true).catch(() => false);
    if (binGenExists) {
      console.log(`\n${colors.yellow}Found bin/gen directory (old cache)${colors.reset}`);
      console.log("Consider removing it: rm -rf bin/gen");
    }
  } catch {
    // Ignorar
  }

  console.log(`\n${colors.green}✅ Migration fixes completed!${colors.reset}`);
  console.log("\nNext steps:");
  console.log("1. Remove old cache: rm -rf bin/gen");
  console.log("2. Clear Deno cache: deno cache --reload levain.ts");
  console.log("3. Run validation: deno run --allow-all scripts/deno2/validate-deno2.ts");
}

if (import.meta.main) {
  await main();
}
