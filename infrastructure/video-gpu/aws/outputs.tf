output "gpu_instance_id" {
  description = "Staging GPU EC2 instance ID; null while the instance is disabled."
  value       = try(aws_instance.gpu_worker[0].id, null)
}

output "gpu_private_ip" {
  description = "Private IP address of the staging GPU worker; null while disabled."
  value       = try(aws_instance.gpu_worker[0].private_ip, null)
}

output "gpu_security_group_id" {
  description = "Outbound-only security group ID."
  value       = aws_security_group.gpu_worker.id
}
