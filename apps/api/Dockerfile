# Optional. Local development uses `pnpm --filter api dev` (see README).
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY dist ./dist
EXPOSE 4000
CMD ["node", "dist/server.js"]
