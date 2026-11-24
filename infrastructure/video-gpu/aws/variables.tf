variable "aws_region" {
  description = "AWS staging region selected for QuillSpark GPU worker."
  type        = string
  default     = "ap-south-1"
}

variable "vpc_id" {
  description = "Existing VPC ID. This module does not create networking."
  type        = string
}

variable "private_subnet_id" {
  description = "Existing private subnet ID for the staging worker."
  type        = string
}

variable "gpu_ami_id" {
  description = "AMI ID for an AWS Deep Learning AMI compatible with the chosen GPU instance."
  type        = string
}

variable "instance_type" {
  description = "GPU instance type. Validate availability and pricing in the selected region."
  type        = string
  default     = "g6e.2xlarge"
}

variable "enable_gpu_instance" {
  description = "Must remain false until the account owner approves paid AWS usage."
  type        = bool
  default     = false
}

variable "adult_billing_approval" {
  description = "Explicit confirmation that the AWS account owner or parent/guardian approved the estimated spend."
  type        = bool
  default     = false
}

variable "project_name" {
  description = "Resource name prefix."
  type        = string
  default     = "quillspark-video-staging"
}

variable "root_volume_size_gib" {
  description = "Encrypted root EBS volume size."
  type        = number
  default     = 200
}
