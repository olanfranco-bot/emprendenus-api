// POST /api/stripe-webhook
// Receives Stripe webhook events, verifies signature, processes checkout.session.completed

import Stripe from 'stripe';
import { createOrder } from '../lib/airtable.js';
import { sendPaymentConfirmation } from '../lib/email.js';

export const config = {
  api: { bodyParser: false }  // raw body needed for signature verification
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

async function buffer(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      const customerEmail = session.customer_details?.email || session.customer_email;
      const customerName = session.customer_details?.name || '';
      const customerPhone = session.customer_details?.phone || '';

      // Create Airtable order
      await createOrder({
        sessionId: session.id,
        product: session.metadata.product,
        productType: session.metadata.productType,
        state: session.metadata.state,
        speed: session.metadata.speed,
        bank: session.metadata.bank,
        total: parseFloat(session.metadata.total),
        customerEmail,
        customerName,
        customerPhone,
        paid: true
      });

      // Send confirmation email with onboarding link
      await sendPaymentConfirmation({
        to: customerEmail,
        name: customerName,
        sessionId: session.id,
        product: session.metadata.productType,
        state: session.metadata.state,
        total: session.metadata.total
      });

      console.log(`[webhook] processed session ${session.id}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhook] handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
