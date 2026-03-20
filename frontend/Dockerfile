# GigShield Frontend Dockerfile
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Build-time API base (Vite embeds this during build)
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S gigshield -u 1001

# Change ownership of nginx directories
RUN chown -R gigshield:nodejs /usr/share/nginx/html
RUN chown -R gigshield:nodejs /var/cache/nginx
RUN chown -R gigshield:nodejs /var/log/nginx
RUN chown -R gigshield:nodejs /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R gigshield:nodejs /var/run/nginx.pid

# Switch to non-root user
USER gigshield

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
