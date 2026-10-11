FROM node:24-alpine
# Corepack resolves pnpm from the root package.json "packageManager" field, so
# the version stays in one place instead of drifting against a hardcoded pin.
RUN corepack enable
# The root `prepare` script installs git hooks (`vp config`); the image has no
# git, and that step fails without it rather than skipping as Husky did.
ENV VP_GIT_HOOKS=0
# Puppeteer (PDF export) needs a system Chromium on Alpine — its own bundled
# Chromium is glibc-only and won't run under musl. font-noto-hebrew is required
# for Hebrew PDFs to render actual glyphs instead of tofu boxes.
RUN apk add --no-cache chromium font-noto font-noto-hebrew ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
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
