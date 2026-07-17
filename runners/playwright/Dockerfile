# Playwright runner (§7). Isolated browser context host behind Browser MCP.
FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY dist ./dist

# One browser context per session; concurrency capped by the caller.
CMD ["node", "dist/index.js"]
