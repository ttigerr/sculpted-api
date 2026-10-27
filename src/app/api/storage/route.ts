import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

const BUCKET = "assets";

export async function GET() {
  const s3 = new S3Client({ forcePathStyle: true });
  const key = `health/${Date.now()}.txt`;
  const body = `hello from neon object storage at ${new Date().toISOString()}`;

  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: "text/plain" }));

  const got = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const bytes = await got.Body!.transformToByteArray();
  const text = new TextDecoder().decode(bytes);

  return NextResponse.json({
    ok: true,
    bucket: BUCKET,
    key,
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION,
    uploaded_bytes: bytes.byteLength,
    roundtrip_matches: text === body,
    content: text,
  });
}
