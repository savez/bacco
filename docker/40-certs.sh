#!/bin/sh
# Eseguito da docker-entrypoint.d di nginx a ogni avvio del container.
# Se sono montati certificati mkcert validi (quickstart.md), li usa al posto di
# quello autofirmato generato in build, così il telefono può fidarsi del certificato.
set -e

LOCAL_DIR=/etc/nginx/certs-local
CERT_DIR=/etc/nginx/certs

if [ -f "$LOCAL_DIR/bacco.pem" ] && [ -f "$LOCAL_DIR/bacco-key.pem" ]; then
  echo "[bacco] Uso i certificati mkcert montati in $LOCAL_DIR"
  cp "$LOCAL_DIR/bacco.pem" "$CERT_DIR/bacco.pem"
  cp "$LOCAL_DIR/bacco-key.pem" "$CERT_DIR/bacco-key.pem"
else
  echo "[bacco] Nessun certificato mkcert trovato: resto sul certificato autofirmato"
fi
