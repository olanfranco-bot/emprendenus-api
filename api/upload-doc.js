// POST /api/upload-doc
// Multipart file upload -> Airtable attachment via direct URL upload
// NOTE: Airtable requires either a public URL or the new attachment-upload endpoint.
// Simpler approach: upload to Vercel Blob or Cloudflare R2, then store the URL in Airtable.
// Here we use Vercel Blob (requires @vercel/blob package + BLOB_READ_WRITE_TOKEN).

import { put } from '@vercel/blob';

export const config = {
  api: { bodyParser: false }
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const filename = req.headers['x-filename'] || `upload-${Date.now()}`;
    const sessionId = req.headers['x-session-id'] || 'unknown';

    // Stream body to Vercel Blob
    const blob = await put(`onboarding/${sessionId}/${filename}`, req, {
      access: 'private', // TODO: consider making these private with signed URLs
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (err) {
    console.error('[upload-doc] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
