#!/usr/bin/env deno run --allow-all

/**
 * Solução Nuclear para o problema do Cliffy
 * Remove completamente o uso do Cliffy e substitui por alternativas
 */

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

console.log(`${colors.red}
╔══════════════════════════════════════════════════════════╗
║         NUCLEAR OPTION: Removing Cliffy                 ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

// Criar versões alternativas dos arquivos sem Cliffy
async function createAlternativeFiles() {
  console.log(`\n${colors.blue}Creating alternative implementations without Cliffy...${colors.reset}`);
  
  // 1. Criar alternativa para validateWithCliffy.ts
  const validateAlternative = `/**
 * Alternative implementation without Cliffy
 * Uses native Deno prompt instead
 */

export async function validateInput(message: string): Promise<string> {
  // Use Deno's built-in prompt instead of Cliffy
  const input = prompt(message);
  return input || "";
}

export async function validateInputWithDefault(message: string, defaultValue: string): Promise<string> {
  const input = prompt(\`\${message} [\${defaultValue}]\`);
  return input || defaultValue;
}
`;

  // 2. Criar alternativa para inputNomeComAcentos.ts
  const inputAlternative = `/**
 * Alternative implementation for accent input without Cliffy
 * Uses native Deno prompt
 */

import * as path from "jsr:@std/path@1.0.0";

export async function inputNomeComAcentos(message: string = "Digite o nome:"): Promise<string> {
  // Use native prompt - it handles accents fine in most terminals
  const name = prompt(message);
  
  if (!name) {
    return "";
  }
  
  // Save for debugging if needed
  const myFolder = Deno.makeTempDirSync();
  await Deno.writeTextFile(path.join(myFolder, 'nome.txt'), name);
  
  const encoder = new TextEncoder();
  const encodedName = encoder.encode(name);
  await Deno.writeFile(path.join(myFolder, 'nome.encoded.txt'), encodedName);
  
  return name;
}

// Simple Input replacement
export class Input {
  static async prompt(config: { message: string; default?: string }): Promise<string> {
    const message = config.default 
      ? \`\${config.message} [\${config.default}]\`
      : config.message;
    
    const result = prompt(message);
    return result || config.default || "";
  }
}
`;

  // 3. Criar stub para cliffy_test_helper.ts
  const testHelperStub = `/**
 * Cliffy Test Helper Stub
 * Minimal implementation for testing without Cliffy
 */

export class CliffyTestHelper {
  static async mockInput(value: string): Promise<void> {
    // Mock implementation
    console.log(\`Mocked input: \${value}\`);
  }
  
  static restore(): void {
    // Mock implementation
    console.log("Input restored");
  }
}
`;

  // Salvar os arquivos
  try {
    // Backup dos originais
    const files = [
      'src/lib/user_info/inputAccentWorkaround/validateWithCliffy.ts',
      'src/lib/user_info/inputAccentWorkaround/inputNomeComAcentos.ts',
      'src/lib/user_info/cliffy_test_helper.ts'
    ];
    
    for (const file of files) {
      try {
        const exists = await Deno.stat(file).then(() => true).catch(() => false);
        if (exists) {
          await Deno.copyFile(file, `${file}.cliffy-backup`);
          console.log(`${colors.yellow}Backed up: ${file}${colors.reset}`);
        }
      } catch {
        // File doesn't exist
      }
    }
    
    // Escrever novos arquivos
    await Deno.writeTextFile(
      'src/lib/user_info/inputAccentWorkaround/validateWithCliffy.ts',
      validateAlternative
    );
    console.log(`${colors.green}✓ Created alternative validateWithCliffy.ts${colors.reset}`);
    
    await Deno.writeTextFile(
      'src/lib/user_info/inputAccentWorkaround/inputNomeComAcentos.ts',
      inputAlternative
    );
    console.log(`${colors.green}✓ Created alternative inputNomeComAcentos.ts${colors.reset}`);
    
    await Deno.writeTextFile(
      'src/lib/user_info/cliffy_test_helper.ts',
      testHelperStub
    );
    console.log(`${colors.green}✓ Created stub cliffy_test_helper.ts${colors.reset}`);
    
  } catch (error) {
    console.log(`${colors.red}Error creating alternatives: ${error}${colors.reset}`);
  }
}

async function cleanAllCaches() {
  console.log(`\n${colors.blue}Cleaning ALL caches...${colors.reset}`);
  
  // Local caches
  const localDirs = ['bin', '.deno', 'dist', 'build', 'node_modules'];
  
  for (const dir of localDirs) {
    try {
      await Deno.remove(dir, { recursive: true });
      console.log(`${colors.green}✓ Removed ${dir}${colors.reset}`);
    } catch {
      // Doesn't exist
    }
  }
  
  // Global Deno cache
  const home = Deno.env.get("HOME");
  if (home) {
    const globalCache = `${home}/.cache/deno`;
    
    console.log(`\n${colors.yellow}About to remove global Deno cache: ${globalCache}${colors.reset}`);
    console.log(`${colors.yellow}This will affect ALL Deno projects on this machine!${colors.reset}`);
    
    const response = prompt("Remove global cache? (y/N)");
    
    if (response?.toLowerCase() === 'y') {
      try {
        await Deno.remove(globalCache, { recursive: true });
        console.log(`${colors.green}✓ Removed global cache${colors.reset}`);
      } catch (error) {
        console.log(`${colors.red}Could not remove global cache: ${error}${colors.reset}`);
      }
    } else {
      console.log("Skipped global cache removal");
    }
  }
}

async function restoreOriginals() {
  console.log(`\n${colors.cyan}To restore original Cliffy files later:${colors.reset}`);
  
  const script = `#!/bin/bash
# Restore original Cliffy files
mv src/lib/user_info/inputAccentWorkaround/validateWithCliffy.ts.cliffy-backup src/lib/user_info/inputAccentWorkaround/validateWithCliffy.ts
mv src/lib/user_info/inputAccentWorkaround/inputNomeComAcentos.ts.cliffy-backup src/lib/user_info/inputAccentWorkaround/inputNomeComAcentos.ts
mv src/lib/user_info/cliffy_test_helper.ts.cliffy-backup src/lib/user_info/cliffy_test_helper.ts
`;
  
  await Deno.writeTextFile('restore-cliffy.sh', script);
  console.log(`Created restore-cliffy.sh script`);
  console.log(`Run: bash restore-cliffy.sh to restore original files`);
}

async function main() {
  console.log(`${colors.yellow}
⚠️  WARNING: This will replace Cliffy with native alternatives
⚠️  Original files will be backed up with .cliffy-backup extension
${colors.reset}`);
  
  const response = prompt("\nProceed with nuclear option? (y/N)");
  
  if (response?.toLowerCase() !== 'y') {
    console.log("Aborted");
    Deno.exit(0);
  }
  
  // 1. Create alternative implementations
  await createAlternativeFiles();
  
  // 2. Clean all caches
  await cleanAllCaches();
  
  // 3. Create restore script
  await restoreOriginals();
  
  console.log(`\n${colors.green}✅ Nuclear option completed!${colors.reset}`);
  console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
  console.log('1. Try: deno cache levain.ts');
  console.log('2. Run: deno run --allow-all levain.ts --help');
  console.log('3. If everything works, continue with migration');
  console.log('4. To restore Cliffy later: bash restore-cliffy.sh');
  
  console.log(`\n${colors.yellow}Note:${colors.reset}`);
  console.log('The input functionality may be slightly different without Cliffy');
  console.log('But it should work for basic testing and migration purposes');
}

if (import.meta.main) {
  await main();
}
