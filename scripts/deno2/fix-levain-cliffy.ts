#!/usr/bin/env deno run --allow-all

/**
 * Corrige os imports do Cliffy especificamente nos arquivos do Levain
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
║       Fixing Cliffy Imports in Levain Files             ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

// Arquivos específicos que precisam ser corrigidos
const filesToFix = [
  'src/lib/user_info/inputAccentWorkaround/validateWithCliffy.ts',
  'src/lib/user_info/inputAccentWorkaround/inputNomeComAcentos.ts',
];

// Versão estável do Cliffy que funciona
const STABLE_CLIFFY = 'https://deno.land/x/cliffy@v1.0.0-rc.3';

async function fixFile(filePath: string) {
  try {
    console.log(`\n${colors.blue}Processing: ${filePath}${colors.reset}`);
    
    let content = await Deno.readTextFile(filePath);
    const originalContent = content;
    
    // Substituir imports do Cliffy
    // De: import {Input} from 'https://deno.land/x/cliffy/prompt/mod.ts'
    // Para: import {Input} from 'https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/mod.ts'
    
    // Padrão para qualquer versão do Cliffy
    content = content.replace(
      /from\s+['"]https:\/\/deno\.land\/x\/cliffy(?:@[^\/]+)?\/prompt\/mod\.ts['"]/g,
      `from '${STABLE_CLIFFY}/prompt/mod.ts'`
    );
    
    // Caso haja outros imports do Cliffy
    content = content.replace(
      /from\s+['"]https:\/\/deno\.land\/x\/cliffy(?:@[^\/]+)?\//g,
      `from '${STABLE_CLIFFY}/`
    );
    
    if (content !== originalContent) {
      await Deno.writeTextFile(filePath, content);
      console.log(`${colors.green}✓ Fixed imports in ${filePath}${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.yellow}⚠ No changes needed in ${filePath}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error processing ${filePath}: ${error}${colors.reset}`);
    return false;
  }
}

async function checkCliffyTestHelper() {
  const testHelperPath = 'src/lib/user_info/cliffy_test_helper.ts';
  
  try {
    const exists = await Deno.stat(testHelperPath).then(() => true).catch(() => false);
    
    if (exists) {
      console.log(`\n${colors.blue}Checking: ${testHelperPath}${colors.reset}`);
      
      let content = await Deno.readTextFile(testHelperPath);
      const originalContent = content;
      
      // Verificar se tem imports do Cliffy
      if (content.includes('cliffy')) {
        // Atualizar qualquer import do Cliffy
        content = content.replace(
          /from\s+['"]https:\/\/deno\.land\/x\/cliffy(?:@[^\/]+)?\//g,
          `from '${STABLE_CLIFFY}/`
        );
        
        // Se for apenas uma referência no nome, não precisa mudar
        if (content !== originalContent) {
          await Deno.writeTextFile(testHelperPath, content);
          console.log(`${colors.green}✓ Fixed imports in ${testHelperPath}${colors.reset}`);
        } else {
          console.log(`${colors.yellow}⚠ File only references Cliffy in name/comments${colors.reset}`);
        }
      }
    } else {
      console.log(`\n${colors.yellow}Note: ${testHelperPath} not found${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}Error checking test helper: ${error}${colors.reset}`);
  }
}

async function createCliffyWrapper() {
  console.log(`\n${colors.blue}Creating Cliffy wrapper for better compatibility...${colors.reset}`);
  
  const wrapperContent = `/**
 * Cliffy Wrapper for Levain
 * Centralizes Cliffy imports to make updates easier
 */

// Use stable version of Cliffy
export { Input } from "${STABLE_CLIFFY}/prompt/mod.ts";
export { Command } from "${STABLE_CLIFFY}/command/mod.ts";
export { Table } from "${STABLE_CLIFFY}/table/mod.ts";

// Re-export types if needed
export type { InputOptions } from "${STABLE_CLIFFY}/prompt/mod.ts";
export type { CommandOptions } from "${STABLE_CLIFFY}/command/mod.ts";
`;

  const wrapperPath = 'src/lib/user_info/cliffy_wrapper.ts';
  
  try {
    await Deno.writeTextFile(wrapperPath, wrapperContent);
    console.log(`${colors.green}✓ Created ${wrapperPath}${colors.reset}`);
    console.log('  You can now import Cliffy from this wrapper instead of directly');
    console.log('  Example: import { Input } from "./cliffy_wrapper.ts"');
  } catch (error) {
    console.log(`${colors.red}Error creating wrapper: ${error}${colors.reset}`);
  }
}

async function updateImportsToUseWrapper() {
  console.log(`\n${colors.blue}Option: Update files to use wrapper...${colors.reset}`);
  
  const updateCode = `
// Instead of:
// import { Input } from 'https://deno.land/x/cliffy/prompt/mod.ts'

// Use:
// import { Input } from '../cliffy_wrapper.ts'
`;
  
  console.log(updateCode);
  console.log('This approach makes future updates easier');
}

async function cleanCache() {
  console.log(`\n${colors.blue}Cleaning cache...${colors.reset}`);
  
  const cacheDirs = ['bin/gen', '.deno'];
  
  for (const dir of cacheDirs) {
    try {
      await Deno.remove(dir, { recursive: true });
      console.log(`${colors.green}✓ Removed ${dir}${colors.reset}`);
    } catch {
      // Directory doesn't exist
    }
  }
}

async function main() {
  // 1. Fix known files
  let fixedCount = 0;
  for (const file of filesToFix) {
    const fixed = await fixFile(file);
    if (fixed) fixedCount++;
  }
  
  // 2. Check test helper
  await checkCliffyTestHelper();
  
  // 3. Create wrapper for future use
  await createCliffyWrapper();
  
  // 4. Show how to update to use wrapper
  await updateImportsToUseWrapper();
  
  // 5. Clean cache
  await cleanCache();
  
  console.log(`\n${colors.green}✅ Cliffy fixes completed!${colors.reset}`);
  console.log(`Fixed ${fixedCount} files`);
  
  console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
  console.log('1. Try: deno cache --reload levain.ts');
  console.log('2. If successful, run: deno run --allow-all levain.ts --help');
  console.log('3. Consider updating imports to use the wrapper for easier maintenance');
  
  console.log(`\n${colors.yellow}Note:${colors.reset}`);
  console.log('The Cliffy imports are now pinned to v1.0.0-rc.3 which is stable');
  console.log('If you need to update Cliffy in the future, just update the wrapper');
}

if (import.meta.main) {
  await main();
}
