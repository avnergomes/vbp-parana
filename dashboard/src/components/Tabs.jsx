import { BarChart3, Layers, Trophy, Map, Activity, Globe } from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
  { id: 'cadeias', label: 'Cadeias', icon: Layers },
  { id: 'produtos', label: 'Produtos', icon: Trophy },
  { id: 'regionais', label: 'Regionais', icon: Globe },
  { id: 'evolucao', label: 'Evolução', icon: Activity },
  { id: 'mapa', label: 'Mapa', icon: Map },
];

export default function Tabs({ activeTab, onTabChange }) {
  return (
    <div className="flex flex-wrap gap-1.5 md:gap-2 p-1.5 md:p-2 bg-neutral-100/50 rounded-xl md:rounded-2xl overflow-x-auto scrollbar-thin">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all duration-200 flex-shrink-0
              ${isActive
                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/25'
                : 'text-neutral-600 hover:text-primary-700 hover:bg-white/80'
              }`}
          >
            <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isActive ? 'text-primary-100' : ''}`} />
            <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export { tabs };
