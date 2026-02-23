import React from 'react';
import { ShapeType, ParticleConfig } from '../types';
import { Heart, Globe, Hexagon, Zap, Flower, User } from 'lucide-react';

interface ControlsProps {
  config: ParticleConfig;
  setConfig: React.Dispatch<React.SetStateAction<ParticleConfig>>;
  tension: number;
}

const SHAPES = [
  { type: ShapeType.SPHERE, icon: Globe },
  { type: ShapeType.HEART, icon: Heart },
  { type: ShapeType.FLOWER, icon: Flower },
  { type: ShapeType.SATURN, icon: Hexagon },
  { type: ShapeType.BUDDHA, icon: User },
  { type: ShapeType.FIREWORKS, icon: Zap },
];

const COLORS = [
  '#FF5733', // Red-Orange
  '#33FF57', // Green
  '#3357FF', // Blue
  '#F3FF33', // Yellow
  '#FF33F6', // Magenta
  '#33FFF6', // Cyan
  '#FFFFFF', // White
];

const Controls: React.FC<ControlsProps> = ({ config, setConfig, tension }) => {
  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 w-[90%] max-w-2xl">
      <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
        
        {/* Tension Bar */}
        <div className="w-full flex items-center space-x-3">
            <span className="text-[10px] uppercase tracking-widest text-white/50 w-12 text-right">Tension</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100 ease-out"
                  style={{ width: `${tension * 100}%` }}
                />
            </div>
            <span className="text-[10px] text-white/50 w-8">{Math.round(tension * 100)}%</span>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Shape Selectors */}
          <div className="flex space-x-2">
            {SHAPES.map((item) => {
              const Icon = item.icon;
              const isActive = config.shape === item.type;
              return (
                <button
                  key={item.type}
                  onClick={() => setConfig(prev => ({ ...prev, shape: item.type }))}
                  className={`p-3 rounded-xl transition-all duration-300 relative group ${
                    isActive ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-transparent text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                  title={item.type}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                  {isActive && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="w-px h-8 bg-white/10 hidden md:block" />

          {/* Color Selectors */}
          <div className="flex space-x-3">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setConfig(prev => ({ ...prev, color: c }))}
                className={`w-6 h-6 rounded-full transition-transform hover:scale-125 border-2 ${
                  config.color === c ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c, boxShadow: config.color === c ? `0 0 10px ${c}` : 'none' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;