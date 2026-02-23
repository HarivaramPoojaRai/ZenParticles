import React, { useState, useCallback } from 'react';
import ParticleSystem from './components/ParticleSystem';
import HandTracker from './components/HandTracker';
import Controls from './components/Controls';
import { ParticleConfig, ShapeType, HandData } from './types';

function App() {
  const [config, setConfig] = useState<ParticleConfig>({
    shape: ShapeType.SPHERE,
    color: '#33FFF6',
    particleCount: 2000, // Resulting vertices = 2000 * 5 trails = 10k
  });

  const [handData, setHandData] = useState<HandData>({
    isPresent: false,
    tension: 0,
    x: 0.5,
    y: 0.5
  });

  const [isExploding, setIsExploding] = useState(false);

  const handleHandUpdate = useCallback((data: HandData) => {
    setHandData(data);
  }, []);

  const handleClap = useCallback(() => {
    setIsExploding(true);
    // Reset explosion trigger after a brief moment
    setTimeout(() => setIsExploding(false), 200);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black font-sans text-white select-none">
      
      {/* 3D Scene Background */}
      <ParticleSystem 
        config={config} 
        handData={handData} 
        isExploding={isExploding}
      />

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-8 pointer-events-none z-10">
        <h1 className="text-4xl font-light tracking-[0.2em] text-white/90 drop-shadow-lg">
          ZEN<span className="font-bold text-blue-400">PARTICLES</span>
        </h1>
        <p className="mt-2 text-xs text-white/50 tracking-widest uppercase">
          Open hand to Expand &middot; Fist to Contract &middot; Grab Fast to Explode
        </p>
      </div>

      {/* Hand Tracker (Top Right) */}
      <HandTracker onHandUpdate={handleHandUpdate} onClap={handleClap} />

      {/* Controls (Bottom) */}
      <Controls 
        config={config} 
        setConfig={setConfig} 
        tension={handData.isPresent ? handData.tension : 0} 
      />
      
    </div>
  );
}

export default App;