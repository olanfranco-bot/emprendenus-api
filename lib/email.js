// Email templates using Resend
// Expects: RESEND_API_KEY, FROM_EMAIL

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || 'Emprendenus <hola@emprendenus.com>';
const SITE_URL = process.env.SITE_URL || 'https://emprendenus.com';

/**
 * Email sent to client after successful payment with onboarding link.
 */
export async function sendPaymentConfirmation({ to, name, sessionId, product, state, total }) {
  const onboardingUrl = `${SITE_URL}/onboarding?session_id=${sessionId}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Inter', Arial, sans-serif; background:#F7F8FA; margin:0; padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA; padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF; border-radius:12px; overflow:hidden;">
        <tr>
          <td style="background:#1B3A5C; padding:32px; text-align:center;">
            <h1 style="color:#FFFFFF; font-family:'Chivo',sans-serif; font-size:24px; margin:0;">Pago confirmado</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="font-size:16px; color:#1F2937; line-height:1.6;">Hola${name ? ' ' + name : ''},</p>
            <p style="font-size:16px; color:#1F2937; line-height:1.6;">
              Recibimos tu pago de <strong>USD $${total}</strong> por <strong>${product}</strong> en <strong>${state}</strong>. Gracias por confiar en Emprendenus.
            </p>
            <p style="font-size:16px; color:#1F2937; line-height:1.6;">
              Para arrancar con la gestion necesitamos que cargues los datos de tu sociedad y la documentacion:
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr><td>
                <a href="${onboardingUrl}" style="background:#2E75B6; color:#FFFFFF; padding:16px 40px; border-radius:8px; text-decoration:none; font-weight:700; font-size:16px; display:inline-block;">Cargar mis datos</a>
              </td></tr>
            </table>
            <p style="font-size:14px; color:#6B7280; line-height:1.5;">
              Si tenes alguna duda, respondenos este email directamente.
            </p>
            <p style="font-size:14px; color:#6B7280; line-height:1.5; margin-top:24px;">
              Un abrazo,<br><strong>Equipo Emprendenus</strong>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#F7F8FA; padding:20px; text-align:center; font-size:12px; color:#6B7280;">
            Emprendenus — Servicios corporativos para latinos en EE.UU.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;

  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Pago confirmado - Carga tus datos para empezar',
    html
  });
}

/**
 * Internal notification to Onell when payment + onboarding complete.
 */
export async function notifyNewOrder({ adminEmail, orderData }) {
  const html = `
<h2>Nueva orden completada</h2>
<ul>
  <li><strong>Cliente:</strong> ${orderData.customerName} (${orderData.customerEmail})</li>
  <li><strong>Producto:</strong> ${orderData.productType}</li>
  <li><strong>Estado:</strong> ${orderData.state}</li>
  <li><strong>Total:</strong> USD $${orderData.total}</li>
  <li><strong>Stripe Session:</strong> ${orderData.sessionId}</li>
</ul>
<p>Ver en Airtable para los datos completos + documentacion.</p>
  `;

  return resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `Nueva orden: ${orderData.productType} - ${orderData.customerName || orderData.customerEmail}`,
    html
  });
}

// ---------- Lead agent ----------

const NOTARY_DISCLAIMER =
  'I am not an attorney licensed to practice law in the State of Florida, and I may not give legal advice or accept fees for legal advice. / ' +
  'No soy abogado autorizado para ejercer la abogacia en el Estado de Florida y no puedo dar asesoramiento legal ni aceptar honorarios por asesoramiento legal.';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textToHtml(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

/**
 * Internal notification: new lead qualified, with link to review/approve the draft.
 */
export async function notifyNewLead({ adminEmail, lead, qualification, reviewUrl }) {
  const list = items => items.length ? `<ul>${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` : '<p>-</p>';

  const html = `
<h2>Nuevo lead: ${escapeHtml(lead.nombre)} — score ${qualification.score}/10 (${escapeHtml(qualification.prioridad)})</h2>
<ul>
  <li><strong>Email:</strong> ${escapeHtml(lead.email)}</li>
  <li><strong>Telefono:</strong> ${escapeHtml(lead.telefono || '-')}</li>
  <li><strong>Pais:</strong> ${escapeHtml(lead.pais || '-')}</li>
  <li><strong>Servicio:</strong> ${escapeHtml(qualification.servicio)}</li>
  <li><strong>Segmento:</strong> ${escapeHtml(qualification.segmento)}</li>
</ul>
<p><strong>Resumen:</strong> ${escapeHtml(qualification.resumen)}</p>
<p><strong>Mensaje original:</strong><br>${textToHtml(lead.mensaje)}</p>
<p><strong>Datos faltantes:</strong></p>${list(qualification.datos_faltantes)}
<p><strong>Alertas compliance:</strong></p>${list(qualification.alertas_compliance)}
<hr>
<p><strong>Borrador — Asunto:</strong> ${escapeHtml(qualification.borrador_asunto)}</p>
<div style="background:#F7F8FA; padding:16px; border-radius:8px;">${textToHtml(qualification.borrador_email)}</div>
<p style="margin-top:24px;">
  <a href="${reviewUrl}" style="background:#2E75B6; color:#FFFFFF; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:700;">Revisar y aprobar envio</a>
</p>
<p style="font-size:12px; color:#6B7280;">Si queres editar el texto, editalo en Airtable (campo "Borrador Email") antes de aprobar.</p>
  `;

  return resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `[Lead ${qualification.prioridad.toUpperCase()} ${qualification.score}/10] ${qualification.servicio} - ${lead.nombre}`,
    html
  });
}

/**
 * Reply to the lead with the approved draft. Includes Florida notary disclaimer (Fla. Stat. 117.05).
 */
export async function sendLeadReply({ to, subject, body }) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Inter', Arial, sans-serif; color:#1F2937; font-size:15px; line-height:1.6;">
  <div style="max-width:600px;">
    ${textToHtml(body)}
    <hr style="border:none; border-top:1px solid #E5E7EB; margin:32px 0 12px;">
    <p style="font-size:11px; color:#6B7280; line-height:1.4;">${escapeHtml(NOTARY_DISCLAIMER)}</p>
  </div>
</body>
</html>
  `;

  return resend.emails.send({
    from: FROM,
    to,
    replyTo: process.env.ADMIN_EMAIL,
    subject,
    html,
    text: `${body}\n\n---\n${NOTARY_DISCLAIMER}`
  });
}
