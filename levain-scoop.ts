// levain.ts - Reimplementação do Levain em Deno 2
// Compatível com receitas Levain existentes e integração com Scoop

import { parse as parseYaml } from "https://deno.land/std@0.210.0/yaml/mod.ts";
import { ensureDir, exists } from "https://deno.land/std@0.210.0/fs/mod.ts";
import { join, dirname, basename } from "https://deno.land/std@0.210.0/path/mod.ts";
import { parse as parseArgs } from "https://deno.land/std@0.210.0/flags/mod.ts";
import { green, red, yellow, blue } from "https://deno.land/std@0.210.0/fmt/colors.ts";

// Interfaces para as receitas Levain
interface LevainRecipe {
  version: string;
  cmd: string;
  levain?: {
    pkg?: {
      name?: string;
      version?: string;
    };
  };
  dependencies?: string[];
  env?: Record<string, string>;
  envPath?: string[];
  "install.environment"?: Record<string, string>;
  "install.windows.environment"?: Record<string, string>;
  "install.windows.cmd"?: string[];
  "install.unix.cmd"?: string[];
  "install.cmd"?: string[];
}

// Interface para repositórios de receitas
interface RecipeRepository {
  name: string;
  url: string;
  path: string;
  updated?: Date;
}

// Classe principal do Levain
class Levain {
  private config: LevainConfig;
  private env: Map<string, string> = new Map();
  private installedPackages: Set<string> = new Set();
  private repositories: Map<string, RecipeRepository> = new Map();
  
  constructor(config?: LevainConfig) {
    this.config = config || this.loadConfig();
    this.initializeEnvironment();
    this.loadRepositories();
  }

  private loadConfig(): LevainConfig {
    const homeDir = Deno.env.get("USERPROFILE") || Deno.env.get("HOME") || ".";
    return {
      levainHome: Deno.env.get("LEVAIN_HOME") || join(homeDir, ".levain"),
      pkgDir: Deno.env.get("LEVAIN_PKG_DIR") || join(homeDir, ".levain", "pkgs"),
      cacheDir: Deno.env.get("LEVAIN_CACHE_DIR") || join(homeDir, ".levain", "cache"),
      tempDir: Deno.env.get("LEVAIN_TEMP_DIR") || join(homeDir, ".levain", "temp"),
      repoDir: Deno.env.get("LEVAIN_REPO_DIR") || join(homeDir, ".levain", "repos"),
      useScoop: Deno.env.get("LEVAIN_USE_SCOOP") === "true",
      scoopHome: Deno.env.get("SCOOP") || join(homeDir, "scoop"),
    };
  }

  private async loadRepositories() {
    const repoConfigFile = join(this.config.levainHome, "repositories.json");
    
    // Carrega repositórios salvos
    if (await exists(repoConfigFile)) {
      try {
        const content = await Deno.readTextFile(repoConfigFile);
        const repos = JSON.parse(content) as RecipeRepository[];
        for (const repo of repos) {
          this.repositories.set(repo.name, repo);
        }
      } catch (error) {
        console.log(yellow("Warning: Could not load repositories config"));
      }
    }
    
    // Adiciona repositório padrão se não existir nenhum
    if (this.repositories.size === 0) {
      const defaultRepo = {
        name: "local",
        url: "local",
        path: this.config.pkgDir,
      };
      this.repositories.set("local", defaultRepo);
    }
  }

  private async saveRepositories() {
    const repoConfigFile = join(this.config.levainHome, "repositories.json");
    await ensureDir(dirname(repoConfigFile));
    
    const repos = Array.from(this.repositories.values());
    await Deno.writeTextFile(repoConfigFile, JSON.stringify(repos, null, 2));
  }

  async addRepository(name: string, url: string): Promise<void> {
    console.log(blue(`Adding repository ${name} from ${url}...`));
    
    // Verifica se já existe
    if (this.repositories.has(name)) {
      console.log(yellow(`Repository ${name} already exists. Use 'repo update ${name}' to update it.`));
      return;
    }
    
    const repoPath = join(this.config.repoDir, name);
    
    // Clona o repositório
    await ensureDir(this.config.repoDir);
    
    const gitClone = new Deno.Command("git", {
      args: ["clone", url, repoPath],
      stdout: "inherit",
      stderr: "inherit",
    });
    
    const { code } = await gitClone.output();
    
    if (code !== 0) {
      throw new Error(`Failed to clone repository from ${url}`);
    }
    
    // Salva configuração
    const repo: RecipeRepository = {
      name,
      url,
      path: repoPath,
      updated: new Date(),
    };
    
    this.repositories.set(name, repo);
    await this.saveRepositories();
    
    console.log(green(`✓ Repository ${name} added successfully`));
    
    // Lista receitas disponíveis no novo repositório
    await this.listRecipesInRepo(name);
  }

  async removeRepository(name: string): Promise<void> {
    if (!this.repositories.has(name)) {
      console.log(yellow(`Repository ${name} not found`));
      return;
    }
    
    if (name === "local") {
      console.log(yellow("Cannot remove local repository"));
      return;
    }
    
    const repo = this.repositories.get(name)!;
    
    // Remove diretório do repositório
    if (await exists(repo.path)) {
      await Deno.remove(repo.path, { recursive: true });
    }
    
    // Remove da configuração
    this.repositories.delete(name);
    await this.saveRepositories();
    
    console.log(green(`✓ Repository ${name} removed`));
  }

  async updateRepository(name?: string): Promise<void> {
    if (name) {
      // Atualiza repositório específico
      const repo = this.repositories.get(name);
      if (!repo) {
        console.log(yellow(`Repository ${name} not found`));
        return;
      }
      
      if (repo.url === "local") {
        console.log(yellow("Local repository cannot be updated"));
        return;
      }
      
      await this.updateSingleRepository(repo);
    } else {
      // Atualiza todos os repositórios
      for (const repo of this.repositories.values()) {
        if (repo.url !== "local") {
          await this.updateSingleRepository(repo);
        }
      }
    }
  }

  private async updateSingleRepository(repo: RecipeRepository): Promise<void> {
    console.log(blue(`Updating repository ${repo.name}...`));
    
    const gitPull = new Deno.Command("git", {
      args: ["pull"],
      cwd: repo.path,
      stdout: "inherit",
      stderr: "inherit",
    });
    
    const { code } = await gitPull.output();
    
    if (code === 0) {
      repo.updated = new Date();
      await this.saveRepositories();
      console.log(green(`✓ Repository ${repo.name} updated`));
    } else {
      console.log(yellow(`Warning: Failed to update repository ${repo.name}`));
    }
  }

  async listRepositories(): Promise<void> {
    console.log(blue("Configured repositories:"));
    
    for (const repo of this.repositories.values()) {
      const updatedStr = repo.updated ? new Date(repo.updated).toLocaleString() : "never";
      console.log(`  ${green(repo.name)}`);
      console.log(`    URL: ${repo.url}`);
      console.log(`    Path: ${repo.path}`);
      console.log(`    Last updated: ${updatedStr}`);
      
      // Conta receitas disponíveis
      const recipeCount = await this.countRecipesInRepo(repo);
      console.log(`    Recipes: ${recipeCount}`);
    }
  }

  private async countRecipesInRepo(repo: RecipeRepository): Promise<number> {
    let count = 0;
    
    if (!await exists(repo.path)) {
      return 0;
    }
    
    for await (const entry of Deno.readDir(repo.path)) {
      if (entry.name.endsWith(".levain.yaml") || entry.name.endsWith(".levain.yml")) {
        count++;
      }
      if (entry.isDirectory) {
        const subPath = join(repo.path, entry.name);
        if (await exists(join(subPath, "levain.yaml")) || await exists(join(subPath, "levain.yml"))) {
          count++;
        }
      }
    }
    
    return count;
  }

  private async listRecipesInRepo(repoName: string): Promise<void> {
    const repo = this.repositories.get(repoName);
    if (!repo) {
      console.log(yellow(`Repository ${repoName} not found`));
      return;
    }
    
    console.log(blue(`\nAvailable recipes in ${repoName}:`));
    
    const recipes: string[] = [];
    
    for await (const entry of Deno.readDir(repo.path)) {
      if (entry.name.endsWith(".levain.yaml") || entry.name.endsWith(".levain.yml")) {
        const name = entry.name.replace(/\.levain\.(yaml|yml)$/, "");
        recipes.push(name);
      }
      if (entry.isDirectory) {
        const subPath = join(repo.path, entry.name);
        if (await exists(join(subPath, "levain.yaml")) || await exists(join(subPath, "levain.yml"))) {
          recipes.push(entry.name);
        }
      }
    }
    
    recipes.sort();
    for (const recipe of recipes) {
      console.log(`  - ${recipe}`);
    }
  }

  async searchRecipe(packageName: string): Promise<void> {
    console.log(blue(`Searching for ${packageName} in all repositories...`));
    
    let found = false;
    
    for (const repo of this.repositories.values()) {
      const recipes = await this.findRecipesInRepo(repo, packageName);
      
      if (recipes.length > 0) {
        console.log(green(`\nFound in ${repo.name}:`));
        for (const recipe of recipes) {
          console.log(`  - ${recipe}`);
        }
        found = true;
      }
    }
    
    if (!found) {
      console.log(yellow(`No recipes found for ${packageName}`));
      
      // Tenta buscar no Scoop se configurado
      if (this.config.useScoop && await this.isScoopAvailable()) {
        console.log(blue("\nSearching in Scoop..."));
        const cmd = new Deno.Command("scoop", { 
          args: ["search", packageName],
          stdout: "piped",
        });
        const { stdout } = await cmd.output();
        const output = new TextDecoder().decode(stdout);
        if (output.includes(packageName)) {
          console.log(output);
        }
      }
    }
  }

  private async findRecipesInRepo(repo: RecipeRepository, pattern: string): Promise<string[]> {
    const recipes: string[] = [];
    const searchPattern = pattern.toLowerCase();
    
    if (!await exists(repo.path)) {
      return recipes;
    }
    
    for await (const entry of Deno.readDir(repo.path)) {
      const name = entry.name.toLowerCase();
      
      if ((entry.name.endsWith(".levain.yaml") || entry.name.endsWith(".levain.yml")) && 
          name.includes(searchPattern)) {
        recipes.push(entry.name.replace(/\.levain\.(yaml|yml)$/, ""));
      }
      
      if (entry.isDirectory && name.includes(searchPattern)) {
        const subPath = join(repo.path, entry.name);
        if (await exists(join(subPath, "levain.yaml")) || await exists(join(subPath, "levain.yml"))) {
          recipes.push(entry.name);
        }
      }
    }

  private initializeEnvironment() {
    // Inicializa variáveis de ambiente do Levain
    this.env.set("LEVAIN_HOME", this.config.levainHome);
    this.env.set("LEVAIN_PKG_DIR", this.config.pkgDir);
    this.env.set("LEVAIN_CACHE_DIR", this.config.cacheDir);
    this.env.set("LEVAIN_TEMP_DIR", this.config.tempDir);
    
    // Copia ambiente atual
    for (const [key, value] of Object.entries(Deno.env.toObject())) {
      this.env.set(key, value);
    }
  }

  async install(packageName: string, recipeUrl?: string): Promise<void> {
    console.log(blue(`Installing ${packageName}...`));
    
    // Verifica se já está instalado
    if (this.installedPackages.has(packageName)) {
      console.log(yellow(`${packageName} is already installed`));
      return;
    }

    // Tenta usar Scoop se configurado
    if (this.config.useScoop && await this.isScoopAvailable()) {
      const scoopInstalled = await this.tryInstallWithScoop(packageName);
      if (scoopInstalled) {
        this.installedPackages.add(packageName);
        return;
      }
    }

    // Carrega a receita Levain
    const recipe = await this.loadRecipe(packageName, recipeUrl);
    if (!recipe) {
      throw new Error(`Recipe not found for ${packageName}`);
    }

    // Processa dependências
    if (recipe.dependencies) {
      for (const dep of recipe.dependencies) {
        await this.install(dep);
      }
    }

    // Executa instalação
    await this.executeRecipe(packageName, recipe);
    this.installedPackages.add(packageName);
    
    console.log(green(`✓ ${packageName} installed successfully`));
  }

    
    return recipes;
  }

  private async loadRecipe(packageName: string, recipeUrl?: string): Promise<LevainRecipe | null> {
    let recipeContent: string;
    
    if (recipeUrl) {
      // Carrega de URL
      if (recipeUrl.startsWith("http")) {
        const response = await fetch(recipeUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch recipe from ${recipeUrl}`);
        }
        recipeContent = await response.text();
      } else {
        // Carrega de arquivo local
        recipeContent = await Deno.readTextFile(recipeUrl);
      }
    } else {
      // Procura em todos os repositórios
      for (const repo of this.repositories.values()) {
        const possiblePaths = [
          join(repo.path, `${packageName}.levain.yaml`),
          join(repo.path, `${packageName}.levain.yml`),
          join(repo.path, packageName, "levain.yaml"),
          join(repo.path, packageName, "levain.yml"),
        ];

        for (const path of possiblePaths) {
          if (await exists(path)) {
            console.log(blue(`  Found recipe in repository: ${repo.name}`));
            recipeContent = await Deno.readTextFile(path);
            break;
          }
        }
        
        if (recipeContent!) {
          break;
        }
      }
      
      if (!recipeContent!) {
        return null;
      }
    }

    return parseYaml(recipeContent) as LevainRecipe;
  }

  private async executeRecipe(packageName: string, recipe: LevainRecipe): Promise<void> {
    const pkgDir = join(this.config.pkgDir, packageName);
    await ensureDir(pkgDir);

    // Configura ambiente
    this.setupEnvironment(recipe);

    // Determina comandos baseado no OS
    const commands = this.getInstallCommands(recipe);
    
    // Executa comandos de instalação
    for (const cmd of commands) {
      await this.executeCommand(cmd, pkgDir);
    }

    // Atualiza PATH se necessário
    if (recipe.envPath) {
      for (const pathEntry of recipe.envPath) {
        const fullPath = this.expandVariables(pathEntry);
        this.addToPath(fullPath);
      }
    }
  }

  private setupEnvironment(recipe: LevainRecipe) {
    // Configura variáveis de ambiente gerais
    if (recipe.env) {
      for (const [key, value] of Object.entries(recipe.env)) {
        this.env.set(key, this.expandVariables(value));
      }
    }

    // Configura variáveis específicas de instalação
    const installEnv = recipe["install.environment"];
    if (installEnv) {
      for (const [key, value] of Object.entries(installEnv)) {
        this.env.set(key, this.expandVariables(value));
      }
    }

    // Configura variáveis específicas do Windows
    if (Deno.build.os === "windows") {
      const winEnv = recipe["install.windows.environment"];
      if (winEnv) {
        for (const [key, value] of Object.entries(winEnv)) {
          this.env.set(key, this.expandVariables(value));
        }
      }
    }
  }

  private getInstallCommands(recipe: LevainRecipe): string[] {
    // Prioridade: OS específico > genérico
    if (Deno.build.os === "windows" && recipe["install.windows.cmd"]) {
      return recipe["install.windows.cmd"];
    }
    
    if (Deno.build.os !== "windows" && recipe["install.unix.cmd"]) {
      return recipe["install.unix.cmd"];
    }
    
    return recipe["install.cmd"] || [];
  }

  private async executeCommand(command: string, workDir: string): Promise<void> {
    console.log(blue(`  > ${command}`));
    
    // Expande variáveis no comando
    const expandedCommand = this.expandVariables(command);
    
    // Tratamento especial para comandos built-in do Levain
    if (expandedCommand.startsWith("levainShell")) {
      await this.executeLevainShell(expandedCommand, workDir);
      return;
    }
    
    if (expandedCommand.startsWith("extract")) {
      await this.executeExtract(expandedCommand, workDir);
      return;
    }
    
    if (expandedCommand.startsWith("copy")) {
      await this.executeCopy(expandedCommand, workDir);
      return;
    }
    
    if (expandedCommand.startsWith("addPath")) {
      await this.executeAddPath(expandedCommand);
      return;
    }

    // Executa comando shell normal
    const cmd = Deno.build.os === "windows" 
      ? ["cmd", "/c", expandedCommand]
      : ["sh", "-c", expandedCommand];
    
    const process = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
      cwd: workDir,
      env: Object.fromEntries(this.env),
    });
    
    const { code, stdout, stderr } = await process.output();
    
    if (code !== 0) {
      console.error(red(`Command failed: ${expandedCommand}`));
      console.error(new TextDecoder().decode(stderr));
      throw new Error(`Command failed with exit code ${code}`);
    }
  }

  private async executeLevainShell(command: string, workDir: string): Promise<void> {
    // Extrai o comando real do levainShell
    const match = command.match(/levainShell\s+(.+)/);
    if (!match) return;
    
    const shellCmd = match[1];
    await this.executeCommand(shellCmd, workDir);
  }

  private async executeExtract(command: string, workDir: string): Promise<void> {
    const parts = command.split(/\s+/);
    if (parts.length < 2) {
      throw new Error("Invalid extract command");
    }
    
    const archivePath = this.expandVariables(parts[1]);
    const targetDir = parts[2] ? this.expandVariables(parts[2]) : workDir;
    
    console.log(blue(`  Extracting ${archivePath} to ${targetDir}`));
    
    // Usa tar ou 7zip dependendo do formato
    if (archivePath.endsWith(".zip")) {
      if (Deno.build.os === "windows") {
        await this.executeCommand(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${targetDir}' -Force"`, workDir);
      } else {
        await this.executeCommand(`unzip -o "${archivePath}" -d "${targetDir}"`, workDir);
      }
    } else if (archivePath.endsWith(".tar.gz") || archivePath.endsWith(".tgz")) {
      await this.executeCommand(`tar -xzf "${archivePath}" -C "${targetDir}"`, workDir);
    } else if (archivePath.endsWith(".tar")) {
      await this.executeCommand(`tar -xf "${archivePath}" -C "${targetDir}"`, workDir);
    }
  }

  private async executeCopy(command: string, workDir: string): Promise<void> {
    const parts = command.match(/copy\s+"?([^"]+)"?\s+"?([^"]+)"?/);
    if (!parts) {
      throw new Error("Invalid copy command");
    }
    
    const source = this.expandVariables(parts[1]);
    const dest = this.expandVariables(parts[2]);
    
    console.log(blue(`  Copying ${source} to ${dest}`));
    await Deno.copyFile(source, dest);
  }

  private async executeAddPath(command: string): Promise<void> {
    const match = command.match(/addPath\s+(.+)/);
    if (!match) return;
    
    const pathToAdd = this.expandVariables(match[1]);
    this.addToPath(pathToAdd);
  }

  private addToPath(pathEntry: string) {
    const currentPath = this.env.get("PATH") || "";
    const separator = Deno.build.os === "windows" ? ";" : ":";
    
    if (!currentPath.includes(pathEntry)) {
      this.env.set("PATH", `${pathEntry}${separator}${currentPath}`);
      console.log(blue(`  Added to PATH: ${pathEntry}`));
    }
  }

  private expandVariables(text: string): string {
    // Substitui variáveis no formato ${VAR} ou $VAR
    return text.replace(/\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, p1, p2) => {
      const varName = p1 || p2;
      return this.env.get(varName) || match;
    });
  }

  private async isScoopAvailable(): Promise<boolean> {
    try {
      const cmd = new Deno.Command("scoop", { args: ["--version"] });
      const { code } = await cmd.output();
      return code === 0;
    } catch {
      return false;
    }
  }

  private async tryInstallWithScoop(packageName: string): Promise<boolean> {
    console.log(blue(`  Trying to install ${packageName} with Scoop...`));
    
    try {
      // Primeiro, tenta buscar o pacote no Scoop
      const searchCmd = new Deno.Command("scoop", { 
        args: ["search", packageName],
        stdout: "piped",
      });
      const { code: searchCode, stdout } = await searchCmd.output();
      
      if (searchCode !== 0) {
        return false;
      }
      
      const searchOutput = new TextDecoder().decode(stdout);
      if (!searchOutput.includes(packageName)) {
        console.log(yellow(`  ${packageName} not found in Scoop repositories`));
        return false;
      }
      
      // Instala com Scoop
      const installCmd = new Deno.Command("scoop", { 
        args: ["install", packageName],
      });
      const { code: installCode } = await installCmd.output();
      
      if (installCode === 0) {
        console.log(green(`  ✓ Installed ${packageName} via Scoop`));
        return true;
      }
    } catch (error) {
      console.log(yellow(`  Could not install via Scoop: ${error}`));
    }
    
    return false;
  }

  async list(): Promise<void> {
    console.log(blue("Installed packages:"));
    
    // Lista pacotes do Levain
    const pkgDir = this.config.pkgDir;
    if (await exists(pkgDir)) {
      for await (const entry of Deno.readDir(pkgDir)) {
        if (entry.isDirectory) {
          console.log(`  - ${entry.name} (Levain)`);
        }
      }
    }
    
    // Lista pacotes do Scoop se disponível
    if (this.config.useScoop && await this.isScoopAvailable()) {
      const cmd = new Deno.Command("scoop", { 
        args: ["list"],
        stdout: "piped",
      });
      const { stdout } = await cmd.output();
      const output = new TextDecoder().decode(stdout);
      console.log("\nScoop packages:");
      console.log(output);
    }
  }

  async uninstall(packageName: string): Promise<void> {
    console.log(blue(`Uninstalling ${packageName}...`));
    
    // Tenta desinstalar via Scoop primeiro
    if (this.config.useScoop && await this.isScoopAvailable()) {
      const cmd = new Deno.Command("scoop", { 
        args: ["uninstall", packageName],
      });
      const { code } = await cmd.output();
      
      if (code === 0) {
        console.log(green(`✓ Uninstalled ${packageName} via Scoop`));
        return;
      }
    }
    
    // Desinstala pacote Levain
    const pkgPath = join(this.config.pkgDir, packageName);
    if (await exists(pkgPath)) {
      await Deno.remove(pkgPath, { recursive: true });
      console.log(green(`✓ Uninstalled ${packageName}`));
    } else {
      console.log(yellow(`${packageName} is not installed`));
    }
  }

  async shell(): Promise<void> {
    console.log(blue("Starting Levain shell..."));
    console.log(blue(`Environment variables set. PATH updated.`));
    
    // Exporta variáveis de ambiente
    const envVars = Object.fromEntries(this.env);
    
    if (Deno.build.os === "windows") {
      // Inicia cmd com ambiente configurado
      const cmd = new Deno.Command("cmd", { 
        env: envVars,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      });
      await cmd.output();
    } else {
      // Inicia bash/sh com ambiente configurado
      const shell = Deno.env.get("SHELL") || "/bin/bash";
      const cmd = new Deno.Command(shell, { 
        env: envVars,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      });
      await cmd.output();
    }
  }
}

// Configuração do Levain
interface LevainConfig {
  levainHome: string;
  pkgDir: string;
  cacheDir: string;
  tempDir: string;
  repoDir: string;
  useScoop: boolean;
  scoopHome: string;
}

// CLI principal
async function main() {
  const args = parseArgs(Deno.args, {
    string: ["recipe", "url"],
    boolean: ["help", "version", "use-scoop"],
    alias: {
      h: "help",
      v: "version",
      r: "recipe",
      u: "url",
      s: "use-scoop",
    },
  });

  if (args.help) {
    printHelp();
    return;
  }

  if (args.version) {
    console.log("Levain-Deno v0.1.0 - Levain reimplementation in Deno 2");
    return;
  }

  // Configura uso do Scoop
  if (args["use-scoop"]) {
    Deno.env.set("LEVAIN_USE_SCOOP", "true");
  }

  const levain = new Levain();
  const command = args._[0] as string;

  try {
    switch (command) {
      case "install":
        const packages = args._.slice(1) as string[];
        for (const pkg of packages) {
          await levain.install(pkg, args.url || args.recipe);
        }
        break;
      
      case "uninstall":
        const uninstallPkgs = args._.slice(1) as string[];
        for (const pkg of uninstallPkgs) {
          await levain.uninstall(pkg);
        }
        break;
      
      case "list":
        await levain.list();
        break;
      
      case "shell":
        await levain.shell();
        break;
      
      default:
        console.log(red(`Unknown command: ${command}`));
        printHelp();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(red(`Error: ${errorMessage}`));
    Deno.exit(1);
  }
}

function printHelp() {
  console.log(`
${green("Levain-Deno")} - Development Environment Manager

${yellow("Usage:")}
  levain [command] [options]

${yellow("Commands:")}
  install <package>...   Install one or more packages
  uninstall <package>... Uninstall one or more packages
  list                   List installed packages
  shell                  Start a shell with Levain environment

${yellow("Options:")}
  -h, --help            Show this help message
  -v, --version         Show version
  -s, --use-scoop       Try to use Scoop for package installation
  -r, --recipe <path>   Path or URL to recipe file
  -u, --url <url>       URL to download recipe from

${yellow("Examples:")}
  levain install nodejs
  levain install git --use-scoop
  levain install myapp --recipe ./recipes/myapp.levain.yaml
  levain install custom --url https://example.com/custom.levain.yaml
  levain shell

${yellow("Environment Variables:")}
  LEVAIN_HOME          Levain home directory (default: ~/.levain)
  LEVAIN_PKG_DIR       Package installation directory
  LEVAIN_CACHE_DIR     Cache directory for downloads
  LEVAIN_USE_SCOOP     Enable Scoop integration (true/false)
  `);
}

// Executa o CLI
if (import.meta.main) {
  await main();
}
