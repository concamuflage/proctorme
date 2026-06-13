#!/bin/bash
# Make the script fail fast when a command fails, an unset variable is used, or a pipeline fails.
set -euo pipefail

 # Store logs and temporary processing files under /tmp because EC2 user data scripts commonly run as root.
LOG_FILE="/tmp/process.log"
TABLE_NAME="FileTables"
WORK_DIR="/tmp/fovus-processing"
JOB_COMPLETED="false"
DATA_REGION="${DATA_REGION:-${AWS_DEFAULT_REGION:-${AWS_REGION:-}}}"
EC2_REGION="${EC2_REGION:-${AWS_DEFAULT_REGION:-${AWS_REGION:-}}}"
CLOUDWATCH_LOG_GROUP="${CLOUDWATCH_LOG_GROUP:-/fovus/ec2-processing}"
CLOUDWATCH_LOG_REGION="${CLOUDWATCH_LOG_REGION:-${DATA_REGION:-${EC2_REGION:-}}}"

 # Create the working directory if it does not already exist.
mkdir -p "$WORK_DIR"
# Send all normal output and error output to both the console and the log file.
exec > >(tee -a "$LOG_FILE") 2>&1

region_args=()
if [[ -n "$DATA_REGION" ]]; then
  region_args=(--region "$DATA_REGION")
fi

ec2_region_args=()
if [[ -n "$EC2_REGION" ]]; then
  ec2_region_args=(--region "$EC2_REGION")
fi

cloudwatch_region_args=()
if [[ -n "$CLOUDWATCH_LOG_REGION" ]]; then
  cloudwatch_region_args=(--region "$CLOUDWATCH_LOG_REGION")
fi

upload_logs() {
  local status="$1"
  local timestamp
  local log_key
  local input_id="${INPUT_ID:-unknown-input}"
  local bucket_name="${BUCKET_NAME:-}"

  if [[ -z "$bucket_name" ]]; then
    echo "BUCKET_NAME is not set; skipping process log upload to S3"
    return 0
  fi

  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  log_key="logs/${input_id}/process-${timestamp}-exit-${status}.log"

  if [[ -f "$LOG_FILE" ]]; then
    echo "Uploading process log to s3://$bucket_name/$log_key"
    aws s3 cp "${region_args[@]}" "$LOG_FILE" "s3://$bucket_name/$log_key"
  else
    echo "Log file does not exist: $LOG_FILE"
  fi
}

upload_cloudwatch_logs() {
  local status="$1"
  local timestamp_ms
  local input_id="${INPUT_ID:-unknown-input}"
  local log_stream
  local events_file="$WORK_DIR/cloudwatch-events.json"

  if [[ -z "${CLOUDWATCH_LOG_GROUP:-}" ]]; then
    echo "CLOUDWATCH_LOG_GROUP is not set; skipping CloudWatch log upload"
    return 0
  fi

  if [[ ! -f "$LOG_FILE" ]]; then
    echo "Log file does not exist: $LOG_FILE"
    return 0
  fi

  timestamp_ms="$(date +%s000)"
  log_stream="${input_id}/$(date -u +%Y%m%dT%H%M%SZ)-exit-${status}"

  echo "Uploading process log to CloudWatch Logs group $CLOUDWATCH_LOG_GROUP stream $log_stream"

  aws logs create-log-group \
    "${cloudwatch_region_args[@]}" \
    --log-group-name "$CLOUDWATCH_LOG_GROUP" 2>/dev/null || true

  aws logs create-log-stream \
    "${cloudwatch_region_args[@]}" \
    --log-group-name "$CLOUDWATCH_LOG_GROUP" \
    --log-stream-name "$log_stream" 2>/dev/null || true

  python3 - "$LOG_FILE" "$timestamp_ms" <<'PY' > "$events_file"
import json
import sys

path, timestamp_ms = sys.argv[1], int(sys.argv[2])
with open(path, "r", encoding="utf-8", errors="replace") as fh:
    message = fh.read()

print(json.dumps([
    {
        "timestamp": timestamp_ms,
        "message": message[-250000:],
    }
]))
PY

  aws logs put-log-events \
    "${cloudwatch_region_args[@]}" \
    --log-group-name "$CLOUDWATCH_LOG_GROUP" \
    --log-stream-name "$log_stream" \
    --log-events "file://$events_file"
}

mark_job_failed() {
  local status="$1"

  if [[ -z "${INPUT_ID:-}" ]]; then
    echo "INPUT_ID is not set; skipping failed job status update"
    return 0
  fi

  echo "Marking DynamoDB job $INPUT_ID as FAILED"

  aws dynamodb update-item \
    "${region_args[@]}" \
    --table-name "$TABLE_NAME" \
    --key "{\"id\":{\"S\":\"$INPUT_ID\"}}" \
    --update-expression "SET jobStatus = :status, jobFailedAt = :failedAt, failureReason = :reason" \
    --expression-attribute-values "$(
      python3 - "$status" <<'PY'
import json
import sys
from datetime import datetime, timezone

status = sys.argv[1]
print(json.dumps({
    ":status": {"S": "FAILED"},
    ":failedAt": {"S": datetime.now(timezone.utc).isoformat()},
    ":reason": {"S": f"process.sh exited with status {status}"},
}))
PY
    )"
}

terminate_instance() {
  local token
  local instance_id

  token="$(
    curl -sS -X PUT "http://169.254.169.254/latest/api/token" \
      -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"
  )"

  instance_id="$(
    curl -sS -H "X-aws-ec2-metadata-token: $token" \
      "http://169.254.169.254/latest/meta-data/instance-id"
  )"

  if [[ -n "$instance_id" ]]; then
    echo "Terminating EC2 instance $instance_id"
    aws ec2 terminate-instances "${ec2_region_args[@]}" --instance-ids "$instance_id"
  else
    echo "Could not determine EC2 instance id; skipping termination"
  fi
}

cleanup() {
  local status="$?"

  set +e +u
  echo "process.sh exiting with status $status"
  if [[ "$status" != "0" && "$JOB_COMPLETED" != "true" ]]; then
    mark_job_failed "$status"
  fi
  upload_logs "$status"
  upload_cloudwatch_logs "$status"
  terminate_instance
}

trap cleanup EXIT

echo "process.sh started at $(date)"

# Require these environment variables. The Lambda function adds them to EC2 user data before starting the instance.
: "${INPUT_ID:?Missing INPUT_ID}"
: "${USER_EMAIL:?Missing USER_EMAIL}"
: "${BUCKET_NAME:?Missing BUCKET_NAME}"
: "${FULL_NAME:?Missing FULL_NAME}"

# Read the input text from DynamoDB using the input record id.
input_text="$(
  aws dynamodb get-item \
    "${region_args[@]}" \
    --table-name "$TABLE_NAME" \
    --key "{\"id\":{\"S\":\"$INPUT_ID\"}}" \
    --query "Item.inputText.S" \
    --output text
)"

# Read the uploaded input file path from DynamoDB using the same input record id.
input_file_path="$(
  aws dynamodb get-item \
    "${region_args[@]}" \
    --table-name "$TABLE_NAME" \
    --key "{\"id\":{\"S\":\"$INPUT_ID\"}}" \
    --query "Item.inputFilePath.S" \
    --output text
)"

# If DynamoDB does not return either value, stop because the job cannot continue.
if [[ "$input_text" == "None" || "$input_file_path" == "None" ]]; then
  echo "Could not find inputText or inputFilePath for id: $INPUT_ID"
  exit 1
fi

# Convert the stored file path into an S3 object key that can be used with aws s3 cp.
# This supports values like s3://bucket/key or bucket/key.
input_key="$input_file_path"
input_key="${input_key#s3://$BUCKET_NAME/}"
input_key="${input_key#$BUCKET_NAME/}"

# Define local file paths, S3 output path, and the length of the input text.
input_file="$WORK_DIR/input-file"
output_file="$WORK_DIR/$FULL_NAME.output"
output_key="$FULL_NAME.output"
output_file_path="$BUCKET_NAME/$output_key"
text_length=${#input_text}

# Download the uploaded input file from S3 to the EC2 instance.
aws s3 cp "${region_args[@]}" "s3://$BUCKET_NAME/$input_key" "$input_file"

# Create the output file by copying the input file content and appending the required result line.
cat "$input_file" > "$output_file"
printf "\n%s %s\n" "$FULL_NAME" "$text_length" >> "$output_file"

# Upload the generated output file back to S3.
aws s3 cp "${region_args[@]}" "$output_file" "s3://$BUCKET_NAME/$output_key"

# Read the output file content so it can also be saved into DynamoDB.
output_text="$(cat "$output_file")"

# Build a DynamoDB JSON item safely using Python so special characters are escaped correctly.
python3 - "$USER_EMAIL" "$output_text" "$output_file_path" <<'PY' > "$WORK_DIR/output-item.json"
import json
import sys

email, output_text, output_file_path = sys.argv[1:]
print(json.dumps({
    "id": {"S": email},
    "outputText": {"S": output_text},
    "outputFilePath": {"S": output_file_path},
}))
PY

# Save the final output text and output file path into a separate DynamoDB output item.
aws dynamodb put-item \
  "${region_args[@]}" \
  --table-name "$TABLE_NAME" \
  --item "file://$WORK_DIR/output-item.json"

# Mark the original DynamoDB input job item as completed.
aws dynamodb update-item \
  "${region_args[@]}" \
  --table-name "$TABLE_NAME" \
  --key "{\"id\":{\"S\":\"$INPUT_ID\"}}" \
  --update-expression "SET jobStatus = :status" \
  --expression-attribute-values '{":status":{"S":"COMPLETED"}}'

JOB_COMPLETED="true"

echo "process.sh finished at $(date)"
echo "Output uploaded to s3://$output_file_path"
