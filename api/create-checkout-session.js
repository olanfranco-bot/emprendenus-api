// POST /api/create-checkout-session
// Body: { product: 'incorporation'|'annual', state, speed?, bank?, email? }
// Returns: { url, sessionId }

import Stripe from 'stripe';
import { calculateIncorporation, calculateAnnual } from '../lib/pricing.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia'
});

const SITE_URL = process.env.SITE_URL || 'https://emprendenus.com';

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { product, state, speed, bank, email } = req.body;

    if (!product || !state) {
      return res.status(400).json({ error: 'Missing product or state' });
    }

    let calc;
    let productType;
    if (product === 'incorporation') {
      calc = calculateIncorporation(state, speed || 'standard', bank || 'virtual');
      productType = 'Incorporacion LLC';
    } else if (product === 'annual') {
      calc = calculateAnnual(state);
      productType = 'Mantenimiento Anual';
    } else {
      return res.status(400).json({ error: 'Invalid product type' });
    }

    // Build Stripe line_items
    const line_items = calc.lineItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description
        },
        unit_amount: Math.round(item.amount * 100) // cents
      },
      quantity: 1
    }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      customer_email: email || undefined,
      success_url: `${SITE_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/cotizador-${product === 'incorporation' ? 'incorporacion' : 'anuales'}/?canceled=1`,
      metadata: {
        product,
        productType,
        state,
        speed: speed || 'n/a',
        bank: bank || 'n/a',
        total: calc.total.toString()
      },
      // Enable Stripe Tax if configured
      automatic_tax: { enabled: false },
      // Collect billing address for invoicing
      billing_address_collection: 'required',
      // Phone collection useful for onboarding
      phone_number_collection: { enabled: true },
      // Locale in Spanish
      locale: 'es'
    });

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      total: calc.total
    });
  } catch (err) {
    console.error('[create-checkout-session] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
