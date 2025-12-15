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
    <div className="flex flex-wrap gap-2 p-2 bg-earth-100/50 rounded-2xl">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
              ${isActive
                ? 'bg-gradient-to-r from-forest-600 to-forest-700 text-white shadow-lg shadow-forest-500/25'
                : 'text-earth-600 hover:text-forest-700 hover:bg-white/80'
              }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-forest-200' : ''}`} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export { tabs };
