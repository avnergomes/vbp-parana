/** @type {import('tailwindcss').Config} */
/* Atlas Editorial theme — shared across datageoparana panel dashboards.
   Same shade keys as the legacy palette; remapped to the earth/forest/clay
   tones used on the datageoparana.github.io landing. */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* primary = forest (was teal). Anchor #2d3f1f. */
        primary: {
          50:  '#f4f6ed',
          100: '#e6ebd5',
          200: '#ccd6ad',
          300: '#aabe7c',
          400: '#84a155',
          500: '#678338',
          600: '#4f6a28',
          700: '#3d5320',
          800: '#2d3f1f',
          900: '#232f17',
          950: '#131a0b',
        },
        /* secondary = river slate (was purple). Anchor #2d5f7f. */
        secondary: {
          50:  '#f0f5f9',
          100: '#d9e6f0',
          200: '#b4cce0',
          300: '#87afcd',
          400: '#5d8eb5',
          500: '#3d729c',
          600: '#2d5f7f',
          700: '#254e69',
          800: '#1f4255',
          900: '#1a3445',
          950: '#102330',
        },
        /* accent = clay terracotta (was amber). Anchor #a8482c. */
        accent: {
          50:  '#fbf2ec',
          100: '#f6e2d3',
          200: '#ecc1a4',
          300: '#e0996d',
          400: '#d27045',
          500: '#c0532e',
          600: '#a8482c',
          700: '#893824',
          800: '#6f2f21',
          900: '#5b291f',
          950: '#2f130d',
        },
        /* dark = warm ink scale (was gunmetal). */
        dark: {
          50:  '#efe9da',
          100: '#dcd2b9',
          200: '#b6a682',
          300: '#918058',
          400: '#6e6453',
          500: '#574e3f',
          600: '#3c342a',
          700: '#2a2419',
          800: '#1a1610',
          900: '#14110c',
          950: '#0a0805',
        },
        /* neutral = paper to ink. */
        neutral: {
          50:  '#f5efde',
          100: '#f1e9d6',
          200: '#e8dfca',
          300: '#d4c8a8',
          400: '#b6a682',
          500: '#918058',
          600: '#6e6453',
          700: '#3c342a',
          800: '#1a1610',
          900: '#14110c',
          950: '#0a0805',
        },
        /* forest semantic — same as primary. */
        forest: {
          50:  '#f4f6ed',
          100: '#e6ebd5',
          200: '#ccd6ad',
          300: '#aabe7c',
          400: '#84a155',
          500: '#678338',
          600: '#4f6a28',
          700: '#3d5320',
          800: '#2d3f1f',
          900: '#232f17',
          950: '#131a0b',
        },
        /* earth semantic — neutral khaki/stone. */
        earth: {
          50:  '#faf6ea',
          100: '#f1e9d6',
          200: '#e2d2ad',
          300: '#cdb277',
          400: '#b08e4a',
          500: '#917235',
          600: '#74592a',
          700: '#574325',
          800: '#3b2e1c',
          900: '#231b11',
          950: '#120e09',
        },
        /* water semantic — same as secondary river. */
        water: {
          50:  '#f0f5f9',
          100: '#d9e6f0',
          200: '#b4cce0',
          300: '#87afcd',
          400: '#5d8eb5',
          500: '#3d729c',
          600: '#2d5f7f',
          700: '#254e69',
          800: '#1f4255',
          900: '#1a3445',
          950: '#102330',
        },
        /* harvest = wheat/mustard. Anchor #c89b3c. */
        harvest: {
          50:  '#fbf5e7',
          100: '#f6e9c5',
          200: '#ecd28a',
          300: '#e0b850',
          400: '#c89b3c',
          500: '#a87f2d',
          600: '#876522',
          700: '#6a4f1c',
          800: '#4d3915',
          900: '#302309',
          950: '#1a1404',
        },
      },
      fontFamily: {
        sans:    ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        serif:   ['"Fraunces"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        mono:    ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        /* Hairline shadows — flat, printed feel. */
        'soft': '0 1px 0 rgba(20,17,12,0.08)',
        'card': '0 0 0 1px rgba(20,17,12,0.16)',
      },
      borderRadius: {
        /* Sharpen everything — atlas printed look. */
        'sm':   '0',
        'DEFAULT': '0',
        'md':   '0',
        'lg':   '0',
        'xl':   '0',
        '2xl':  '0',
        '3xl':  '0',
        'full': '9999px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'nature-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L30 60M0 30L60 30' stroke='%232d3f1f' stroke-width='0.5' opacity='0.08'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
