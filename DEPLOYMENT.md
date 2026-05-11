# Deployment & DevOps Guide

## Local Development Setup

```bash
# 1. Clone and install dependencies
git clone <repo>
cd "Car Parking System"
npm run install:all

# 2. Create .env files for each service
# Copy templates from ENVIRONMENT.md

# 3. Start MongoDB
mongod

# 4. Run all services
npm run dev:all

# 5. Access application
# Frontend: http://localhost:5173
# API Gateway: http://localhost:3000
# Admin: email: admin@parkiq.com, password: password123
```

## Production Deployment

### Option 1: Docker Deployment

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Option 2: Kubernetes Deployment

```yaml
# kubernetes/mongodb.yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb
spec:
  ports:
  - port: 27017
  selector:
    app: mongodb
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:latest
        ports:
        - containerPort: 27017
        volumeMounts:
        - name: data
          mountPath: /data/db
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: mongodb-pvc
```

### Option 3: Manual VM Deployment

```bash
# 1. SSH into server
ssh user@your-server.com

# 2. Install Node.js & npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install MongoDB
sudo apt-get install -y mongodb

# 4. Clone repository
git clone <repo> /opt/parkiq
cd /opt/parkiq

# 5. Install dependencies
npm run install:all

# 6. Create .env files with production values
nano services/user-service/.env

# 7. Start services with PM2
npm install -g pm2
pm2 start "npm run dev:all" --name parkiq
pm2 save
```

## Database Backup & Recovery

### MongoDB Backup

```bash
# Full database backup
mongodump --db parkiq --out ./backups/parkiq-$(date +%Y%m%d)

# Backup with compression
mongodump --db parkiq --archive=parkiq-backup.archive --gzip

# Backup to S3
mongodump --db parkiq --archive | aws s3 cp - s3://backup-bucket/parkiq-$(date +%Y%m%d).archive
```

### MongoDB Restore

```bash
# Restore from directory
mongorestore ./backups/parkiq-20240510

# Restore from archive
mongorestore --archive=parkiq-backup.archive --gzip

# Restore from S3
aws s3 cp s3://backup-bucket/parkiq-latest.archive - | mongorestore --archive --gzip
```

### Automated Daily Backups

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/backups/parkiq"
DATE=$(date +%Y%m%d_%H%M%S)
ARCHIVE="$BACKUP_DIR/parkiq_$DATE.archive.gz"

# Create backup
mongodump --db parkiq --archive | gzip > "$ARCHIVE"

# Upload to S3
aws s3 cp "$ARCHIVE" s3://parkiq-backups/

# Keep only last 30 days
find "$BACKUP_DIR" -name "parkiq_*.archive.gz" -mtime +30 -delete
find "s3://parkiq-backups" -name "parkiq_*.archive.gz" -mtime +30 -delete

# Send notification
echo "Backup completed: $ARCHIVE" | mail -s "ParkIQ Backup" admin@parkiq.com

# Cron job (daily at 2 AM)
# 0 2 * * * /usr/local/bin/backup.sh
```

## Monitoring & Health Checks

### Health Check Endpoint

```bash
# Check API Gateway health
curl http://localhost:3000/health

# Check specific service
curl http://localhost:3001/health

# Response:
# {
#   "success": true,
#   "service": "api-gateway",
#   "status": "healthy",
#   "uptime": 3600,
#   "timestamp": "2024-05-10T10:00:00Z"
# }
```

### Prometheus Monitoring

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'parkiq-services'
    static_configs:
      - targets:
        - 'localhost:3000'  # api-gateway
        - 'localhost:3001'  # user-service
        - 'localhost:3002'  # parking-service
        - 'localhost:3003'  # booking-service
        - 'localhost:3004'  # pricing-service
        - 'localhost:3005'  # payment-service
```

### Alert Rules

```yaml
# alerts.yml
groups:
  - name: parkiq
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: DatabaseDown
        expr: up{job="mongodb"} == 0
        for: 1m
        annotations:
          summary: "MongoDB is down"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1024 / 1024 > 500
        for: 5m
        annotations:
          summary: "High memory usage detected"
```

## Performance Optimization

### Database Indexing

```javascript
// Create indexes for frequently queried fields
db.users.createIndex({ email: 1 })
db.bookings.createIndex({ userId: 1, createdAt: -1 })
db.slots.createIndex({ zone: 1, status: 1 })
db.payments.createIndex({ userId: 1, paidAt: -1 })
```

### Caching Strategy

```javascript
// Redis caching example
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Cache slot statistics
async function getStats() {
  const cached = await client.get('parking:stats');
  if (cached) return JSON.parse(cached);

  const stats = await Slot.aggregate([...]);
  await client.setEx('parking:stats', 300, JSON.stringify(stats)); // 5 min TTL
  return stats;
}
```

### Load Balancing

```nginx
# nginx.conf for load balancing
upstream parkiq_api {
    server localhost:3000;
    server localhost:3000; # Multiple instances
}

server {
    listen 80;
    server_name parkiq.com;

    location / {
        proxy_pass http://parkiq_api;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Security Checklist

- [ ] Enable HTTPS/SSL
- [ ] Set strong JWT secrets
- [ ] Enable database authentication
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Database encryption at rest
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Secrets in environment variables
- [ ] Regular penetration testing
- [ ] WAF (Web Application Firewall) enabled
- [ ] DDoS protection configured
- [ ] Database backups encrypted
- [ ] Audit logging enabled

## Scaling Strategy

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Optimize database queries
- Enable caching

### Horizontal Scaling
- Load balance multiple instances
- Database replication
- Redis cluster
- CDN for static assets

## Troubleshooting

### Service Won't Start
```bash
# Check logs
npm run dev:gateway 2>&1 | tail -100

# Verify port not in use
lsof -i :3000

# Check environment variables
env | grep -i mongo
```

### Database Connection Issues
```bash
# Test MongoDB connection
mongo mongodb://localhost:27017/parkiq

# Check connection string
echo $MONGODB_URI
```

### High Memory Usage
```bash
# Check memory
free -h
ps aux | grep node

# Restart service
pm2 restart parkiq
```

## Support & Maintenance

- Regular security updates: Weekly
- Database optimization: Monthly
- Log rotation: Daily
- Backup verification: Weekly
- Health check monitoring: Continuous
