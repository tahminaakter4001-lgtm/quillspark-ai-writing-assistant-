# AWS GPU staging scaffold

This directory contains an **opt-in Terraform scaffold** for a QuillSpark Video Creator staging EC2 GPU worker.

## Safety defaults

- No AWS resources are created by default: `enable_gpu_instance = false`.
- Enabling the instance also requires `adult_billing_approval = true`. The account owner or parent/guardian must review the AWS estimate, account permissions, quotas, and spending controls first.
- This scaffold does not create a VPC, subnet, NAT gateway, S3 bucket, load balancer, or public ingress rule.
- The security group permits outbound traffic only. Connect through an organization-approved private access path; do not expose SSH or the worker API publicly.
- The AMI is supplied by the account owner. Select a compatible AWS Deep Learning AMI and verify its NVIDIA driver/CUDA compatibility for the chosen instance family.

## Candidate instance

The initial staging candidate is `g6e.2xlarge` (one NVIDIA L40S GPU with 48 GB GPU memory). This is a candidate for model and memory profiling, not a guarantee that every video model will fit or run efficiently. Confirm regional availability, service quota, current price, and model license before launch.

## Required inputs

Provide an existing VPC ID, private subnet ID, compatible GPU AMI ID, and AWS region. Use an IAM role/profile with least-privilege permissions. Do not place AWS credentials in Terraform variables, repository files, or GitHub Actions secrets.

## Validation before any launch

1. Have the AWS account owner review the current EC2, EBS, data-transfer, and storage costs.
2. Configure AWS Budgets and billing alerts in the account.
3. Confirm the selected region offers the chosen GPU instance and the account has quota.
4. Confirm the AMI's NVIDIA driver and CUDA compatibility.
5. Review the model's license and commercial-use terms.
6. Keep the instance disabled until the account owner explicitly approves the spend.

This is infrastructure scaffolding only. It does not install a video model, run inference, or expose a production service.
