# Kranos Gym - Docker Setup

## Quick Start

### 1. Copy environment variables
```bash
cp .env.example .env
```

### 2. Edit .env file
Update the JWT secrets with secure values:
```bash
# Generate secure secrets
openssl rand -base64 32  # Use this for JWT_SECRET
openssl rand -base64 32  # Use this for JWT_REFRESH_SECRET
```

### 3. Build and run with Docker Compose

#### Production mode:
```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

#### Development mode (with hot reload):
```bash
# Start development container
docker-compose -f docker-compose.dev.yml up

# In another terminal, you can run commands inside the container
docker-compose -f docker-compose.dev.yml exec kranos-gym-dev npm test
```

## Access the Application

Once running, access the application at:
- **Production**: http://localhost:3000
- **Development**: http://localhost:5173

### Default Login Credentials

- **Admin**: 
  - Username: `pjb`
  - Password: `admin123`
  
- **Trainer**:
  - Username: `niranjan`
  - Password: `trainer123`

- **Members**: 
  - Username: `[firstname+lastname]`
  - Password: `member123`

## Data Persistence

- **Database**: Stored in `./data/kranos.db`
- **Uploads**: Stored in `./static/uploads/`

Both directories are mounted as volumes, so data persists between container restarts.

## Building for Different Environments

### Build only:
```bash
docker build -t kranos-gym .
```

### Run with custom settings:
```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/static/uploads:/app/static/uploads \
  -e JWT_SECRET=your-secret \
  -e JWT_REFRESH_SECRET=your-refresh-secret \
  kranos-gym
```

## Troubleshooting

### Check container status:
```bash
docker-compose ps
```

### View logs:
```bash
docker-compose logs kranos-gym
```

### Access container shell:
```bash
docker-compose exec kranos-gym sh
```

### Reset database:
```bash
# Stop container
docker-compose down

# Remove database
rm -rf ./data

# Restart (will create fresh database)
docker-compose up -d
```

## Health Check

The application includes a health check endpoint:
```bash
curl http://localhost:3000/api/health
```

## Security Notes

1. Always change the default passwords after first login
2. Use strong JWT secrets in production
3. Consider using HTTPS with a reverse proxy for production deployments
4. Regularly backup the `./data` directory