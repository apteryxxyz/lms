# The builder runner
FROM node:18-alpine
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

# Install dependencies
COPY package.json .
RUN npm install

# Build the app
COPY . .
RUN npm run build

# Run the app
CMD ["npm", "run", "start"]