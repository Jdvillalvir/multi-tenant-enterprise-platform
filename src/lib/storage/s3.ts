import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.S3_ENDPOINT;
const client = new S3Client({ region: process.env.S3_REGION || "us-east-1", endpoint: endpoint || undefined, forcePathStyle: Boolean(endpoint), credentials: process.env.S3_ACCESS_KEY_ID ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } : undefined });
const bucket = process.env.S3_BUCKET!;
export async function putObject(key: string, body: Uint8Array, contentType: string) { await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, ServerSideEncryption: endpoint ? undefined : "AES256" })); }
export async function deleteObject(key: string) { await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); }
export async function signedDownloadUrl(key: string, filename: string) { return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` }), { expiresIn: 300 }); }
