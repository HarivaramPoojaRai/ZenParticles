import { ShapeType } from '../types';

export const TRAIL_LENGTH = 5;

// Helper to generate a random point on a sphere surface
const randomSpherePoint = (r: number) => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi),
  };
};

export const generateGeometry = (type: ShapeType, count: number): { positions: Float32Array, targets: Float32Array, randoms: Float32Array, trailIndices: Float32Array } => {
  const totalVertices = count * TRAIL_LENGTH;
  
  const positions = new Float32Array(totalVertices * 3);
  const targets = new Float32Array(totalVertices * 3);
  const randoms = new Float32Array(totalVertices); // For size variation/noise
  const trailIndices = new Float32Array(totalVertices);

  for (let i = 0; i < count; i++) {
    // Generate the "Target" position based on the shape formula
    let tx = 0, ty = 0, tz = 0;

    switch (type) {
      case ShapeType.SPHERE: {
        const p = randomSpherePoint(2.5);
        tx = p.x; ty = p.y; tz = p.z;
        break;
      }
      case ShapeType.HEART: {
        // Parametric Heart
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        // Basic 3D heart approximation
        // x = 16sin^3(t)
        // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
        // We mix a 2D extrusion to make it 3D or use a volume equation. 
        // Let's use a simpler parametric volume approach:
        const t = Math.random() * Math.PI * 2; // 0 to 2PI
        const u = Math.random() * Math.PI; // 0 to PI (slices)
        
        // This is a known 3D Heart formula
        tx = 16 * Math.pow(Math.sin(t), 3) * Math.sin(u) * 0.15;
        ty = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * Math.sin(u) * 0.15;
        tz = 6 * Math.cos(u) * 0.5; 
        ty += 0.5; // Center it better
        break;
      }
      case ShapeType.FLOWER: {
        // Phyllotaxis
        const angle = i * 137.5 * (Math.PI / 180);
        const r = 0.05 * Math.sqrt(i);
        tx = r * Math.cos(angle);
        ty = r * Math.sin(angle);
        tz = (Math.random() - 0.5) * 1.5 * (1 - r/3); // Curve z slightly based on radius
        
        // Tilt the flower to face camera slightly
        const tilt = 0.5;
        const tempY = ty;
        ty = tempY * Math.cos(tilt) - tz * Math.sin(tilt);
        tz = tempY * Math.sin(tilt) + tz * Math.cos(tilt);
        break;
      }
      case ShapeType.SATURN: {
        const isRing = Math.random() > 0.3;
        if (isRing) {
          // Ring
          const theta = Math.random() * Math.PI * 2;
          const r = 2.0 + Math.random() * 1.5; // Inner to outer radius
          tx = r * Math.cos(theta);
          tz = r * Math.sin(theta);
          ty = (Math.random() - 0.5) * 0.1; // Flat disk
        } else {
          // Planet
          const p = randomSpherePoint(1.2);
          tx = p.x; ty = p.y; tz = p.z;
        }
        // Tilt saturn
        const tilt = 0.4;
        const tempX = tx;
        tx = tempX * Math.cos(tilt) - ty * Math.sin(tilt);
        ty = tempX * Math.sin(tilt) + ty * Math.cos(tilt);
        break;
      }
      case ShapeType.BUDDHA: {
        // Abstract geometric approximation
        const r = Math.random();
        if (r < 0.2) {
          // Head (Sphere)
          const p = randomSpherePoint(0.6);
          tx = p.x; ty = p.y + 1.8; tz = p.z;
        } else if (r < 0.7) {
          // Body (Ellipsoid)
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          tx = 1.2 * Math.sin(phi) * Math.cos(theta);
          ty = 1.4 * Math.sin(phi) * Math.sin(theta); // Usually z in math, mapping to y here
          tz = 1.0 * Math.cos(phi); 
          // Re-map to Y-up
           const tempY = ty;
           ty = 1.4 * Math.cos(phi); // Tall
           tx = 1.2 * Math.sin(phi) * Math.cos(theta);
           tz = 1.0 * Math.sin(phi) * Math.sin(theta);
        } else {
          // Base/Legs (Torus-ish)
          const majorR = 1.2;
          const minorR = 0.5;
          const u = Math.random() * Math.PI * 2;
          const v = Math.random() * Math.PI * 2;
          tx = (majorR + minorR * Math.cos(v)) * Math.cos(u);
          tz = (majorR + minorR * Math.cos(v)) * Math.sin(u);
          ty = minorR * Math.sin(v) - 1.2;
        }
        break;
      }
      case ShapeType.FIREWORKS: {
        // Explosion volume
        const p = randomSpherePoint(0.1 + Math.random() * 3.0);
        tx = p.x; ty = p.y; tz = p.z;
        break;
      }
    }

    // Initial position (Start at center or scattered)
    const startX = (Math.random() - 0.5) * 10;
    const startY = (Math.random() - 0.5) * 10;
    const startZ = (Math.random() - 0.5) * 10;

    const pScale = 0.5 + Math.random();

    // Replicate for trails
    for (let t = 0; t < TRAIL_LENGTH; t++) {
      const idx = (i * TRAIL_LENGTH) + t;
      
      positions[idx * 3] = startX;
      positions[idx * 3 + 1] = startY;
      positions[idx * 3 + 2] = startZ;

      targets[idx * 3] = tx;
      targets[idx * 3 + 1] = ty;
      targets[idx * 3 + 2] = tz;

      randoms[idx] = pScale;
      trailIndices[idx] = t;
    }
  }

  return { positions, targets, randoms, trailIndices };
};