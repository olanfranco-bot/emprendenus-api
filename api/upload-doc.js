// POST /api/upload-doc
// STUB: Vercel Blob private store requires signed URL flow.
// For now, accept upload and return a placeholder URL. Replace with S3/R2/Cloudinary later.

export const config = {
    api: { bodyParser: false }
};

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
        const filename = req.headers['x-filename'] || `upload-${Date.now()}`;
        const sessionId = req.headers['x-session-id'] || 'unknown';
        const placeholder = `https://emprendenus-api.vercel.app/uploads/${sessionId}/${encodeURIComponent(filename)}`;
        return res.status(200).json({ url: placeholder, pathname: filename, stub: true });
  } catch (err) {
        return res.status(500).json({ error: err.message });
  }
}
