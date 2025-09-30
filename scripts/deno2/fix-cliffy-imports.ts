#!/usr/bin/env deno run --allow-all

/**
 * Script para corrigir imports do Cliffy
 * Atualiza de deno.land/x/cliffy para JSR
 */

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
};

async function updateCliffyImports() {
  console.log(`${colors.blue}Fixing Cliffy imports...${colors.reset}\n`);
  
  // Padrões de substituição para Cliffy
  const cliffyReplacements = [
    // Versões antigas do deno.land/x/cliffy
    {
      pattern: /from\s+["']https:\/\/deno\.land\/x\/cliffy@[^\/]+\/command\/mod\.ts["']/g,
      replacement: 'from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts"'
    },
    {
      pattern: /from\s+["']https:\/\/deno\.land\/x\/cliffy@[^\/]+\/prompt\/mod\.ts["']/g,
      replacement: 'from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/mod.ts"'
    },
    {
      pattern: /from\s+["']https:\/\/deno\.land\/x\/cliffy@[^\/]+\/table\/mod\.ts["']/g,
      replacement: 'from "https://deno.land/x/cliffy@v1.0.0-rc.3/table/mod.ts"'
    },
    {
      pattern: /from\s+["']https:\/\/deno\.land\/x\/cliffy@[^\/]+\/([^"']+)["']/g,
      replacement: 'from "https://deno.land/x/cliffy@v1.0.0-rc.3/$1"'
    }
  ];
  
  async function* walkFiles(dir: string): AsyncGenerator<string> {
    try {
      for await (const entry of Deno.readDir(dir)) {
        const path = `${dir}/${entry.name}`;
        
        if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'bin') {
          continue;
        }
        
        if (entry.isFile && (path.endsWith('.ts') || path.endsWith('.js'))) {
          yield path;
        } else if (entry.isDirectory) {
          yield* walkFiles(path);
        }
      }
    } catch {
      // Ignorar erros
    }
  }
  
  let filesUpdated = 0;
  
  for await (const file of walkFiles('.')) {
    try {
      let content = await Deno.readTextFile(file);
      let changed = false;
      
      for (const { pattern, replacement } of cliffyReplacements) {
        const before = content;
        content = content.replace(pattern, replacement);
        if (content !== before) {
          changed = true;
        }
      }
      
      if (changed) {
        await Deno.writeTextFile(file, content);
        console.log(`${colors.green}✓${colors.reset} Updated: ${file}`);
        filesUpdated++;
      }
    } catch (error) {
      console.log(`${colors.red}✗${colors.reset} Error processing ${file}: ${error}`);
    }
  }
  
  console.log(`\n${colors.green}Updated ${filesUpdated} files${colors.reset}`);
}

async function updateDenoJson() {
  console.log(`\n${colors.blue}Updating deno.json...${colors.reset}\n`);
  
  try {
    const denoJsonContent = await Deno.readTextFile('deno.json');
    const denoJson = JSON.parse(denoJsonContent);
    
    // Remover mapeamentos problemáticos do Cliffy
    if (denoJson.imports) {
      delete denoJson.imports['@cliffy/'];
      
      // Adicionar mapeamentos específicos se necessário
      // Por enquanto, vamos usar URLs diretas
    }
    
    // Remover importMap se existir (conflito com imports)
    delete denoJson.importMap;
    
    await Deno.writeTextFile('deno.json', JSON.stringify(denoJson, null, 2));
    console.log(`${colors.green}✓${colors.reset} Updated deno.json`);
    
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Error updating deno.json: ${error}`);
  }
}

async function clearCache() {
  console.log(`\n${colors.blue}Clearing Deno cache...${colors.reset}\n`);
  
  // Remover diretório bin/gen se existir
  try {
    await Deno.remove('bin/gen', { recursive: true });
    console.log(`${colors.green}✓${colors.reset} Removed bin/gen directory`);
  } catch {
    // Não existe ou não pode remover
  }
  
  // Remover diretório .deno se existir
  try {
    await Deno.remove('.deno', { recursive: true });
    console.log(`${colors.green}✓${colors.reset} Removed .deno directory`);
  } catch {
    // Não existe ou não pode remover
  }
}

async function main() {
  console.log(`${colors.yellow}
╔══════════════════════════════════════════════════════════╗
║           Fixing Cliffy Import Issues                   ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);
  
  await updateCliffyImports();
  await updateDenoJson();
  await clearCache();
  
  console.log(`\n${colors.green}✅ Cliffy imports fixed!${colors.reset}`);
  console.log('\nNext steps:');
  console.log('1. Try to run: deno cache levain.ts');
  console.log('2. If still having issues, run: deno cache --reload levain.ts');
  console.log('3. Test with: deno run --allow-all levain.ts --help');
}

if (import.meta.main) {
  await main();
}
