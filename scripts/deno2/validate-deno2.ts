#!/usr/bin/env deno run --allow-all

/**
 * Script de Validação da Migração para Deno 2
 * 
 * Execute após a migração para verificar:
 * - APIs deprecadas ainda presentes
 * - Imports incorretos
 * - Problemas de compatibilidade
 * - Dependências faltando
 * 
 * Como usar: deno run --allow-all validate-deno2.ts
 */

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

interface ValidationResult {
  passed: boolean;
  message: string;
  file?: string;
  line?: number;
  severity: "error" | "warning" | "info";
}

const validationResults: ValidationResult[] = [];

function addResult(result: ValidationResult) {
  validationResults.push(result);
  const icon = result.passed ? `${colors.green}✓` : 
               result.severity === "error" ? `${colors.red}✗` :
               result.severity === "warning" ? `${colors.yellow}⚠` :
               `${colors.blue}ℹ`;
  
  console.log(`${icon} ${result.message}${colors.reset}`);
  if (result.file) {
    console.log(`  ${colors.cyan}File: ${result.file}${result.line ? `:${result.line}` : ""}${colors.reset}`);
  }
}

// Verificar versão do Deno
async function checkDenoVersion() {
  console.log(`\n${colors.bright}Checking Deno Version...${colors.reset}`);
  
  const version = Deno.version.deno;
  const isV2 = version.startsWith("2.");
  
  addResult({
    passed: isV2,
    message: `Deno version: ${version}`,
    severity: isV2 ? "info" : "warning"
  });
  
  if (!isV2) {
    console.log(`\n  ${colors.yellow}Run 'deno upgrade' to install Deno 2${colors.reset}`);
  }
}

// Verificar arquivo de configuração
async function checkConfigFile() {
  console.log(`\n${colors.bright}Checking Configuration...${colors.reset}`);
  
  try {
    const config = await Deno.readTextFile("deno.json");
    const parsed = JSON.parse(config);
    
    addResult({
      passed: true,
      message: "deno.json found and valid",
      severity: "info"
    });
    
    // Verificar imports JSR
    if (parsed.imports && parsed.imports["@std/"]) {
      addResult({
        passed: true,
        message: "JSR imports configured",
        severity: "info"
      });
    } else {
      addResult({
        passed: false,
        message: "JSR imports not configured in deno.json",
        severity: "warning"
      });
    }
    
    // Verificar nodeModulesDir
    if (parsed.nodeModulesDir) {
      addResult({
        passed: true,
        message: `Node modules directory: ${parsed.nodeModulesDir}`,
        severity: "info"
      });
    }
    
  } catch (error) {
    addResult({
      passed: false,
      message: "deno.json not found or invalid",
      severity: "error"
    });
  }
}

// Verificar APIs deprecadas no código
async function checkDeprecatedAPIs() {
  console.log(`\n${colors.bright}Checking for Deprecated APIs...${colors.reset}`);
  
  const deprecatedPatterns = [
    {
      pattern: /Deno\.run\(/g,
      message: "Deno.run() found - should be migrated to Deno.Command",
      severity: "error" as const
    },
    {
      pattern: /Deno\.metrics\(\)/g,
      message: "Deno.metrics() found - this API was removed in Deno 2",
      severity: "error" as const
    },
    {
      pattern: /Deno\.resources\(\)/g,
      message: "Deno.resources() found - this API was removed in Deno 2",
      severity: "error" as const
    },
    {
      pattern: /window\./g,
      message: "window global reference found - may cause issues in Deno 2",
      severity: "warning" as const
    },
    {
      pattern: /Deno\.bundle/g,
      message: "Deno.bundle found - this API was removed in Deno 2",
      severity: "error" as const
    },
    {
      pattern: /Deno\.Buffer/g,
      message: "Deno.Buffer found - use Buffer instead",
      severity: "warning" as const
    },
    {
      pattern: /Deno\.serveHttp/g,
      message: "Deno.serveHttp found - soft-deprecated, consider using Deno.serve",
      severity: "warning" as const
    }
  ];
  
  const files = await findTypeScriptFiles();
  let foundIssues = false;
  
  for (const file of files) {
    try {
      const content = await Deno.readTextFile(file);
      const lines = content.split('\n');
      
      for (const { pattern, message, severity } of deprecatedPatterns) {
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            foundIssues = true;
            addResult({
              passed: false,
              message,
              file,
              line: index + 1,
              severity
            });
          }
        });
      }
    } catch (error) {
      // Ignorar erros de leitura
    }
  }
  
  if (!foundIssues) {
    addResult({
      passed: true,
      message: "No deprecated APIs found",
      severity: "info"
    });
  }
}

// Verificar imports antigos
async function checkOldImports() {
  console.log(`\n${colors.bright}Checking for Old Import Patterns...${colors.reset}`);
  
  const oldImportPatterns = [
    /https:\/\/deno\.land\/std@/,
    /https:\/\/deno\.land\/x\//,
    /https:\/\/cdn\.skypack\.dev/,
    /https:\/\/esm\.sh/,
    /https:\/\/unpkg\.com/
  ];
  
  const files = await findTypeScriptFiles();
  let foundOldImports = false;
  
  for (const file of files) {
    try {
      const content = await Deno.readTextFile(file);
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        for (const pattern of oldImportPatterns) {
          if (pattern.test(line)) {
            foundOldImports = true;
            const match = line.match(pattern)?.[0] || "";
            addResult({
              passed: false,
              message: `Old import pattern found: ${match}`,
              file,
              line: index + 1,
              severity: "warning"
            });
          }
        }
      });
    } catch (error) {
      // Ignorar erros de leitura
    }
  }
  
  if (!foundOldImports) {
    addResult({
      passed: true,
      message: "All imports migrated to JSR",
      severity: "info"
    });
  }
}

// Verificar se o projeto compila
async function checkCompilation() {
  console.log(`\n${colors.bright}Checking Compilation...${colors.reset}`);
  
  try {
    const command = new Deno.Command("deno", {
      args: ["check", "levain.ts"],
      stdout: "piped",
      stderr: "piped"
    });
    
    const { success, stderr } = await command.output();
    
    if (success) {
      addResult({
        passed: true,
        message: "Project compiles successfully",
        severity: "info"
      });
    } else {
      const errorText = new TextDecoder().decode(stderr);
      addResult({
        passed: false,
        message: "Compilation errors found",
        severity: "error"
      });
      console.log(`\n${colors.red}Compilation errors:${colors.reset}`);
      console.log(errorText);
    }
  } catch (error) {
    addResult({
      passed: false,
      message: `Could not run compilation check: ${error}`,
      severity: "warning"
    });
  }
}

// Verificar testes
async function checkTests() {
  console.log(`\n${colors.bright}Checking Tests...${colors.reset}`);
  
  try {
    const command = new Deno.Command("deno", {
      args: ["test", "--allow-all", "--no-run"],
      stdout: "piped",
      stderr: "piped"
    });
    
    const { success } = await command.output();
    
    if (success) {
      addResult({
        passed: true,
        message: "Test files compile successfully",
        severity: "info"
      });
    } else {
      addResult({
        passed: false,
        message: "Test compilation failed",
        severity: "warning"
      });
    }
  } catch (error) {
    addResult({
      passed: false,
      message: "Could not check tests",
      severity: "warning"
    });
  }
}

// Sugerir próximos comandos
function suggestNextSteps() {
  console.log(`\n${colors.bright}${colors.cyan}${"=".repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}Suggested Next Steps:${colors.reset}\n`);
  
  const errors = validationResults.filter(r => !r.passed && r.severity === "error");
  const warnings = validationResults.filter(r => !r.passed && r.severity === "warning");
  
  if (errors.length > 0) {
    console.log(`${colors.red}1. Fix ${errors.length} error(s) found:${colors.reset}`);
    errors.forEach(e => {
      console.log(`   - ${e.message}`);
      if (e.file) console.log(`     in ${e.file}${e.line ? `:${e.line}` : ""}`);
    });
    console.log();
  }
  
  if (warnings.length > 0) {
    console.log(`${colors.yellow}2. Review ${warnings.length} warning(s):${colors.reset}`);
    warnings.slice(0, 3).forEach(w => {
      console.log(`   - ${w.message}`);
    });
    if (warnings.length > 3) {
      console.log(`   ... and ${warnings.length - 3} more`);
    }
    console.log();
  }
  
  console.log(`${colors.green}Recommended commands:${colors.reset}`);
  console.log(`  ${colors.cyan}deno upgrade${colors.reset}          # Ensure you have Deno 2`);
  console.log(`  ${colors.cyan}deno install${colors.reset}          # Install dependencies`);
  console.log(`  ${colors.cyan}deno fmt${colors.reset}              # Format code`);
  console.log(`  ${colors.cyan}deno lint${colors.reset}             # Check for issues`);
  console.log(`  ${colors.cyan}deno task test${colors.reset}        # Run tests`);
  console.log(`  ${colors.cyan}deno task dev${colors.reset}         # Start development`);
}

// Função auxiliar para encontrar arquivos TypeScript
async function findTypeScriptFiles(): Promise<string[]> {
  const files: string[] = [];
  
  async function walkDir(dir: string) {
    try {
      for await (const entry of Deno.readDir(dir)) {
        const path = `${dir}/${entry.name}`;
        
        // Pular diretórios especiais
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' || 
            entry.name === 'dist' ||
            entry.name === 'build') {
          continue;
        }
        
        if (entry.isFile && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          files.push(path);
        } else if (entry.isDirectory) {
          await walkDir(path);
        }
      }
    } catch {
      // Ignorar erros de leitura de diretório
    }
  }
  
  // Arquivos na raiz
  for await (const entry of Deno.readDir('.')) {
    if (entry.isFile && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      files.push(entry.name);
    } else if (entry.isDirectory && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      await walkDir(entry.name);
    }
  }
  
  return files;
}

// Criar relatório final
function createReport() {
  console.log(`\n${colors.bright}${colors.cyan}${"=".repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}Validation Report Summary${colors.reset}\n`);
  
  const errors = validationResults.filter(r => !r.passed && r.severity === "error").length;
  const warnings = validationResults.filter(r => !r.passed && r.severity === "warning").length;
  const passed = validationResults.filter(r => r.passed).length;
  
  console.log(`  ${colors.green}✓ Passed:${colors.reset}  ${passed}`);
  console.log(`  ${colors.yellow}⚠ Warnings:${colors.reset} ${warnings}`);
  console.log(`  ${colors.red}✗ Errors:${colors.reset}   ${errors}`);
  
  if (errors === 0) {
    console.log(`\n${colors.green}${colors.bright}✅ Migration validation completed successfully!${colors.reset}`);
    if (warnings > 0) {
      console.log(`${colors.yellow}   (with ${warnings} warning(s) to review)${colors.reset}`);
    }
  } else {
    console.log(`\n${colors.red}${colors.bright}❌ Found ${errors} error(s) that need to be fixed${colors.reset}`);
  }
  
  // Salvar relatório em arquivo
  const reportContent = validationResults.map(r => {
    const status = r.passed ? "PASS" : r.severity.toUpperCase();
    const location = r.file ? ` [${r.file}${r.line ? `:${r.line}` : ""}]` : "";
    return `[${status}] ${r.message}${location}`;
  }).join('\n');
  
  try {
    Deno.writeTextFileSync("validation-report.txt", reportContent);
    console.log(`\n${colors.cyan}Full report saved to: validation-report.txt${colors.reset}`);
  } catch {
    // Ignorar se não conseguir salvar
  }
}

// Main
async function main() {
  console.clear();
  console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════╗
║          Deno 2 Migration Validation Tool               ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);
  
  // Verificar se está no diretório correto
  try {
    await Deno.stat("levain.ts");
  } catch {
    console.log(`${colors.red}ERROR: levain.ts not found!${colors.reset}`);
    console.log("Please run this script from the root of the levain project.");
    Deno.exit(1);
  }
  
  // Executar validações
  await checkDenoVersion();
  await checkConfigFile();
  await checkDeprecatedAPIs();
  await checkOldImports();
  await checkCompilation();
  await checkTests();
  
  // Relatório e sugestões
  createReport();
  suggestNextSteps();
}

// Executar
if (import.meta.main) {
  await main();
}
