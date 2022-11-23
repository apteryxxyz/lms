FROM node:18-alpine
WORKDIR /app

# Install dotnet
# COPY ./scripts scripts
# RUN chmod +x ./scripts/dotnet-install.sh
# RUN ./scripts/dotnet-install.sh -c Current
# RUN apk add \
#     bash \
#     icu-libs \
#     krb5-libs \
#     libgcc \
#     libintl \
#     libssl1.1 \
#     libstdc++ zlib

# Install chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Ensure puppeteer use the already installed chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install pnpm
RUN npm install -g pnpm; \
   pnpm --version; \
   pnpm setup; \
   mkdir -p /usr/local/share/pnpm &&\
   export PNPM_HOME="/usr/local/share/pnpm" &&\
   export PATH="$PNPM_HOME:$PATH"; \
   pnpm bin -g

# Prepare start script
CMD ["pnpm", "start"]

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the app
COPY . .
RUN pnpm build