# The builder runner
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json .
RUN npm install

# Build the app
COPY . .
RUN npm run build

# The production runner
FROM node:18-alpine AS production
WORKDIR /app

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

# Copy the required files
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build

# Run the app
CMD ["npm", "run", "start"]