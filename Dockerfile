# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
# Aggiunge il mime type di .webmanifest (assente nella tabella di default; .wasm
# c'è già) prima della "}" di chiusura: un blocco "types" separato in nginx.conf
# sostituirebbe per intero la tabella ereditata invece di estenderla.
RUN sed -i '/^}/i\    application/manifest+json webmanifest;' /etc/nginx/mime.types
RUN apk add --no-cache openssl \
  && mkdir -p /etc/nginx/certs \
  && openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
       -keyout /etc/nginx/certs/bacco-key.pem \
       -out /etc/nginx/certs/bacco.pem \
       -subj "/CN=bacco.local"
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx-security-headers.conf /etc/nginx/security-headers.conf
COPY docker/40-certs.sh /docker-entrypoint.d/40-certs.sh
RUN chmod +x /docker-entrypoint.d/40-certs.sh
COPY --from=build /app/dist /usr/share/nginx/html
