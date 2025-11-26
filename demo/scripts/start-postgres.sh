#!/bin/bash
# Start PostgreSQL for workflow demo

echo "Starting PostgreSQL container..."
docker run -d \
  --name workflow-postgres \
  -e POSTGRES_USER=workflow \
  -e POSTGRES_PASSWORD=workflow \
  -e POSTGRES_DB=workflow_dev \
  -p 5432:5432 \
  postgres:15

echo "Waiting for PostgreSQL to be ready..."
sleep 5

echo "PostgreSQL is ready at localhost:5432"
echo "Database: workflow_dev"
echo "Username: workflow"
echo "Password: workflow"
