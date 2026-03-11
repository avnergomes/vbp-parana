import { useRef, useEffect, useState } from 'react';
import { BarChart3, Layers, Trophy, Map, Activity, Globe, ChevronLeft, ChevronRight } from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
  { id: 'cadeias', label: 'Cadeias', icon: Layers },
  { id: 'produtos', label: 'Produtos', icon: Trophy },
  { id: 'regionais', label: 'Regionais', icon: Globe },
  { id: 'evolucao', label: 'Evolução', icon: Activity },
  { id: 'mapa', label: 'Mapa', icon: Map },
];

export default function Tabs({ activeTab, onTabChange }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-neutral-200 md:hidden"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="w-4 h-4 text-neutral-600" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex gap-1.5 md:gap-2 p-1.5 md:p-2 bg-neutral-100/50 rounded-xl md:rounded-2xl overflow-x-auto scrollbar-thin"
      >
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all duration-200 flex-shrink-0
                ${isActive
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/25 scale-[1.02]'
                  : 'text-neutral-600 hover:text-primary-700 hover:bg-white/80'
                }`}
              aria-selected={isActive}
              role="tab"
            >
              <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isActive ? 'text-primary-100' : ''}`} />
              <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
      {canScrollRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-neutral-200 md:hidden"
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="w-4 h-4 text-neutral-600" />
        </button>
      )}
    </div>
  );
}

export { tabs };
