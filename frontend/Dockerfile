# Build stage
FROM node:18-bullseye AS build

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
# Install dependencies (ignoring lockfile to resolve platform mismatch)
RUN rm -f package-lock.json && npm install

# Copy source code (including generated protos in src/proto)
# NOTE: You must run ./generate-proto.sh locally before building this image
# to ensure frontend/src/proto is populated with the latest definitions.
COPY frontend/ .

# Build the Vite app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration for SPA routing
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
