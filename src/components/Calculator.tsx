import React, { useState } from 'react';
import { Delete, X } from 'lucide-react';

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleNumber = (num: string) => {
    setDisplay(prev => prev === '0' ? num : prev + num);
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      const fullEquation = equation + display;
      // Use Function instead of eval for a bit more safety in this context
      const result = new Function(`return ${fullEquation}`)();
      setDisplay(String(result));
      setEquation('');
    } catch (e) {
      setDisplay('Erro');
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
  };

  return (
    <div className="bg-zinc-900/40 backdrop-blur-2xl p-8 rounded-[3rem] shadow-2xl w-full max-w-sm mx-auto border border-white/10 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div className="mb-8 text-right relative z-10">
        <div className="text-zinc-500 text-sm font-bold tracking-widest h-6 overflow-hidden uppercase">{equation || 'Pronto'}</div>
        <div className="text-white text-3xl md:text-5xl font-black tracking-tighter mt-2 break-all text-right leading-none">{display}</div>
      </div>
      <div className="grid grid-cols-4 gap-3 relative z-10">
        <button onClick={clear} className="col-span-2 bg-zinc-800/50 text-zinc-300 p-5 rounded-3xl hover:bg-zinc-700 transition-all font-bold text-lg border border-white/5">AC</button>
        <button onClick={() => setDisplay(prev => prev.slice(0, -1) || '0')} className="bg-zinc-800/50 text-zinc-300 p-5 rounded-3xl hover:bg-zinc-700 flex items-center justify-center border border-white/5"><Delete size={24} /></button>
        <button onClick={() => handleOperator('/')} className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 rounded-3xl hover:scale-105 transition-all font-black text-xl shadow-lg shadow-emerald-500/20">/</button>
        
        {[7, 8, 9].map(n => (
          <button key={n} onClick={() => handleNumber(String(n))} className="bg-white/5 text-white p-5 rounded-3xl hover:bg-white/10 transition-all font-bold text-xl border border-white/5">{n}</button>
        ))}
        <button onClick={() => handleOperator('*')} className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-5 rounded-3xl hover:scale-105 transition-all font-black text-xl shadow-lg shadow-blue-500/20">×</button>
        
        {[4, 5, 6].map(n => (
          <button key={n} onClick={() => handleNumber(String(n))} className="bg-white/5 text-white p-5 rounded-3xl hover:bg-white/10 transition-all font-bold text-xl border border-white/5">{n}</button>
        ))}
        <button onClick={() => handleOperator('-')} className="bg-gradient-to-br from-purple-500 to-pink-600 text-white p-5 rounded-3xl hover:scale-105 transition-all font-black text-xl shadow-lg shadow-purple-500/20">-</button>
        
        {[1, 2, 3].map(n => (
          <button key={n} onClick={() => handleNumber(String(n))} className="bg-white/5 text-white p-5 rounded-3xl hover:bg-white/10 transition-all font-bold text-xl border border-white/5">{n}</button>
        ))}
        <button onClick={() => handleOperator('+')} className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-5 rounded-3xl hover:scale-105 transition-all font-black text-xl shadow-lg shadow-orange-500/20">+</button>
        
        <button onClick={() => handleNumber('0')} className="col-span-2 bg-white/5 text-white p-5 rounded-3xl hover:bg-white/10 transition-all font-bold text-xl border border-white/5">0</button>
        <button onClick={() => handleNumber('.')} className="bg-white/5 text-white p-5 rounded-3xl hover:bg-white/10 transition-all font-bold text-xl border border-white/5">.</button>
        <button onClick={calculate} className="bg-white text-black p-5 rounded-3xl hover:scale-105 transition-all font-black text-xl shadow-xl shadow-white/20">=</button>
      </div>
    </div>
  );
}
