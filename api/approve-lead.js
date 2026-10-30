// GET  /api/approve-lead?id=recXXX&token=...  -> pagina de confirmacion con el borrador (no envia nada)
// POST /api/approve-lead (form: id, token)      -> envia el borrador al lead y marca "Respondido"
// GET no envia porque los filtros de email (Outlook/Gmail) abren los links automaticamente.

import { findLeadById, updateLead } from '../lib/airtable.js';
import { sendLeadReply } from '../lib/email.js';
import { verifyLeadToken } from '../lib/lead-token.js';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function page(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title></head>
<body style="font-family:Arial,sans-serif; max-width:640px; margin:40px auto; padding:0 16px; color:#1F2937; line-height:1.6;">
${body}</body></html>`;
}

export default async function handler(req, res) {
  const params = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const { id, token } = params;

  if (!verifyLeadToken(id, token)) {
    return res.status(403).send(page('No autorizado', '<h2>Link invalido</h2>'));
  }

  try {
    const lead = await findLeadById(id);
    if (!lead) return res.status(404).send(page('No encontrado', '<h2>Lead no encontrado</h2>'));

    const f = lead.fields;
    if (f['Estado Lead'] === 'Respondido') {
      return res.status(200).send(page('Ya enviado', `<h2>Este lead ya fue respondido</h2><p>${escapeHtml(f['Fecha Respuesta'] || '')}</p>`));
    }
    if (!f['Borrador Email'] || !f['Borrador Asunto']) {
      return res.status(400).send(page('Sin borrador', '<h2>El lead no tiene borrador. Revisalo en Airtable.</h2>'));
    }

    if (req.method === 'GET') {
      return res.status(200).send(page('Aprobar respuesta', `
<h2>Aprobar respuesta a ${escapeHtml(f['Nombre'])}</h2>
<p><strong>Para:</strong> ${escapeHtml(f['Email'])}<br><strong>Asunto:</strong> ${escapeHtml(f['Borrador Asunto'])}</p>
<div style="background:#F7F8FA; padding:16px; border-radius:8px; white-space:pre-wrap;">${escapeHtml(f['Borrador Email'])}</div>
<p style="font-size:13px; color:#6B7280;">Se envia el texto actual de Airtable. Si lo editaste alli, recarga esta pagina antes de aprobar.</p>
<form method="POST" action="/api/approve-lead">
  <input type="hidden" name="id" value="${escapeHtml(id)}">
  <input type="hidden" name="token" value="${escapeHtml(token)}">
  <button type="submit" style="background:#2E75B6; color:#fff; border:0; padding:12px 28px; border-radius:8px; font-weight:700; font-size:16px; cursor:pointer;">Enviar al cliente</button>
</form>`));
    }

    if (req.method !== 'POST') return res.status(405).send(page('Error', '<h2>Method not allowed</h2>'));

    await sendLeadReply({ to: f['Email'], subject: f['Borrador Asunto'], body: f['Borrador Email'] });
    await updateLead(id, { 'Estado Lead': 'Respondido', 'Fecha Respuesta': new Date().toISOString() });

    return res.status(200).send(page('Enviado', `<h2>Enviado a ${escapeHtml(f['Email'])}</h2>`));
  } catch (err) {
    console.error('[approve-lead] error:', err);
    return res.status(500).send(page('Error', `<h2>Error</h2><p>${escapeHtml(err.message)}</p>`));
  }
}
