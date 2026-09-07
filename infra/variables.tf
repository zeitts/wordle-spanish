variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "eu-west-1"
}

variable "project" {
  description = "Name prefix for all resources"
  type        = string
  default     = "wordle-es"
}

variable "timezone" {
  description = "IANA timezone the daily word rolls over in"
  type        = string
  default     = "America/New_York"
}

variable "permutation_seed" {
  description = "Seed for the deterministic word order. Do NOT change once live."
  type        = string
  default     = "wordle-es-v1"
}

variable "password_param_name" {
  description = "SSM SecureString parameter holding the universal password (created out of band)"
  type        = string
  default     = "/wordle/password"
}

variable "token_secret_param_name" {
  description = "SSM SecureString parameter holding the token signing secret (created out of band)"
  type        = string
  default     = "/wordle/token-secret"
}
