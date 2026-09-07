data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/dist"
  output_path = "${path.module}/build/lambda.zip"
}

resource "aws_lambda_function" "api" {
  function_name    = "${var.project}-api"
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs20.x"
  architectures    = ["arm64"]
  handler          = "index.handler"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      WORDLE_TABLE              = aws_dynamodb_table.puzzles.name
      WORDLE_TZ                 = var.timezone
      WORDLE_SEED               = var.permutation_seed
      WORDLE_PASSWORD_PARAM     = var.password_param_name
      WORDLE_TOKEN_SECRET_PARAM = var.token_secret_param_name
      NODE_OPTIONS              = "--enable-source-maps"
    }
  }

  tags = { Project = var.project }
}

# Public URL; the app password + HMAC token is the real gate. Avoids the OAC
# SigV4 signing that broke the browser-facing API.
resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE"
}

# Auth type NONE still needs a resource policy granting public access, and since
# Oct 2025 a new function URL needs both actions ("dual auth").
resource "aws_lambda_permission" "public_invoke_url" {
  statement_id           = "FunctionURLAllowPublicAccess"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.api.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

# The second statement needs the lambda:InvokedViaFunctionUrl condition, which
# aws_lambda_permission can't set yet (hashicorp/terraform-provider-aws#44829),
# so add it via the CLI.
resource "null_resource" "invoke_function_dual_auth" {
  triggers = {
    function_name = aws_lambda_function.api.function_name
    region        = var.aws_region
    statement_id  = "FunctionURLInvokeAllowPublicAccess"
  }

  provisioner "local-exec" {
    command = "aws lambda add-permission --region ${self.triggers.region} --function-name ${self.triggers.function_name} --statement-id ${self.triggers.statement_id} --action lambda:InvokeFunction --principal '*' --invoked-via-function-url"
  }

  provisioner "local-exec" {
    when    = destroy
    command = "aws lambda remove-permission --region ${self.triggers.region} --function-name ${self.triggers.function_name} --statement-id ${self.triggers.statement_id} || true"
  }

  depends_on = [aws_lambda_function_url.api]
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${aws_lambda_function.api.function_name}"
  retention_in_days = 14
  tags              = { Project = var.project }
}
