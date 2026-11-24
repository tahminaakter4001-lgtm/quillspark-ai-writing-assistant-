# QuillSpark Video Creator — Cloud GPU Staging

This directory contains the first infrastructure scaffold for QuillSpark's self-hosted NVIDIA GPU video-generation environment.

## Scope of this change

- Defines an isolated staging Redis service for future asynchronous video jobs.
- Defines an opt-in NVIDIA CUDA container check that runs `nvidia-smi`.
- Keeps all services on a private Compose network; no Redis or GPU administration port is published.
- Provides an environment-variable example without credentials.
- Adds CI validation for the Compose configuration.

This scaffold does **not** provision a cloud VM, install a host NVIDIA driver, deploy a video model, implement a generation worker, or enable production traffic. The GPU check is a one-shot validation container, not a video-generation service.

## Prerequisites

1. A staging cloud VM with a supported NVIDIA GPU.
2. A host NVIDIA driver compatible with the selected CUDA container.
3. Docker Engine and the Docker Compose plugin.
4. NVIDIA Container Toolkit configured for Docker.
5. Access to the repository and permission to manage the staging VM.

Use the cloud provider's supported GPU image or driver installation process. Do not install a driver inside the application container.

## Configure staging

Copy `.env.example` to a local, untracked `.env` in this directory and set a unique random `VIDEO_REDIS_PASSWORD`. Never commit the populated file or put secrets in GitHub source.

Start the private Redis service:

```bash
cd infrastructure/video-gpu
docker compose --env-file .env -f docker-compose.staging.yaml up -d redis
```

Run the one-shot GPU visibility check:

```bash
docker compose --env-file .env -f docker-compose.staging.yaml --profile gpu-validation run --rm gpu-validation
```

A successful GPU check prints the detected NVIDIA device information and exits. It does not load a video model or prove that a particular model fits in GPU memory.

Stop staging services:

```bash
docker compose --env-file .env -f docker-compose.staging.yaml down
```

Persistent Redis data is stored in the named `video_gpu_redis_data` volume. Remove that volume only when its contents are intentionally disposable.

## Network and security

- Compose publishes no Redis port to the host.
- Keep the VM behind the cloud provider firewall; allow administrative access only from trusted operator networks.
- Do not expose Docker socket, NVIDIA management interfaces, Redis, model inference or worker administration endpoints publicly.
- Use a secret manager for staging credentials when the VM is provisioned.
- Use private object storage and short-lived authorized download URLs for generated media in a later implementation phase.
- Apply per-user quotas, job timeouts, upload limits and model allowlists before enabling generation.
- Treat uploaded media and prompts as untrusted input.

## Compatibility and model selection

The validation image currently uses NVIDIA CUDA 12.4.1 on Ubuntu 22.04. Confirm host driver compatibility before running it. This is a runtime validation baseline, not a commitment to a specific video model or production CUDA/PyTorch matrix.

Before selecting a model, benchmark:
- supported GPU architecture and compute capability;
- peak VRAM during model load and inference;
- system RAM and temporary disk requirements;
- generation latency at the intended clip length and resolution;
- commercial-use and redistribution license terms;
- model download provenance, checksum and pinned revision.

Candidate model families are evaluated separately. No model weights are included in this repository.

## Next implementation stages

1. Provision a staging NVIDIA cloud VM and validate the host driver/container runtime.
2. Select and license-review one model; pin its revision and dependencies.
3. Implement an isolated GPU worker with authenticated internal job intake.
4. Add durable job state, retries, cancellation and idempotency.
5. Add private object storage and FFmpeg rendering for 16:9 and 9:16.
6. Integrate the backend API and Dashboard/ChatGPT Plugin authorization.
7. Run load, failure-recovery, security and cost tests before production approval.

## CI

The `video-gpu-staging.yml` workflow validates Compose syntax on GitHub-hosted runners. GitHub-hosted CI does not have access to this project's cloud GPU and therefore does not claim to test NVIDIA hardware or model inference. Run the one-shot GPU check on the actual staging VM before proceeding.
