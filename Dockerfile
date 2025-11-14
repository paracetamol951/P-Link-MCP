# ---------- Build stage ----------
FROM node:18-alpine AS builder

# Optimisations réseau / build
ENV NODE_ENV=development \
    CI=true

WORKDIR /app

# Copie sélective pour profiter du cache Docker
COPY package.json package-lock.json* ./
COPY tsconfig.json ./

# Installe TOUTES les deps (prod + dev) pour pouvoir builder
RUN npm ci

# Copie du code
COPY . .

# Build TypeScript -> build/
RUN npm run build

# ---------- Runtime stage ----------
FROM node:18-alpine AS runtime

ENV NODE_ENV=production \
    # Langue par défaut (peut être "fr" ou "en")
    MCP_LANG=fr \
    # Port exposé par l'app (src/index.ts -> 8787 si non défini)
    PORT=8787

WORKDIR /app

# On ne copie que le strict nécessaire pour la prod
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copie des artefacts buildés + fichiers utiles (manifest, locales…)
#COPY --from=builder /app/build ./build
#COPY --from=builder /app/manifest.*.json /app/manifest.template.json ./
#COPY --from=builder /app/locales ./locales
#COPY --from=builder /app/scripts ./scripts

# (Optionnel) Générer le manifest final au démarrage
# RUN npm run generate:manifest

EXPOSE 8787

# Lancement en mode stdio (endpoint /mcp)
# Équivalent à: npm run start:stdio ; could also be start:http if redis server present
#CMD ["node", "build/stdio.js", "--stdio"]

# Lancement en mode HTTP (endpoint /mcp)
# Équivalent à: npm run start:stdio ; could also be start:http if redis server present
CMD ["node", "build/index.js", "--http"]
