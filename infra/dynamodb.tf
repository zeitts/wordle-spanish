# One item per calendar day: the authoritative word that was served that day.
resource "aws_dynamodb_table" "puzzles" {
  name         = "${var.project}-puzzles"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "date"

  attribute {
    name = "date"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = { Project = var.project }
}
