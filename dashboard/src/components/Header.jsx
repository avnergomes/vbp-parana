import { Leaf, BarChart3, MapPin, TrendingUp } from 'lucide-react';

export default function Header() {
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 text-white">
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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          {/* Logo and title */}
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 flex-shrink-0">
              <Leaf className="w-6 h-6 md:w-8 md:h-8 text-primary-100" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold tracking-tight">
                VBP Paraná
              </h1>
              <p className="text-primary-100 text-xs md:text-sm lg:text-base font-medium">
                Inteligência Territorial da Produção Agropecuária
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-2 md:gap-4 lg:gap-6">
            <QuickStat icon={MapPin} label="399" sublabel="Municípios" />
            <QuickStat icon={BarChart3} label="13" sublabel="Anos" />
            <QuickStat icon={TrendingUp} label="200+" sublabel="Produtos" />
          </div>
        </div>

        {/* Description banner */}
        <div className="mt-4 md:mt-6 p-3 md:p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
          <p className="text-primary-50 text-xs md:text-sm leading-relaxed">
            Explore dados do <strong>Valor Bruto da Produção</strong> do estado do Paraná (2012-2024).
            Analise tendências por município, regional, cadeia produtiva e produto.
            Dados oficiais processados para inteligência territorial.
          </p>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-4 md:h-6 lg:h-8">
          <path
            d="M0 48h1440V24c-120 12-240 18-360 18S840 36 720 24 480 0 360 0 120 12 0 24v24z"
            className="fill-neutral-50"
          />
        </svg>
      </div>
    </header>
  );
}

function QuickStat({ icon: Icon, label, sublabel }) {
  return (
    <div className="flex items-center gap-1.5 md:gap-2 px-2 py-1.5 md:px-4 md:py-2 bg-white/10 backdrop-blur-sm rounded-lg md:rounded-xl border border-white/20">
      <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary-200 flex-shrink-0" />
      <div>
        <div className="text-sm md:text-lg font-bold">{label}</div>
        <div className="text-[10px] md:text-xs text-primary-200">{sublabel}</div>
      </div>
    </div>
  );
}
