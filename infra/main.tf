terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
  # For a shared/remote state, configure a backend here (e.g. S3). The default
  # local state is fine for a single-maintainer personal project.
}

provider "aws" {
  region = var.aws_region
}

# CloudFront-managed cache / origin-request policies (AWS-owned, same IDs in
# every account).
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

data "aws_caller_identity" "current" {}
