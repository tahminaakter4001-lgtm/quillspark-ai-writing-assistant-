# QuillSpark Video Creator — Cloud GPU Staging Plan

## Decision record

- Hosting model: self-hosted inference on a cloud GPU VM.
- Cloud provider: AWS.
- AWS Region: Asia Pacific (Mumbai), `ap-south-1`.
- Candidate GPU instance: `g6e.2xlarge`; confirm AZ capacity and account quota before launch.
- GPU vendor: NVIDIA.
- Initial environment: staging only.
- Output targets: landscape 16:9 and portrait 9:16.
- Existing application: retain the current backend and deployment behavior; integrate video services additively.
- Production: explicitly out of scope until staging tests and a separate release review pass.

## Existing repository context

The current repository contains a Node.js/Express API, PostgreSQL migrations, a backend Dockerfile, a sandbox Compose deployment and GitHub Actions workflows. This change adds a separate infrastructure directory and a dedicated validation workflow. It does not modify the existing backend, payment, terminology-audit or sandbox deployment files.

## Staging components added

- `infrastructure/video-gpu/docker-compose.staging.yaml`: isolated Redis service and an opt-in one-shot NVIDIA CUDA validation container.
- `infrastructure/video-gpu/.env.example`: non-secret environment-variable template.
- `infrastructure/video-gpu/README.md`: operator setup, security boundaries, compatibility notes and next steps.
- `.github/workflows/video-gpu-staging.yml`: static Compose configuration validation on pull requests and manual dispatch.
- `infrastructure/video-gpu/aws/`: opt-in Terraform scaffold targeting AWS Mumbai.

The GPU validation container executes `nvidia-smi`. It is not an inference API or generation worker. Redis is not connected to the existing API yet; that integration requires a later reviewed code change and a defined authentication boundary.

## Deployment sequence

### Stage A — cloud host readiness

1. Confirm G6e capacity and the account's EC2 quota in the chosen Mumbai Availability Zone.
2. Have the AWS account owner review current EC2, EBS, storage and data-transfer charges; configure budgets and billing alerts.
3. Select an AWS Deep Learning AMI compatible with the chosen GPU instance and verify its NVIDIA driver/CUDA compatibility.
4. Use an existing private subnet and an organization-approved private administration path. Do not expose SSH, Redis or GPU administration services publicly.
5. Install Docker Engine, Docker Compose and NVIDIA Container Toolkit using vendor-supported instructions.
6. Create staging secrets in an approved secret manager; never commit credentials.

### Stage B — GPU validation

1. Start the staging Redis service.
2. Run the opt-in GPU validation container.
3. Confirm `nvidia-smi` lists the expected GPU.
4. Record driver version, GPU model, VRAM, CUDA compatibility and host resource limits.
5. Stop and investigate if the container cannot access the GPU; do not proceed to model deployment.

### Stage C — model and worker (future change)

1. Evaluate candidate models against hardware, quality, latency and license requirements.
2. Pin model revision, container base image and Python dependencies.
3. Implement an isolated worker with authenticated internal job intake, queue acknowledgement, idempotency, cancellation and bounded retries.
4. Add health/readiness endpoints and structured logs without exposing administrative interfaces.
5. Benchmark VRAM and generation time before allowing user traffic.

### Stage D — media and application integration (future change)

1. Add durable video project, scene, job and export records.
2. Integrate private object storage with scoped, expiring download links.
3. Add FFmpeg rendering and safe crop/reframe logic for 16:9 and 9:16.
4. Integrate the existing API using server-to-server authentication and per-user authorization.
5. Connect Dashboard and ChatGPT Plugin through the same authorized API contracts.

### Stage E — staging release gate

Required before production review:
- GPU visibility check passes on the actual staging VM.
- Model license and artifact provenance are documented.
- Inference and rendering tests pass on the target GPU.
- Job retry, cancellation, duplicate submission and worker restart tests pass.
- Private media access and deletion tests pass.
- Resource quotas, timeouts and cost alerts are enabled.
- Existing QuillSpark writing, terminology and payment tests remain green.
- Security review and human release approval are recorded.

## Production safeguards

No production GPU host, production model, public generation endpoint or production deployment is created by this infrastructure scaffold. Production requires a separate approval, deployment configuration, secret set, backup plan, monitoring thresholds and rollback procedure.
