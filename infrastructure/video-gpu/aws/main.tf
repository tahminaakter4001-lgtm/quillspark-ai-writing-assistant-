terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_security_group" "gpu_worker" {
  count = var.enable_gpu_instance ? 1 : 0

  name_prefix = "${var.project_name}-"
  description = "HTTPS-egress-only security group for private QuillSpark GPU staging worker"
  vpc_id      = var.vpc_id

  egress {
    description = "Allow outbound HTTPS for approved package and model retrieval."
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-sg"
    Project     = "QuillSpark"
    Environment = "staging"
    ManagedBy   = "Terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_instance" "gpu_worker" {
  count = var.enable_gpu_instance ? 1 : 0

  ami                         = var.gpu_ami_id
  instance_type               = var.instance_type
  subnet_id                   = var.private_subnet_id
  vpc_security_group_ids      = [aws_security_group.gpu_worker[0].id]
  associate_public_ip_address = false
  monitoring                  = true

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size_gib
    encrypted             = true
    delete_on_termination = true
  }

  tags = {
    Name        = var.project_name
    Project     = "QuillSpark"
    Environment = "staging"
    ManagedBy   = "Terraform"
  }

  lifecycle {
    precondition {
      condition     = var.adult_billing_approval
      error_message = "GPU launch blocked: obtain AWS account owner or parent/guardian billing approval first."
    }
  }
}
