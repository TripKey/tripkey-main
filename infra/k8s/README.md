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

production:

```bash
kubectl apply -k infra/k8s/overlays/prod
```

staging:

```bash
kubectl apply -k infra/k8s/overlays/staging
```

`infra/k8s/` 루트 kustomization은 기존 명령 호환성을 위해 production overlay를 가리킨다. 신규 작업에서는 환경을 명확히 하기 위해 `overlays/prod` 또는 `overlays/staging` 경로를 직접 사용한다.

frontend Nginx 이미지 안에도 `/api` proxy fallback이 남아 있을 수 있지만, EKS 운영 환경의 외부 트래픽은 기본적으로 ALB Ingress에서 먼저 라우팅한다.

## GitHub Actions 배포

`.github/workflows/deploy.yml`은 branch에 따라 ECR 이미지를 build/push한 뒤 EKS Deployment를 갱신한다.

현재 `tripkey-prod` EKS 클러스터와 `usetripkey.com`은 production 환경으로 간주한다. 따라서 production 배포는 `main` 기준으로만 수행한다.

브랜치별 역할:

- `feature/*`: 기능 작업 브랜치. PR을 통해 CI 검증을 받는다.
- `develop`: staging 배포 브랜치. `tripkey-staging` namespace와 `staging.usetripkey.com`에 반영한다.
- `main`: production 배포 브랜치. `usetripkey.com`에 반영되는 EKS 배포는 이 브랜치 push 기준으로 실행한다.

환경별 배포 대상:

- `develop`: `infra/k8s/overlays/staging`, namespace `tripkey-staging`.
- `main`: `infra/k8s/overlays/prod`, namespace `tripkey`.

배포 흐름:

1. GitHub Actions가 AWS IAM Role을 OIDC로 assume한다.
2. frontend, backend, ai-engine 이미지를 ECR에 push한다.
3. 각 이미지는 `latest`와 `GITHUB_SHA` 태그를 함께 push한다.
4. `kubectl apply -k infra/k8s/`로 매니페스트를 적용한다.
5. `kubectl set image`로 Deployment 이미지를 `GITHUB_SHA` 태그로 갱신한다.
6. `kubectl rollout status`로 rollout 성공 여부를 확인한다.

필요한 GitHub 설정:

- Repository secret
  - `AWS_ROLE_TO_ASSUME`: GitHub Actions가 assume할 AWS IAM Role ARN
- Repository variable 또는 secret
  - `AWS_REGION`: `ap-northeast-2`
  - `EKS_CLUSTER_NAME`: `tripkey-prod`

권장 AWS 권한 구성:

- GitHub OIDC provider를 IAM에 등록한다.
- GitHub Actions용 IAM Role을 만든다.
- 해당 Role에 ECR image push 권한과 EKS cluster 조회 권한을 부여한다.
- EKS Access Entry 또는 `aws-auth` ConfigMap을 통해 해당 IAM Role이 Kubernetes 리소스를 apply/patch/get 할 수 있게 한다.
- IAM Role 신뢰 정책은 production 배포 기준 브랜치인 `main`에서 실행되는 workflow를 허용해야 한다.

이 workflow는 Kubernetes Secret 값을 생성하거나 갱신하지 않는다. 앱 Secret은 기존 EKS `tripkey-secrets`, `tripkey-config`를 계속 사용한다.

기존 EC2 SSM 기반 Docker Compose 배포는 더 이상 수행하지 않는다. `usetripkey.com`이 EKS Ingress ALB를 바라보므로, ECR에 이미지를 push하는 것만으로는 실행 중인 EKS Pod가 바뀌지 않는다. 따라서 workflow에서 `kubectl set image`와 `kubectl rollout status`를 실행해 EKS Deployment를 자동 갱신한다.

### production 배포 후 확인

GitHub Actions가 성공하더라도 운영 관점에서는 새 Pod가 `Running`과 `Ready` 상태가 되었는지 별도로 확인한다. `kubectl apply`와 `kubectl set image`가 성공해도, 애플리케이션이 시작되는 과정에서 DB migration 누락, Secret 값 오류, 외부 서비스 연결 문제로 새 Pod가 `CrashLoopBackOff`가 될 수 있다.

production 배포 후에는 최소한 아래 명령을 확인한다.

```bash
kubectl -n tripkey get deploy
kubectl -n tripkey get pods
kubectl -n tripkey get hpa
curl -i https://usetripkey.com/api/health
```

Kubernetes Deployment는 새 Pod가 정상 기동하지 못하면 기존 Ready Pod를 가능한 한 유지한다. 따라서 서비스가 계속 응답하더라도 rollout이 완전히 성공한 것은 아닐 수 있다. 새 Pod가 실패하는 경우에는 실패한 Pod를 직접 지정해 로그를 확인한다.

```bash
kubectl -n tripkey logs pod/<crashloop-pod-name> --tail=150
```

`kubectl logs deploy/<deployment-name>`은 Deployment에 속한 Pod 중 하나를 선택하므로, 기존 정상 Pod 로그가 보일 수 있다. CrashLoop 원인을 볼 때는 `kubectl get pods`에서 새로 실패한 Pod 이름을 확인한 뒤 직접 조회한다.

## Secret / ConfigMap 주의사항

`tripkey-config`와 `tripkey-secrets`의 실제 값은 이 디렉터리의 YAML에 커밋하지 않는다. 특히 DB URL, API key, Supabase key는 Kubernetes Secret 또는 별도 Secret 관리 도구에서 주입한다.

production과 staging은 namespace가 다르므로 Secret도 따로 만든다.

- production: namespace `tripkey`, Secret `tripkey-secrets`.
- staging: namespace `tripkey-staging`, Secret `tripkey-secrets`.

staging overlay는 non-secret 값만 담은 `tripkey-config` ConfigMap을 생성한다. staging Secret에는 기존 dev/staging Supabase DB와 API key를 넣고, production Secret에는 production Supabase DB와 운영 API key를 넣는다.

Supabase 관련 URL은 용도가 다르므로 혼동하지 않는다.

- `SUPABASE_URL`: Supabase API URL. `https://...supabase.co` 형식이다.
- `SUPABASE_DB_URL`: Spring datasource URL. `jdbc:postgresql://...` 형식이다.

`SUPABASE_DB_URL`에 `https://...supabase.co` 값을 넣으면 PostgreSQL driver가 URL을 인식하지 못해 backend와 ai-worker Pod가 시작되지 않는다.

```text
Driver org.postgresql.Driver claims to not accept jdbcUrl, https://...supabase.co
```

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

Secret 값을 수정한 뒤에는 기존 Pod가 자동으로 새 환경변수를 읽지 않는다. 변경을 반영하려면 Deployment를 재시작한다.

```bash
kubectl -n tripkey rollout restart deployment/tripkey-backend
kubectl -n tripkey rollout restart deployment/tripkey-ai-worker
```

## DB migration 운영 규칙

production 프로필의 Spring Boot backend는 Hibernate `ddl-auto=validate`를 사용한다. 앱 코드가 기대하는 테이블 또는 컬럼이 DB에 없으면 애플리케이션이 시작되지 않고 Pod가 `CrashLoopBackOff` 상태가 된다.

예시:

```text
Schema-validation: missing column [distance_meters] in table [route_legs_cache]
```

따라서 DB schema 변경이 포함된 배포는 아래 순서를 따른다.

1. migration SQL을 PR에 포함한다.
2. staging DB에 migration을 먼저 적용한다.
3. staging 배포와 smoke test를 통과시킨다.
4. production DB에 같은 migration을 적용한다.
5. `main` 배포를 진행한다.
6. production Pod 상태와 `/api/health`를 확인한다.

현재 migration 파일의 기준 위치는 `shared/docs/migrations/`이다. Supabase 실제 스키마를 직접 수정했다면 동일한 변경을 migration 파일에도 남겨 코드 기준 스키마와 실제 DB 스키마가 벌어지지 않게 한다.

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

### staging 사전 준비

`develop` branch에서 staging 배포를 실행하기 전에 AWS에서 아래 항목을 준비한다.

1. ACM 인증서가 `staging.usetripkey.com`을 포함하는지 확인한다.
   - 기존 인증서에 `*.usetripkey.com` 또는 `staging.usetripkey.com`이 있어야 한다.
   - 현재 인증서가 `usetripkey.com`, `www.usetripkey.com`만 포함한다면 staging용 ACM 인증서를 새로 발급하거나 SAN을 추가한 인증서로 교체해야 한다.
2. staging Ingress가 생성한 ALB DNS 이름을 확인한다.
3. Route53에서 `staging.usetripkey.com` A Alias record를 staging ALB로 연결한다.
4. `tripkey-staging` namespace에 `tripkey-secrets`를 생성한다.
5. staging SQS queue와 DLQ를 생성한다.
   - `tripkey-staging-enrichment`
   - `tripkey-staging-enrichment-dlq`
6. ai-worker IAM Role 또는 SQS policy가 staging queue에 접근할 수 있게 권한을 추가한다.

staging은 production과 별도 ALB를 사용한다. 운영 초기에는 비용보다 격리와 장애 원인 추적을 우선한다.

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
kubectl apply --dry-run=client -k infra/k8s/overlays/prod
kubectl apply --dry-run=client -k infra/k8s/overlays/staging
```

렌더링 결과 확인:

```bash
kubectl kustomize infra/k8s/overlays/prod
kubectl kustomize infra/k8s/overlays/staging
```

배포 후 기본 상태 확인:

```bash
kubectl -n tripkey get pods
kubectl -n tripkey get ingress
kubectl -n tripkey get hpa
```
