# 🚀 GigShield Deployment Guide

## Environment Setup

### Backend (Django)

1. **Environment Variables**
   ```bash
   # Copy the example file
   cp backend/.env.example backend/.env
   
   # Edit with your values
   DJANGO_SECRET_KEY=your-production-secret-key
   DJANGO_DEBUG=0
   DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
   ```

2. **Database Setup**
   ```bash
   # PostgreSQL recommended for production
   DATABASE_URL=postgresql://user:password@localhost:5432/gigshield
   
   # Run migrations
   python manage.py migrate
   
   # Create superuser
   python manage.py createsuperuser
   ```

3. **Static Files**
   ```bash
   python manage.py collectstatic --noinput
   ```

### Frontend (React)

1. **Environment Variables**
   ```bash
   # Copy the example file
   cp frontend/.env.example frontend/.env.local
   
   # Edit with your production API URL
   VITE_API_BASE=https://api.yourdomain.com
   ```

2. **Build**
   ```bash
   cd frontend
   npm run build
   ```

## Docker Deployment

### Using Docker Compose

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: gigshield
      POSTGRES_USER: gigshield
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://gigshield:${DB_PASSWORD}@db:5432/gigshield
      - DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}
      - DJANGO_DEBUG=0
      - DJANGO_ALLOWED_HOSTS=${DOMAIN}
    depends_on:
      - db
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

## Manual Deployment

### Backend (Gunicorn + Nginx)

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   pip install gunicorn
   ```

2. **Run with Gunicorn**
   ```bash
   gunicorn config.wsgi:application --bind 0.0.0.0:8000
   ```

3. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location /static/ {
           alias /path/to/your/static/files/;
       }
   }
   ```

### Frontend (Nginx)

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Nginx configuration**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       root /path/to/frontend/dist;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location /api {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## Health Checks

### Backend Health Check
```bash
curl http://yourdomain.com/health/
```

### Frontend Health Check
```bash
curl http://yourdomain.com/
```

## Monitoring

### Application Metrics
- Monitor Django admin metrics
- Track claim processing times
- Monitor fraud detection accuracy
- Track API response times

### Database Monitoring
- Monitor connection pool
- Track query performance
- Set up automated backups

## Security Considerations

1. **Environment Variables**: Never commit secrets to git
2. **Database**: Use strong passwords and restrict access
3. **HTTPS**: Enable SSL/TLS in production
4. **CORS**: Restrict to your frontend domain
5. **Rate Limiting**: Implement API rate limiting
6. **Logging**: Set up proper log aggregation

## Scaling Considerations

1. **Backend**: Use multiple Gunicorn workers
2. **Database**: Implement read replicas for scaling
3. **Frontend**: Use CDN for static assets
4. **Load Balancing**: Implement proper load balancing
5. **Caching**: Add Redis for session storage and caching

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL format
   - Verify database is running
   - Check network connectivity

2. **Static Files Not Loading**
   - Run `collectstatic`
   - Check Nginx static file configuration
   - Verify file permissions

3. **CORS Issues**
   - Check CORS settings in Django
   - Verify frontend domain is allowed
   - Check preflight requests

4. **High Memory Usage**
   - Monitor Gunicorn worker count
   - Check for memory leaks
   - Optimize database queries

## Backup Strategy

1. **Database Backups**
   ```bash
   # Daily backup
   pg_dump gigshield > backup_$(date +%Y%m%d).sql
   
   # Automated backup script
   0 2 * * * /path/to/backup_script.sh
   ```

2. **File Backups**
   - Backup static files
   - Backup media uploads
   - Backup configuration files

## Rollback Plan

1. **Database Rollback**
   ```bash
   psql gigshield < backup_20240320.sql
   ```

2. **Code Rollback**
   ```bash
   git checkout previous-stable-tag
   docker-compose up -d --build
   ```

## Performance Optimization

1. **Database Optimization**
   - Add proper indexes
   - Optimize slow queries
   - Use connection pooling

2. **Application Optimization**
   - Implement caching
   - Optimize N+1 queries
   - Use async processing for heavy tasks

3. **Frontend Optimization**
   - Enable code splitting
   - Optimize bundle size
   - Use lazy loading
