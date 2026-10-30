// POST /api/lead-intake
// Body: { nombre, email, telefono?, pais?, servicio?, mensaje, origen?, website? (honeypot, debe venir vacio) }
// Guarda el lead en Airtable, Claude lo califica y redacta respuesta, notifica a admin para aprobar.
// NO envia nada al lead: el envio requiere aprobacion en /api/approve-lead

import { createLead, updateLead } from '../lib/airtable.js';
import { qualifyLead } from '../lib/lead-agent.js';
import { notifyNewLead } from '../lib/email.js';
import { signLeadId } from '../lib/lead-token.js';

const API_URL = process.env.API_URL || 'https://api.emprendenus.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE = 4000;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nombre, email, telefono, pais, servicio, mensaje, origen, website } = req.body || {};

  // Honeypot: bots llenan todos los campos. Responder OK sin procesar.
  if (website) return res.status(200).json({ success: true });

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ error: 'Missing nombre, email or mensaje' });
  }
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email' });
  if (String(mensaje).length > MAX_MESSAGE) return res.status(400).json({ error: 'Mensaje demasiado largo' });

  const lead = {
    nombre: String(nombre).slice(0, 200),
    email: String(email).slice(0, 200),
    telefono: telefono ? String(telefono).slice(0, 50) : '',
    pais: pais ? String(pais).slice(0, 100) : '',
    servicio: servicio ? String(servicio).slice(0, 100) : '',
    mensaje: String(mensaje),
    origen: origen ? String(origen).slice(0, 50) : 'web'
  };

  let record;
  try {
    record = await createLead(lead);
  } catch (err) {
    console.error('[lead-intake] airtable create error:', err);
    return res.status(500).json({ error: 'No se pudo registrar la consulta' });
  }

  try {
    const q = await qualifyLead(lead);

    await updateLead(record.id, {
      'Servicio Detectado': q.servicio,
      'Segmento': q.segmento,
      'Score': q.score,
      'Prioridad': q.prioridad,
      'Resumen': q.resumen,
      'Datos Faltantes': q.datos_faltantes.join('\n'),
      'Alertas Compliance': q.alertas_compliance.join('\n'),
      'Borrador Asunto': q.borrador_asunto,
      'Borrador Email': q.borrador_email,
      'Estado Lead': 'Borrador - Pendiente Aprobacion'
    });

    const reviewUrl = `${API_URL}/api/approve-lead?id=${record.id}&token=${signLeadId(record.id)}`;
    await notifyNewLead({ adminEmail: process.env.ADMIN_EMAIL, lead, qualification: q, reviewUrl });
  } catch (err) {
    // El lead ya esta guardado: se marca para revision manual y se responde OK al visitante
    console.error('[lead-intake] qualify/notify error:', err);
    await updateLead(record.id, { 'Estado Lead': 'Error - Revisar Manual', 'Resumen': `Error agente: ${err.message}` })
      .catch(e => console.error('[lead-intake] airtable update error:', e));
  }

  return res.status(200).json({ success: true });
}
