import React from 'react';
import { Scissors, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl text-center space-y-4">
        <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 mb-2">
          <Scissors className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
          <span>SoftBarber</span>
          <Sparkles className="w-5 h-5 text-amber-400" />
        </h1>
        <p className="text-zinc-400 text-sm">
          Sistema Inteligente de Agendamentos e Gestão de Pacotes de Barbearia.
        </p>
        <div className="pt-4 border-t border-zinc-800 text-xs text-zinc-500">
          Frontend Vite + React + TypeScript + Tailwind CSS pronto para integração.
        </div>
      </div>
    </div>
  );
};

export default App;
