#!/bin/bash
set -euo pipefail

APP_DIR="/home/ec2-user/tripkey-main"
COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.prod.yml)

cd "$APP_DIR"

echo "Deploy directory: $APP_DIR"

if [ ! -f .env ]; then
  echo "Missing required .env file: $APP_DIR/.env" >&2
  exit 1
fi

echo "Loading deploy environment"
set -a
source .env
set +a

: "${ECR_REGISTRY:?ECR_REGISTRY is required in $APP_DIR/.env}"

AWS_REGION="${AWS_REGION:-ap-northeast-2}"
DEPLOY_BRANCH="fix/cd-remove-build-flag"

echo "Logging in to ECR: $ECR_REGISTRY"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

# echo "Pulling branch: $DEPLOY_BRANCH"
git pull origin "${DEPLOY_BRANCH:-fix/cd-remove-build-flag}"

echo "Pulling compose images"
ECR_REGISTRY="$ECR_REGISTRY" docker compose "${COMPOSE_FILES[@]}" pull

echo "Starting compose services"
ECR_REGISTRY="$ECR_REGISTRY" docker compose "${COMPOSE_FILES[@]}" up -d
