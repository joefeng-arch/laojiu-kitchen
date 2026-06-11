#!/usr/bin/env bash
# 老舅厨房每日备份脚本
# 由 deploy.sh 安装到 /etc/cron.daily/laojiu-kitchen-backup
set -euo pipefail

BACKUP_DIR=/var/backups/laojiu-kitchen
KEEP_DAYS=14
TS=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

# Postgres dump
docker exec ujk-postgres pg_dump -U "${DB_USER:-ujk_user}" "${DB_NAME:-ujk_prod}" \
    | gzip > "$BACKUP_DIR/db-$TS.sql.gz"

# uploads
tar czf "$BACKUP_DIR/uploads-$TS.tar.gz" -C /var/lib/laojiu-kitchen uploads

# 清理超过保留期的旧备份
find "$BACKUP_DIR" -type f -mtime +$KEEP_DAYS -delete

echo "[backup] $TS done"
