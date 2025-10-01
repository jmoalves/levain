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

// Classe principal do Levain
class Levain {
  private config: LevainConfig;
  private env: Map<string, string> = new Map();
  private installedPackages: Set<string> = new Set();
  private repositories: Map<string, RecipeRepository> = new Map();
  
  constructor(config?: LevainConfig) {
    this.config = config || this.loadConfig();
    this.initializeEnvironment();
  }
  
  async init(): Promise<void> {
    await this.loadRepositories();
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

  private async loadRepositories() {
    const repoConfigFile = join(this.config.levainHome, "repositories.json");
    
    // Garante que o diretório existe
    await ensureDir(this.config.levainHome);
    
    // Carrega repositórios salvos
    if (await exists(repoConfigFile)) {
      try {
        const content = await Deno.readTextFile(repoConfigFile);
        const repos = JSON.parse(content) as RecipeRepository[];
        for (const repo of repos) {
          this.repositories.set(repo.name, repo);
        }
        console.log(blue(`Loaded ${repos.length} repositories from config`));
      } catch (error) {
        console.log(yellow("Warning: Could not load repositories config"));
        console.log(red(`Error: ${error}`));
      }
    }
    
    // Adiciona repositório padrão se não existir nenhum
    if (this.repositories.size === 0) {
      const defaultRepo = {
        name: "local",
        url: "local",
        path: this.config.pkgDir,
        updated: undefined,
      };
      this.repositories.set("local", defaultRepo);
      await this.saveRepositories();
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
    
    if (this.repositories.size === 0) {
      console.log(yellow("  No repositories configured"));
      console.log("\nAdd a repository with:");
      console.log("  levain repo add <name> <url>");
      return;
    }
    
    for (const repo of this.repositories.values()) {
      const updatedStr = repo.updated ? new Date(repo.updated).toLocaleString() : "never";
      console.log(`\n  ${green(repo.name)}`);
      console.log(`    URL: ${repo.url}`);
      console.log(`    Path: ${repo.path}`);
      console.log(`    Last updated: ${updatedStr}`);
      
      // Verifica se o diretório existe
      if (!await exists(repo.path)) {
        console.log(yellow(`    Status: Directory not found`));
        continue;
      }
      
      // Conta receitas disponíveis
      const recipeCount = await this.countRecipesInRepo(repo);
      console.log(`    Recipes available: ${recipeCount}`);
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
    await this.scanDirectoryForRecipes(repo.path, recipes);
    
    recipes.sort();
    for (const recipe of recipes) {
      console.log(`  - ${recipe}`);
    }
    
    if (recipes.length === 0) {
      console.log(yellow("  No recipes found"));
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
    
    return recipes;
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

  private async loadRecipe(packageName: string, recipeUrl?: string): Promise<LevainRecipe | null> {
    let recipeContent: string | undefined;
    
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
      // Debug: mostra repositórios disponíveis
      if (Deno.env.get("LEVAIN_DEBUG") === "true") {
        console.log(blue(`Searching for ${packageName}.levain.yaml in ${this.repositories.size} repositories`));
      }
      
      // Procura em todos os repositórios
      for (const repo of this.repositories.values()) {
        if (Deno.env.get("LEVAIN_DEBUG") === "true") {
          console.log(blue(`  Checking repository: ${repo.name} at ${repo.path}`));
        }
        
        // Verifica se o diretório do repositório existe
        if (!await exists(repo.path)) {
          console.log(yellow(`  Warning: Repository path does not exist: ${repo.path}`));
          continue;
        }
        
        // Busca a receita em qualquer lugar do repositório
        const recipe = await this.findRecipeFile(repo.path, `${packageName}.levain.yaml`);
        if (recipe) {
          console.log(green(`  ✓ Found recipe in repository: ${repo.name}`));
          console.log(blue(`    Path: ${recipe.path}`));
          recipeContent = recipe.content;
          break;
        }
      }
      
      if (!recipeContent) {
        // Lista repositórios verificados para ajudar no debug
        console.log(yellow(`\nRecipe "${packageName}.levain.yaml" not found.`));
        console.log("\nSearched in repositories:");
        for (const repo of this.repositories.values()) {
          console.log(`  - ${repo.name}: ${repo.path}`);
        }
        console.log("\nTips:");
        console.log(`  - Use 'levain search ${packageName}' to search for similar recipes`);
        console.log(`  - Use 'levain repo list --show-recipes' to see all available recipes`);
        console.log(`  - Use '--debug' flag for detailed search information`);
        return null;
      }
    }

    return parseYaml(recipeContent) as LevainRecipe;
  }
  
  private async findRecipeFile(dir: string, fileName: string, depth: number = 0, maxDepth: number = 10): Promise<{path: string, content: string} | null> {
    if (depth > maxDepth) return null;
    
    try {
      // Primeiro verifica no diretório atual
      const filePath = join(dir, fileName);
      if (await exists(filePath)) {
        try {
          const content = await Deno.readTextFile(filePath);
          return { path: filePath, content };
        } catch (error) {
          if (Deno.env.get("LEVAIN_DEBUG") === "true") {
            console.log(yellow(`    Could not read ${filePath}: ${error}`));
          }
        }
      }
      
      // Depois busca recursivamente em subdiretórios
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isDirectory && !entry.name.startsWith(".") && entry.name !== "node_modules") {
          const result = await this.findRecipeFile(
            join(dir, entry.name), 
            fileName, 
            depth + 1, 
            maxDepth
          );
          if (result) return result;
        }
      }
    } catch (error) {
      if (Deno.env.get("LEVAIN_DEBUG") === "true") {
        console.log(yellow(`    Error reading directory ${dir}: ${error}`));
      }
    }
    
    return null;
  }
  
  private async buildRecipeCache(dir: string, cache: Map<string, string> = new Map(), depth: number = 0, maxDepth: number = 10): Promise<Map<string, string>> {
    if (depth > maxDepth) return cache;
    
    try {
      for await (const entry of Deno.readDir(dir)) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isFile && entry.name.endsWith(".levain.yaml")) {
          // O nome da receita é o nome do arquivo sem a extensão .levain.yaml
          const recipeName = entry.name.replace(/\.levain\.yaml$/, "");
          cache.set(fullPath, recipeName);
          
          if (Deno.env.get("LEVAIN_DEBUG") === "true" && depth === 0 && cache.size <= 5) {
            console.log(blue(`      Found: ${recipeName} at ${fullPath.replace(dir + "/", "")}`));
          }
        } else if (entry.isDirectory && !entry.name.startsWith(".") && entry.name !== "node_modules") {
          // Busca recursivamente no diretório
          await this.buildRecipeCache(fullPath, cache, depth + 1, maxDepth);
        }
      }
    } catch (error) {
      if (Deno.env.get("LEVAIN_DEBUG") === "true") {
        console.log(yellow(`    Error scanning ${dir}: ${error}`));
      }
    }
    
    if (depth === 0 && Deno.env.get("LEVAIN_DEBUG") === "true") {
      console.log(blue(`      Total recipes found: ${cache.size}`));
    }
    
    return cache;
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
    
    if (expandedCommand.startsWith("download") || expandedCommand.startsWith("fetch")) {
      await this.executeDownload(expandedCommand, workDir);
      return;
    }
    
    if (expandedCommand.startsWith("mkDir") || expandedCommand.startsWith("mkdir")) {
      await this.executeMkDir(expandedCommand, workDir);
      return;
    }
    
    if (expandedCommand.startsWith("setEnv")) {
      await this.executeSetEnv(expandedCommand);
      return;
    }
    
    if (expandedCommand.startsWith("removeFile") || expandedCommand.startsWith("rm")) {
      await this.executeRemove(expandedCommand, workDir);
      return;
    }
    
    if (expandedCommand.startsWith("removeDir") || expandedCommand.startsWith("rmdir")) {
      await this.executeRemoveDir(expandedCommand, workDir);
      return;
    }
    
    if (expandedCommand.startsWith("checkCmd")) {
      await this.executeCheckCmd(expandedCommand);
      return;
    }
    
    if (expandedCommand.startsWith("template")) {
      await this.executeTemplate(expandedCommand, workDir);
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
  
  private async executeDownload(command: string, workDir: string): Promise<void> {
    const parts = command.match(/(?:download|fetch)\s+"?([^"\s]+)"?\s+"?([^"]+)"?/);
    if (!parts) {
      throw new Error("Invalid download command");
    }
    
    const url = this.expandVariables(parts[1]);
    const dest = parts[2] ? this.expandVariables(parts[2]) : join(workDir, basename(url));
    
    console.log(blue(`  Downloading ${url} to ${dest}`));
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download from ${url}: ${response.statusText}`);
    }
    
    const data = new Uint8Array(await response.arrayBuffer());
    await ensureDir(dirname(dest));
    await Deno.writeFile(dest, data);
    
    console.log(green(`  ✓ Downloaded ${basename(dest)}`));
  }
  
  private async executeMkDir(command: string, workDir: string): Promise<void> {
    const match = command.match(/(?:mkDir|mkdir)\s+"?([^"]+)"?/);
    if (!match) return;
    
    const dirPath = this.expandVariables(match[1]);
    const fullPath = dirPath.startsWith("/") || dirPath.includes(":") 
      ? dirPath 
      : join(workDir, dirPath);
    
    console.log(blue(`  Creating directory ${fullPath}`));
    await ensureDir(fullPath);
  }
  
  private async executeSetEnv(command: string): Promise<void> {
    const match = command.match(/setEnv\s+"?([^"=]+)"?\s*=?\s*"?([^"]+)"?/);
    if (!match) return;
    
    const varName = match[1];
    const varValue = this.expandVariables(match[2]);
    
    console.log(blue(`  Setting ${varName}=${varValue}`));
    this.env.set(varName, varValue);
    Deno.env.set(varName, varValue);
  }
  
  private async executeRemove(command: string, workDir: string): Promise<void> {
    const match = command.match(/(?:removeFile|rm)\s+"?([^"]+)"?/);
    if (!match) return;
    
    const filePath = this.expandVariables(match[1]);
    const fullPath = filePath.startsWith("/") || filePath.includes(":") 
      ? filePath 
      : join(workDir, filePath);
    
    if (await exists(fullPath)) {
      console.log(blue(`  Removing file ${fullPath}`));
      await Deno.remove(fullPath);
    }
  }
  
  private async executeRemoveDir(command: string, workDir: string): Promise<void> {
    const match = command.match(/(?:removeDir|rmdir)\s+"?([^"]+)"?/);
    if (!match) return;
    
    const dirPath = this.expandVariables(match[1]);
    const fullPath = dirPath.startsWith("/") || dirPath.includes(":") 
      ? dirPath 
      : join(workDir, dirPath);
    
    if (await exists(fullPath)) {
      console.log(blue(`  Removing directory ${fullPath}`));
      await Deno.remove(fullPath, { recursive: true });
    }
  }
  
  private async executeCheckCmd(command: string): Promise<void> {
    const match = command.match(/checkCmd\s+"?([^"]+)"?/);
    if (!match) return;
    
    const cmdToCheck = match[1];
    console.log(blue(`  Checking for command: ${cmdToCheck}`));
    
    try {
      const checkCmd = new Deno.Command(Deno.build.os === "windows" ? "where" : "which", {
        args: [cmdToCheck],
        stdout: "piped",
      });
      const { code, stdout } = await checkCmd.output();
      
      if (code === 0) {
        const location = new TextDecoder().decode(stdout).trim();
        console.log(green(`  ✓ Found: ${location}`));
      } else {
        console.log(yellow(`  ⚠ Command '${cmdToCheck}' not found in PATH`));
      }
    } catch {
      console.log(yellow(`  ⚠ Could not check for '${cmdToCheck}'`));
    }
  }
  
  private async executeTemplate(command: string, workDir: string): Promise<void> {
    const parts = command.match(/template\s+"?([^"]+)"?\s+"?([^"]+)"?/);
    if (!parts) {
      throw new Error("Invalid template command");
    }
    
    const source = this.expandVariables(parts[1]);
    const dest = this.expandVariables(parts[2]);
    
    const sourcePath = source.startsWith("/") || source.includes(":") 
      ? source 
      : join(workDir, source);
    const destPath = dest.startsWith("/") || dest.includes(":") 
      ? dest 
      : join(workDir, dest);
    
    console.log(blue(`  Processing template ${sourcePath} to ${destPath}`));
    
    // Lê o template
    let content = await Deno.readTextFile(sourcePath);
    
    // Substitui variáveis no template
    content = this.expandVariables(content);
    
    // Escreve o arquivo processado
    await ensureDir(dirname(destPath));
    await Deno.writeTextFile(destPath, content);
    
    console.log(green(`  ✓ Template processed`));
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

// CLI principal
async function main() {
  const args = parseArgs(Deno.args, {
    string: ["recipe", "url", "repo"],
    boolean: ["help", "version", "use-scoop", "debug", "show-recipes", "recipes"],
    alias: {
      h: "help",
      v: "version",
      r: "recipe",
      u: "url",
      s: "use-scoop",
      d: "debug",
    },
  });

  if (args.help) {
    printHelp();
    return;
  }

  if (args.version) {
    console.log("Levain-Deno v0.2.1 - Levain reimplementation in Deno 2");
    return;
  }

  // Configura uso do Scoop
  if (args["use-scoop"]) {
    Deno.env.set("LEVAIN_USE_SCOOP", "true");
  }
  
  // Ativa debug
  if (args.debug) {
    Deno.env.set("LEVAIN_DEBUG", "true");
  }

  const levain = new Levain();
  await levain.init(); // Inicializa assincronamente
  
  const command = args._[0] as string;

  try {
    switch (command) {
      case "install":
        const packages = args._.slice(1) as string[];
        if (packages.length === 0) {
          console.log(red("Please specify at least one package to install"));
          console.log("Usage: levain install <package>...");
          return;
        }
        for (const pkg of packages) {
          await levain.install(pkg, args.url || args.recipe);
        }
        break;
      
      case "uninstall":
        const uninstallPkgs = args._.slice(1) as string[];
        if (uninstallPkgs.length === 0) {
          console.log(red("Please specify at least one package to uninstall"));
          console.log("Usage: levain uninstall <package>...");
          return;
        }
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
      
      case "repo":
        await handleRepoCommand(levain, args);
        break;
      
      case "search":
        const searchTerms = args._.slice(1) as string[];
        if (searchTerms.length === 0) {
          console.log(red("Please specify at least one search term"));
          console.log("Usage: levain search <term>...");
          return;
        }
        for (const term of searchTerms) {
          await levain.searchRecipe(term);
        }
        break;
      
      default:
        if (!command) {
          console.log(red("No command specified"));
        } else {
          console.log(red(`Unknown command: ${command}`));
        }
        printHelp();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(red(`Error: ${errorMessage}`));
    if (args.debug) {
      console.error(error);
    }
    Deno.exit(1);
  }
}

async function handleRepoCommand(levain: Levain, args: any) {
  const subCommand = args._[1] as string;
  
  switch (subCommand) {
    case "add":
      const name = args._[2] as string;
      const url = args._[3] as string;
      if (!name || !url) {
        console.log(red("Usage: levain repo add <name> <url>"));
        return;
      }
      await levain.addRepository(name, url);
      break;
    
    case "remove":
      const removeName = args._[2] as string;
      if (!removeName) {
        console.log(red("Usage: levain repo remove <name>"));
        return;
      }
      await levain.removeRepository(removeName);
      break;
    
    case "update":
      const updateName = args._[2] as string;
      await levain.updateRepository(updateName);
      break;
    
    case "list":
      await levain.listRepositories();
      break;
    
    default:
      console.log(red(`Unknown repo command: ${subCommand}`));
      console.log("Available commands: add, remove, update, list");
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
  search <term>...       Search for recipes in all repositories
  repo <subcommand>      Manage recipe repositories
    add <name> <url>     Add a new repository from Git URL
    remove <name>        Remove a repository
    update [name]        Update repository (all if no name specified)
    list                 List all repositories

${yellow("Options:")}
  -h, --help            Show this help message
  -v, --version         Show version
  -s, --use-scoop       Try to use Scoop for package installation
  -r, --recipe <path>   Path or URL to recipe file
  -u, --url <url>       URL to download recipe from

${yellow("Examples:")}
  # Add official Levain packages repository
  levain repo add official https://github.com/jmoalves/levain-pkgs

  # Search and install from repositories
  levain search nodejs
  levain install nodejs

  # Install with Scoop integration
  levain install git --use-scoop

  # Install from specific recipe
  levain install myapp --recipe ./recipes/myapp.levain.yaml

  # Update all repositories
  levain repo update

  # Start shell with configured environment
  levain shell

${yellow("Environment Variables:")}
  LEVAIN_HOME          Levain home directory (default: ~/.levain)
  LEVAIN_PKG_DIR       Package installation directory
  LEVAIN_CACHE_DIR     Cache directory for downloads
  LEVAIN_REPO_DIR      Repository storage directory
  LEVAIN_USE_SCOOP     Enable Scoop integration (true/false)
  `);
}

// Executa o CLI
if (import.meta.main) {
  await main();
}
