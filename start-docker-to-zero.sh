#!/bin/bash

echo "=== Reiniciando Docker do Zero ==="
echo ""

echo "1. Parando containers..."
docker compose down

echo ""
echo "2. Removendo volumes (apagando dados)..."
docker volume rm tp_postgres_data 2>/dev/null || echo "   Volume já não existe"

echo ""
echo "3. Subindo containers novamente..."
docker compose up -d

echo ""
echo "4. Aguardando banco de dados ficar pronto..."
sleep 5

echo ""
echo "5. Verificando status..."
docker compose ps

echo ""
echo "=== Docker reiniciado com banco zerado! ==="
echo ""
echo "Para verificar os logs: docker compose logs -f"
