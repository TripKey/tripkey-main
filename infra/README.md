## Infra

TripKey의 로컬/운영 배포 리소스를 모아둔 영역입니다.

## 구성

- 루트 `docker-compose.yml`: 공통 서비스/네트워크 정의
- 루트 `docker-compose.dev.yml`: 로컬 개발용 build, volume, LocalStack SQS 설정
- 루트 `docker-compose.prod.yml`: 운영 이미지 실행, healthcheck, logging 설정
- `deploy.sh`: 배포 보조 스크립트
- `DEPLOY_RUNBOOK.md`: 배포 운영 절차
- `k8s/`: Kubernetes base/overlay manifests

프론트 운영 컨테이너는 nginx를 통해 `/api` 요청을 백엔드 `/v1` API로 프록시합니다. 개발 환경에서는 Vite proxy가 같은 역할을 합니다.
