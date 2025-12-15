import { Leaf } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-earth-50 via-white to-forest-50">
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-forest-500 to-forest-700 rounded-2xl flex items-center justify-center animate-pulse">
            <Leaf className="w-10 h-10 text-white" />
          </div>
          <div className="absolute inset-0 w-20 h-20 mx-auto rounded-2xl bg-forest-500/30 animate-ping" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-display font-bold text-earth-900">VBP Paraná</h2>
          <p className="text-earth-500 animate-pulse">Carregando dados...</p>
        </div>

        {/* Progress bar */}
        <div className="w-48 h-1.5 bg-earth-200 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-gradient-to-r from-forest-500 to-forest-600 rounded-full animate-loading" />
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-loading {
          animation: loading 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
