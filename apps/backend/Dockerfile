FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma/
COPY apps/backend/prisma.config.ts ./apps/backend/

RUN pnpm install --frozen-lockfile --filter backend...

COPY apps/backend/src ./apps/backend/src
COPY apps/backend/tsconfig.json apps/backend/tsconfig.build.json ./apps/backend/
COPY apps/backend/nest-cli.json ./apps/backend/

RUN pnpm --filter backend build && \
  find apps/backend/dist/generated -name "*.js" -exec \
  sed -i 's/require("\([^"]*\)\.ts")/require("\1.js")/g' {} \;

EXPOSE 3000
WORKDIR /app/apps/backend

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node_modules/.bin/ts-node --transpile-only prisma/seed.ts && node dist/main.js"]
