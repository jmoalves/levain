/**
 * Levain Helper Functions for Deno 2
 * Funções utilitárias atualizadas para Deno 2
 */

export class ProcessUtils {
  /**
   * Executa um comando e retorna o resultado
   * Substitui o antigo padrão com Deno.run()
   */
  static async runCommand(
    command: string,
    args: string[] = [],
    options?: {
      cwd?: string;
      env?: Record<string, string>;
      stdout?: "inherit" | "piped" | "null";
      stderr?: "inherit" | "piped" | "null";
    },
  ): Promise<{
    success: boolean;
    code: number;
    stdout: string;
    stderr: string;
  }> {
    const cmd = new Deno.Command(command, {
      args,
      cwd: options?.cwd,
      env: options?.env,
      stdout: options?.stdout || "piped",
      stderr: options?.stderr || "piped",
    });

    const output = await cmd.output();

    return {
      success: output.success,
      code: output.code,
      stdout: new TextDecoder().decode(output.stdout),
      stderr: new TextDecoder().decode(output.stderr),
    };
  }

  /**
   * Executa comando com output em tempo real
   */
  static async runCommandWithOutput(
    command: string,
    args: string[] = [],
    options?: {
      cwd?: string;
      env?: Record<string, string>;
    },
  ): Promise<boolean> {
    const cmd = new Deno.Command(command, {
      args,
      cwd: options?.cwd,
      env: options?.env,
      stdout: "inherit",
      stderr: "inherit",
    });

    const { success } = await cmd.output();
    return success;
  }

  /**
   * Executa comando e retorna apenas stdout como string
   */
  static async getCommandOutput(
    command: string,
    args: string[] = [],
  ): Promise<string> {
    const result = await ProcessUtils.runCommand(command, args);
    if (!result.success) {
      throw new Error(`Command failed: ${command} ${args.join(" ")}\n${result.stderr}`);
    }
    return result.stdout.trim();
  }
}

export class FileUtils {
  /**
   * Download de arquivo com progresso
   */
  static async downloadFile(
    url: string,
    destination: string,
    options?: {
      onProgress?: (percent: number) => void;
    },
  ): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const contentLength = response.headers.get("content-length");
    const totalSize = contentLength ? parseInt(contentLength, 10) : 0;

    // Garantir que o diretório existe
    const dir = destination.substring(0, destination.lastIndexOf("/"));
    if (dir) {
      await ensureDir(dir);
    }

    const file = await Deno.open(destination, {
      write: true,
      create: true,
      truncate: true,
    });

    try {
      if (totalSize && options?.onProgress && response.body) {
        let downloadedSize = 0;
        const reader = response.body.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          await file.write(value);
          downloadedSize += value.byteLength;

          const percent = Math.round((downloadedSize / totalSize) * 100);
          options.onProgress(percent);
        }
      } else {
        // Download simples sem progresso
        await response.body?.pipeTo(file.writable);
      }
    } finally {
      // file.close() - not needed with Deno.Command
    }
  }

  /**
   * Extrai arquivo ZIP/TAR
   */
  static async extractArchive(
    archivePath: string,
    destinationDir: string,
    options?: {
      onProgress?: (file: string) => void;
    },
  ): Promise<void> {
    await ensureDir(destinationDir);

    const extension = archivePath.toLowerCase();

    if (extension.endsWith(".zip")) {
      // Para ZIP, usar comando unzip
      const result = await ProcessUtils.runCommand("unzip", [
        "-q",
        "-o",
        archivePath,
        "-d",
        destinationDir,
      ]);

      if (!result.success) {
        throw new Error(`Failed to extract ZIP: ${result.stderr}`);
      }
    } else if (extension.endsWith(".tar") || extension.endsWith(".tar.gz") || extension.endsWith(".tgz")) {
      // Para TAR, usar comando tar
      const args = ["xf", archivePath, "-C", destinationDir];
      if (extension.endsWith(".gz") || extension.endsWith(".tgz")) {
        args.unshift("z");
      }

      const result = await ProcessUtils.runCommand("tar", args);

      if (!result.success) {
        throw new Error(`Failed to extract TAR: ${result.stderr}`);
      }
    } else {
      throw new Error(`Unsupported archive format: ${extension}`);
    }
  }

  /**
   * Copia diretório recursivamente
   */
  static async copyDirectory(src: string, dest: string): Promise<void> {
    await ensureDir(dest);

    for await (const entry of Deno.readDir(src)) {
      const srcPath = `${src}/${entry.name}`;
      const destPath = `${dest}/${entry.name}`;

      if (entry.isDirectory) {
        await FileUtils.copyDirectory(srcPath, destPath);
      } else {
        await Deno.copyFile(srcPath, destPath);
      }
    }
  }
}

export class GitUtils {
  /**
   * Clona repositório Git
   */
  static async clone(
    repoUrl: string,
    destination?: string,
    options?: {
      branch?: string;
      depth?: number;
    },
  ): Promise<boolean> {
    const args = ["clone"];

    if (options?.branch) {
      args.push("-b", options.branch);
    }

    if (options?.depth) {
      args.push("--depth", options.depth.toString());
    }

    args.push(repoUrl);

    if (destination) {
      args.push(destination);
    }

    const result = await ProcessUtils.runCommand("git", args);
    return result.success;
  }

  /**
   * Faz pull do repositório
   */
  static async pull(repoPath?: string): Promise<boolean> {
    const result = await ProcessUtils.runCommand("git", ["pull"], {
      cwd: repoPath,
    });
    return result.success;
  }
}

export class NetworkUtils {
  /**
   * Faz requisição HTTP com retry
   */
  static async fetchWithRetry(
    url: string,
    options?: RequestInit & { maxRetries?: number; retryDelay?: number },
  ): Promise<Response> {
    const maxRetries = options?.maxRetries || 3;
    const retryDelay = options?.retryDelay || 1000;

    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) {
          return response;
        }

        // Se não for erro de rede, não fazer retry
        if (response.status < 500) {
          return response;
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;
      }

      // Aguardar antes do próximo retry
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (i + 1)));
      }
    }

    throw lastError || new Error("Failed to fetch after retries");
  }
}

// Re-export das funções do Deno std atualizadas
export { ensureDir } from "jsr:@std/fs@1.0.0/ensure-dir";
export { exists } from "jsr:@std/fs@1.0.0/exists";
export { walk } from "jsr:@std/fs@1.0.0/walk";
export { basename, dirname, join, resolve } from "jsr:@std/path@1.0.0";
export { parse as parseYaml } from "jsr:@std/yaml@1.0.0";
export { decode as base64Decode, encode as base64Encode } from "jsr:@std/encoding@1.0.0/base64";
