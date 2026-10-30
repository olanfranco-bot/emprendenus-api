// HMAC token for the lead approval link (so only Onell can approve a send)
// Expects env vars: LEAD_APPROVAL_SECRET

import crypto from 'crypto';

export function signLeadId(leadId) {
  const secret = process.env.LEAD_APPROVAL_SECRET;
  if (!secret) throw new Error('Missing LEAD_APPROVAL_SECRET');
  return crypto.createHmac('sha256', secret).update(leadId).digest('hex');
}

export function verifyLeadToken(leadId, token) {
  if (typeof leadId !== 'string' || typeof token !== 'string') return false;
  const expected = Buffer.from(signLeadId(leadId));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
