import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles, Environment } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

/**
 * Hero 3D canvas — a morphing icosahedron floating in space with
 * sparkles and an orbiting torus knot. Designed to feel "alive"
 * but cheap enough to hold 60fps on a Macbook Air M2.
 */

function Knot() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.x += dt * 0.15;
    ref.current.rotation.y += dt * 0.22;
  });
  return (
    <mesh ref={ref} position={[2.2, -0.6, -1]} scale={0.55}>
      <torusKnotGeometry args={[1, 0.28, 160, 24]} />
      <meshStandardMaterial
        color="#38bdf8"
        emissive="#1e40af"
        emissiveIntensity={0.4}
        roughness={0.25}
        metalness={0.85}
      />
    </mesh>
  );
}

function MorphingBlob() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x = t * 0.18;
    ref.current.rotation.y = t * 0.24;
  });
  return (
    <Float speed={1.4} rotationIntensity={0.4} floatIntensity={1.2}>
      <mesh ref={ref} scale={1.55}>
        <icosahedronGeometry args={[1, 32]} />
        <MeshDistortMaterial
          color="#a855f7"
          emissive="#6b21a8"
          emissiveIntensity={0.6}
          roughness={0.15}
          metalness={0.6}
          distort={0.45}
          speed={1.8}
        />
      </mesh>
    </Float>
  );
}

export default function HeroCanvas() {
  return (
    <Canvas
      dpr={[1, 1.7]}
      camera={{ position: [0, 0, 5], fov: 55 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[0, 0, 0]} />
      <fog attach="fog" args={['#0b0f1f', 6, 14]} />

      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} color="#a855f7" />
      <directionalLight position={[-3, -2, 2]} intensity={0.6} color="#38bdf8" />

      <MorphingBlob />
      <Knot />

      <Sparkles count={80} size={2.5} speed={0.35} scale={[10, 6, 6]} color="#ffffff" />
      <Environment preset="city" />
    </Canvas>
  );
}
