# Tiangong LCA Self-Hosting Guide

This document provides instructions for self-hosting the Tiangong LCA application using Docker. The setup includes both the Tiangong LCA Next application and a complete Supabase backend.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- Git
- At least 4GB of RAM available for Docker
- At least 10GB of free disk space
- Basic knowledge of terminal/command line operations

## Installation

### 1. Clone the Repository

```bash
TODO: change the repo url to your own
git clone https://github.com/Biaoo/tiangong-lca-next.git
cd tiangong-lca-next
```

### 2. Configure Environment Variables

```bash
cd docker
cp .env.example .env
```

Edit the `.env` file to set your configuration:

Important variables to configure:

- `POSTGRES_PASSWORD`: Set a strong password for your PostgreSQL database
- `JWT_SECRET`: Set a secure JWT secret (at least 32 characters)
- `ANON_KEY` and `SERVICE_ROLE_KEY`: JWT tokens for Supabase authentication
- `DASHBOARD_USERNAME` and `DASHBOARD_PASSWORD`: Credentials for the Supabase dashboard
- `SMTP_*`: Email configuration must be set to enable email authentication
- `POOLER_TENANT_ID`: The tenant ID for the Pooler service

### 3. Start the Services

```bash
# Start all services
docker compose up -d
```

This will start the following services:

- Tiangong LCA Next application
- Supabase services (PostgreSQL, Auth, REST API, Realtime, Storage, etc.)
- Supporting services (Vector, Imgproxy, etc.)

### 4. Access the Application

Once all services are running, you can access:

- **Tiangong LCA Application**: http://localhost:8000

  - Default User
    - Email: admin@tiangong.earth
    - Password: TianGongAdmin

- **Supabase Studio**: http://localhost:54321
- **Postgres**:
  - For session-based connections (equivalent to direct Postgres connections):
    ```bash
    psql 'postgres://postgres.your-tenant-id:your-super-secret-and-long-postgres-password@localhost:5432/postgres'
    ```
  - For pooled transactional connections:
    ```bash
    psql 'postgres://postgres.your-tenant-id:your-super-secret-and-long-postgres-password@localhost:6543/postgres'
    ```
- See the [Supabase Documentation](https://supabase.com/docs/guides/self-hosting/docker#accessing-postgres) for more information on how to use the Supabase Studio and Postgres.

## Docker Service Management

### Starting Services

There are several ways to start the Docker services:

```bash
# Start all services in detached mode (run in background)
docker compose up -d

# Start all services and see logs in terminal
docker compose up
```

### Stopping Services

```bash
# Stop all services but keep containers
docker compose stop

# Stop all services and remove containers
docker compose down

# Stop all services, remove containers, and delete volumes (WARNING: This will delete all data)
docker compose down -v
```

### Restarting Services

```bash
# Restart all services
docker compose restart
```

### Checking Service Status

```bash
# List all services and their status
docker compose ps

# Check detailed status of a specific service
docker compose ps app

# Check resource usage of all services
docker stats
```

### Rebuilding Services

If you've made changes to the application code:

```bash
# Rebuild and restart the app service
docker compose up -d --build app

# Rebuild all services
docker compose up -d --build
```

## Configuration Options

### Edge Functions

The setup includes support for Supabase Edge Functions. Functions are stored in the `docker/volumes/functions` directory.

To synchronize edge functions from an external repository:

```bash
# Create a temporary directory
mkdir -p temp_repo

# Clone the edge functions repository
git clone --depth 1 https://github.com/linancn/tiangong-lca-edge-functions.git temp_repo

# Copy edge functions to the Docker volumes directory
mkdir -p docker/volumes/functions
cp -r temp_repo/supabase/functions/* docker/volumes/functions/

# Copy edge functions to the local Supabase directory
cp -r temp_repo/supabase/functions/* supabase/functions/

# Clean up
rm -rf temp_repo
```

## Maintenance

### Updating

To update the services:

```bash
# Pull the latest images
docker compose pull

# Restart the services
docker compose up -d
```

### Backup

To backup your PostgreSQL database:

```bash
# Create a backup of the PostgreSQL database
docker exec -t supabase-db pg_dumpall -c -U postgres > backup_$(date +%Y-%m-%d_%H-%M-%S).sql
```

### Restore

To restore from a backup:

```bash
# Stop the services
docker compose down

# Reset the database volume
rm -rf ./volumes/db/data

# Start the database service
docker compose up -d db

# Wait for the database to be ready
sleep 10

# Restore from backup
cat your_backup_file.sql | docker exec -i supabase-db psql -U postgres

# Start all services
docker compose up -d
```

### Reset Environment

If you need to completely reset your environment:

```bash
# Run the reset script
./reset.sh
```

This will:

1. Stop and remove all containers
2. Delete all data volumes
3. Reset the `.env` file to defaults

## Troubleshooting

### Common Issues

#### Services Not Starting

Check the logs for errors:

```bash
docker compose logs
```

For specific service logs:

```bash
docker compose logs app
docker compose logs db
```

#### Database Connection Issues

Ensure the database is running and healthy:

```bash
docker compose ps db
```

Check database logs:

```bash
docker compose logs db
```

### Viewing Logs

```bash
# View all logs
docker compose logs -f

# View logs for a specific service
docker compose logs -f app
docker compose logs -f db
docker compose logs -f auth
```

## Security Considerations

For production deployments, consider the following security measures:

1. **Change Default Credentials**: Update all default passwords and keys in the `.env` file
2. **Use HTTPS**: Configure a reverse proxy with SSL/TLS for secure connections
3. **Restrict Access**: Use firewall rules to limit access to your services
4. **Regular Backups**: Implement a regular backup strategy
5. **Updates**: Keep your Docker images and host system updated

## Additional Resources

- [TianGong LCA Next Project](https://github.com/linancn/tiangong-lca-next)
- [TianGong LCA Platform Website](https://lca.tiangong.earth/welcome)
- [Supabase Documentation](https://supabase.com/docs)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
