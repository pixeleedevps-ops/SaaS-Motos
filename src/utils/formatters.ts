// Colombian Formatting Utilities & Helpers

/**
 * Format numbers as Colombian Pesos (COP)
 * Example: 245000 -> "$ 245.000"
 */
export const formatCOP = (amount: number, showCurrencyCode: boolean = false): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '$ 0';
  }
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return showCurrencyCode ? `${formatted} COP` : formatted;
};

/**
 * Colombian VAT / IVA standard rate
 */
export const COLOMBIAN_IVA_RATE = 19; // 19% IVA DIAN

/**
 * Colombian Cities with Departments
 */
export const COLOMBIAN_CITIES = [
  'Bogotá D.C.',
  'Medellín, Antioquia',
  'Cali, Valle del Cauca',
  'Barranquilla, Atlántico',
  'Bucaramanga, Santander',
  'Pereira, Risaralda',
  'Manizales, Caldas',
  'Cartagena, Bolívar',
];

/**
 * Colombian Branches (Sedes)
 */
export const COLOMBIAN_BRANCHES = [
  'Sede Bogotá (Calle 80 - Principal)',
  'Sede Bogotá (7 de Agosto)',
  'Sede Medellín (El Poblado)',
  'Sede Cali (Pasoancho)',
];
