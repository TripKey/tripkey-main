# TripKey Production Compose Runbook

## 범위

이 문서는 AWS EC2 같은 단일 호스트에서 Docker Compose로 TripKey production
구성을 배포하는 절차를 다룹니다. 데이터베이스는 별도 RDS가 아니라 현재 사용 중인
Supabase 관리형 PostgreSQL을 사용합니다.

## 사전 준비

- 호스트에 Docker와 Docker Compose가 설치되어 있어야 합니다.
- Supabase schema가 이미 적용되어 있어야 합니다.
- 호스트에 필요한 env 파일이 있어야 합니다.
  - `apps/backend/.env`
  - `apps/ai-engine/.env`
- EC2 Security Group에서 필요한 접속 범위에 대해 TCP `80` inbound가 열려 있어야 합니다.

실제 env 파일이나 secret 값은 커밋하지 않습니다.

## EC2 호스트 설정

Amazon Linux 2023:

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
docker compose version
```

Ubuntu:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
docker compose version
```

## 코드 체크아웃

```bash
git clone <REPO_URL> tripkey-main
cd tripkey-main
git checkout chore/78-aws-prod-compose
```

## Backend 필수 Env

```env
SPRING_PROFILES_ACTIVE=prod
SUPABASE_DB_URL=
SUPABASE_DB_USERNAME=
SUPABASE_DB_PASSWORD=
AI_ENGINE_URL=http://tripkey-ai-engine:8000
AI_ENGINE_TIMEOUT_SECONDS=90
```

## AI Engine 필수 Env

```env
GEMINI_API_KEY=
GOOGLE_MAPS_API_KEY=
AI_ENGINE_WORKERS=2
```

EC2 호스트에서 직접 파일을 만들거나, 팀에서 사용하는 secret 관리 경로를 통해
복사합니다. 파일 위치 예시는 다음과 같습니다.

```bash
vi apps/backend/.env
vi apps/ai-engine/.env
chmod 600 apps/backend/.env apps/ai-engine/.env
```

## 실행

실행 전 dev compose와 prod compose가 병합된 최종 설정을 확인합니다.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

기본적으로 host port를 외부에 공개하는 컨테이너는 frontend뿐입니다.

- `frontend`: `80:80`
- `backend`: Docker 내부 네트워크에서만 접근 가능
- `ai-engine`: Docker 내부 네트워크에서만 접근 가능

frontend nginx 컨테이너는 `/api/*` 요청을 `backend:8080/v1/*`로 프록시합니다.

컨테이너 상태를 확인합니다.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

## 로그

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

서비스별 로그는 다음 명령으로 확인합니다.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f ai-engine
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f frontend
```

## 중지

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```

## Smoke Test

EC2 호스트 내부에서 frontend 응답을 확인합니다.

```bash
curl http://localhost/
```

frontend proxy를 통해 backend API 응답을 확인합니다.

```bash
curl -G 'http://localhost/api/trips/destinations/search' --data-urlencode 'q=도쿄'
```

API 요청이 실패하면 backend와 frontend 로그를 먼저 확인합니다.

로컬 PC에서는 `<EC2_PUBLIC_IP>`를 실제 EC2 public IP로 바꿔서 확인합니다.

```bash
curl http://<EC2_PUBLIC_IP>/
curl -G 'http://<EC2_PUBLIC_IP>/api/trips/destinations/search' --data-urlencode 'q=도쿄'
```

backend와 ai-engine이 EC2 외부에서 직접 접근되지 않는지 확인합니다.

```bash
curl --connect-timeout 5 http://<EC2_PUBLIC_IP>:8080/v1/trips/destinations/search?q=health
curl --connect-timeout 5 http://<EC2_PUBLIC_IP>:8000/health
```

두 외부 직접 접근 요청은 실패하거나 timeout이 발생해야 정상입니다. 둘 중 하나라도
성공하면 해당 inbound Security Group rule을 제거하고, `docker-compose.prod.yml`에서
`backend` 또는 `ai-engine` port가 publish되고 있지 않은지 확인합니다.

Smoke test 기대 결과:

- `http://<EC2_PUBLIC_IP>/`에서 frontend HTML이 응답됩니다.
- `/api/trips/destinations/search`에서 JSON 목적지 검색 응답이 반환됩니다.
- EC2 외부에서 `:8080`으로 직접 접근할 수 없습니다.
- EC2 외부에서 `:8000`으로 직접 접근할 수 없습니다.

이슈 코멘트 예시:

```md
EC2 production compose 배포 및 smoke test를 완료했습니다.

확인한 내용:
- `http://<EC2_PUBLIC_IP>/`에서 frontend HTML 응답 확인
- `/api/trips/destinations/search?q=도쿄`가 frontend nginx proxy를 통해 정상 응답
- Backend는 외부에서 `:8080`으로 직접 접근 불가
- AI engine은 외부에서 `:8000`으로 직접 접근 불가

이번 이슈 범위 제외:
- RDS
- S3
```

## 테스트 인스턴스 정리

임시 smoke test용 EC2 인스턴스라면 검증 후 stop 또는 terminate합니다.

애플리케이션만 내리고 인스턴스는 유지하려면 다음 명령을 실행합니다.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```

그 다음 AWS 콘솔 또는 CLI에서 EC2 인스턴스를 stop합니다. Stop하면 EBS volume과 env
파일은 유지되지만, Elastic IP를 사용하지 않는 경우 public IP가 바뀔 수 있습니다.

인스턴스를 다시 사용할 계획이 없다면 terminate합니다. Root EBS volume 삭제 설정이
켜져 있다면 terminate 시 인스턴스와 env 파일이 함께 삭제됩니다.
