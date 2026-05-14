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
/**
 * Gradientes para mapas
 */

// ATLAS-PALETTE-V1
// Re-export the shared Atlas Editorial palette (daltonic-safe).
export { CHART_COLORS, MAP_GRADIENTS, ATLAS_CATEGORICAL, ATLAS_FOREST, ATLAS_WATER, ATLAS_CLAY, ATLAS_EARTH, ATLAS_HARVEST, ATLAS_DIVERGING, ATLAS_CHROME, categoricalColor, sequentialColor } from './chart-palette.js';
