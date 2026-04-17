// Single source of truth for pricing
// Update here when state fees change

export const INCORPORATION_BASE = 749;
export const ANNUAL_BASE = 250;
export const BANK_UPGRADE = 200;

export const INCORPORATION_STATE_FEES = {
  "Florida":         { standard: 125,    express: null },
  "Wyoming":         { standard: null,   express: 103.75 },
  "Delaware":        { standard: 160,    express: 210 },
  "Michigan":        { standard: 50,     express: 100 },
  "North Carolina":  { standard: 128,    express: 228 },
  "New Mexico":      { standard: 0,      express: null },
  "Texas":           { standard: 300,    express: null },
  "Illinois":        { standard: 329,    express: null },
  "Maryland":        { standard: 100,    express: null },
  "Indiana":         { standard: 0,      express: null },
  "Colorado":        { standard: 0,      express: null },
  "Montana":         { standard: 0,      express: null },
  "Nevada":          { standard: null,   express: 435.63 },
  "Pennsylvania":    { standard: 125,    express: null },
  "Georgia":         { standard: 0,      express: null }
};

export const ANNUAL_STATE_FEES = {
  "Arizona":         0,
  "California":      20.46,
  "Colorado":        10,
  "Connecticut":     82,
  "Delaware":        300,
  "Florida":         138.75,
  "Georgia":         60,
  "Hawaii":          15.37,
  "Idaho":           0,
  "Illinois":        75,
  "Indiana":         31.77,
  "Iowa":            30.75,
  "Kansas":          56.37,
  "Kentucky":        15.37,
  "Louisiana":       30.75,
  "Maine":           87.12,
  "Maryland":        309,
  "Massachusetts":   512.5,
  "Michigan":        25,
  "Minnesota":       0,
  "Mississippi":     0,
  "Missouri":        0,
  "Montana":         20,
  "Nebraska":        10.25,
  "Nevada":          350,
  "New Hampshire":   102.5,
  "New Jersey":      76.88,
  "New York":        9.22,
  "North Carolina":  203,
  "North Dakota":    51.25,
  "Ohio":            0,
  "Oklahoma":        25.62,
  "Oregon":          102.5,
  "Pennsylvania":    70,
  "Rhode Island":    51.25,
  "South Carolina":  0,
  "South Dakota":    51.25,
  "Tennessee":       307.5,
  "Texas":           300,
  "Utah":            18.45,
  "Vermont":         35.88,
  "Virginia":        51.25,
  "Washington":      61.5,
  "West Virginia":   25.62,
  "Wisconsin":       25.62,
  "Wyoming":         62.25
};

/**
 * Calculate total for incorporation.
 * @param {string} state - state name
 * @param {'standard'|'express'} speed
 * @param {'virtual'|'traditional'} bank
 * @returns {{total:number, stateFee:number, base:number, bankExtra:number, lineItems:Array}}
 */
export function calculateIncorporation(state, speed, bank) {
  const fees = INCORPORATION_STATE_FEES[state];
  if (!fees) throw new Error(`Unknown state: ${state}`);

  let stateFee = 0;
  if (speed === 'express' && fees.express !== null) {
    stateFee = fees.express;
  } else if (fees.standard !== null) {
    stateFee = fees.standard;
  } else if (fees.express !== null) {
    stateFee = fees.express;
  }

  const bankExtra = bank === 'traditional' ? BANK_UPGRADE : 0;
  const total = INCORPORATION_BASE + stateFee + bankExtra;

  const lineItems = [
    {
      name: `Paquete Incorporacion LLC - ${state}`,
      description: 'Articulos de formacion, EIN, Domicilio, Agente Registral, Operating Agreement, BOI Report, cuenta bancaria',
      amount: INCORPORATION_BASE
    }
  ];

  if (stateFee > 0) {
    lineItems.push({
      name: `Fee estatal de registro - ${state}${speed === 'express' ? ' (Express)' : ''}`,
      description: speed === 'express' ? 'Registro en 1 dia habil' : 'Registro en 3-5 dias habiles',
      amount: stateFee
    });
  }

  if (bankExtra > 0) {
    lineItems.push({
      name: 'Banco tradicional con sede fisica',
      description: 'Cargo adicional por gestion de apertura en banco fisico',
      amount: bankExtra
    });
  }

  return { total, stateFee, base: INCORPORATION_BASE, bankExtra, lineItems };
}

/**
 * Calculate total for annual maintenance.
 */
export function calculateAnnual(state) {
  const stateFee = ANNUAL_STATE_FEES[state];
  if (stateFee === undefined) throw new Error(`Unknown state: ${state}`);

  const total = ANNUAL_BASE + stateFee;

  const lineItems = [
    {
      name: `Paquete Mantenimiento Anual LLC - ${state}`,
      description: 'Domicilio, Agente Registral y Gestion Reporte Anual (1 ano)',
      amount: ANNUAL_BASE
    }
  ];

  if (stateFee > 0) {
    const isFranchise = (state === 'Delaware' || state === 'Texas');
    lineItems.push({
      name: isFranchise ? `Franchise Tax - ${state}` : `Fee estatal - Reporte Anual ${state}`,
      description: isFranchise ? 'Impuesto estatal anual' : 'Fee del Estado por Reporte Anual',
      amount: stateFee
    });
  }

  return { total, stateFee, base: ANNUAL_BASE, lineItems };
}
