# The password and token secret are created manually so their plaintext never
# lands in Terraform state:
#
#   aws ssm put-parameter --name /wordle/password \
#     --type SecureString --value 'your-password'
#   aws ssm put-parameter --name /wordle/token-secret \
#     --type SecureString --value "$(openssl rand -hex 32)"
#
# Terraform only needs their ARNs to scope the Lambda's IAM policy.
data "aws_ssm_parameter" "password" {
  name            = var.password_param_name
  with_decryption = false
}

data "aws_ssm_parameter" "token_secret" {
  name            = var.token_secret_param_name
  with_decryption = false
}
