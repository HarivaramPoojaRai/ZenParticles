import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { generateGeometry, TRAIL_LENGTH } from '../utils/geometryFactory';
import { ParticleConfig, HandData } from '../types';

interface ParticleSystemProps {
  config: ParticleConfig;
  handData: HandData;
  isExploding: boolean;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({ config, handData, isExploding }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const animationFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const explosionTimeRef = useRef<number>(0);

  // REF FIX: Store handData in a ref so the animation loop always sees the latest version
  const handDataRef = useRef<HandData>(handData);

  useEffect(() => {
    handDataRef.current = handData;
  }, [handData]);

  // Shader Code
  const vertexShader = `
    uniform float uTime;
    uniform float uTension; // 0.0 (Open/Expanded) to 1.0 (Closed/Tight)
    uniform float uExplosion; // 0.0 to 1.0 (1.0 = Max Boom)
    
    attribute vec3 targetPos;
    attribute float randomness;
    attribute float trailIdx; // 0 to 4
    
    varying float vAlpha;
    varying float vTrail;

    // Simplex Noise 3D (Standard Implementation)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    
    float snoise(vec3 v) { 
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i); 
      vec4 p = permute( permute( permute( 
                 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
               + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
      // Lag effect: Offset time based on trail index
      float lag = trailIdx * 0.05;
      float time = uTime - lag;
      
      // Determine mix state
      // uTension 1.0 = Fist = TIGHT formation
      // uTension 0.0 = Open = LOOSE/EXPANDED formation
      float disorder = 1.0 - uTension; 
      
      // Add breathing
      float breath = sin(time * 2.0) * 0.1;
      
      // Noise Field
      vec3 noisePos = targetPos * 0.5 + time * 0.2;
      vec3 noiseVec = vec3(
        snoise(noisePos),
        snoise(noisePos + 100.0),
        snoise(noisePos + 200.0)
      );
      
      // Expansion logic:
      // When disorder is high (Open Hand), scale the position outward
      vec3 finalPos = targetPos;
      
      // 1. Scale expansion based on disorder (Open hand = bigger shape)
      float expansionScale = 1.0 + (disorder * 2.0); 
      finalPos *= expansionScale;

      // 2. Add noise displacement based on disorder (Open hand = more chaotic)
      finalPos += noiseVec * (0.1 + disorder * 0.8);
      
      // Add explosion
      vec3 explDir = normalize(targetPos) * (randomness + 0.5);
      finalPos += explDir * uExplosion * 10.0;
      
      // Scale entire shape slightly by breath
      finalPos *= (1.0 + breath * 0.2);

      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Size attenuation
      // Trail particles are smaller
      float trailScale = 1.0 - (trailIdx / 5.0);
      gl_PointSize = (4.0 * randomness + 2.0) * (30.0 / -mvPosition.z) * trailScale;
      
      // Pass transparency to frag
      vAlpha = 1.0 - (trailIdx / 5.0); // Older trails fade out
      vTrail = trailIdx;
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor;
    varying float vAlpha;
    varying float vTrail;

    void main() {
      // Circular particle
      vec2 uv = gl_PointCoord.xy - 0.5;
      float dist = length(uv);
      
      if (dist > 0.5) discard;
      
      // Soft glow gradient
      float strength = 1.0 - (dist * 2.0);
      strength = pow(strength, 2.0); // sharpen
      
      vec3 finalColor = uColor;
      
      // Make core whiter/hotter
      finalColor = mix(uColor, vec3(1.0), strength * 0.5);
      
      gl_FragColor = vec4(finalColor, strength * vAlpha);
    }
  `;

  // --- Geometry Generation Memoization ---
  const { positions, targets, randoms, trailIndices } = useMemo(() => {
    return generateGeometry(config.shape, config.particleCount);
  }, [config.shape, config.particleCount]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.z = 8;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('targetPos', new THREE.BufferAttribute(targets, 3));
    geometry.setAttribute('randomness', new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute('trailIdx', new THREE.BufferAttribute(trailIndices, 1));

    // Material
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uTension: { value: 0 },
        uExplosion: { value: 0 },
        uColor: { value: new THREE.Color(config.color) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    materialRef.current = material;

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Resize Handler
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.01;

      // REF FIX: Read from ref to get the absolute latest hand data
      const latestHandData = handDataRef.current;

      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = timeRef.current;
        
        // Smoothly interpolate tension
        const currentTension = materialRef.current.uniforms.uTension.value;
        const targetTension = latestHandData.isPresent ? latestHandData.tension : 0.0; // Default to open/expanded if no hand
        materialRef.current.uniforms.uTension.value = THREE.MathUtils.lerp(currentTension, targetTension, 0.1);

        // Handle Explosion decay
        if (materialRef.current.uniforms.uExplosion.value > 0.01) {
           materialRef.current.uniforms.uExplosion.value *= 0.95; // Decay
        }
      }

      // Rotate scene slightly based on hand X/Y
      if (sceneRef.current && latestHandData.isPresent) {
         const targetRotX = (latestHandData.y - 0.5) * 1.0;
         const targetRotY = (latestHandData.x - 0.5) * 1.0;
         sceneRef.current.rotation.x += (targetRotX - sceneRef.current.rotation.x) * 0.05;
         sceneRef.current.rotation.y += (targetRotY - sceneRef.current.rotation.y) * 0.05;
      } else if (sceneRef.current) {
        // Auto rotate if no hand
        sceneRef.current.rotation.y += 0.002;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        containerRef.current?.removeChild(rendererRef.current.domElement);
      }
      geometry.dispose();
      material.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, targets, randoms, trailIndices]); // Re-init when geometry arrays change

  // Updates for props that shouldn't trigger full re-init
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uColor.value.set(config.color);
    }
  }, [config.color]);

  useEffect(() => {
    if (isExploding && materialRef.current) {
      materialRef.current.uniforms.uExplosion.value = 1.0;
      explosionTimeRef.current = timeRef.current;
    }
  }, [isExploding]);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
};

export default ParticleSystem;