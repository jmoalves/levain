#!/usr/bin/env deno run --allow-all

/**
 * Script para forçar correção dos imports do Cliffy
 * Substitui TODAS as referências para uma versão funcional
 */

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

console.log(`${colors.cyan}
╔══════════════════════════════════════════════════════════╗
║         Force Fix Cliffy Import Issues                  ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

async function findAndReplaceCliffyImports() {
  const replacements = [
    // Qualquer versão do Cliffy para v1.0.0-rc.3 (versão mais estável)
    {
      pattern: /https:\/\/deno\.land\/x\/cliffy@[^\/]+\//g,
      replacement: "https://deno.land/x/cliffy@v1.0.0-rc.3/",
    },
    // Se houver imports com JSR
    {
      pattern: /jsr:@cliffy\/([^@]+)@[^"']*/g,
      replacement: (match: string, module: string) => {
        // Mapear para deno.land/x equivalente
        const moduleMap: Record<string, string> = {
          "command": "command/mod.ts",
          "prompt": "prompt/mod.ts",
          "table": "table/mod.ts",
          "flags": "flags/mod.ts",
          "keycode": "keycode/mod.ts",
          "ansi": "ansi/mod.ts",
        };

        const path = moduleMap[module] || `${module}/mod.ts`;
        return `https://deno.land/x/cliffy@v1.0.0-rc.3/${path}`;
      },
    },
    // Imports relativos do Cliffy que possam estar quebrados
    {
      pattern: /"@cliffy\/([^"]+)"/g,
      replacement: (match: string, path: string) => {
        return `"https://deno.land/x/cliffy@v1.0.0-rc.3/${path}"`;
      },
    },
  ];

  async function* walkFiles(dir: string): AsyncGenerator<string> {
    try {
      for await (const entry of Deno.readDir(dir)) {
        const path = `${dir}/${entry.name}`;

        // Pular diretórios que não devemos modificar
        if (
          entry.name === ".git" ||
          entry.name === "node_modules" ||
          entry.name === ".backup-deno1"
        ) {
          continue;
        }

        if (entry.isFile && (path.endsWith(".ts") || path.endsWith(".js"))) {
          yield path;
        } else if (entry.isDirectory) {
          yield* walkFiles(path);
        }
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠ Cannot access ${dir}: ${error}${colors.reset}`);
    }
  }

  let totalFiles = 0;
  let updatedFiles = 0;
  const updatedFilesList: string[] = [];

  // Processar todos os arquivos
  for await (const file of walkFiles(".")) {
    totalFiles++;

    try {
      let content = await Deno.readTextFile(file);
      let changed = false;
      const originalContent = content;

      for (const { pattern, replacement } of replacements) {
        const before = content;
        if (typeof replacement === "string") {
          content = content.replace(pattern, replacement);
        } else {
          content = content.replace(pattern, replacement as any);
        }

        if (content !== before) {
          changed = true;
        }
      }

      if (changed) {
        await Deno.writeTextFile(file, content);
        updatedFiles++;
        updatedFilesList.push(file);
        console.log(`${colors.green}✓${colors.reset} Fixed: ${file}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗${colors.reset} Error processing ${file}: ${error}`);
    }
  }

  console.log(`\n${colors.blue}Summary:${colors.reset}`);
  console.log(`Files scanned: ${totalFiles}`);
  console.log(`Files updated: ${updatedFiles}`);

  if (updatedFilesList.length > 0) {
    console.log(`\n${colors.green}Updated files:${colors.reset}`);
    updatedFilesList.forEach((f) => console.log(`  - ${f}`));
  }
}

async function cleanDenoJson() {
  console.log(`\n${colors.blue}Cleaning deno.json...${colors.reset}`);

  try {
    const content = await Deno.readTextFile("deno.json");
    const config = JSON.parse(content);

    // Remover mapeamentos problemáticos
    if (config.imports) {
      // Remover @cliffy/ mapping que causa problemas
      delete config.imports["@cliffy/"];

      // Remover importMap se existir (conflito)
      delete config.importMap;

      console.log(`${colors.green}✓${colors.reset} Removed problematic Cliffy mappings from deno.json`);
    }

    await Deno.writeTextFile("deno.json", JSON.stringify(config, null, 2));
  } catch (error) {
    console.log(`${colors.yellow}⚠${colors.reset} Could not update deno.json: ${error}`);
  }
}

async function cleanCache() {
  console.log(`\n${colors.blue}Cleaning cache directories...${colors.reset}`);

  const dirsToClean = ["bin/gen", ".deno", "dist", "build"];

  for (const dir of dirsToClean) {
    try {
      const stats = await Deno.stat(dir);
      if (stats.isDirectory) {
        await Deno.remove(dir, { recursive: true });
        console.log(`${colors.green}✓${colors.reset} Removed ${dir}`);
      }
    } catch {
      // Directory doesn't exist, that's fine
    }
  }
}

async function findCliffyUsage() {
  console.log(`\n${colors.blue}Finding Cliffy usage in the project...${colors.reset}`);

  const cliffyFiles: string[] = [];

  async function* walkFiles(dir: string): AsyncGenerator<string> {
    try {
      for await (const entry of Deno.readDir(dir)) {
        const path = `${dir}/${entry.name}`;

        if (
          entry.name === ".git" ||
          entry.name === "node_modules" ||
          entry.name === "bin" ||
          entry.name === ".backup-deno1"
        ) {
          continue;
        }

        if (entry.isFile && path.endsWith(".ts")) {
          yield path;
        } else if (entry.isDirectory) {
          yield* walkFiles(path);
        }
      }
    } catch {
      // Ignore
    }
  }

  for await (const file of walkFiles(".")) {
    try {
      const content = await Deno.readTextFile(file);
      if (content.includes("cliffy")) {
        cliffyFiles.push(file);
      }
    } catch {
      // Ignore
    }
  }

  if (cliffyFiles.length > 0) {
    console.log(`\nFound Cliffy imports in ${cliffyFiles.length} files:`);
    cliffyFiles.forEach((f) => console.log(`  - ${f}`));
  } else {
    console.log(`\n${colors.green}No Cliffy imports found in TypeScript files${colors.reset}`);
  }

  return cliffyFiles;
}

async function createLockFile() {
  console.log(`\n${colors.blue}Creating deno.lock to pin dependencies...${colors.reset}`);

  // Remover lock antigo se existir
  try {
    await Deno.remove("deno.lock");
    console.log(`${colors.yellow}Removed old deno.lock${colors.reset}`);
  } catch {
    // Não existe
  }
}

// Main execution
async function main() {
  // 1. Limpar deno.json
  await cleanDenoJson();

  // 2. Encontrar onde Cliffy é usado
  const cliffyFiles = await findCliffyUsage();

  // 3. Substituir todos os imports do Cliffy
  await findAndReplaceCliffyImports();

  // 4. Limpar cache
  await cleanCache();

  // 5. Preparar para novo lock
  await createLockFile();

  console.log(`\n${colors.green}✅ Cliffy fixes completed!${colors.reset}`);
  console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
  console.log("1. Try: deno cache --reload levain.ts");
  console.log("2. If that fails, try: deno run --reload --allow-all levain.ts --help");
  console.log("3. If still having issues:");
  console.log("   - Check if Cliffy is actually needed");
  console.log("   - Consider removing it temporarily");
  console.log("   - Or replace with a different CLI library");

  if (cliffyFiles.length === 0) {
    console.log(`\n${colors.yellow}Note: No Cliffy usage found in your TypeScript files.${colors.reset}`);
    console.log("The error might be from cached dependencies.");
    console.log("Try: deno cache --reload levain.ts");
  }
}

if (import.meta.main) {
  await main();
}
