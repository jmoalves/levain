#!/usr/bin/env deno run --allow-all

/**
 * Corrige vírgulas duplas e outros erros de sintaxe
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
║     Fixing Double Commas and Syntax Errors              ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

async function fixSyntaxErrors(filePath: string): Promise<boolean> {
  try {
    console.log(`\n${colors.blue}Fixing ${filePath}...${colors.reset}`);
    
    let content = await Deno.readTextFile(filePath);
    const originalContent = content;
    
    // Backup
    await Deno.writeTextFile(`${filePath}.syntax-backup`, originalContent);
    
    // 1. Remover vírgulas duplas
    content = content.replace(/,,+/g, ',');
    
    // 2. Remover vírgulas antes de fechamento de chaves/parênteses
    content = content.replace(/,(\s*[\}\)])/g, '$1');
    
    // 3. Corrigir vírgulas depois de colchetes vazios ou valores
    content = content.replace(/\],\s*,/g, '],');
    content = content.replace(/\),\s*,/g, '),');
    content = content.replace(/\},\s*,/g, '},');
    
    // 4. Corrigir new Deno.Command mal formatado
    // Procurar especificamente por problemas comuns
    const lines = content.split('\n');
    const fixedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Se a linha tem args: [...], e termina com vírgulas extras
      if (line.includes('args:') && line.includes(']')) {
        line = line.replace(/\],+/g, '],');
        line = line.replace(/\],,/g, '],');
      }
      
      // Se há vírgulas duplas em qualquer lugar
      line = line.replace(/,,+/g, ',');
      
      // Se termina com vírgula e a próxima linha começa com }
      if (line.endsWith(',') && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.startsWith('}') || nextLine.startsWith(')')) {
          line = line.slice(0, -1); // Remove a vírgula final
        }
      }
      
      fixedLines.push(line);
    }
    
    content = fixedLines.join('\n');
    
    // 5. Verificar e corrigir estrutura de Deno.Command
    content = content.replace(
      /new Deno\.Command\(([^,]+),\s*\{([^}]*)\}\)/gs,
      (match, cmd, options) => {
        // Limpar as opções
        let cleanOptions = options
          .replace(/,,+/g, ',')  // Remover vírgulas duplas
          .replace(/,(\s*$)/g, '$1')  // Remover vírgula final
          .trim();
        
        // Se não termina com vírgula e tem conteúdo
        if (cleanOptions && !cleanOptions.endsWith(',')) {
          return `new Deno.Command(${cmd}, {\n${cleanOptions}\n})`;
        }
        
        return `new Deno.Command(${cmd}, {\n${cleanOptions}\n})`;
      }
    );
    
    // 6. Corrigir casos específicos do powershell.ts
    // Se tem algo como: args: [resolvedTargetFile],,
    content = content.replace(/\[([^\]]+)\],+(\s)/g, '[$1],$2');
    
    // Salvar conteúdo corrigido
    if (content !== originalContent) {
      await Deno.writeTextFile(filePath, content);
      console.log(`${colors.green}✓ Fixed ${filePath}${colors.reset}`);
      
      // Mostrar mudanças ao redor da linha problemática
      const newLines = content.split('\n');
      console.log(`\n${colors.yellow}Around line 38:${colors.reset}`);
      for (let i = 35; i < Math.min(42, newLines.length); i++) {
        const marker = i === 37 ? '>>>' : '   ';
        console.log(`${marker} ${i + 1}: ${newLines[i]}`);
      }
      
      return true;
    } else {
      console.log(`${colors.yellow}No changes needed${colors.reset}`);
      return false;
    }
    
  } catch (error) {
    console.log(`${colors.red}✗ Error: ${error}${colors.reset}`);
    return false;
  }
}

async function checkAllFilesForSyntaxErrors() {
  const filesToCheck = [
    'src/lib/os/powershell.ts',
    'src/lib/os/os_shell.ts',
    'src/lib/os/os_utils.ts',
    'src/action/os/mkdir.ts',
    'src/action/os/killProcess.test.ts',
    'src/lib/extract/untar_extractor.ts',
  ];
  
  console.log(`\n${colors.cyan}Checking all potentially problematic files...${colors.reset}`);
  
  for (const file of filesToCheck) {
    try {
      const content = await Deno.readTextFile(file);
      
      // Procurar por padrões problemáticos
      const problems: string[] = [];
      
      if (content.includes(',,')) {
        problems.push('double commas');
      }
      if (/,\s*\}/.test(content)) {
        problems.push('comma before closing brace');
      }
      if (/,\s*\)/.test(content)) {
        problems.push('comma before closing parenthesis');
      }
      if (/\],\s*,/.test(content)) {
        problems.push('double comma after array');
      }
      
      if (problems.length > 0) {
        console.log(`\n${colors.yellow}${file} has issues: ${problems.join(', ')}${colors.reset}`);
        await fixSyntaxErrors(file);
      }
    } catch {
      // File doesn't exist or can't be read
    }
  }
}

async function manualFixInstructions() {
  console.log(`\n${colors.cyan}If automatic fix didn't work, here's how to fix manually:${colors.reset}`);
  console.log(`
1. Open the file: ${colors.yellow}nano +38 src/lib/os/powershell.ts${colors.reset}

2. Look for this pattern around line 38:
   ${colors.red}args: [resolvedTargetFile],,${colors.reset}
   
3. Change it to:
   ${colors.green}args: [resolvedTargetFile],${colors.reset}
   
4. Make sure the Deno.Command is properly closed:
   ${colors.green}new Deno.Command("powershell", {
     args: [resolvedTargetFile],
     stdout: "inherit",
     stderr: "inherit"
   });${colors.reset}

5. Save and exit (Ctrl+X, Y, Enter in nano)
`);
}

async function main() {
  // Primeiro, corrigir o arquivo específico com erro
  const fixed = await fixSyntaxErrors('src/lib/os/powershell.ts');
  
  if (!fixed) {
    console.log(`\n${colors.yellow}Couldn't fix automatically. Trying to read the file...${colors.reset}`);
    
    try {
      const content = await Deno.readTextFile('src/lib/os/powershell.ts');
      const lines = content.split('\n');
      
      console.log(`\n${colors.red}Line 38 content:${colors.reset}`);
      console.log(lines[37]); // Line 38 is index 37
      
      // Tentar corrigir especificamente essa linha
      if (lines[37].includes(',,')) {
        console.log(`\n${colors.green}Found double comma! Fixing...${colors.reset}`);
        lines[37] = lines[37].replace(/,,+/g, ',');
        
        const fixedContent = lines.join('\n');
        await Deno.writeTextFile('src/lib/os/powershell.ts', fixedContent);
        console.log(`${colors.green}✓ Fixed double comma${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}Error reading file: ${error}${colors.reset}`);
    }
  }
  
  // Verificar outros arquivos
  await checkAllFilesForSyntaxErrors();
  
  // Instruções manuais
  await manualFixInstructions();
  
  console.log(`\n${colors.green}✅ Syntax fix completed!${colors.reset}`);
  console.log(`\n${colors.cyan}Now try:${colors.reset}`);
  console.log('deno cache levain.ts');
}

if (import.meta.main) {
  await main();
}
