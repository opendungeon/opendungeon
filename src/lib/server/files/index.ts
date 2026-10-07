import { S3Client } from "bun";
import { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, S3_URL } from "$app/env/private";

export const files = new S3Client({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  acl: "private",
  endpoint: S3_URL,
  bucket: S3_BUCKET,
});
