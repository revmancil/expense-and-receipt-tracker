// Client-side helper: upload a receipt file to cloud storage via a presigned URL.
// Returns the stored cloud_storage_path to save on the entry.

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/pdf',
]
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function uploadReceipt(file: File): Promise<string> {
  if (!file) throw new Error('No file selected')
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Unsupported file type. Use an image or PDF.')
  }
  if (file.size > MAX_SIZE) {
    throw new Error('File is too large (max 10MB).')
  }

  const presignRes = await fetch('/api/upload/presigned', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, contentType: file.type }),
  })
  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Could not prepare upload')
  }
  const { uploadUrl, cloud_storage_path } = await presignRes.json()
  if (!uploadUrl || !cloud_storage_path) throw new Error('Invalid upload response')

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!putRes.ok) {
    throw new Error('Upload failed')
  }
  return cloud_storage_path
}

// Fetch a short-lived signed URL to view/download a stored receipt.
export async function getReceiptViewUrl(path: string): Promise<string> {
  const res = await fetch(`/api/upload/view?path=${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error('Could not open receipt')
  const { url } = await res.json()
  if (!url) throw new Error('Could not open receipt')
  return url
}
