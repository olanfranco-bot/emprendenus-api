// POST /api/upload-doc
// Uploads file to Cloudflare R2 and returns public URL.
// Headers: x-filename, x-session-id, Content-Type

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const config = {
      api: { bodyParser: false }
};

const BUCKET = 'emprendenus-docs';

const s3 = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
              accessKeyId: process.env.R2_ACCESS_KEY_ID,
              secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
});

async function readStreamToBuffer(req) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      return Buffer.concat(chunks);
}

export default async function handler(req, res) {
      if (req.method === 'OPTIONS') return res.status(200).end();
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
          const filename = req.headers['x-filename'] || `upload-${Date.now()}`;
          const sessionId = req.headers['x-session-id'] || 'unknown';
          const contentType = req.headers['content-type'] || 'application/octet-stream';

        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
          const key = `onboarding/${sessionId}/${Date.now()}-${safeName}`;

        const body = await readStreamToBuffer(req);

        await s3.send(new PutObjectCommand({
                  Bucket: BUCKET,
                  Key: key,
                  Body: body,
                  ContentType: contentType
        }));

        const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
          return res.status(200).json({ url: publicUrl, key });
  } catch (err) {
          console.error('[upload-doc] error:', err);
          return res.status(500).json({ error: err.message });
  }
}
