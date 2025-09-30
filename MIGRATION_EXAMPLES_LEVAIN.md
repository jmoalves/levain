# Exemplos de Migração Levain - Deno 1 → Deno 2

## 1. Executar Comandos (Substituir Deno.run)

### Antes (Deno 1):

```typescript
const p = Deno.run({
  cmd: ["git", "clone", repoUrl, destPath],
  stdout: "piped",
  stderr: "piped",
});

const { success } = await p.status();
const rawOutput = await p.output();
const output = new TextDecoder().decode(rawOutput);
p.close();
```

### Depois (Deno 2):

```typescript
import { ProcessUtils } from "./src/lib/deno2_helpers.ts";

const result = await ProcessUtils.runCommand("git", ["clone", repoUrl, destPath]);
if (result.success) {
  console.log("Clone successful:", result.stdout);
} else {
  console.error("Clone failed:", result.stderr);
}
```

## 2. Download de Arquivos com Progresso

### Antes (Deno 1):

```typescript
const response = await fetch(downloadUrl);
const file = await Deno.open(destPath, { write: true, create: true });
await Deno.copy(response.body!, file);
file.close();
```

### Depois (Deno 2):

```typescript
import { FileUtils } from "./src/lib/deno2_helpers.ts";

await FileUtils.downloadFile(
  downloadUrl,
  destPath,
  {
    onProgress: (percent) => {
      console.log(`Download progress: ${percent}%`);
    },
  },
);
```

## 3. Extrair Arquivos

### Antes (Deno 1):

```typescript
const p = Deno.run({
  cmd: ["unzip", "-o", zipFile, "-d", destDir],
  stdout: "piped",
  stderr: "piped",
});
await p.status();
p.close();
```

### Depois (Deno 2):

```typescript
import { FileUtils } from "./src/lib/deno2_helpers.ts";

await FileUtils.extractArchive(zipFile, destDir);
```

## 4. Operações Git

### Antes (Deno 1):

```typescript
const p = Deno.run({
  cmd: ["git", "clone", "-b", branch, "--depth", "1", repoUrl, destPath],
});
const { success } = await p.status();
p.close();
```

### Depois (Deno 2):

```typescript
import { GitUtils } from "./src/lib/deno2_helpers.ts";

const success = await GitUtils.clone(repoUrl, destPath, {
  branch: branch,
  depth: 1,
});
```

## 5. Imports do Standard Library

### Antes (Deno 1):

```typescript
import { ensureDir } from "https://deno.land/std@0.200.0/fs/ensure_dir.ts";
import { exists } from "https://deno.land/std@0.200.0/fs/exists.ts";
import { join } from "https://deno.land/std@0.200.0/path/mod.ts";
import { parse } from "https://deno.land/std@0.200.0/encoding/yaml.ts";
```

### Depois (Deno 2):

```typescript
import { ensureDir } from "jsr:@std/fs@1.0.0/ensure-dir";
import { exists } from "jsr:@std/fs@1.0.0/exists";
import { join } from "jsr:@std/path@1.0.0";
import { parse } from "jsr:@std/yaml@1.0.0";
```

## 6. Variáveis de Ambiente e Permissões

### Antes (Deno 1):

```bash
deno run --allow-all levain.ts
```

### Depois (Deno 2 - mais seguro):

```bash
deno run \
  --allow-read=. \
  --allow-write=./temp,./downloads \
  --allow-net=github.com,api.github.com \
  --allow-run=git,unzip,tar \
  --allow-env=LEVAIN_HOME,PATH \
  levain.ts
```

## 7. Configuração do VSCode

Crie/atualize `.vscode/settings.json`:

```json
{
  "deno.enable": true,
  "deno.lint": true,
  "deno.unstable": false,
  "deno.importMap": "./deno.json",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "denoland.vscode-deno"
  },
  "[javascript]": {
    "editor.defaultFormatter": "denoland.vscode-deno"
  }
}
```

## 8. GitHub Actions para CI/CD

Atualize `.github/workflows/deno.yml`:

```yaml
name: Deno CI

on:
  push:
    branches: [main, deno2_opus]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x

      - name: Verify formatting
        run: deno fmt --check

      - name: Run linter
        run: deno lint

      - name: Run tests
        run: deno test --allow-all --coverage

      - name: Generate coverage
        run: deno coverage --lcov > coverage.lcov

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.lcov

  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]

    steps:
      - uses: actions/checkout@v3

      - uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x

      - name: Build executable
        run: deno compile --allow-all --output=levain${{ matrix.os == 'windows-latest' && '.exe' || '' }} levain.ts

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: levain-${{ matrix.os }}
          path: levain${{ matrix.os == 'windows-latest' && '.exe' || '' }}
```

## 9. Package.json para Compatibilidade NPM (opcional)

Se quiser manter compatibilidade com NPM:

```json
{
  "name": "levain",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "deno run --allow-all --watch levain.ts",
    "test": "deno test --allow-all",
    "build": "deno compile --allow-all --output=levain levain.ts",
    "fmt": "deno fmt",
    "lint": "deno lint"
  },
  "devDependencies": {},
  "dependencies": {}
}
```
