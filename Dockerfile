FROM node:20-alpine
WORKDIR /app

# Dépendances (express ; puppeteer est en devDependencies -> ignoré)
COPY cockpit_dsi/package.json cockpit_dsi/package-lock.json ./
RUN npm install --omit=dev && npm cache clean --force

# Application cockpit DSI
COPY cockpit_dsi/ ./

# Livrables téléchargeables — servis en /livrables, listés par /api/tree
COPY 01_livrable_principal.pdf ./livrables/
COPY 03_dossier_pmp_refonte_web ./livrables/03_dossier_pmp_refonte_web
COPY 04_referentiel_templates_vides ./livrables/04_referentiel_templates_vides

ENV PORT=3001
EXPOSE 3001
CMD ["node", "server.js"]
