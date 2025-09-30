#!/usr/bin/env deno run --allow-all

/**
 * Correções Específicas para o Projeto Levain
 * 
 * Este script aplica correções específicas para padrões
 * encontrados no projeto Levain que podem precisar de
 * atenção especial na migração para Deno 2.
 */

import { ensureDir } from "https://deno.land/std@0.200.0/fs/ensure_dir.ts";
import { exists } from "https://deno.land/std@0.200.0/fs/exists.ts";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
};

// Criar arquivo atualizado para operações de arquivo/processo comum no Levain
async function createLevainHelpers() {
  const helpers = `/**
 * Levain Helper Functions for Deno 2
 * Funções utilitárias atualizadas para Deno 2
 */

export class ProcessUtils {
  /**
   * Executa um comando e retorna o resultado
   * Substitui o antigo padrão com Deno.run()
   */
  static async runCommand(
    command: string,
    args: string[] = [],
    options?: {
      cwd?: string;
      env?: Record<string, string>;
      stdout?: "inherit" | "piped" | "null";
      stderr?: "inherit" | "piped" | "null";
    }
  ): Promise<{
    success: boolean;
    code: number;
    stdout: string;
    stderr: string;
  }> {
    const cmd = new Deno.Command(command, {
      args,
      cwd: options?.cwd,
      env: options?.env,
      stdout: options?.stdout || "piped",
      stderr: options?.stderr || "piped",
    });

    const output = await cmd.output();
    
    return {
      success: output.success,
      code: output.code,
      stdout: new TextDecoder().decode(output.stdout),
      stderr: new TextDecoder().decode(output.stderr),
    };
  }

  /**
   * Executa comando com output em tempo real
   */
  static async runCommandWithOutput(
    command: string,
    args: string[] = [],
    options?: {
      cwd?: string;
      env?: Record<string, string>;
    }
  ): Promise<boolean> {
    const cmd = new Deno.Command(command, {
      args,
      cwd: options?.cwd,
      env: options?.env,
      stdout: "inherit",
      stderr: "inherit",
    });

    const { success } = await cmd.output();
    return success;
  }

  /**
   * Executa comando e retorna apenas stdout como string
   */
  static async getCommandOutput(
    command: string,
    args: string[] = []
  ): Promise<string> {
    const result = await ProcessUtils.runCommand(command, args);
    if (!result.success) {
      throw new Error(\`Command failed: \${command} \${args.join(" ")}\\n\${result.stderr}\`);
    }
    return result.stdout.trim();
  }
}

export class FileUtils {
  /**
   * Download de arquivo com progresso
   */
  static async downloadFile(
    url: string,
    destination: string,
    options?: {
      onProgress?: (percent: number) => void;
    }
  ): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(\`Failed to download: \${response.statusText}\`);
    }

    const contentLength = response.headers.get("content-length");
    const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
    
    // Garantir que o diretório existe
    const dir = destination.substring(0, destination.lastIndexOf("/"));
    if (dir) {
      await ensureDir(dir);
    }

    const file = await Deno.open(destination, {
      write: true,
      create: true,
      truncate: true,
    });

    try {
      if (totalSize && options?.onProgress && response.body) {
        let downloadedSize = 0;
        const reader = response.body.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          await file.write(value);
          downloadedSize += value.byteLength;
          
          const percent = Math.round((downloadedSize / totalSize) * 100);
          options.onProgress(percent);
        }
      } else {
        // Download simples sem progresso
        await response.body?.pipeTo(file.writable);
      }
    } finally {
      file.close();
    }
  }

  /**
   * Extrai arquivo ZIP/TAR
   */
  static async extractArchive(
    archivePath: string,
    destinationDir: string,
    options?: {
      onProgress?: (file: string) => void;
    }
  ): Promise<void> {
    await ensureDir(destinationDir);
    
    const extension = archivePath.toLowerCase();
    
    if (extension.endsWith(".zip")) {
      // Para ZIP, usar comando unzip
      const result = await ProcessUtils.runCommand("unzip", [
        "-q",
        "-o",
        archivePath,
        "-d",
        destinationDir,
      ]);
      
      if (!result.success) {
        throw new Error(\`Failed to extract ZIP: \${result.stderr}\`);
      }
    } else if (extension.endsWith(".tar") || extension.endsWith(".tar.gz") || extension.endsWith(".tgz")) {
      // Para TAR, usar comando tar
      const args = ["xf", archivePath, "-C", destinationDir];
      if (extension.endsWith(".gz") || extension.endsWith(".tgz")) {
        args.unshift("z");
      }
      
      const result = await ProcessUtils.runCommand("tar", args);
      
      if (!result.success) {
        throw new Error(\`Failed to extract TAR: \${result.stderr}\`);
      }
    } else {
      throw new Error(\`Unsupported archive format: \${extension}\`);
    }
  }

  /**
   * Copia diretório recursivamente
   */
  static async copyDirectory(src: string, dest: string): Promise<void> {
    await ensureDir(dest);
    
    for await (const entry of Deno.readDir(src)) {
      const srcPath = \`\${src}/\${entry.name}\`;
      const destPath = \`\${dest}/\${entry.name}\`;
      
      if (entry.isDirectory) {
        await FileUtils.copyDirectory(srcPath, destPath);
      } else {
        await Deno.copyFile(srcPath, destPath);
      }
    }
  }
}

export class GitUtils {
  /**
   * Clona repositório Git
   */
  static async clone(
    repoUrl: string,
    destination?: string,
    options?: {
      branch?: string;
      depth?: number;
    }
  ): Promise<boolean> {
    const args = ["clone"];
    
    if (options?.branch) {
      args.push("-b", options.branch);
    }
    
    if (options?.depth) {
      args.push("--depth", options.depth.toString());
    }
    
    args.push(repoUrl);
    
    if (destination) {
      args.push(destination);
    }
    
    const result = await ProcessUtils.runCommand("git", args);
    return result.success;
  }

  /**
   * Faz pull do repositório
   */
  static async pull(repoPath?: string): Promise<boolean> {
    const result = await ProcessUtils.runCommand("git", ["pull"], {
      cwd: repoPath,
    });
    return result.success;
  }
}

export class NetworkUtils {
  /**
   * Faz requisição HTTP com retry
   */
  static async fetchWithRetry(
    url: string,
    options?: RequestInit & { maxRetries?: number; retryDelay?: number }
  ): Promise<Response> {
    const maxRetries = options?.maxRetries || 3;
    const retryDelay = options?.retryDelay || 1000;
    
    let lastError: Error | null = null;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) {
          return response;
        }
        
        // Se não for erro de rede, não fazer retry
        if (response.status < 500) {
          return response;
        }
        
        lastError = new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      } catch (error) {
        lastError = error as Error;
      }
      
      // Aguardar antes do próximo retry
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
      }
    }
    
    throw lastError || new Error("Failed to fetch after retries");
  }
}

// Re-export das funções do Deno std atualizadas
export { ensureDir } from "jsr:@std/fs@1.0.0/ensure-dir";
export { exists } from "jsr:@std/fs@1.0.0/exists";
export { walk } from "jsr:@std/fs@1.0.0/walk";
export { join, resolve, dirname, basename } from "jsr:@std/path@1.0.0";
export { parse as parseYaml } from "jsr:@std/yaml@1.0.0";
export { encode as base64Encode, decode as base64Decode } from "jsr:@std/encoding@1.0.0/base64";
`;

  try {
    await ensureDir("src/lib");
    await Deno.writeTextFile("src/lib/deno2_helpers.ts", helpers);
    console.log(`${colors.green}✓${colors.reset} Created src/lib/deno2_helpers.ts with updated utilities`);
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Failed to create helpers: ${error}`);
  }
}

// Criar arquivo de testes para as novas funções
async function createHelperTests() {
  const tests = `/**
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
`;

  try {
    await ensureDir("src/lib");
    await Deno.writeTextFile("src/lib/deno2_helpers_test.ts", tests);
    console.log(`${colors.green}✓${colors.reset} Created src/lib/deno2_helpers_test.ts with tests`);
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Failed to create tests: ${error}`);
  }
}

// Criar exemplo de uso dos novos patterns
async function createMigrationExamples() {
  const examples = `# Exemplos de Migração Levain - Deno 1 → Deno 2

## 1. Executar Comandos (Substituir Deno.run)

### Antes (Deno 1):
\`\`\`typescript
const p = Deno.run({
  cmd: ["git", "clone", repoUrl, destPath],
  stdout: "piped",
  stderr: "piped"
});

const { success } = await p.status();
const rawOutput = await p.output();
const output = new TextDecoder().decode(rawOutput);
p.close();
\`\`\`

### Depois (Deno 2):
```typescript
import { ProcessUtils } from "./src/lib/deno2_helpers.ts";

const result = await ProcessUtils.runCommand("git", ["clone", repoUrl, destPath]);
if (result.success) {
  console.log("Clone successful:", result.stdout);
} else {
  console.error("Clone failed:", result.stderr);
}
```

## 2. Download de Arquivos com Progresso

### Antes (Deno 1):
```typescript
const response = await fetch(downloadUrl);
const file = await Deno.open(destPath, { write: true, create: true });
await Deno.copy(response.body!, file);
file.close();
```

### Depois (Deno 2):
```typescript
import { FileUtils } from "./src/lib/deno2_helpers.ts";

await FileUtils.downloadFile(
  downloadUrl,
  destPath,
  {
    onProgress: (percent) => {
      console.log(`Download progress: ${percent}%`);
    }
  }
);
```

## 3. Extrair Arquivos

### Antes (Deno 1):
```typescript
const p = Deno.run({
  cmd: ["unzip", "-o", zipFile, "-d", destDir],
  stdout: "piped",
  stderr: "piped"
});
await p.status();
p.close();
```

### Depois (Deno 2):
```typescript
import { FileUtils } from "./src/lib/deno2_helpers.ts";

await FileUtils.extractArchive(zipFile, destDir);
```

## 4. Operações Git

### Antes (Deno 1):
```typescript
const p = Deno.run({
  cmd: ["git", "clone", "-b", branch, "--depth", "1", repoUrl, destPath],
});
const { success } = await p.status();
p.close();
```

### Depois (Deno 2):
```typescript
import { GitUtils } from "./src/lib/deno2_helpers.ts";

const success = await GitUtils.clone(repoUrl, destPath, {
  branch: branch,
  depth: 1
});
```

## 5. Imports do Standard Library

### Antes (Deno 1):
```typescript
import { ensureDir } from "https://deno.land/std@0.200.0/fs/ensure_dir.ts";
import { exists } from "https://deno.land/std@0.200.0/fs/exists.ts";
import { join } from "https://deno.land/std@0.200.0/path/mod.ts";
import { parse } from "https://deno.land/std@0.200.0/encoding/yaml.ts";
```

### Depois (Deno 2):
```typescript
import { ensureDir } from "jsr:@std/fs@1.0.0/ensure-dir";
import { exists } from "jsr:@std/fs@1.0.0/exists";
import { join } from "jsr:@std/path@1.0.0";
import { parse } from "jsr:@std/yaml@1.0.0";
```

## 6. Variáveis de Ambiente e Permissões

### Antes (Deno 1):
```bash
deno run --allow-all levain.ts
```

### Depois (Deno 2 - mais seguro):
```bash
deno run \
  --allow-read=. \
  --allow-write=./temp,./downloads \
  --allow-net=github.com,api.github.com \
  --allow-run=git,unzip,tar \
  --allow-env=LEVAIN_HOME,PATH \
  levain.ts
```

## 7. Configuração do VSCode

Crie/atualize `.vscode/settings.json`:
```json
{
  "deno.enable": true,
  "deno.lint": true,
  "deno.unstable": false,
  "deno.importMap": "./deno.json",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "denoland.vscode-deno"
  },
  "[javascript]": {
    "editor.defaultFormatter": "denoland.vscode-deno"
  }
}
```

## 8. GitHub Actions para CI/CD

Atualize `.github/workflows/deno.yml`:
```yaml
name: Deno CI

on:
  push:
    branches: [ main, deno2_opus ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - uses: denoland/setup-deno@v1
      with:
        deno-version: v2.x
    
    - name: Verify formatting
      run: deno fmt --check
    
    - name: Run linter
      run: deno lint
    
    - name: Run tests
      run: deno test --allow-all --coverage
    
    - name: Generate coverage
      run: deno coverage --lcov > coverage.lcov
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.lcov

  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    steps:
    - uses: actions/checkout@v3
    
    - uses: denoland/setup-deno@v1
      with:
        deno-version: v2.x
    
    - name: Build executable
      run: deno compile --allow-all --output=levain${{ matrix.os == 'windows-latest' && '.exe' || '' }} levain.ts
    
    - name: Upload artifact
      uses: actions/upload-artifact@v3
      with:
        name: levain-${{ matrix.os }}
        path: levain${{ matrix.os == 'windows-latest' && '.exe' || '' }}
```

## 9. Package.json para Compatibilidade NPM (opcional)

Se quiser manter compatibilidade com NPM:
```json
{
  "name": "levain",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "deno run --allow-all --watch levain.ts",
    "test": "deno test --allow-all",
    "build": "deno compile --allow-all --output=levain levain.ts",
    "fmt": "deno fmt",
    "lint": "deno lint"
  },
  "devDependencies": {},
  "dependencies": {}
}
```
`;

  try {
    await Deno.writeTextFile("MIGRATION_EXAMPLES_LEVAIN.md", examples);
    console.log(`${colors.green}✓${colors.reset} Created MIGRATION_EXAMPLES_LEVAIN.md with Levain-specific examples`);
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Failed to create examples: ${error}`);
  }
}

// Atualizar arquivo principal levain.ts
async function updateMainFile() {
  const updatedMain = `#!/usr/bin/env deno run --allow-all
/**
 * Levain - Something to help you make your software grow
 * Migrated to Deno 2
 */

// Imports atualizados para Deno 2
import { parse } from "jsr:@std/flags@1.0.0";
import { exists } from "jsr:@std/fs@1.0.0/exists";
import { ensureDir } from "jsr:@std/fs@1.0.0/ensure-dir";
import { join, resolve } from "jsr:@std/path@1.0.0";
import { parse as parseYaml } from "jsr:@std/yaml@1.0.0";

// Import dos helpers
import { ProcessUtils, FileUtils } from "./src/lib/deno2_helpers.ts";

// Verificar versão do Deno
const REQUIRED_DENO_VERSION = "2.0.0";
const currentVersion = Deno.version.deno;

if (!currentVersion.startsWith("2.")) {
  console.warn(\`⚠️  Levain requires Deno 2.x or higher. Current version: \${currentVersion}\`);
  console.warn("   Run 'deno upgrade' to update to Deno 2");
}

// Configuração global
const CONFIG = {
  levainHome: Deno.env.get("LEVAIN_HOME") || join(Deno.env.get("HOME") || ".", ".levain"),
  levainRegistry: Deno.env.get("LEVAIN_REGISTRY") || "https://github.com/jmoalves/levain-pkgs",
  debug: Deno.env.get("LEVAIN_DEBUG") === "true",
};

// Logger melhorado
class Logger {
  static debug(message: string) {
    if (CONFIG.debug) {
      console.log(\`[DEBUG] \${message}\`);
    }
  }
  
  static info(message: string) {
    console.log(\`[INFO] \${message}\`);
  }
  
  static warn(message: string) {
    console.warn(\`⚠️  \${message}\`);
  }
  
  static error(message: string) {
    console.error(\`❌ \${message}\`);
  }
  
  static success(message: string) {
    console.log(\`✅ \${message}\`);
  }
}

// Classe principal do Levain
class Levain {
  constructor(private config = CONFIG) {}
  
  async init() {
    Logger.info("Initializing Levain...");
    await ensureDir(this.config.levainHome);
    await ensureDir(join(this.config.levainHome, "packages"));
    await ensureDir(join(this.config.levainHome, "temp"));
    Logger.success("Levain initialized");
  }
  
  async install(packageName: string) {
    Logger.info(\`Installing \${packageName}...\`);
    
    try {
      // Implementar lógica de instalação
      // Este é um exemplo simplificado
      const packagePath = join(this.config.levainHome, "packages", packageName);
      
      if (await exists(packagePath)) {
        Logger.warn(\`Package \${packageName} already installed\`);
        return;
      }
      
      // Download e instalação do pacote
      // ...
      
      Logger.success(\`Package \${packageName} installed successfully\`);
    } catch (error) {
      Logger.error(\`Failed to install \${packageName}: \${error.message}\`);
      throw error;
    }
  }
  
  async list() {
    Logger.info("Listing installed packages...");
    
    const packagesDir = join(this.config.levainHome, "packages");
    
    if (!await exists(packagesDir)) {
      Logger.warn("No packages installed");
      return;
    }
    
    for await (const entry of Deno.readDir(packagesDir)) {
      if (entry.isDirectory) {
        console.log(\`  - \${entry.name}\`);
      }
    }
  }
  
  async shell(packages: string[]) {
    Logger.info(\`Starting shell with packages: \${packages.join(", ")}\`);
    
    // Configurar ambiente
    const env = { ...Deno.env.toObject() };
    
    // Adicionar paths dos pacotes
    for (const pkg of packages) {
      const pkgPath = join(this.config.levainHome, "packages", pkg);
      if (await exists(pkgPath)) {
        env.PATH = \`\${pkgPath}/bin:\${env.PATH}\`;
      }
    }
    
    // Iniciar shell
    const shell = Deno.build.os === "windows" ? "cmd.exe" : "/bin/bash";
    
    const result = await ProcessUtils.runCommandWithOutput(shell, [], { env });
    
    if (!result) {
      Logger.error("Shell exited with error");
    }
  }
}

// Parser de argumentos
async function parseArgs(args: string[]) {
  const flags = parse(args, {
    boolean: ["help", "version", "debug"],
    string: ["config"],
    alias: {
      h: "help",
      v: "version",
      d: "debug",
      c: "config",
    },
  });
  
  if (flags.debug) {
    CONFIG.debug = true;
  }
  
  return flags;
}

// Função principal
async function main() {
  const args = await parseArgs(Deno.args);
  
  if (args.help) {
    console.log(\`
Levain - Something to help you make your software grow

Usage:
  levain <command> [options]

Commands:
  init              Initialize Levain
  install <pkg>     Install a package
  list              List installed packages  
  shell [pkgs...]   Start a shell with packages

Options:
  -h, --help        Show help
  -v, --version     Show version
  -d, --debug       Enable debug mode
  -c, --config      Config file path

Examples:
  levain init
  levain install nodejs
  levain list
  levain shell nodejs python
\`);
    return;
  }
  
  if (args.version) {
    console.log("Levain 2.0.0 (Deno 2)");
    return;
  }
  
  const levain = new Levain();
  const command = args._[0]?.toString();
  
  try {
    switch (command) {
      case "init":
        await levain.init();
        break;
        
      case "install":
        const packageName = args._[1]?.toString();
        if (!packageName) {
          Logger.error("Package name required");
          Deno.exit(1);
        }
        await levain.install(packageName);
        break;
        
      case "list":
        await levain.list();
        break;
        
      case "shell":
        const packages = args._.slice(1).map(p => p.toString());
        await levain.shell(packages);
        break;
        
      default:
        Logger.error(\`Unknown command: \${command}\`);
        console.log("Run 'levain --help' for usage");
        Deno.exit(1);
    }
  } catch (error) {
    Logger.error(\`Command failed: \${error.message}\`);
    if (CONFIG.debug) {
      console.error(error);
    }
    Deno.exit(1);
  }
}

// Executar se for o arquivo principal
if (import.meta.main) {
  await main();
}

export { Levain, Logger, CONFIG };
`;

  try {
    // Fazer backup do arquivo original
    if (await exists("levain.ts")) {
      await Deno.copyFile("levain.ts", "levain.ts.backup");
      console.log(`${colors.yellow}⚠${colors.reset}  Backed up original levain.ts to levain.ts.backup`);
    }
    
    await Deno.writeTextFile("levain_deno2.ts", updatedMain);
    console.log(`${colors.green}✓${colors.reset} Created levain_deno2.ts with Deno 2 structure`);
    console.log(`  ${colors.blue}ℹ${colors.reset}  Review and merge with your existing levain.ts`);
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Failed to create updated main file: ${error}`);
  }
}

// Main execution
async function main() {
  console.log(`${colors.bright}${colors.blue}
╔══════════════════════════════════════════════════════════╗
║        Levain-Specific Deno 2 Migration Fixes           ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

  console.log("Creating Levain-specific helpers and examples...\n");
  
  await createLevainHelpers();
  await createHelperTests();
  await createMigrationExamples();
  await updateMainFile();
  
  console.log(`\n${colors.green}${colors.bright}✅ Levain-specific files created!${colors.reset}\n`);
  
  console.log("Files created:");
  console.log("  • src/lib/deno2_helpers.ts - Utility functions for Deno 2");
  console.log("  • src/lib/deno2_helpers_test.ts - Tests for utilities");
  console.log("  • MIGRATION_EXAMPLES_LEVAIN.md - Levain-specific examples");
  console.log("  • levain_deno2.ts - Example main file structure");
  
  console.log(`\n${colors.bright}Next steps:${colors.reset}`);
  console.log("1. Review the generated files");
  console.log("2. Integrate deno2_helpers.ts into your codebase");
  console.log("3. Compare levain_deno2.ts with your current levain.ts");
  console.log("4. Run tests: deno test src/lib/deno2_helpers_test.ts");
}

if (import.meta.main) {
  await main();
}
