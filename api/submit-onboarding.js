// POST /api/submit-onboarding
// Body: { sessionId, llcName1, llcName2, llcName3, companyType, businessActivity, country, members: [{name, passport, dob, address, email, phone}], documentUrls: [] }
// Marks order as onboarding complete + notifies admin

import { findOrderBySession, updateOrderWithOnboarding } from '../lib/airtable.js';
import { notifyNewOrder } from '../lib/email.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = req.body;
    if (!data.sessionId) return res.status(400).json({ error: 'Missing sessionId' });

    const order = await findOrderBySession(data.sessionId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!order.fields.Pagado) return res.status(400).json({ error: 'Order not paid' });

    await updateOrderWithOnboarding(order.id, data);

    await notifyNewOrder({
      adminEmail: process.env.ADMIN_EMAIL,
      orderData: {
        customerName: order.fields.Nombre,
        customerEmail: order.fields.Email,
        productType: order.fields.Producto,
        state: order.fields.Estado,
        total: order.fields['Total USD'],
        sessionId: data.sessionId
      }
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[submit-onboarding] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
