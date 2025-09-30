#!/usr/bin/env deno run --allow-all

/**
 * Corrige TODOS os arquivos que usam Cliffy
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
║         Fixing ALL Cliffy Files                         ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

// Lista de TODOS os arquivos que precisam ser corrigidos
const filesToFix = [
  "./src/lib/user_info/userinfo_util.test.ts",
  "./src/lib/user_info/input_name.ts",
  "./src/lib/user_info/input_name.test.ts",
  "./src/lib/user_info/validators/validator.ts",
  "./src/lib/user_info/validators/validators.ts",
  "./src/lib/user_info/cliffy_wrapper.ts",
  "./src/lib/user_info/input_email.test.ts",
  "./src/lib/user_info/input_email.ts",
  "./src/lib/user_info/input_login.ts",
  "./src/lib/user_info/userinfo_util.ts",
  "./src/lib/user_info/input_login.test.ts",
];

const STABLE_CLIFFY = "https://deno.land/x/cliffy@v1.0.0-rc.3";

async function fixFile(filePath: string): Promise<boolean> {
  try {
    console.log(`Processing: ${filePath}`);

    let content = await Deno.readTextFile(filePath);
    const originalContent = content;
    let changed = false;

    // Padrões de substituição
    const replacements = [
      // Qualquer versão do Cliffy para rc.3
      {
        pattern: /https:\/\/deno\.land\/x\/cliffy@[^\/]+\//g,
        replacement: `${STABLE_CLIFFY}/`,
      },
      // Imports sem versão
      {
        pattern: /https:\/\/deno\.land\/x\/cliffy\//g,
        replacement: `${STABLE_CLIFFY}/`,
      },
      // Imports com rc.7 especificamente
      {
        pattern: /cliffy@v1\.0\.0-rc\.7/g,
        replacement: "cliffy@v1.0.0-rc.3",
      },
      // Import map style
      {
        pattern: /"@cliffy\/([^"]+)"/g,
        replacement: `"${STABLE_CLIFFY}/$1"`,
      },
    ];

    for (const { pattern, replacement } of replacements) {
      const before = content;
      content = content.replace(pattern, replacement);
      if (content !== before) {
        changed = true;
      }
    }

    if (changed) {
      // Fazer backup
      await Deno.writeTextFile(`${filePath}.bak`, originalContent);
      // Salvar corrigido
      await Deno.writeTextFile(filePath, content);
      console.log(`${colors.green}✓ Fixed: ${filePath}${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.yellow}⚠ No changes needed: ${filePath}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error: ${filePath}: ${error}${colors.reset}`);
    return false;
  }
}

async function createStubsForProblematicFiles() {
  console.log(`\n${colors.blue}Creating stubs for problematic imports...${colors.reset}`);

  // Se o cliffy_wrapper.ts já existe e está causando problemas, vamos sobrescrever
  const wrapperContent = `/**
 * Cliffy Wrapper - Simplified version
 * Using stable Cliffy version
 */

// Re-export from stable Cliffy version
export { Input } from "${STABLE_CLIFFY}/prompt/mod.ts";
export { Select } from "${STABLE_CLIFFY}/prompt/mod.ts";
export { Confirm } from "${STABLE_CLIFFY}/prompt/mod.ts";
export { Command } from "${STABLE_CLIFFY}/command/mod.ts";

// Type exports if needed
export type { InputOptions } from "${STABLE_CLIFFY}/prompt/mod.ts";
export type { SelectOptions } from "${STABLE_CLIFFY}/prompt/mod.ts";
`;

  try {
    await Deno.writeTextFile("./src/lib/user_info/cliffy_wrapper.ts", wrapperContent);
    console.log(`${colors.green}✓ Updated cliffy_wrapper.ts${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}✗ Could not update wrapper: ${error}${colors.reset}`);
  }
}

async function commentOutImportsTemporarily() {
  console.log(`\n${colors.blue}Option B: Comment out ALL Cliffy imports temporarily...${colors.reset}`);

  for (const file of filesToFix) {
    try {
      let content = await Deno.readTextFile(file);

      // Comentar todos os imports do Cliffy
      content = content.replace(
        /^(import .* from .*cliffy.*)/gm,
        "// TEMP DISABLED: $1",
      );

      // Adicionar stubs para não quebrar
      if (!content.includes("// CLIFFY STUB")) {
        content = `// CLIFFY STUB - Remove after fixing
const Input = { prompt: async (opts: any) => opts.default || '' };
const Select = { prompt: async (opts: any) => opts.options?.[0] || '' };
const Confirm = { prompt: async (opts: any) => false };
const Command = class Command { parse() {} };

` + content;
      }

      await Deno.writeTextFile(file, content);
      console.log(`${colors.yellow}Commented out Cliffy in: ${file}${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}Error: ${error}${colors.reset}`);
    }
  }
}

async function main() {
  let fixedCount = 0;

  // Primeiro tentar corrigir os imports
  console.log(`${colors.cyan}Step 1: Fixing imports in all files...${colors.reset}\n`);

  for (const file of filesToFix) {
    const fixed = await fixFile(file);
    if (fixed) fixedCount++;
  }

  // Atualizar o wrapper
  console.log(`\n${colors.cyan}Step 2: Updating wrapper...${colors.reset}`);
  await createStubsForProblematicFiles();

  console.log(`\n${colors.green}Fixed ${fixedCount}/${filesToFix.length} files${colors.reset}`);

  // Se ainda tiver problemas, oferecer opção nuclear
  if (fixedCount < filesToFix.length) {
    console.log(`\n${colors.yellow}Some files could not be fixed automatically.${colors.reset}`);
    console.log(`${colors.yellow}Would you like to comment out all Cliffy imports? (nuclear option)${colors.reset}`);

    const response = prompt("Comment out all Cliffy imports? (y/N)");
    if (response?.toLowerCase() === "y") {
      await commentOutImportsTemporarily();
    }
  }

  console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
  console.log("1. Clear cache: rm -rf ~/.cache/deno");
  console.log("2. Try again: deno cache levain.ts");
  console.log("3. If it works, test: deno run --allow-all levain.ts --help");
}

if (import.meta.main) {
  await main();
}
