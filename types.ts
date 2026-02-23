export enum ShapeType {
  SPHERE = 'Sphere',
  HEART = 'Heart',
  FLOWER = 'Flower',
  SATURN = 'Saturn',
  BUDDHA = 'Buddha',
  FIREWORKS = 'Fireworks',
}

export interface HandData {
  tension: number; // 0.0 (Open) to 1.0 (Fist)
  isPresent: boolean;
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
}

export interface ParticleConfig {
  shape: ShapeType;
  color: string; // Hex
  particleCount: number;
}