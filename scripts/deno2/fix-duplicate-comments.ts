#!/usr/bin/env deno run --allow-all

/**
 * Corrige comentários duplicados e problemas de Deno.resources()
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
║     Fixing Duplicate Comments and Resources             ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

async function fixFileUtils() {
  const filePath = 'src/lib/fs/file_utils.ts';
  
  try {
    console.log(`${colors.blue}Fixing ${filePath}...${colors.reset}`);
    
    let content = await Deno.readTextFile(filePath);
    const originalContent = content;
    
    // Backup
    await Deno.writeTextFile(`${filePath}.comments-backup`, originalContent);
    
    // Mostrar a linha problemática
    const lines = content.split('\n');
    console.log(`\n${colors.yellow}Line 83 (current):${colors.reset}`);
    console.log(lines[82]); // Line 83 is index 82
    
    // Corrigir comentários duplicados
    // Pattern: {} /* {} /* Deno.resources() removed in Deno 2 */ removed in Deno 2 */
    content = content.replace(
      /\{\}\s*\/\*.*?Deno\.resources\(\).*?\*\/.*?\/\*.*?\*\//g,
      '{} /* Deno.resources() removed in Deno 2 */'
    );
    
    // Corrigir qualquer duplicação de "removed in Deno 2"
    content = content.replace(
      /\/\*([^*]*removed in Deno 2[^*]*)\*\/[^*]*removed in Deno 2[^*]*\*\//g,
      '/* $1 */'
    );
    
    // Corrigir casos onde Deno.resources() não foi substituído corretamente
    content = content.replace(
      /Deno\.resources\(\)/g,
      '{} /* Deno.resources() removed in Deno 2 */'
    );
    
    // Mas se já tem o comentário, não duplicar
    content = content.replace(
      /\{\}\s*\/\*[^*]*Deno\.resources[^*]*\*\/\s*\/\*[^*]*Deno\.resources[^*]*\*\//g,
      '{} /* Deno.resources() removed in Deno 2 */'
    );
    
    // Verificar especificamente a linha 83
    const newLines = content.split('\n');
    if (newLines[82] && newLines[82].includes('removed in Deno 2') && newLines[82].includes('removed in Deno 2')) {
      // Tem duplicação, vamos corrigir manualmente essa linha
      console.log(`\n${colors.yellow}Fixing line 83 specifically...${colors.reset}`);
      
      // Procurar o padrão específico e substituir
      newLines[82] = newLines[82].replace(
        /\{\}\s*\/\*.*?\*\/.*?\/\*.*?\*\//,
        '{} /* Deno.resources() removed in Deno 2 */'
      );
      
      // Se ainda tem problema, simplificar ainda mais
      if (newLines[82].includes('removed in Deno 2') && newLines[82].split('removed in Deno 2').length > 2) {
        // Extrair o que vem antes e depois do problema
        const beforeMatch = newLines[82].match(/^(.*?)(\{\}|Deno\.resources\(\))/);
        const afterMatch = newLines[82].match(/\*\/\s*\)(.*)$/);
        
        if (beforeMatch && afterMatch) {
          newLines[82] = beforeMatch[1] + '{} /* Deno.resources() removed in Deno 2 */)' + (afterMatch[1] || '');
        }
      }
    }
    
    content = newLines.join('\n');
    
    // Verificar se há outros Deno.resources() no arquivo
    const resourcesMatches = content.match(/Deno\.resources\(\)/g);
    if (resourcesMatches) {
      console.log(`\n${colors.yellow}Found ${resourcesMatches.length} remaining Deno.resources() calls${colors.reset}`);
    }
    
    // Salvar
    await Deno.writeTextFile(filePath, content);
    
    // Mostrar a linha corrigida
    const fixedLines = content.split('\n');
    console.log(`\n${colors.green}Line 83 (fixed):${colors.reset}`);
    console.log(fixedLines[82]);
    
    console.log(`${colors.green}✓ Fixed ${filePath}${colors.reset}`);
    
  } catch (error) {
    console.log(`${colors.red}✗ Error: ${error}${colors.reset}`);
  }
}

async function checkOtherFiles() {
  console.log(`\n${colors.cyan}Checking for similar issues in other files...${colors.reset}`);
  
  const filesToCheck = [
    'src/lib/fs/file_utils.ts',
    'src/lib/os/os_utils.ts',
    'src/lib/os/os_shell.ts',
  ];
  
  for (const file of filesToCheck) {
    try {
      const content = await Deno.readTextFile(file);
      
      // Procurar por problemas
      if (content.includes('Deno.resources()')) {
        console.log(`${colors.yellow}${file} still has Deno.resources()${colors.reset}`);
      }
      
      if (content.includes('Deno.metrics()')) {
        console.log(`${colors.yellow}${file} still has Deno.metrics()${colors.reset}`);
      }
      
      // Verificar comentários duplicados
      if (content.includes('removed in Deno 2') && 
          content.includes('removed in Deno 2 */') &&
          content.includes('*/ removed in Deno 2')) {
        console.log(`${colors.yellow}${file} has duplicate comments${colors.reset}`);
        
        // Tentar corrigir
        let fixed = content;
        fixed = fixed.replace(
          /\{\}\s*\/\*.*?removed in Deno 2.*?\*\/.*?removed in Deno 2.*?\*\//g,
          '{} /* removed in Deno 2 */'
        );
        
        if (fixed !== content) {
          await Deno.writeTextFile(file, fixed);
          console.log(`${colors.green}✓ Fixed duplicate comments in ${file}${colors.reset}`);
        }
      }
    } catch {
      // Ignore if file doesn't exist
    }
  }
}

async function showManualFix() {
  console.log(`\n${colors.cyan}If automatic fix didn't work:${colors.reset}`);
  console.log(`
1. Open the file:
   ${colors.yellow}nano +83 src/lib/fs/file_utils.ts${colors.reset}

2. Look for something like:
   ${colors.red}{} /* {} /* Deno.resources() removed in Deno 2 */ removed in Deno 2 */${colors.reset}

3. Replace with:
   ${colors.green}{} /* Deno.resources() removed in Deno 2 */${colors.reset}

4. Or if you see:
   ${colors.red}Deno.resources()${colors.reset}
   
   Replace with:
   ${colors.green}{}${colors.reset}

5. Save and exit
`);
}

async function main() {
  // Corrigir o arquivo principal
  await fixFileUtils();
  
  // Verificar outros arquivos
  await checkOtherFiles();
  
  // Mostrar instruções manuais
  await showManualFix();
  
  console.log(`\n${colors.green}✅ Fix completed!${colors.reset}`);
  console.log(`\n${colors.cyan}Now try:${colors.reset}`);
  console.log('deno cache levain.ts');
}

if (import.meta.main) {
  await main();
}
