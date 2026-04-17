import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  basico: 'price_1TNC8dEoRhP9xfa8iH9nTDBe',
  pro: 'price_1TNCACEoRhP9xfa8cbQdHruX',
  family_office: 'price_1TNCAvEoRhP9xfa8qu5UxTXY'
};

const PLAN_NAMES = {
  basico: 'Proteccion Patrimonial - Basico',
  pro: 'Proteccion Patrimonial - Pro',
  family_office: 'Proteccion Patrimonial - Family Office'
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://emprendenus.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, email } = req.body || {};
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan. Use basico | pro | family_office' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://emprendenus.com/gracias?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://emprendenus.com/proteccion-patrimonial/',
      customer_email: email || undefined,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: { product: 'proteccion_patrimonial', plan }
    });

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      plan,
      planName: PLAN_NAMES[plan]
    });
  } catch (err) {
    console.error('create-subscription error:', err);
    return res.status(500).json({ error: err.message });
  }
}
