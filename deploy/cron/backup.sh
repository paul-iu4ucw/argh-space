#!/bin/sh
# Un giro subito e poi uno al giorno. Si tengono BACKUP_KEEP_DAYS giorni.
set -u
set -o pipefail
umask 077
while true; do
  d=$(date +%Y%m%d-%H%M)
  if pg_dump -h db -U argh -d argh | gzip > "/backups/db-$d.sql.gz.tmp"; then
    mv "/backups/db-$d.sql.gz.tmp" "/backups/db-$d.sql.gz"
    tar -czf "/backups/media-$d.tar.gz" -C /media . && echo "backup $d completato"
    # le copie vecchie si cancellano solo dopo un backup riuscito
    find /backups -name '*.gz' -mtime "+${BACKUP_KEEP_DAYS:-14}" -delete
  else
    rm -f "/backups/db-$d.sql.gz.tmp"
    echo "BACKUP FALLITO $d" >&2
  fi
  sleep 86400
done
