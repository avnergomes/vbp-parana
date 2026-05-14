/**
 * Atlas Editorial — Chart palette
 *
 * Designed for the datageoparana panel ecosystem.
 *
 * Accessibility goals:
 *   - Categorical series use the Okabe-Ito qualitative palette, which is
 *     distinguishable by all common forms of color vision deficiency
 *     (protan/deutan/tritan) and on grayscale prints.
 *   - Sequential ramps are single-hue (forest, water, clay, earth), so
 *     order is preserved by luminance even under full achromatopsia.
 *   - Diverging ramps are clay ↔ paper ↔ water — brown vs. blue endpoints,
 *     never red vs. green, with a distinct neutral midpoint.
 *
 * Visual goals:
 *   - Tones align with the Atlas Editorial earth / forest / clay / paper system
 *     used on datageoparana.github.io.
 *   - Axes, grids and tooltip chrome read like printed cartography.
 *
 * Drop-in: this file is copied into every panel dashboard at
 *   src/utils/chart-palette.js
 * and re-exported from utils/format.js so existing imports keep working.
 */

// Okabe-Ito qualitative — proven colorblind-safe (8% of male users).
// Reference: Okabe & Ito, "Color Universal Design" (2002).
export const ATLAS_CATEGORICAL = [
  '#0072B2', // blue
  '#D55E00', // vermillion
  '#009E73', // bluish green
  '#E69F00', // orange
  '#CC79A7', // reddish purple
  '#56B4E9', // sky blue
  '#F0E442', // yellow
  '#2a2419', // atlas ink (was Okabe-Ito black)
];

// Single-hue sequentials — monotonic luminance, inherently colorblind-safe.
export const ATLAS_FOREST = ['#e6ebd5', '#ccd6ad', '#aabe7c', '#678338', '#3d5320', '#232f17'];
export const ATLAS_WATER  = ['#d9e6f0', '#b4cce0', '#87afcd', '#3d729c', '#254e69', '#1a3445'];
export const ATLAS_CLAY   = ['#f6e2d3', '#ecc1a4', '#e0996d', '#c0532e', '#893824', '#5b291f'];
export const ATLAS_EARTH  = ['#f1e9d6', '#e2d2ad', '#cdb277', '#917235', '#574325', '#231b11'];
export const ATLAS_HARVEST = ['#f6e9c5', '#ecd28a', '#e0b850', '#c89b3c', '#876522', '#4d3915'];

// Diverging clay ↔ paper ↔ water — brown vs. blue, colorblind-safe.
export const ATLAS_DIVERGING = [
  '#893824', '#c0532e', '#e0996d', '#f1e9d6', '#87afcd', '#3d729c', '#254e69',
];

// Chrome tokens — used by axes, grids, tooltip borders, legend text.
export const ATLAS_CHROME = {
  grid:        '#d4c8a8',  // neutral-300
  axisLine:    '#b6a682',  // neutral-400
  axisTick:    '#3c342a',  // neutral-700
  axisLabel:   '#3c342a',
  legendText:  '#3c342a',
  paper:       '#f1e9d6',
  ink:         '#14110c',
  mutedText:   '#6e6453',
};

// Legacy-compatible API. Drop-in for the old CHART_COLORS / MAP_GRADIENTS
// objects so existing imports keep working without touching call sites.
export const CHART_COLORS = {
  primary:    ATLAS_FOREST.slice(1, 6),
  secondary:  ATLAS_WATER.slice(1, 6),
  accent:     ATLAS_CLAY.slice(1, 6),
  earth:      ATLAS_EARTH.slice(1, 6),
  harvest:    ATLAS_HARVEST.slice(1, 6),
  rainbow:    ATLAS_CATEGORICAL,
  categorical: ATLAS_CATEGORICAL,
  diverging:  ATLAS_DIVERGING,
  chrome:     ATLAS_CHROME,
};

export const MAP_GRADIENTS = {
  green:   ATLAS_FOREST,
  blue:    ATLAS_WATER,
  yellow:  ATLAS_HARVEST,
  clay:    ATLAS_CLAY,
  earth:   ATLAS_EARTH,
  forest:  ATLAS_FOREST,
  water:   ATLAS_WATER,
  harvest: ATLAS_HARVEST,
};

// Get the i-th categorical color, wrapping around.
export function categoricalColor(i) {
  return ATLAS_CATEGORICAL[i % ATLAS_CATEGORICAL.length];
}

// Get a sequential color from a ramp at fractional position [0,1].
export function sequentialColor(ramp, t) {
  const arr = Array.isArray(ramp) ? ramp : ATLAS_FOREST;
  const idx = Math.max(0, Math.min(arr.length - 1, Math.round(t * (arr.length - 1))));
  return arr[idx];
}

// SVG <defs> patterns for non-color encoding on bars/areas (daltonic safety
// when many overlapping series share similar hues). Mount once per chart;
// reference via fill="url(#atlas-pattern-stripes)" etc.
export const ATLAS_PATTERNS_SVG = `
<defs>
  <pattern id="atlas-pattern-stripes" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" stroke-width="2" opacity="0.45"/>
  </pattern>
  <pattern id="atlas-pattern-dots" patternUnits="userSpaceOnUse" width="6" height="6">
    <circle cx="3" cy="3" r="1.1" fill="currentColor" opacity="0.55"/>
  </pattern>
  <pattern id="atlas-pattern-grid" patternUnits="userSpaceOnUse" width="6" height="6">
    <path d="M 6 0 L 0 0 0 6" fill="none" stroke="currentColor" stroke-width="0.6" opacity="0.55"/>
  </pattern>
  <pattern id="atlas-pattern-cross" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
    <line x1="0" y1="0" x2="8" y2="0" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
  </pattern>
</defs>
`;

export const ATLAS_PATTERN_IDS = [
  'atlas-pattern-stripes',
  'atlas-pattern-dots',
  'atlas-pattern-grid',
  'atlas-pattern-cross',
];

export default {
  ATLAS_CATEGORICAL,
  ATLAS_FOREST,
  ATLAS_WATER,
  ATLAS_CLAY,
  ATLAS_EARTH,
  ATLAS_HARVEST,
  ATLAS_DIVERGING,
  ATLAS_CHROME,
  CHART_COLORS,
  MAP_GRADIENTS,
  categoricalColor,
  sequentialColor,
};
