#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRAPPER_DIR="$PROJECT_DIR/scrapper"
NODE_BIN="$(which node)"
NPM_BIN="$(which npm)"

SCRAP_CRON="0 */2 * * * cd $SCRAPPER_DIR && $NPM_BIN start -- type=scrap >> $PROJECT_DIR/logs/scrap.log 2>&1"
CHECK_CRON="0 * * * * cd $SCRAPPER_DIR && $NPM_BIN start -- type=check >> $PROJECT_DIR/logs/check.log 2>&1"

echo "=== Configurando Cron Jobs para Worten Scraper ==="
echo "Diretório do projeto: $PROJECT_DIR"
echo ""

mkdir -p "$PROJECT_DIR/logs"

current_crontab=$(crontab -l 2>/dev/null)

scrap_exists=$(echo "$current_crontab" | grep -F "type=scrap" | grep -v "^#")
check_exists=$(echo "$current_crontab" | grep -F "type=check" | grep -v "^#")

if [ -z "$scrap_exists" ]; then
    echo "[+] Adicionando cron job para SCRAP (a cada 2 horas)..."
    (crontab -l 2>/dev/null; echo "$SCRAP_CRON") | crontab -
    echo "    ✓ Cron job 'scrap' criado com sucesso"
else
    echo "[!] Cron job para SCRAP já existe:"
    echo "    $scrap_exists"
fi

if [ -z "$check_exists" ]; then
    echo "[+] Adicionando cron job para CHECK (a cada 1 hora)..."
    (crontab -l 2>/dev/null; echo "$CHECK_CRON") | crontab -
    echo "    ✓ Cron job 'check' criado com sucesso"
else
    echo "[!] Cron job para CHECK já existe:"
    echo "    $check_exists"
fi

echo ""
echo "=== Cron Jobs Configurados ==="
echo "SCRAP: Executa a cada 2 horas (0 */2 * * *)"
echo "CHECK: Executa a cada 1 hora (0 * * * *)"
echo ""
echo "Logs:"
echo "- SCRAP: $PROJECT_DIR/logs/scrap.log"
echo "- CHECK: $PROJECT_DIR/logs/check.log"
echo ""
echo "Para visualizar os cron jobs atuais, execute: crontab -l"
echo "Para remover os cron jobs, execute: crontab -e"
