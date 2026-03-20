# GigShield Frontend Deployment Guide

This guide covers deploying the GigShield frontend to production environments.

## Prerequisites

- Node.js 18+ and npm installed
- Access to the backend API endpoints
- Web server (nginx, Apache, Vercel, Netlify, etc.)

## Build Process

### Option 1: Using Deployment Scripts

#### Windows
```bash
deploy.bat
```

#### Linux/macOS
```bash
chmod +x deploy.sh
./deploy.sh
```

### Option 2: Manual Build

```bash
# Install dependencies
npm ci --only=production

# Run tests (if available)
npm test

# Build for production
npm run build

# Preview the build
npm run preview
```

## Deployment Options

### 1. Static Hosting (Vercel, Netlify, GitHub Pages)

The build output in `dist/` can be deployed to any static hosting service.

#### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Netlify Deployment
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

### 2. Traditional Web Server (nginx/Apache)

#### nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    # Handle SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

#### Apache Configuration
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/dist
    
    # Handle SPA routing
    <Directory "/path/to/dist">
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Proxy API requests
    ProxyPreserveHost On
    ProxyPass /api http://localhost:8000
    ProxyPassReverse /api http://localhost:8000
</VirtualHost>
```

### 3. Docker Deployment

Create a `Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /api {
            proxy_pass http://backend:8000;
        }
    }
}
```

Build and run:
```bash
docker build -t gigshield-frontend .
docker run -p 80:80 gigshield-frontend
```

## Environment Configuration

### Backend API URL

Update the API URL in `frontend/src/services/api.ts`:

```typescript
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-api-domain.com' 
  : 'http://localhost:8000';
```

### Environment Variables

Create `.env.production`:
```
VITE_API_BASE_URL=https://your-api-domain.com
VITE_APP_ENV=production
```

## Performance Optimization

### Build Optimizations

The Vite configuration includes:
- Code splitting (vendor, router chunks)
- Terser minification
- Source maps for debugging
- Chunk size warnings

### Additional Optimizations

1. **Enable CDN for static assets**
2. **Configure browser caching**
3. **Enable HTTP/2**
4. **Use Brotli compression**

### Monitoring

Set up monitoring for:
- Core Web Vitals
- Error tracking
- Performance metrics
- User analytics

## Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **CORS**: Configure proper CORS headers on backend
3. **Content Security Policy**: Implement CSP headers
4. **Dependencies**: Regularly update and audit dependencies

## Troubleshooting

### Common Issues

1. **Blank page on refresh**: Ensure SPA routing is configured
2. **API errors**: Check CORS and proxy configuration
3. **Build failures**: Verify Node.js version and clear npm cache
4. **Slow loading**: Check bundle size and enable compression

### Debug Steps

1. Check browser console for errors
2. Verify network requests in DevTools
3. Test API endpoints separately
4. Check server logs

## Deployment Checklist

- [ ] Dependencies installed (`npm ci --only=production`)
- [ ] Tests passing (`npm test`)
- [ ] Build successful (`npm run build`)
- [ ] Environment variables configured
- [ ] API endpoints accessible
- [ ] SPA routing configured
- [ ] HTTPS enabled
- [ ] Performance monitoring setup
- [ ] Error tracking configured
- [ ] Backup strategy in place

## Post-Deployment

1. **Monitor performance** using tools like Lighthouse
2. **Check Core Web Vitals** in Google Search Console
3. **Set up alerts** for errors and downtime
4. **Regular updates** for dependencies
5. **Backup strategy** for quick rollbacks
