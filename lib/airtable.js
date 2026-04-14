// Airtable integration
// Expects env vars: AIRTABLE_API_KEY, AIRTABLE_BASE_ID

import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

/**
 * Create a new Order record in Airtable after successful Stripe payment.
 */
export async function createOrder({
  sessionId,
  product,
  productType,
  state,
  speed,
  bank,
  total,
  customerEmail,
  customerName,
  customerPhone,
  paid = false,
  onboardingCompleted = false
}) {
  const record = await base('Orders').create([
    {
      fields: {
        'Stripe Session ID': sessionId,
        'Producto': productType,
        'Tipo Producto': product,
        'Estado': state,
        'Velocidad': speed || '',
        'Banco': bank || '',
        'Total USD': total,
        'Email': customerEmail,
        'Nombre': customerName || '',
        'Telefono': customerPhone || '',
        'Pagado': paid,
        'Onboarding Completado': onboardingCompleted,
        'Fecha Pago': paid ? new Date().toISOString() : null,
        'Estado Orden': paid ? 'Pagado - Pendiente Onboarding' : 'Pendiente Pago'
      }
    }
  ]);
  return record[0];
}

/**
 * Find order by Stripe session ID.
 */
export async function findOrderBySession(sessionId) {
  const records = await base('Orders').select({
    filterByFormula: `{Stripe Session ID} = '${sessionId}'`,
    maxRecords: 1
  }).firstPage();
  return records[0] || null;
}

/**
 * Update order with onboarding data.
 */
export async function updateOrderWithOnboarding(orderId, onboardingData) {
  const record = await base('Orders').update(orderId, {
    'Onboarding Completado': true,
    'Fecha Onboarding': new Date().toISOString(),
    'Estado Orden': 'En Proceso',
    'Nombre LLC Opcion 1': onboardingData.llcName1 || '',
    'Nombre LLC Opcion 2': onboardingData.llcName2 || '',
    'Nombre LLC Opcion 3': onboardingData.llcName3 || '',
    'Tipo Sociedad': onboardingData.companyType || '',
    'Objeto Social': onboardingData.businessActivity || '',
    'Pais Residencia': onboardingData.country || '',
    'Socios JSON': JSON.stringify(onboardingData.members || []),
    'Docs URLs': (onboardingData.documentUrls || []).join('\n')
  });
  return record;
}
