#!/usr/bin/env deno run --allow-all

/**
 * Corrige erro de sintaxe em file_utils.ts linha 189
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
║     Fixing Syntax Error in file_utils.ts                ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

async function analyzeAndFix() {
  const filePath = 'src/lib/fs/file_utils.ts';
  
  try {
    console.log(`${colors.blue}Analyzing ${filePath}...${colors.reset}`);
    
    let content = await Deno.readTextFile(filePath);
    const originalContent = content;
    
    // Backup
    await Deno.writeTextFile(`${filePath}.syntax-backup`, originalContent);
    
    // Pegar as linhas para análise
    const lines = content.split('\n');
    
    // Mostrar contexto ao redor da linha 189
    console.log(`\n${colors.yellow}Context around line 189:${colors.reset}`);
    for (let i = 184; i < Math.min(194, lines.length); i++) {
      const marker = i === 188 ? '>>>' : '   ';
      console.log(`${marker} ${i + 1}: ${lines[i]}`);
    }
    
    // Analisar o problema
    // O erro "Expression expected" geralmente significa que há um problema estrutural
    // como um bloco não fechado, parênteses não balanceados, etc.
    
    // Vamos verificar a estrutura de blocos ao redor da linha 189
    let braceCount = 0;
    let parenCount = 0;
    let bracketCount = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < Math.min(189, lines.length); i++) {
      const line = lines[i];
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const prevChar = j > 0 ? line[j - 1] : '';
        
        // Verificar strings
        if (!inString && (char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar && prevChar !== '\\') {
          inString = false;
        }
        
        // Contar apenas se não estiver em string
        if (!inString) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          if (char === '(') parenCount++;
          if (char === ')') parenCount--;
          if (char === '[') bracketCount++;
          if (char === ']') bracketCount--;
        }
      }
    }
    
    console.log(`\n${colors.cyan}Structure analysis up to line 189:${colors.reset}`);
    console.log(`Braces: ${braceCount} (should be balanced or positive)`);
    console.log(`Parentheses: ${parenCount} (should be balanced)`);
    console.log(`Brackets: ${bracketCount} (should be balanced)`);
    
    // Procurar por problemas específicos
    let fixed = false;
    
    // Verificar se há um problema comum: falta de fechamento de função/bloco antes da linha 189
    // Vamos procurar por padrões problemáticos nas linhas anteriores
    
    for (let i = Math.max(0, 180); i < Math.min(189, lines.length); i++) {
      const line = lines[i];
      
      // Verificar se há um return ou throw sem ponto e vírgula
      if ((line.includes('return') || line.includes('throw')) && 
          !line.trim().endsWith(';') && 
          !line.trim().endsWith('{') &&
          line.trim() !== '') {
        console.log(`\n${colors.yellow}Found possible missing semicolon at line ${i + 1}${colors.reset}`);
        lines[i] = line + ';';
        fixed = true;
      }
      
      // Verificar se há um } sem fechamento adequado
      if (line.trim() === '}' || line.trim() === '};') {
        // Verificar se o próximo não-vazio é um else ou catch
        let nextNonEmpty = '';
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim()) {
            nextNonEmpty = lines[j].trim();
            break;
          }
        }
        
        if (nextNonEmpty && !nextNonEmpty.startsWith('else') && 
            !nextNonEmpty.startsWith('catch') && 
            !nextNonEmpty.startsWith('}')) {
          // Pode estar faltando algo
        }
      }
    }
    
    // Verificar especificamente a linha 189
    const line189 = lines[188]; // index 188
    
    // O erro sugere que há algo errado ANTES da linha 189
    // Vamos verificar se há uma estrutura incompleta
    
    // Procurar por um padrão comum: função ou bloco não fechado
    for (let i = 187; i >= Math.max(0, 170); i--) {
      const line = lines[i];
      
      // Se encontrar algo como "async function" ou "function" sem {
      if (line.includes('function') && !line.includes('{')) {
        // Verificar se a próxima linha tem {
        if (i + 1 < lines.length && !lines[i + 1].includes('{')) {
          console.log(`\n${colors.yellow}Function at line ${i + 1} might be missing opening brace${colors.reset}`);
        }
      }
      
      // Se encontrar um if/for/while sem {
      if ((line.includes('if (') || line.includes('for (') || line.includes('while (')) && 
          !line.includes('{')) {
        // Verificar se é uma linha única
        if (i + 1 < lines.length && !lines[i + 1].trim().startsWith('{')) {
          // Pode ser uma declaração de linha única, ok
        }
      }
      
      // Verificar se há algo como:
      // } else
      // sem o {
      if (line.trim().endsWith('else') && !line.includes('{')) {
        if (i + 1 < lines.length && !lines[i + 1].trim().startsWith('{')) {
          console.log(`\n${colors.yellow}else at line ${i + 1} might be missing opening brace${colors.reset}`);
          lines[i] = line + ' {';
          fixed = true;
        }
      }
    }
    
    // Tentar uma correção mais específica
    // Verificar se antes da linha 189 há uma estrutura mal fechada
    
    // Procurar por } catch ou } else sem {
    for (let i = 180; i < 189; i++) {
      if (lines[i].includes('} catch') && !lines[i].includes('{')) {
        lines[i] = lines[i].replace('} catch', '} catch {');
        fixed = true;
      }
      if (lines[i].includes('} else') && !lines[i].includes('{')) {
        lines[i] = lines[i].replace('} else', '} else {');
        fixed = true;
      }
    }
    
    if (fixed) {
      content = lines.join('\n');
      await Deno.writeTextFile(filePath, content);
      console.log(`${colors.green}✓ Applied fixes to ${filePath}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}Could not automatically fix the issue${colors.reset}`);
      
      // Tentar uma abordagem diferente: adicionar um bloco de fechamento
      console.log(`\n${colors.cyan}Attempting alternative fix...${colors.reset}`);
      
      // Inserir um } antes da linha problemática se necessário
      if (braceCount > 0) {
        console.log(`Adding closing brace before line 189...`);
        lines.splice(188, 0, '    }');
        content = lines.join('\n');
        await Deno.writeTextFile(filePath, content);
        console.log(`${colors.green}✓ Added closing brace${colors.reset}`);
      }
    }
    
  } catch (error) {
    console.log(`${colors.red}✗ Error: ${error}${colors.reset}`);
  }
}

async function showManualInstructions() {
  console.log(`\n${colors.cyan}Manual fix instructions:${colors.reset}`);
  console.log(`
1. Open the file:
   ${colors.yellow}nano +185 src/lib/fs/file_utils.ts${colors.reset}

2. Look for these common issues around line 189:
   - Missing closing brace } before the if statement
   - Missing semicolon on a return or throw statement
   - Unclosed function or block
   - else or catch without opening {

3. The error "Expression expected" usually means the parser
   found an 'if' statement where it shouldn't be.
   
   This often happens when:
   - A function is not properly closed
   - A previous if/else block is malformed
   - There's a missing } or ; somewhere above

4. Check that all blocks are properly closed before line 189

5. Save and test again
`);
}

async function main() {
  await analyzeAndFix();
  await showManualInstructions();
  
  console.log(`\n${colors.green}✅ Analysis complete!${colors.reset}`);
  console.log(`\n${colors.cyan}Now try:${colors.reset}`);
  console.log('deno cache levain.ts');
  
  console.log(`\n${colors.yellow}If still broken, please share lines 180-195 of the file${colors.reset}`);
  console.log('You can get them with:');
  console.log('sed -n "180,195p" src/lib/fs/file_utils.ts');
}

if (import.meta.main) {
  await main();
}
