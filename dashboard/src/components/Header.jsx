import { Leaf, BarChart3, MapPin, TrendingUp } from 'lucide-react';

export default function Header() {
  return (
    <header className="relative overflow-hidden bg-gradient-to-r from-forest-700 via-forest-600 to-forest-700 text-white">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse">
              <circle cx="25" cy="25" r="1" fill="currentColor" opacity="0.5"/>
              <circle cx="75" cy="75" r="1" fill="currentColor" opacity="0.5"/>
              <circle cx="50" cy="10" r="0.5" fill="currentColor" opacity="0.3"/>
              <circle cx="10" cy="60" r="0.5" fill="currentColor" opacity="0.3"/>
              <circle cx="90" cy="40" r="0.5" fill="currentColor" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grain)"/>
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Logo and title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
              <Leaf className="w-8 h-8 text-forest-200" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
                VBP Paraná
              </h1>
              <p className="text-forest-200 text-sm md:text-base font-medium">
                Inteligência Territorial da Produção Agropecuária
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 md:gap-6">
            <QuickStat icon={MapPin} label="399" sublabel="Municípios" />
            <QuickStat icon={BarChart3} label="13" sublabel="Anos" />
            <QuickStat icon={TrendingUp} label="200+" sublabel="Produtos" />
          </div>
        </div>

        {/* Description banner */}
        <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
          <p className="text-forest-100 text-sm leading-relaxed">
            Explore dados do <strong>Valor Bruto da Produção</strong> do estado do Paraná (2012-2024).
            Analise tendências por município, regional, cadeia produtiva e produto.
            Dados oficiais processados para inteligência territorial.
          </p>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-6 md:h-8">
          <path
            d="M0 48h1440V24c-120 12-240 18-360 18S840 36 720 24 480 0 360 0 120 12 0 24v24z"
            className="fill-earth-50"
          />
        </svg>
      </div>
    </header>
  );
}

function QuickStat({ icon: Icon, label, sublabel }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
      <Icon className="w-5 h-5 text-forest-300" />
      <div>
        <div className="text-lg font-bold">{label}</div>
        <div className="text-xs text-forest-300">{sublabel}</div>
      </div>
    </div>
  );
}
