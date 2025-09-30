#!/usr/bin/env deno run --allow-all
/**
 * Levain - Something to help you make your software grow
 * Migrated to Deno 2
 */

// Imports atualizados para Deno 2
import { parse } from "jsr:@std/flags@1.0.0";
import { exists } from "jsr:@std/fs@1.0.0/exists";
import { ensureDir } from "jsr:@std/fs@1.0.0/ensure-dir";
import { join, resolve } from "jsr:@std/path@1.0.0";
import { parse as parseYaml } from "jsr:@std/yaml@1.0.0";

// Import dos helpers
import { ProcessUtils, FileUtils } from "./src/lib/deno2_helpers.ts";

// Verificar versão do Deno
const REQUIRED_DENO_VERSION = "2.0.0";
const currentVersion = Deno.version.deno;

if (!currentVersion.startsWith("2.")) {
  console.warn(`⚠️  Levain requires Deno 2.x or higher. Current version: ${currentVersion}`);
  console.warn("   Run 'deno upgrade' to update to Deno 2");
}

// Configuração global
const CONFIG = {
  levainHome: Deno.env.get("LEVAIN_HOME") || join(Deno.env.get("HOME") || ".", ".levain"),
  levainRegistry: Deno.env.get("LEVAIN_REGISTRY") || "https://github.com/jmoalves/levain-pkgs",
  debug: Deno.env.get("LEVAIN_DEBUG") === "true",
};

// Logger melhorado
class Logger {
  static debug(message: string) {
    if (CONFIG.debug) {
      console.log(`[DEBUG] ${message}`);
    }
  }
  
  static info(message: string) {
    console.log(`[INFO] ${message}`);
  }
  
  static warn(message: string) {
    console.warn(`⚠️  ${message}`);
  }
  
  static error(message: string) {
    console.error(`❌ ${message}`);
  }
  
  static success(message: string) {
    console.log(`✅ ${message}`);
  }
}

// Classe principal do Levain
class Levain {
  constructor(private config = CONFIG) {}
  
  async init() {
    Logger.info("Initializing Levain...");
    await ensureDir(this.config.levainHome);
    await ensureDir(join(this.config.levainHome, "packages"));
    await ensureDir(join(this.config.levainHome, "temp"));
    Logger.success("Levain initialized");
  }
  
  async install(packageName: string) {
    Logger.info(`Installing ${packageName}...`);
    
    try {
      // Implementar lógica de instalação
      // Este é um exemplo simplificado
      const packagePath = join(this.config.levainHome, "packages", packageName);
      
      if (await exists(packagePath)) {
        Logger.warn(`Package ${packageName} already installed`);
        return;
      }
      
      // Download e instalação do pacote
      // ...
      
      Logger.success(`Package ${packageName} installed successfully`);
    } catch (error) {
      Logger.error(`Failed to install ${packageName}: ${error.message}`);
      throw error;
    }
  }
  
  async list() {
    Logger.info("Listing installed packages...");
    
    const packagesDir = join(this.config.levainHome, "packages");
    
    if (!await exists(packagesDir)) {
      Logger.warn("No packages installed");
      return;
    }
    
    for await (const entry of Deno.readDir(packagesDir)) {
      if (entry.isDirectory) {
        console.log(`  - ${entry.name}`);
      }
    }
  }
  
  async shell(packages: string[]) {
    Logger.info(`Starting shell with packages: ${packages.join(", ")}`);
    
    // Configurar ambiente
    const env = { ...Deno.env.toObject() };
    
    // Adicionar paths dos pacotes
    for (const pkg of packages) {
      const pkgPath = join(this.config.levainHome, "packages", pkg);
      if (await exists(pkgPath)) {
        env.PATH = `${pkgPath}/bin:${env.PATH}`;
      }
    }
    
    // Iniciar shell
    const shell = Deno.build.os === "windows" ? "cmd.exe" : "/bin/bash";
    
    const result = await ProcessUtils.runCommandWithOutput(shell, [], { env });
    
    if (!result) {
      Logger.error("Shell exited with error");
    }
  }
}

// Parser de argumentos
async function parseArgs(args: string[]) {
  const flags = parse(args, {
    boolean: ["help", "version", "debug"],
    string: ["config"],
    alias: {
      h: "help",
      v: "version",
      d: "debug",
      c: "config",
    },
  });
  
  if (flags.debug) {
    CONFIG.debug = true;
  }
  
  return flags;
}

// Função principal
async function main() {
  const args = await parseArgs(Deno.args);
  
  if (args.help) {
    console.log(`
Levain - Something to help you make your software grow

Usage:
  levain <command> [options]

Commands:
  init              Initialize Levain
  install <pkg>     Install a package
  list              List installed packages  
  shell [pkgs...]   Start a shell with packages

Options:
  -h, --help        Show help
  -v, --version     Show version
  -d, --debug       Enable debug mode
  -c, --config      Config file path

Examples:
  levain init
  levain install nodejs
  levain list
  levain shell nodejs python
`);
    return;
  }
  
  if (args.version) {
    console.log("Levain 2.0.0 (Deno 2)");
    return;
  }
  
  const levain = new Levain();
  const command = args._[0]?.toString();
  
  try {
    switch (command) {
      case "init":
        await levain.init();
        break;
        
      case "install":
        const packageName = args._[1]?.toString();
        if (!packageName) {
          Logger.error("Package name required");
          Deno.exit(1);
        }
        await levain.install(packageName);
        break;
        
      case "list":
        await levain.list();
        break;
        
      case "shell":
        const packages = args._.slice(1).map(p => p.toString());
        await levain.shell(packages);
        break;
        
      default:
        Logger.error(`Unknown command: ${command}`);
        console.log("Run 'levain --help' for usage");
        Deno.exit(1);
    }
  } catch (error) {
    Logger.error(`Command failed: ${error.message}`);
    if (CONFIG.debug) {
      console.error(error);
    }
    Deno.exit(1);
  }
}

// Executar se for o arquivo principal
if (import.meta.main) {
  await main();
}

export { Levain, Logger, CONFIG };
