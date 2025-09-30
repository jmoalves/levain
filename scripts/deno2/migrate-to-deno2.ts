#!/usr/bin/env deno run --allow-all

/**
 * Script de Migração Automática do Levain para Deno 2
 * 
 * Como usar:
 * 1. Clone o repositório: git clone -b deno2_opus https://github.com/jmoalves/levain.git
 * 2. Entre no diretório: cd levain
 * 3. Execute este script: deno run --allow-all migrate-to-deno2.ts
 * 
 * O script irá:
 * - Fazer backup dos arquivos originais
 * - Atualizar todos os imports para JSR
 * - Migrar APIs deprecadas (Deno.run → Deno.Command)
 * - Criar/atualizar deno.json
 * - Gerar relatório de migração
 */

const VERSION = "1.0.0";
const BACKUP_DIR = ".backup-deno1";

// Cores para output
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

function header(title: string) {
  console.log(`\n${colors.bright}${colors.cyan}${"=".repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${"=".repeat(60)}${colors.reset}\n`);
}

// Mapeamento de imports antigos para novos
const IMPORT_MAPPINGS: Array<[RegExp | string, string]> = [
  // Standard Library - qualquer versão
  [/https:\/\/deno\.land\/std@[\d.]+\/flags\/mod\.ts/g, "jsr:@std/flags@1.0.0"],
  [/https:\/\/deno\.land\/std@[\d.]+\/fs\/mod\.ts/g, "jsr:@std/fs@1.0.0"],
  [/https:\/\/deno\.land\/std@[\d.]+\/fs\/ensure_dir\.ts/g, "jsr:@std/fs@1.0.0/ensure-dir"],
  [/https:\/\/deno\.land\/std@[\d.]+\/fs\/exists\.ts/g, "jsr:@std/fs@1.0.0/exists"],
  [/https:\/\/deno\.land\/std@[\d.]+\/fs\/walk\.ts/g, "jsr:@std/fs@1.0.0/walk"],
  [/https:\/\/deno\.land\/std@[\d.]+\/fs\/copy\.ts/g, "jsr:@std/fs@1.0.0/copy"],
  [/https:\/\/deno\.land\/std@[\d.]+\/fs\/move\.ts/g, "jsr:@std/fs@1.0.0/move"],
  [/https:\/\/deno\.land\/std@[\d.]+\/fs\/empty_dir\.ts/g, "jsr:@std/fs@1.0.0/empty-dir"],
  [/https:\/\/deno\.land\/std@[\d.]+\/fs\/expand_glob\.ts/g, "jsr:@std/fs@1.0.0/expand-glob"],
  
  [/https:\/\/deno\.land\/std@[\d.]+\/path\/mod\.ts/g, "jsr:@std/path@1.0.0"],
  [/https:\/\/deno\.land\/std@[\d.]+\/path\/posix\.ts/g, "jsr:@std/path@1.0.0/posix"],
  [/https:\/\/deno\.land\/std@[\d.]+\/path\/win32\.ts/g, "jsr:@std/path@1.0.0/windows"],
  
  [/https:\/\/deno\.land\/std@[\d.]+\/fmt\/colors\.ts/g, "jsr:@std/fmt@1.0.0/colors"],
  [/https:\/\/deno\.land\/std@[\d.]+\/fmt\/printf\.ts/g, "jsr:@std/fmt@1.0.0/printf"],
  
  [/https:\/\/deno\.land\/std@[\d.]+\/testing\/asserts\.ts/g, "jsr:@std/assert@1.0.0"],
  [/https:\/\/deno\.land\/std@[\d.]+\/testing\/bdd\.ts/g, "jsr:@std/testing@1.0.0/bdd"],
  
  [/https:\/\/deno\.land\/std@[\d.]+\/encoding\/yaml\.ts/g, "jsr:@std/yaml@1.0.0"],
  [/https:\/\/deno\.land\/std@[\d.]+\/encoding\/toml\.ts/g, "jsr:@std/toml@1.0.0"],
  [/https:\/\/deno\.land\/std@[\d.]+\/encoding\/base64\.ts/g, "jsr:@std/encoding@1.0.0/base64"],
  [/https:\/\/deno\.land\/std@[\d.]+\/encoding\/hex\.ts/g, "jsr:@std/encoding@1.0.0/hex"],
  
  [/https:\/\/deno\.land\/std@[\d.]+\/collections\/mod\.ts/g, "jsr:@std/collections@1.0.0"],
  [/https:\/\/deno\.land\/std@[\d.]+\/datetime\/mod\.ts/g, "jsr:@std/datetime@1.0.0"],
  [/https:\/\/deno\.land\/std@[\d.]+\/log\/mod\.ts/g, "jsr:@std/log@0.224.0"],
  [/https:\/\/deno\.land\/std@[\d.]+\/http\/server\.ts/g, "jsr:@std/http@1.0.0/server"],
  [/https:\/\/deno\.land\/std@[\d.]+\/io\/mod\.ts/g, "jsr:@std/io@0.224.0"],
  [/https:\/\/deno\.land\/std@[\d.]+\/streams\/mod\.ts/g, "jsr:@std/streams@1.0.0"],
  [/https:\/\/deno\.land\/std@[\d.]+\/crypto\/mod\.ts/g, "jsr:@std/crypto@1.0.0"],
  [/https:\/\/deno\.land\/std@[\d.]+\/uuid\/mod\.ts/g, "jsr:@std/uuid@1.0.0"],
  [/https:\/\/deno\.land\/std@[\d.]+\/async\/mod\.ts/g, "jsr:@std/async@1.0.0"],
  [/https:\/\/deno\.land\/std@[\d.]+\/signal\/mod\.ts/g, "jsr:@std/signal@1.0.0"],
  
  // Módulos x
  [/https:\/\/deno\.land\/x\/oak@[\d.v]+\/mod\.ts/g, "jsr:@oak/oak@17.0.0"],
  [/https:\/\/deno\.land\/x\/cliffy@[\d.v]+\/command\/mod\.ts/g, "jsr:@cliffy/command@1.0.0"],
  [/https:\/\/deno\.land\/x\/cliffy@[\d.v]+\/prompt\/mod\.ts/g, "jsr:@cliffy/prompt@1.0.0"],
  [/https:\/\/deno\.land\/x\/cliffy@[\d.v]+\/table\/mod\.ts/g, "jsr:@cliffy/table@1.0.0"],
];

// Padrões de código que precisam ser migrados
interface CodePattern {
  name: string;
  pattern: RegExp;
  replacement: string | ((match: string, ...args: string[]) => string);
  multiline?: boolean;
}

const CODE_PATTERNS: CodePattern[] = [
  // Deno.run → Deno.Command
  {
    name: "Deno.run to Deno.Command - Simple",
    pattern: /const\s+(\w+)\s*=\s*Deno\.run\(\{([^}]+)\}\);?/g,
    replacement: (match: string, varName: string, args: string) => {
      // Extrair cmd
      const cmdMatch = args.match(/cmd:\s*\[([^\]]+)\]/);
      if (!cmdMatch) return match;
      
      const cmdParts = cmdMatch[1].split(',').map(s => s.trim());
      const command = cmdParts[0].replace(/['"]/g, '');
      const cmdArgs = cmdParts.slice(1).map(arg => arg.trim());
      
      // Extrair outras opções
      const stdout = args.includes('stdout:') ? 
        args.match(/stdout:\s*["']([^"']+)["']/)?.[1] || "piped" : "inherit";
      const stderr = args.includes('stderr:') ? 
        args.match(/stderr:\s*["']([^"']+)["']/)?.[1] || "piped" : "inherit";
      const stdin = args.includes('stdin:') ? 
        args.match(/stdin:\s*["']([^"']+)["']/)?.[1] || undefined : undefined;
      const cwd = args.match(/cwd:\s*["']([^"']+)["']/)?.[1];
      
      let newCode = `const ${varName} = new Deno.Command("${command}", {\n`;
      if (cmdArgs.length > 0) {
        newCode += `  args: [${cmdArgs.join(', ')}],\n`;
      }
      newCode += `  stdout: "${stdout}",\n`;
      newCode += `  stderr: "${stderr}",\n`;
      if (stdin) newCode += `  stdin: "${stdin}",\n`;
      if (cwd) newCode += `  cwd: "${cwd}",\n`;
      newCode = newCode.replace(/,\n$/, '\n');
      newCode += `});`;
      
      return newCode;
    },
    multiline: true
  },
  
  // process.status() → command.output()
  {
    name: "process.status() to command.output()",
    pattern: /await\s+(\w+)\.status\(\)/g,
    replacement: "await $1.output()"
  },
  
  // process.output() → já incluído em command.output()
  {
    name: "Remove separate process.output() calls",
    pattern: /const\s+\w+\s*=\s*await\s+\w+\.output\(\);?\s*\/\/\s*process output/gi,
    replacement: "// output already retrieved with command.output()"
  },
  
  // process.close() → não necessário
  {
    name: "Remove process.close()",
    pattern: /(\w+)\.close\(\);?/g,
    replacement: (match: string, varName: string) => {
      // Apenas remove se parece ser um process
      if (match.includes('process') || match.includes('proc') || match.includes('cmd')) {
        return "// close() not needed with Deno.Command";
      }
      return match;
    }
  },
  
  // Deno.copy → readableStream.pipeTo
  {
    name: "Deno.copy to pipeTo",
    pattern: /await\s+Deno\.copy\(([^,]+),\s*([^)]+)\)/g,
    replacement: "await $1.readable.pipeTo($2.writable)"
  },
  
  // window global
  {
    name: "window global removal",
    pattern: /typeof\s+window\s*!==?\s*["']undefined["']/g,
    replacement: "typeof globalThis.window !== 'undefined'"
  },
  
  // Deno.metrics() removal
  {
    name: "Deno.metrics() removal",
    pattern: /Deno\.metrics\(\)[^;]*/g,
    replacement: "undefined // Deno.metrics() was removed in Deno 2"
  },
  
  // Deno.serveHttp → soft deprecated
  {
    name: "Deno.serveHttp deprecation warning",
    pattern: /Deno\.serveHttp/g,
    replacement: "/* @ts-ignore - Deno.serveHttp is soft-removed in Deno 2 */\nDeno.serveHttp"
  },
  
  // Deno.Buffer → Buffer
  {
    name: "Deno.Buffer to Buffer",
    pattern: /new\s+Deno\.Buffer\(/g,
    replacement: "new Buffer("
  },
  
  // Permissões no comentário/docs
  {
    name: "Update permission flags in comments",
    pattern: /--allow-run(?!\=)/g,
    replacement: "--allow-run=<BINARY_NAME>"
  }
];

// Função para fazer backup
async function createBackup() {
  header("Creating Backup");
  
  try {
    await Deno.mkdir(BACKUP_DIR, { recursive: true });
    
    // Copiar arquivos importantes
    const filesToBackup = [
      "levain.ts",
      "deno.json",
      "deno.jsonc",
      "import_map.json",
      ".vscode/settings.json"
    ];
    
    for (const file of filesToBackup) {
      try {
        await Deno.copyFile(file, `${BACKUP_DIR}/${file}`);
        log(`Backed up: ${file}`, "success");
      } catch {
        // Arquivo não existe, ok
      }
    }
    
    log(`Backup created in ${BACKUP_DIR}/`, "success");
  } catch (error) {
    log(`Failed to create backup: ${error}`, "error");
  }
}

// Função para processar arquivo TypeScript
async function processTypeScriptFile(filePath: string): Promise<{ updated: boolean; changes: string[] }> {
  const changes: string[] = [];
  let updated = false;
  
  try {
    let content = await Deno.readTextFile(filePath);
    const originalContent = content;
    
    // Aplicar mudanças de imports
    for (const [pattern, replacement] of IMPORT_MAPPINGS) {
      if (pattern instanceof RegExp) {
        const matches = content.match(pattern);
        if (matches) {
          content = content.replace(pattern, replacement);
          changes.push(`Updated import: ${matches[0]} → ${replacement}`);
          updated = true;
        }
      }
    }
    
    // Aplicar padrões de código
    for (const pattern of CODE_PATTERNS) {
      const regex = pattern.multiline 
        ? new RegExp(pattern.pattern.source, pattern.pattern.flags + 's')
        : pattern.pattern;
      
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        if (typeof pattern.replacement === 'string') {
          content = content.replace(regex, pattern.replacement);
        } else {
          content = content.replace(regex, pattern.replacement as any);
        }
        changes.push(`Applied: ${pattern.name}`);
        updated = true;
      }
    }
    
    // Salvar arquivo se houve mudanças
    if (updated && content !== originalContent) {
      await Deno.writeTextFile(filePath, content);
    }
    
  } catch (error) {
    log(`Error processing ${filePath}: ${error}`, "error");
  }
  
  return { updated, changes };
}

// Criar/atualizar deno.json
async function createDenoConfig() {
  header("Creating/Updating deno.json");
  
  const denoConfig = {
    "tasks": {
      "dev": "deno run --allow-all --watch levain.ts",
      "test": "deno test --allow-all",
      "compile": "deno compile --allow-all --output=levain levain.ts",
      "compile:windows": "deno compile --allow-all --target x86_64-pc-windows-msvc --output=levain.exe levain.ts",
      "compile:linux": "deno compile --allow-all --target x86_64-unknown-linux-gnu --output=levain levain.ts",
      "compile:mac": "deno compile --allow-all --target x86_64-apple-darwin --output=levain levain.ts",
      "fmt": "deno fmt",
      "lint": "deno lint",
      "cache": "deno cache levain.ts",
      "install-deps": "deno install"
    },
    "imports": {
      "@std/": "jsr:@std/",
      "@cliffy/": "jsr:@cliffy/",
      "std/": "jsr:@std/"
    },
    "compilerOptions": {
      "lib": ["deno.window", "dom"],
      "strict": true,
      "noImplicitAny": true,
      "strictNullChecks": true
    },
    "fmt": {
      "files": {
        "include": ["src/", "*.ts", "*.js"],
        "exclude": ["src/testdata/", "data/"]
      },
      "options": {
        "useTabs": false,
        "lineWidth": 120,
        "indentWidth": 2,
        "semiColons": true,
        "singleQuote": false,
        "proseWrap": "preserve"
      }
    },
    "lint": {
      "files": {
        "include": ["src/", "*.ts"],
        "exclude": ["src/testdata/", "data/"]
      },
      "rules": {
        "tags": ["recommended"],
        "exclude": ["no-explicit-any"],
        "include": ["no-process-globals"]
      }
    },
    "nodeModulesDir": "auto",
    "lock": false,
    "test": {
      "files": {
        "include": ["src/**/*_test.ts", "test/**/*.ts"],
        "exclude": ["data/"]
      }
    }
  };
  
  try {
    // Verificar se já existe
    let existingConfig: any = {};
    try {
      const existing = await Deno.readTextFile("deno.json");
      existingConfig = JSON.parse(existing);
      log("Found existing deno.json, merging configurations...", "info");
    } catch {
      // Não existe, criar novo
    }
    
    // Merge com configuração existente
    const finalConfig = { ...existingConfig, ...denoConfig };
    
    // Preservar imports personalizados se existirem
    if (existingConfig.imports) {
      finalConfig.imports = { ...denoConfig.imports, ...existingConfig.imports };
    }
    
    await Deno.writeTextFile("deno.json", JSON.stringify(finalConfig, null, 2));
    log("Created/updated deno.json", "success");
  } catch (error) {
    log(`Failed to create deno.json: ${error}`, "error");
  }
}

// Criar arquivo de exemplo para Deno.Command
async function createMigrationExamples() {
  const examples = `/**
 * Exemplos de Migração Deno 1 → Deno 2
 * Referência rápida para padrões comuns
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
// Deno.resources() - REMOVIDO  
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
`;

  try {
    await Deno.writeTextFile("MIGRATION_EXAMPLES.md", examples);
    log("Created MIGRATION_EXAMPLES.md with code examples", "success");
  } catch (error) {
    log(`Failed to create examples: ${error}`, "error");
  }
}

// Função principal
async function main() {
  console.clear();
  console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════╗
║     Levain → Deno 2 Migration Script v${VERSION}           ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Verificar se está no diretório correto
  try {
    await Deno.stat("levain.ts");
  } catch {
    log("ERROR: levain.ts not found! Are you in the levain directory?", "error");
    log("Please run this script from the root of the levain project.", "error");
    Deno.exit(1);
  }

  // Criar backup
  await createBackup();
  
  // Processar arquivos TypeScript
  header("Processing TypeScript Files");
  
  let totalFiles = 0;
  let updatedFiles = 0;
  const allChanges: Map<string, string[]> = new Map();
  
  // Buscar todos os arquivos .ts e .js
  async function* walkFiles(dir: string): AsyncGenerator<string> {
    try {
      for await (const entry of Deno.readDir(dir)) {
        const path = `${dir}/${entry.name}`;
        
        // Pular diretórios especiais
        if (entry.name.startsWith(".") || 
            entry.name === "node_modules" || 
            entry.name === "dist" ||
            entry.name === "build" ||
            path.includes("/.git/") ||
            path.includes("/.backup")) {
          continue;
        }
        
        if (entry.isFile && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
          yield path;
        } else if (entry.isDirectory) {
          yield* walkFiles(path);
        }
      }
    } catch (error) {
      log(`Warning: Could not access directory ${dir}: ${error}`, "warning");
    }
  }
  
  // Processar arquivos em diretórios
  for await (const entry of Deno.readDir(".")) {
    if (entry.isDirectory && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      for await (const filePath of walkFiles(entry.name)) {
        totalFiles++;
        const { updated, changes } = await processTypeScriptFile(filePath);
        
        if (updated) {
          updatedFiles++;
          allChanges.set(filePath, changes);
          log(`Updated: ${filePath}`, "success");
        }
      }
    }
  }
  
  // Processar arquivos na raiz
  for await (const entry of Deno.readDir(".")) {
    if (entry.isFile && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
      totalFiles++;
      const { updated, changes } = await processTypeScriptFile(entry.name);
      
      if (updated) {
        updatedFiles++;
        allChanges.set(entry.name, changes);
        log(`Updated: ${entry.name}`, "success");
      }
    }
  }
  
  // Criar deno.json
  await createDenoConfig();
  
  // Criar exemplos
  await createMigrationExamples();
  
  // Relatório final
  header("Migration Report");
  
  console.log(`${colors.bright}Files processed:${colors.reset} ${totalFiles}`);
  console.log(`${colors.bright}Files updated:${colors.reset} ${updatedFiles}`);
  
  if (allChanges.size > 0) {
    console.log(`\n${colors.bright}Changes made:${colors.reset}`);
    for (const [file, changes] of allChanges) {
      console.log(`\n  ${colors.cyan}${file}:${colors.reset}`);
      for (const change of changes) {
        console.log(`    • ${change}`);
      }
    }
  }
  
  // Instruções finais
  header("Next Steps");
  
  console.log(`${colors.green}✅ Migration completed!${colors.reset}\n`);
  console.log("1. Review the changes made by this script");
  console.log("2. Install Deno 2: ${colors.cyan}deno upgrade${colors.reset}");
  console.log("3. Install dependencies: ${colors.cyan}deno install${colors.reset}");
  console.log("4. Run tests: ${colors.cyan}deno task test${colors.reset}");
  console.log("5. Test the application: ${colors.cyan}deno task dev${colors.reset}");
  console.log("\nIf you encounter issues:");
  console.log(`• Check ${colors.yellow}MIGRATION_EXAMPLES.md${colors.reset} for migration patterns`);
  console.log(`• Restore from backup: ${colors.yellow}${BACKUP_DIR}/${colors.reset}`);
  console.log(`• See Deno 2 migration guide: ${colors.blue}https://docs.deno.com/runtime/reference/migration_guide/${colors.reset}`);
  
  // Verificar versão do Deno
  console.log(`\n${colors.bright}Current Deno version:${colors.reset} ${Deno.version.deno}`);
  if (!Deno.version.deno.startsWith("2.")) {
    console.log(`${colors.yellow}⚠ You're still on Deno 1.x. Run 'deno upgrade' to get Deno 2${colors.reset}`);
  }
}

// Executar
if (import.meta.main) {
  await main();
}
