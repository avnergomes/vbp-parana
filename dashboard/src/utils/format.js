/**
 * Formatação de números e valores para o dashboard VBP Paraná
 */

/**
 * Formata valor em moeda brasileira com notação compacta
 * @param {number} value - Valor a ser formatado
 * @param {boolean} showCurrency - Se deve mostrar "R$"
 * @returns {string}
 */
export function formatCurrency(value, showCurrency = true) {
  if (value === null || value === undefined || isNaN(value)) return '-';

  const prefix = showCurrency ? 'R$ ' : '';
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000_000) {
    return `${sign}${prefix}${(absValue / 1_000_000_000_000).toFixed(1).replace('.', ',')} tri`;
  }
  if (absValue >= 1_000_000_000) {
    return `${sign}${prefix}${(absValue / 1_000_000_000).toFixed(1).replace('.', ',')} bi`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${prefix}${(absValue / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  }
  if (absValue >= 1_000) {
    return `${sign}${prefix}${(absValue / 1_000).toFixed(1).replace('.', ',')} mil`;
  }

  return `${sign}${prefix}${absValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

/**
 * Formata número com notação compacta
 * @param {number} value - Valor a ser formatado
 * @param {string} unit - Unidade opcional (ex: "t", "ha")
 * @returns {string}
 */
export function formatNumber(value, unit = '') {
  if (value === null || value === undefined || isNaN(value)) return '-';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const suffix = unit ? ` ${unit}` : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(1).replace('.', ',')} bi${suffix}`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(1).replace('.', ',')} mi${suffix}`;
  }
  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(1).replace('.', ',')} mil${suffix}`;
  }

  return `${sign}${absValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}${suffix}`;
}

/**
 * Formata porcentagem
 * @param {number} value - Valor decimal (0.1 = 10%)
 * @param {number} decimals - Casas decimais
 * @returns {string}
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return `${(value * 100).toFixed(decimals).replace('.', ',')}%`;
}

/**
 * Formata variação percentual com indicador de direção
 * @param {number} value - Valor da variação (0.1 = +10%)
 * @returns {object} { text, isPositive, isNegative }
 */
export function formatVariation(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return { text: '-', isPositive: false, isNegative: false };
  }

  const percent = (value * 100).toFixed(1).replace('.', ',');
  const isPositive = value > 0;
  const isNegative = value < 0;

  return {
    text: `${isPositive ? '+' : ''}${percent}%`,
    isPositive,
    isNegative
  };
}

/**
 * Calcula variação percentual entre dois valores
 * @param {number} current - Valor atual
 * @param {number} previous - Valor anterior
 * @returns {number|null}
 */
export function calculateVariation(current, previous) {
  if (!previous || previous === 0) return null;
  return (current - previous) / previous;
}

/**
 * Cores para gráficos
 */
export const CHART_COLORS = {
  primary: ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
  secondary: ['#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'],
  accent: ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
  earth: ['#a68f5b', '#8b7648', '#705e3a', '#5c4d32', '#4d412c'],
  rainbow: [
    '#22c55e', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
  ],
};

/**
 * Gradientes para mapas
 */
export const MAP_GRADIENTS = {
  green: ['#dcfce7', '#86efac', '#22c55e', '#15803d', '#14532d'],
  blue: ['#e0f2fe', '#7dd3fc', '#0ea5e9', '#0369a1', '#0c4a6e'],
  yellow: ['#fef3c7', '#fcd34d', '#f59e0b', '#b45309', '#78350f'],
};
