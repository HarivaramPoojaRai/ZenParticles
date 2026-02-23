import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { Camera, RefreshCw, AlertCircle } from 'lucide-react';
import { HandData } from '../types';

interface HandTrackerProps {
  onHandUpdate: (data: HandData) => void;
  onClap: () => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onHandUpdate, onClap }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const lastTensionRef = useRef<number>(0);
  const lastClapTimeRef = useRef<number>(0);

  // Initialize MediaPipe
  const setupMediaPipe = async () => {
    try {
      setLoading(true);
      setError(null);
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      
      startCamera();
    } catch (err) {
      setError("Failed to load AI models.");
      setLoading(false);
      console.error(err);
    }
  };

  const startCamera = async () => {
    try {
      // Request a reasonable size, but handle whatever the browser gives
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 320 }, 
            height: { ideal: 240 },
            facingMode: "user"
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for metadata to load to know dimensions and play
        videoRef.current.onloadedmetadata = () => {
             if (videoRef.current) {
                 videoRef.current.play().then(() => {
                     // Start loop once playing
                     predict();
                 }).catch(e => console.error("Play error:", e));
             }
        };
      }
      setLoading(false);
    } catch (err) {
      setError("Camera access denied.");
      setLoading(false);
      console.error("Camera Error:", err);
    }
  };

  const calculateTension = (landmarks: any[]) => {
    // 0 is wrist
    // Tips: 4 (Thumb), 8 (Index), 12 (Middle), 16 (Ring), 20 (Pinky)
    // MCPs (Knuckles): 5, 9, 13, 17
    
    const wrist = landmarks[0];
    const tips = [4, 8, 12, 16, 20];
    
    // Calculate simple palm scale (distance from wrist to Index MCP)
    const dx = landmarks[9].x - wrist.x;
    const dy = landmarks[9].y - wrist.y;
    const dz = landmarks[9].z - wrist.z;
    const palmScale = Math.sqrt(dx*dx + dy*dy + dz*dz);

    let totalDist = 0;
    tips.forEach(idx => {
      const ddx = landmarks[idx].x - wrist.x;
      const ddy = landmarks[idx].y - wrist.y;
      const ddz = landmarks[idx].z - wrist.z;
      totalDist += Math.sqrt(ddx*ddx + ddy*ddy + ddz*ddz);
    });

    const avgDist = totalDist / 5;
    
    // Normalize based on heuristic ratios
    // Fully open hand: avgDist/palmScale is approx 2.2 - 2.5
    // Closed fist: avgDist/palmScale is approx 0.8 - 1.0
    
    const ratio = avgDist / (palmScale || 0.1);
    
    // Map ratio to 0-1 tension
    // High ratio (Open) -> Low Tension (0)
    // Low ratio (Fist) -> High Tension (1)
    
    const minRatio = 1.0; // Fist
    const maxRatio = 2.2; // Open
    
    let tension = 1.0 - ((ratio - minRatio) / (maxRatio - minRatio));
    tension = Math.max(0, Math.min(1, tension));
    
    return tension;
  };

  const predict = useCallback(() => {
    if (!handLandmarkerRef.current || !videoRef.current || !canvasRef.current) return;

    // Ensure video has dimensions
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        requestRef.current = requestAnimationFrame(predict);
        return;
    }

    // Sync canvas size to video size
    if (canvasRef.current.width !== videoRef.current.videoWidth || canvasRef.current.height !== videoRef.current.videoHeight) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
    }

    const startTimeMs = performance.now();
    
    if (videoRef.current.currentTime > 0) {
      const results = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
      
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Horizontal flip for mirror effect
        ctx.translate(canvasRef.current.width, 0);
        ctx.scale(-1, 1);

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          
          // Draw simple visualizer
          const drawingUtils = new DrawingUtils(ctx);
          drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 2
          });
          
          const tension = calculateTension(landmarks);
          
          // Clap Detection
          const tensionDelta = tension - lastTensionRef.current;
          const now = Date.now();
          
          if (tensionDelta > 0.4 && (now - lastClapTimeRef.current > 500)) {
             onClap();
             lastClapTimeRef.current = now;
          }

          lastTensionRef.current = tension;
          
          // Normalized Center X/Y
          const centerX = 1.0 - landmarks[9].x; // Flip X because of mirror
          const centerY = landmarks[9].y;

          onHandUpdate({
            isPresent: true,
            tension: tension,
            x: centerX,
            y: centerY
          });

        } else {
            // No hand
            onHandUpdate({
                isPresent: false,
                tension: 0,
                x: 0.5,
                y: 0.5
            });
        }
        ctx.restore();
      }
    }

    requestRef.current = requestAnimationFrame(predict);
  }, [onHandUpdate, onClap]);

  useEffect(() => {
    setupMediaPipe();
    return () => {
        if(requestRef.current) cancelAnimationFrame(requestRef.current);
        if(videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative w-32 h-24 bg-black/50 rounded-lg overflow-hidden border border-white/20 backdrop-blur-sm shadow-xl">
        {loading && (
           <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
             <RefreshCw className="w-6 h-6 text-white animate-spin" />
           </div>
        )}
        
        {error ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center z-10 bg-black/80">
                <AlertCircle className="w-6 h-6 text-red-500 mb-1" />
                <span className="text-xs text-red-200 leading-tight">Camera Error</span>
                <button onClick={setupMediaPipe} className="mt-1 text-[10px] bg-white/20 px-2 py-0.5 rounded hover:bg-white/30 text-white">Retry</button>
             </div>
        ) : (
            <>
                {/* 
                  Video is visually hidden via opacity but exists in DOM for processing. 
                  Removed 'hidden' class which equates to display:none.
                */}
                <video 
                    ref={videoRef} 
                    className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none" 
                    autoPlay 
                    playsInline 
                    muted 
                />
                <canvas 
                    ref={canvasRef} 
                    className="absolute inset-0 w-full h-full object-cover opacity-80" 
                />
            </>
        )}
        
        <div className="absolute bottom-1 left-1 flex items-center space-x-1 z-20">
            <Camera className="w-3 h-3 text-white/50" />
            <span className="text-[8px] text-white/50 uppercase tracking-wider">Vision</span>
        </div>
      </div>
    </div>
  );
};

export default HandTracker;