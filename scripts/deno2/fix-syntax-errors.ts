#!/usr/bin/env deno run --allow-all

/**
 * Corrige erros de sintaxe causados pela migração
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
║         Fixing Syntax Errors from Migration             ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

// Arquivos com problemas conhecidos
const problematicFiles = [
  'src/lib/os/powershell.ts',
  'src/lib/os/os_shell.ts',
  'src/lib/os/os_utils.ts',
  'src/action/os/mkdir.ts',
  'src/lib/extract/untar_extractor.ts',
];

async function showFileAroundLine(filePath: string, lineNumber: number) {
  try {
    const content = await Deno.readTextFile(filePath);
    const lines = content.split('\n');
    
    console.log(`\n${colors.yellow}File: ${filePath} around line ${lineNumber}:${colors.reset}`);
    
    const start = Math.max(0, lineNumber - 5);
    const end = Math.min(lines.length, lineNumber + 5);
    
    for (let i = start; i < end; i++) {
      const marker = i === lineNumber - 1 ? '>>>' : '   ';
      console.log(`${marker} ${i + 1}: ${lines[i]}`);
    }
  } catch (error) {
    console.log(`${colors.red}Error reading file: ${error}${colors.reset}`);
  }
}

async function fixPowershellFile() {
  const filePath = 'src/lib/os/powershell.ts';
  console.log(`\n${colors.blue}Fixing ${filePath}...${colors.reset}`);
  
  try {
    let content = await Deno.readTextFile(filePath);
    
    // Backup
    await Deno.writeTextFile(`${filePath}.backup`, content);
    
    // Procurar por padrões problemáticos de Deno.Command mal convertidos
    // O erro indica que há um problema na linha 39 com "stdout: "inherit","
    
    // Padrão: new Deno.Command com sintaxe errada
    const lines = content.split('\n');
    const problematicLine = lines[38]; // linha 39 é índice 38
    
    console.log(`Problematic line: ${problematicLine}`);
    
    // Verificar se há um new Deno.Command mal formatado
    let inCommand = false;
    let commandStart = -1;
    let braceCount = 0;
    let fixedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Detectar início de new Deno.Command
      if (line.includes('new Deno.Command(')) {
        inCommand = true;
        commandStart = i;
        braceCount = 0;
        
        // Tentar extrair e corrigir o comando
        // Procurar pelo padrão completo até o fechamento
        let commandBlock = '';
        let j = i;
        let openParens = 0;
        let openBraces = 0;
        
        while (j < lines.length && (openParens > 0 || j === i)) {
          const currentLine = lines[j];
          commandBlock += currentLine + '\n';
          
          // Contar parênteses e chaves
          for (const char of currentLine) {
            if (char === '(') openParens++;
            if (char === ')') openParens--;
            if (char === '{') openBraces++;
            if (char === '}') openBraces--;
          }
          
          if (openParens === 0) break;
          j++;
        }
        
        // Tentar corrigir o bloco
        if (commandBlock.includes('new Deno.Command(')) {
          // Extrair o comando e argumentos
          const cmdMatch = commandBlock.match(/new Deno.Command\(([^,]+),\s*\{([^}]*)\}\)/s);
          
          if (cmdMatch) {
            const [fullMatch, cmd, options] = cmdMatch;
            
            // Verificar se as opções estão bem formatadas
            if (!options.trim().endsWith(',')) {
              // Corrigir formatação
              const fixedOptions = options
                .split('\n')
                .map(line => line.trim())
                .filter(line => line)
                .join(',\n    ');
              
              const fixedCommand = `new Deno.Command(${cmd}, {\n    ${fixedOptions}\n  })`;
              
              // Substituir no array de linhas
              fixedLines.push(fixedCommand);
              i = j; // Pular as linhas já processadas
              continue;
            }
          }
        }
      }
      
      fixedLines.push(line);
    }
    
    // Salvar conteúdo corrigido
    content = fixedLines.join('\n');
    await Deno.writeTextFile(filePath, content);
    
    console.log(`${colors.green}✓ Fixed ${filePath}${colors.reset}`);
    return true;
    
  } catch (error) {
    console.log(`${colors.red}✗ Error fixing ${filePath}: ${error}${colors.reset}`);
    return false;
  }
}

async function fixFileGenerically(filePath: string) {
  console.log(`\n${colors.blue}Checking ${filePath}...${colors.reset}`);
  
  try {
    let content = await Deno.readTextFile(filePath);
    const originalContent = content;
    
    // Padrões de correção genéricos
    
    // 1. Corrigir new Deno.Command mal formatado
    // Procurar por patterns como:
    // new Deno.Command("cmd", {
    //   stdout: "inherit",
    // Que deveria ser:
    // new Deno.Command("cmd", {
    //   stdout: "inherit"
    // });
    
    // Regex para encontrar Deno.Command mal fechado
    content = content.replace(
      /new Deno\.Command\(([^)]+)\)(?!;|\)|,|\s*\.)/g,
      (match) => {
        if (!match.endsWith(');') && !match.endsWith(')')) {
          return match + ';';
        }
        return match;
      }
    );
    
    // 2. Corrigir vírgulas extras em objetos
    content = content.replace(/,(\s*\})/g, '$1');
    
    // 3. Corrigir Deno.Command sem fechamento adequado
    const commandPattern = /new Deno\.Command\(([^;]+?)(?=\n\s*(?:const|let|var|\/\/|$))/gm;
    content = content.replace(commandPattern, (match) => {
      if (!match.includes('});')) {
        const openBraces = (match.match(/\{/g) || []).length;
        const closeBraces = (match.match(/\}/g) || []).length;
        const openParens = (match.match(/\(/g) || []).length;
        const closeParens = (match.match(/\)/g) || []).length;
        
        let fixed = match;
        // Adicionar chaves e parênteses faltando
        for (let i = closeBraces; i < openBraces; i++) {
          fixed += '}';
        }
        for (let i = closeParens; i < openParens; i++) {
          fixed += ')';
        }
        if (!fixed.endsWith(';')) {
          fixed += ';';
        }
        return fixed;
      }
      return match;
    });
    
    if (content !== originalContent) {
      // Backup
      await Deno.writeTextFile(`${filePath}.backup`, originalContent);
      // Salvar
      await Deno.writeTextFile(filePath, content);
      console.log(`${colors.green}✓ Fixed ${filePath}${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.yellow}No changes needed for ${filePath}${colors.reset}`);
      return false;
    }
    
  } catch (error) {
    console.log(`${colors.red}✗ Error: ${error}${colors.reset}`);
    return false;
  }
}

async function main() {
  // Primeiro mostrar o erro
  await showFileAroundLine('src/lib/os/powershell.ts', 39);
  
  // Tentar corrigir o powershell.ts especificamente
  const powershellFixed = await fixPowershellFile();
  
  // Se não conseguiu corrigir automaticamente, tentar abordagem genérica
  if (!powershellFixed) {
    console.log(`\n${colors.yellow}Trying generic fix approach...${colors.reset}`);
    await fixFileGenerically('src/lib/os/powershell.ts');
  }
  
  // Verificar outros arquivos que podem ter o mesmo problema
  console.log(`\n${colors.cyan}Checking other files that might have similar issues...${colors.reset}`);
  
  for (const file of problematicFiles) {
    if (file !== 'src/lib/os/powershell.ts') {
      await fixFileGenerically(file);
    }
  }
  
  console.log(`\n${colors.green}✅ Syntax fixes completed!${colors.reset}`);
  console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
  console.log('1. Try again: deno cache levain.ts');
  console.log('2. If there are more syntax errors, note the file and line number');
  console.log('3. Run this script again or fix manually');
  
  console.log(`\n${colors.yellow}Tip:${colors.reset} If the automatic fix didn't work,`);
  console.log('you can manually edit the file. The error is usually:');
  console.log('- Missing closing parenthesis or brace');
  console.log('- Extra comma before closing brace');
  console.log('- Deno.Command not properly closed with });');
}

if (import.meta.main) {
  await main();
}
