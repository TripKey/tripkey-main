# TripKey Kubernetes 매니페스트

이 디렉터리는 TripKey 서비스를 EKS에서 실행하기 위한 Kubernetes 매니페스트를 담고 있다.

## 구성 범위

- `frontend`: React/Vite 정적 파일을 Nginx로 서빙한다.
- `backend`: Spring Boot API 서버다.
- `ai-engine`: FastAPI 기반 AI 서비스다.
- `ai-worker`: 현재는 backend 이미지를 재사용한다. SQS listener와 outbox relay가 Spring Boot 앱 안에 있기 때문이다.

Secret과 ConfigMap의 실제 값은 이 매니페스트에 포함하지 않는다. Deployment에서는 아래 리소스를 참조하는 위치만 정의한다.

- `tripkey-config`
- `tripkey-secrets`

실제 key 목록과 값은 별도 Secret/ConfigMap 관리 이슈에서 다룬다. 새 클러스터에 배포할 때는 Pod를 띄우기 전에 `tripkey` namespace에 위 두 리소스를 먼저 만들어야 한다.

## 이미지

`kustomization.yaml`에서 현재 TripKey ECR 저장소를 바라보도록 설정한다.

- `400524748280.dkr.ecr.ap-northeast-2.amazonaws.com/tripkey-frontend:latest`
- `400524748280.dkr.ecr.ap-northeast-2.amazonaws.com/tripkey-backend:latest`
- `400524748280.dkr.ecr.ap-northeast-2.amazonaws.com/tripkey-ai-engine:latest`

운영 CD에서는 직접 manifest의 image 값을 손으로 고치기보다 `kubectl set image` 또는 `kustomize edit set image`로 배포 job의 태그를 주입하는 방식을 권장한다.

## 공개 라우팅

`ingress.yaml`은 AWS Load Balancer Controller 기준으로 작성되어 있다.

- Host: `usetripkey.com`
- ACM 인증서: `arn:aws:acm:ap-northeast-2:400524748280:certificate/7dd0095e-542b-4bc5-a965-8fb7f5083c8c`
- HTTP 80은 HTTPS 443으로 redirect한다.
- `/api/*`는 backend Service로 라우팅한다.
- `/*`는 frontend Service로 라우팅한다.

Spring Boot backend는 `/v1` context path로 동작하고, frontend는 `/api`로 API를 호출한다. 따라서 Ingress에서 `/api/...` 요청을 backend로 보내기 전에 `/v1/...`로 rewrite한다.

Ingress 적용 후 생성된 ALB DNS 이름은 아래 명령으로 확인한다.

```bash
kubectl -n tripkey get ingress tripkey
```

Route53에서는 `usetripkey.com`의 `A` Alias record가 이 ALB를 바라보도록 설정한다.

## 적용 순서

```bash
kubectl apply -k infra/k8s/
```

frontend Nginx 이미지 안에도 `/api` proxy fallback이 남아 있을 수 있지만, EKS 운영 환경의 외부 트래픽은 기본적으로 ALB Ingress에서 먼저 라우팅한다.

## Secret / ConfigMap 주의사항

`tripkey-config`와 `tripkey-secrets`의 실제 값은 이 디렉터리의 YAML에 커밋하지 않는다. 특히 DB URL, API key, Supabase key는 Kubernetes Secret 또는 별도 Secret 관리 도구에서 주입한다.

Supabase pooler를 사용하는 경우 `SUPABASE_DB_URL`에는 PostgreSQL JDBC 옵션 `prepareThreshold=0`을 포함해야 한다.

예시:

```text
jdbc:postgresql://.../postgres?prepareThreshold=0
```

이미 다른 query parameter가 있다면 `?` 대신 `&`로 이어 붙인다.

```text
jdbc:postgresql://.../postgres?sslmode=require&prepareThreshold=0
```

이 옵션이 없으면 Spring/JPA가 DB 쿼리를 처리할 때 Supabase pooler와 PostgreSQL JDBC의 서버 사이드 prepared statement가 충돌할 수 있다. 운영에서 다음과 같은 오류가 발생하면 이 설정을 먼저 확인한다.

```text
ERROR: prepared statement "S_1" already exists
ERROR: prepared statement "S_1" does not exist
```

현재 EKS 클러스터에는 Secret을 수동으로 patch해서 이 옵션을 반영했다. 하지만 Secret을 다시 만들거나 새 클러스터에 배포할 때는 이 옵션이 빠지지 않도록 주의해야 한다.

## ai-worker

`ai-worker`는 현재 backend 이미지를 재사용한다. SQS listener와 outbox relay가 Spring Boot 애플리케이션 안에 있기 때문이다.

EKS에서는 backend Deployment에 `APP_ROLE=api`, ai-worker Deployment에 `APP_ROLE=ai-worker`를 설정한다. Spring은 이를 `app.role` property로 매핑한다.

- `APP_ROLE=api`: API 서버만 동작한다.
- `APP_ROLE=ai-worker`: SQS consumer와 outbox relay가 동작한다.

`matchIfMissing=true`가 적용되어 있어 로컬 Docker Compose처럼 `APP_ROLE`이 없는 환경에서는 기존 동작을 유지한다.

배포 후 확인 명령:

```bash
kubectl -n tripkey exec deploy/tripkey-backend -- printenv APP_ROLE
kubectl -n tripkey exec deploy/tripkey-ai-worker -- printenv APP_ROLE
kubectl -n tripkey logs deploy/tripkey-backend | grep -i sqs
kubectl -n tripkey logs deploy/tripkey-ai-worker | grep -i sqs
```

backend 로그에는 SQS listener 소비 로그가 없어야 한다. worker 로그에는 메시지가 있을 때 SQS listener 동작 로그가 보여야 한다.

## AWS 사전 준비

새 EKS 클러스터에 적용하기 전에 아래 작업이 필요하다.

1. `ap-northeast-2` 리전에 EKS 클러스터를 생성한다.
2. TripKey Pod를 실행할 managed node group 또는 Fargate profile을 구성한다.
3. 클러스터 OIDC provider를 연결한다.
4. AWS Load Balancer Controller와 필요한 IAM 권한을 설치한다.
5. HPA 사용을 위해 `metrics-server`를 설치한다.
6. Docker 이미지를 ECR에 push한다.
7. `tripkey` namespace에 `tripkey-config`, `tripkey-secrets`를 생성한다.
8. `kubectl apply -k infra/k8s/`로 매니페스트를 적용한다.
9. Route53에서 `usetripkey.com` Alias record가 Ingress로 생성된 ALB를 바라보도록 설정한다.

Ingress 도입 전에 수동으로 만든 ALB가 있더라도, EKS 운영 환경에서는 AWS Load Balancer Controller가 생성한 ALB를 사용하는 것을 권장한다. 기존 ALB를 재사용하려면 TargetGroupBinding 등 추가 구성이 필요해서 초기 운영 구성에는 적합하지 않다.

## 오토스케일링

현재 HPA 설정은 다음과 같다.

- `tripkey-backend`: 2~6 replicas, CPU 65%.
- `tripkey-ai-engine`: 2~8 replicas, CPU 60% 또는 memory 70%.
- `tripkey-ai-worker`: 1~5 replicas, CPU 50%.

HPA가 동작하려면 EKS 클러스터에 `metrics-server`가 설치되어 있어야 한다.

현재 worker HPA는 CPU 기준의 초기 구성이다. 운영이 안정화된 뒤에는 SQS queue depth 기반으로 KEDA를 붙이는 구성을 후속 작업으로 검토할 수 있다.

## 검증

로컬 dry-run:

```bash
kubectl apply --dry-run=client -k infra/k8s/
```

렌더링 결과 확인:

```bash
kubectl kustomize infra/k8s/
```

배포 후 기본 상태 확인:

```bash
kubectl -n tripkey get pods
kubectl -n tripkey get ingress
kubectl -n tripkey get hpa
```
