import React from 'react';
import { BarChart3, Hammer, TrendingUp, CheckCircle2 } from 'lucide-react';

export function LoginBackground3D() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Background Gradients & Glows */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/50" />
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[60%] bg-blue-400/20 rounded-full mix-blend-multiply filter blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[60%] bg-indigo-400/20 rounded-full mix-blend-multiply filter blur-[120px]" />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[40%] bg-cyan-300/10 rounded-full mix-blend-multiply filter blur-[100px]" />
      
      {/* Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      ></div>

      {/* Inline styles for 3D floating animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-bg-1 {
          0%, 100% { transform: perspective(1200px) rotateY(-20deg) rotateX(15deg) translateY(0); }
          50% { transform: perspective(1200px) rotateY(-20deg) rotateX(15deg) translateY(-20px); }
        }
        @keyframes float-bg-2 {
          0%, 100% { transform: perspective(1200px) rotateY(15deg) rotateX(20deg) translateY(0); }
          50% { transform: perspective(1200px) rotateY(15deg) rotateX(20deg) translateY(-25px); }
        }
        .animate-bg-3d-1 { animation: float-bg-1 8s ease-in-out infinite; }
        .animate-bg-3d-2 { animation: float-bg-2 10s ease-in-out infinite; animation-delay: 2s; }
      `}} />

      {/* 3D Cluster 1: Bottom Left (Opacity increased, repositioned to avoid cut-off) */}
      <div className="absolute -bottom-4 -left-4 lg:bottom-8 lg:left-8 opacity-40 lg:opacity-50 blur-[1px] animate-bg-3d-1">
        {/* Main Card */}
        <div className="w-64 h-80 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 shadow-2xl p-5 flex flex-col justify-between relative">
          <div className="flex items-center gap-3 border-b border-white/40 pb-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Hammer className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-2">
              <div className="w-20 h-3 rounded bg-white/60"></div>
              <div className="w-12 h-2 rounded bg-white/40"></div>
            </div>
          </div>
          <div className="flex-1 mt-4 space-y-3">
            <div className="w-full h-8 bg-white/30 rounded-lg"></div>
            <div className="w-5/6 h-8 bg-white/30 rounded-lg"></div>
            <div className="w-4/6 h-8 bg-white/30 rounded-lg"></div>
          </div>
        </div>

        {/* Floating badge over card 1 */}
        <div className="absolute -top-6 -right-12 w-32 bg-white/50 backdrop-blur-lg rounded-xl border border-white/50 shadow-xl p-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <div className="w-16 h-2.5 bg-white/80 rounded"></div>
        </div>
      </div>

      {/* 3D Cluster 2: Top Right (Opacity increased, blurred) */}
      <div className="absolute -top-10 -right-4 lg:top-12 lg:right-12 opacity-35 lg:opacity-45 blur-[2px] animate-bg-3d-2 hidden md:block">
        <div className="w-72 h-64 bg-gradient-to-br from-indigo-100/50 to-purple-100/30 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-6 relative">
           <div className="flex gap-4">
             <div className="flex-1 bg-white/40 rounded-xl h-24 p-3 shadow-sm border border-white/40">
               <BarChart3 className="w-5 h-5 text-indigo-500 mb-2" />
               <div className="w-10 h-2 bg-white/60 rounded mb-1"></div>
               <div className="w-16 h-3 bg-indigo-400/40 rounded"></div>
             </div>
             <div className="flex-1 bg-white/40 rounded-xl h-24 p-3 shadow-sm border border-white/40">
               <TrendingUp className="w-5 h-5 text-emerald-500 mb-2" />
               <div className="w-10 h-2 bg-white/60 rounded mb-1"></div>
               <div className="w-16 h-3 bg-emerald-400/40 rounded"></div>
             </div>
           </div>
           
           <div className="w-full h-20 bg-white/30 rounded-xl mt-4 border border-white/40 overflow-hidden flex items-end justify-between px-2 pb-2 gap-1.5">
             {[30, 50, 40, 70, 60, 90, 80].map((h, i) => (
                <div key={i} className="w-full bg-indigo-400/30 rounded-t-sm" style={{ height: `${h}%` }}></div>
             ))}
           </div>
        </div>
      </div>

    </div>
  );
}
