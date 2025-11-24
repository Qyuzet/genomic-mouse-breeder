# DEPLOYMENT GUIDE - MOUSE BREEDING SIMULATOR API

## LOCAL DEVELOPMENT

### Prerequisites

- Python 3.9 or higher
- pip (Python package manager)
- Git

### Setup Steps

1. Clone repository:

```bash
git clone <repository-url>
cd mouse-breeding/backend
```

2. Create virtual environment (recommended):

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Run server:

```bash
python run.py
```

5. Access API:

- API: http://localhost:8000
- Interactive Docs: http://localhost:8000/docs
- Alternative Docs: http://localhost:8000/redoc

### Testing

Run test suite:

```bash
python test_api.py
```

### Environment Variables

Create `.env` file (optional):

```bash
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=true
```

---

## PRODUCTION DEPLOYMENT

### OPTION 1: DOCKER

1. Create Dockerfile:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["python", "run.py"]
```

2. Build image:

```bash
docker build -t mouse-breeding-api .
```

3. Run container:

```bash
docker run -d -p 8000:8000 --name mouse-api mouse-breeding-api
```

4. Check logs:

```bash
docker logs mouse-api
```

### OPTION 2: SYSTEMD SERVICE (Linux)

1. Create service file `/etc/systemd/system/mouse-breeding-api.service`:

```ini
[Unit]
Description=Mouse Breeding Simulator API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/mouse-breeding/backend
Environment="PATH=/var/www/mouse-breeding/backend/venv/bin"
ExecStart=/var/www/mouse-breeding/backend/venv/bin/python run.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

2. Enable and start service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable mouse-breeding-api
sudo systemctl start mouse-breeding-api
```

3. Check status:

```bash
sudo systemctl status mouse-breeding-api
```

### OPTION 3: NGINX REVERSE PROXY

1. Install Nginx:

```bash
sudo apt install nginx
```

2. Create Nginx config `/etc/nginx/sites-available/mouse-breeding-api`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

3. Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/mouse-breeding-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. Add SSL with Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### OPTION 4: CLOUD PLATFORMS

#### Railway

1. Install Railway CLI:

```bash
npm install -g @railway/cli
```

2. Login and deploy:

```bash
railway login
railway init
railway up
```

#### Render

1. Create `render.yaml`:

```yaml
services:
  - type: web
    name: mouse-breeding-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: python run.py
```

2. Connect GitHub repository and deploy.

#### Heroku

1. Create `Procfile`:

```
web: python run.py
```

2. Deploy:

```bash
heroku create mouse-breeding-api
git push heroku main
```

---

## PRODUCTION CONFIGURATION

### Security

1. Update CORS settings in `app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Specific origins
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

2. Add authentication (JWT):

```bash
pip install python-jose[cryptography] passlib[bcrypt]
```

3. Add rate limiting:

```bash
pip install slowapi
```

### Database

For production, migrate from SQLite to PostgreSQL:

1. Install PostgreSQL:

```bash
sudo apt install postgresql postgresql-contrib
```

2. Update `database.py`:

```python
DATABASE_URL = "postgresql://user:password@localhost/mouse_breeding"
```

3. Install driver:

```bash
pip install psycopg2-binary
```

### Monitoring

1. Add logging:

```python
import logging
logging.basicConfig(level=logging.INFO)
```

2. Add health checks:

```bash
curl http://localhost:8000/health
```

3. Monitor with tools:

- Prometheus + Grafana
- Sentry for error tracking
- New Relic for APM

---

## TROUBLESHOOTING

### Port already in use

```bash
# Find process using port 8000
lsof -i :8000
# Kill process
kill -9 <PID>
```

### Database locked

```bash
# Remove database file
rm mouse_breeding.db
# Restart server
python run.py
```

### Import errors

```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### CORS errors

Update `allow_origins` in `app/main.py` to include your frontend URL.

---

## PERFORMANCE TUNING

### Increase workers

```bash
uvicorn app.main:app --workers 4 --host 0.0.0.0 --port 8000
```

### Enable caching

```bash
pip install redis
```

### Database connection pooling

```python
engine = create_engine(DATABASE_URL, pool_size=20, max_overflow=0)
```

---

## BACKUP

### Database backup

```bash
# SQLite
cp mouse_breeding.db mouse_breeding_backup.db

# PostgreSQL
pg_dump mouse_breeding > backup.sql
```

### Restore

```bash
# SQLite
cp mouse_breeding_backup.db mouse_breeding.db

# PostgreSQL
psql mouse_breeding < backup.sql
```

---

## SCALING

### Horizontal scaling

Use load balancer (Nginx, HAProxy) with multiple API instances.

### Vertical scaling

Increase server resources (CPU, RAM).

### Database scaling

- Read replicas for PostgreSQL
- Connection pooling
- Query optimization

---

## TECHNICAL SUPPORT

For troubleshooting and support:

1. Review server logs for error messages
2. Consult interactive API documentation at /docs
3. Check GitHub repository issues
4. Refer to API_DOCUMENTATION.md for detailed specifications
