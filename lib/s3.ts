import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createS3Client, getBucketConfig } from './aws-config'

function shouldServeInline(contentType: string): boolean {
  // image/svg+xml excluded — SVGs can execute embedded scripts (XSS risk)
  return (
    (contentType.startsWith('image/') && contentType !== 'image/svg+xml') ||
    contentType.startsWith('video/') ||
    contentType.startsWith('audio/')
  )
}

function buildStoragePath(fileName: string, folderPrefix: string, isPublic: boolean): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return isPublic
    ? `${folderPrefix}public/uploads/${Date.now()}-${safeName}`
    : `${folderPrefix}uploads/${Date.now()}-${safeName}`
}

export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic = false
): Promise<{ uploadUrl: string; cloud_storage_path: string }> {
  const s3 = createS3Client()
  const { bucketName, folderPrefix } = getBucketConfig()
  const cloud_storage_path = buildStoragePath(fileName, folderPrefix, isPublic)

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ContentType: contentType,
  })
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })
  return { uploadUrl, cloud_storage_path }
}

// Uploads bytes the server already holds (e.g. a multipart request body),
// skipping the presigned-URL round trip used by client-driven uploads.
export async function uploadFileBuffer(
  fileName: string,
  contentType: string,
  buffer: Buffer,
  isPublic = false
): Promise<string> {
  const s3 = createS3Client()
  const { bucketName, folderPrefix } = getBucketConfig()
  const cloud_storage_path = buildStoragePath(fileName, folderPrefix, isPublic)

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: cloud_storage_path,
      Body: buffer,
      ContentType: contentType,
    })
  )
  return cloud_storage_path
}

export async function getFileUrl(
  cloud_storage_path: string,
  contentType: string,
  isPublic: boolean
): Promise<string> {
  const { bucketName } = getBucketConfig()
  const region = process.env.AWS_REGION ?? 'us-east-1'
  if (isPublic) {
    const encoded = cloud_storage_path.split('/').map(encodeURIComponent).join('/')
    return `https://${bucketName}.s3.${region}.amazonaws.com/${encoded}`
  }
  const s3 = createS3Client()
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ResponseContentDisposition: shouldServeInline(contentType) ? 'inline' : 'attachment',
  })
  return getSignedUrl(s3, command, { expiresIn: 3600 })
}

export async function deleteFile(cloud_storage_path: string): Promise<void> {
  const s3 = createS3Client()
  const { bucketName } = getBucketConfig()
  await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: cloud_storage_path }))
}

// Reads an uploaded file's bytes server-side, for pipelines (e.g. bill
// extraction) that need to inspect the file rather than just link to it.
export async function getFileBuffer(
  cloud_storage_path: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const s3 = createS3Client()
  const { bucketName } = getBucketConfig()
  const result = await s3.send(
    new GetObjectCommand({ Bucket: bucketName, Key: cloud_storage_path })
  )
  const bytes = await result.Body?.transformToByteArray()
  return {
    buffer: Buffer.from(bytes ?? []),
    contentType: result.ContentType ?? 'application/octet-stream',
  }
}
