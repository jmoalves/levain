#!/bin/bash

# Script de Limpeza Total do Cache do Deno
echo "🔥 ULTIMATE CACHE CLEAN 🔥"
echo "========================="

# 1. Remover TODOS os caches locais
echo "Removing local caches..."
rm -rf bin/
rm -rf .deno/
rm -rf dist/
rm -rf build/
rm -rf node_modules/
rm -f deno.lock

# 2. Remover cache global do Deno
echo "Removing global Deno cache..."
rm -rf ~/.cache/deno
rm -rf ~/.deno

# 3. Remover cache no diretório temporário
echo "Removing temp caches..."
rm -rf /tmp/deno*

# 4. Limpar variáveis de ambiente que possam afetar o cache
unset DENO_DIR
unset DENO_INSTALL_ROOT

# 5. Verificar se ainda existe algum arquivo com cliffy@v1.0.0-rc.7
echo ""
echo "Checking for problematic Cliffy imports..."
grep -r "cliffy@v1.0.0-rc.7" . --include="*.ts" --include="*.js" 2>/dev/null

# 6. Se encontrar, substituir
echo ""
echo "Fixing any remaining bad Cliffy imports..."
find . -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i 's/cliffy@v1.0.0-rc.7/cliffy@v1.0.0-rc.3/g' {} \;

echo ""
echo "✅ Cache completely cleaned!"
echo ""
echo "Now try:"
echo "  deno cache --reload levain.ts"
