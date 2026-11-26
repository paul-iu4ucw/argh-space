#!/bin/sh
# Chiama un cron del sito con il segreto.
wget -q -T 90 -O - --header="Authorization: Bearer $CRON_SECRET" "http://app:3000/api/cron/$1" >/proc/1/fd/1 2>&1
echo " <- $1" >/proc/1/fd/1
