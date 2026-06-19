# TripKey Kubernetes Manifests

This directory contains the first EKS-ready Kubernetes manifests for TripKey.

## Scope

- `frontend`: React/Vite static app served by Nginx.
- `backend`: Spring Boot API service.
- `ai-engine`: FastAPI AI service.
- `ai-worker`: initial worker deployment using the backend image because SQS listeners currently live in the Spring Boot app.

Secret and ConfigMap object definitions are intentionally excluded from this issue. Deployments only keep placeholder references to:

- `tripkey-config`
- `tripkey-secrets`

Expected keys are documented in each app's `.env.example` file. Create those objects in a separate secret/config issue before rolling pods in EKS.

## Image Tags

The manifests target the current TripKey ECR repositories through `kustomization.yaml`:

- `400524748280.dkr.ecr.ap-northeast-2.amazonaws.com/tripkey-frontend:latest`
- `400524748280.dkr.ecr.ap-northeast-2.amazonaws.com/tripkey-backend:latest`
- `400524748280.dkr.ecr.ap-northeast-2.amazonaws.com/tripkey-ai-engine:latest`

In CI/CD, prefer `kubectl set image` or `kustomize edit set image` so the image tag comes from the deploy job, not from handwritten manifest edits.

## Public Routing

`ingress.yaml` is configured for AWS Load Balancer Controller:

- Host: `usetripkey.com`
- ACM certificate: `arn:aws:acm:ap-northeast-2:400524748280:certificate/7dd0095e-542b-4bc5-a965-8fb7f5083c8c`
- HTTP 80 redirects to HTTPS 443.
- `/api/*` routes directly to the backend Service.
- `/*` routes to the frontend Service.

The backend Spring app serves under `/v1`, while the frontend calls `/api`. The Ingress rewrites `/api/...` to `/v1/...` before forwarding to the backend target group.

After applying the Ingress, get the generated ALB DNS name:

```bash
kubectl -n tripkey get ingress tripkey
```

Then create a Route53 `A` Alias record for `usetripkey.com` pointing to that ALB.

## Apply Order

```bash
kubectl apply -k infra/k8s/
```

The frontend Nginx image still contains a `/api` proxy fallback, but EKS public traffic should normally be routed by ALB before it reaches the frontend container.

## ai-worker Note

`ai-worker` currently reuses the backend image because the SQS listener and outbox relay live in the Spring Boot application. The EKS backend Deployment sets `APP_ROLE=api`, while the worker Deployment sets `APP_ROLE=ai-worker`.

Spring maps those environment variables to `app.role`. SQS consumers and the outbox relay are only registered when `app.role=ai-worker`. `matchIfMissing=true` preserves the existing local Docker Compose behavior when `APP_ROLE` is not set.

Useful checks after rollout:

```bash
kubectl -n tripkey exec deploy/tripkey-backend -- printenv APP_ROLE
kubectl -n tripkey exec deploy/tripkey-ai-worker -- printenv APP_ROLE
kubectl -n tripkey logs deploy/tripkey-backend | grep -i sqs
kubectl -n tripkey logs deploy/tripkey-ai-worker | grep -i sqs
```

The backend logs should not show active SQS listener consumption. The worker logs should show SQS listener activity when messages are available.

## AWS Prerequisites

Before applying these manifests to a new EKS cluster:

1. Create or select the EKS cluster in `ap-northeast-2`.
2. Add a managed node group or Fargate profile that can run the TripKey pods.
3. Associate the cluster OIDC provider.
4. Install AWS Load Balancer Controller with IAM permissions.
5. Install `metrics-server` for HPA.
6. Push the three Docker images to ECR.
7. Create `tripkey-config` and `tripkey-secrets` in the `tripkey` namespace.
8. Apply the manifests with `kubectl apply -k infra/k8s/`.
9. Create or update the Route53 Alias record for `usetripkey.com` to point at the ALB created by the Ingress.

If an ALB was created manually before introducing Ingress, prefer letting AWS Load Balancer Controller create and manage the EKS ALB. Reusing a manual ALB requires extra TargetGroupBinding work and is usually not worth it for this deployment.

## Autoscaling

HPA is configured for:

- `tripkey-backend`: 2 to 6 replicas, CPU 65%.
- `tripkey-ai-engine`: 2 to 8 replicas, CPU 60% or memory 70%.
- `tripkey-ai-worker`: 1 to 5 replicas, CPU 50%.

These HPAs require `metrics-server`. The worker HPA is a first step; queue-depth based scaling with KEDA/SQS would be a good follow-up once the base EKS deployment is stable.

## Validation

```bash
kubectl apply --dry-run=client -k infra/k8s/
```

HPA requires `metrics-server` to be installed in the EKS cluster.

If local `kubectl` is pointed at a stale or non-Kubernetes endpoint, schema discovery can fail before manifest validation. In that case, first verify the rendered output:

```bash
kubectl kustomize infra/k8s/
```
