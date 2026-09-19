import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Sparkles, Float } from '@react-three/drei';
import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { skillCategories as defaultSkillCategories } from '../../lib/data';

export type SkillCategory = {
  label: string;
  color: string;
  skills: { name: string; level: number }[];
};

/**
 * Skills 3D — next-gen premium cluster.
 *
 *   Each skill is a small glossy solid on a Fibonacci sphere.
 *   Improvements over the first pass:
 *     · Central pulsing "core" sphere with a soft primary-green rim,
 *       plus a translucent halo around it.
 *     · Skill nodes use MeshPhysicalMaterial with clearcoat, so light
 *       catches on them like a wet-glass finish.
 *     · Faint tapered lines from the core to every node (light rays)
 *       so the cluster reads as connected rather than random points.
 *     · Three orbital guide rings at different tilts, rotating at
 *       different speeds — pure decoration for depth.
 *     · Ambient particles (drei Sparkles) drift through the volume.
 *     · Hover a node → node lifts, halos pulse harder, tooltip appears.
 *     · Whole cluster spins on Y with a scroll-velocity kick so the
 *       animation reacts to page scroll.
 */

type NodeProps = {
  position: [number, number, number];
  color: string;
  label: string;
  level: number;
  index: number;
};

/* Shared mutable scroll-velocity signal — R3F frames can't call Framer
   hooks, so we mirror scroll velocity onto a module-level ref. */
const scrollKick = { v: 0 };

function useScrollVelocity() {
  useEffect(() => {
    let last = window.scrollY;
    let lastT = performance.now();
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      const dy = window.scrollY - last;
      const v = Math.min(2.5, Math.abs(dy) / dt);
      scrollKick.v = scrollKick.v * 0.85 + v * 0.15;
      last = window.scrollY;
      lastT = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}

/* ─────────────────────────  Skill node  ───────────────────────── */

function SkillNode({ position, color, label, level, index }: NodeProps) {
  const ref = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, dt) => {
    if (!ref.current) return;
    // Hover-scale spring + subtle idle breathing per-index.
    const t = state.clock.getElapsedTime();
    const idleScale = 1 + Math.sin(t * 1.4 + index * 0.6) * 0.05;
    const target = (hovered ? 1.5 : 1) * idleScale;
    ref.current.scale.lerp(new THREE.Vector3(target, target, target), Math.min(1, dt * 8));
    // Self-rotation for that shifting-facet sparkle.
    ref.current.rotation.x += dt * 0.25;
    ref.current.rotation.y += dt * 0.32;
    // Halo pulses opacity slightly.
    if (halo.current) {
      const m = halo.current.material as THREE.MeshBasicMaterial;
      m.opacity = hovered ? 0.55 : 0.18 + Math.sin(t * 2 + index) * 0.06;
    }
  });

  useEffect(() => () => { document.body.style.cursor = 'auto'; }, []);

  const size = 0.28 + level / 500;

  return (
    <group position={position}>
      {/* Halo — larger transparent sphere behind the solid. */}
      <mesh ref={halo}>
        <sphereGeometry args={[size * 2.2, 20, 20]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      {/* Core icosahedron with a premium physical material. */}
      <mesh
        ref={ref}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <icosahedronGeometry args={[size, 1]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 1.6 : 0.9}
          roughness={0.18}
          metalness={0.35}
          clearcoat={1}
          clearcoatRoughness={0.15}
          reflectivity={0.7}
        />
      </mesh>
      {hovered && (
        <Html distanceFactor={8} center>
          <div className="px-3 py-1.5 rounded-lg text-xs whitespace-nowrap glass ambient-float text-ink">
            <span className="font-semibold">{label}</span>
            <span className="text-muted ml-2 font-num">· {level}%</span>
          </div>
        </Html>
      )}
    </group>
  );
}

/* ─────────────────────────  Core hub  ───────────────────────── */

function CoreHub() {
  const inner = useRef<THREE.Mesh>(null);
  const outer = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (inner.current) {
      const s = 1 + Math.sin(t * 1.6) * 0.08;
      inner.current.scale.set(s, s, s);
      inner.current.rotation.y = t * 0.6;
      inner.current.rotation.x = t * 0.3;
    }
    if (outer.current) {
      const s = 1 + Math.sin(t * 1.6 + 1.2) * 0.15;
      outer.current.scale.set(s, s, s);
    }
  });
  return (
    <group>
      {/* Outer soft halo — big translucent sphere. */}
      <mesh ref={outer}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshBasicMaterial color="#00d166" transparent opacity={0.09} depthWrite={false} />
      </mesh>
      {/* Inner glowing core. */}
      <mesh ref={inner}>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshPhysicalMaterial
          color="#00d166"
          emissive="#00d166"
          emissiveIntensity={2.4}
          metalness={0.6}
          roughness={0.15}
          clearcoat={1}
        />
      </mesh>
    </group>
  );
}

/* ─────────────────────────  Ray lines from hub → node  ───────────────────────── */

function RayLines({ nodes }: { nodes: NodeProps[] }) {
  // Build a single BufferGeometry with two vertices per node (hub → node).
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(nodes.length * 2 * 3);
    const colors    = new Float32Array(nodes.length * 2 * 3);
    nodes.forEach((n, i) => {
      const c = new THREE.Color(n.color);
      // Start at hub
      positions.set([0, 0, 0], i * 6);
      colors.set([c.r * 0.05, c.g * 0.05, c.b * 0.05], i * 6);
      // End at node
      positions.set(n.position, i * 6 + 3);
      colors.set([c.r, c.g, c.b], i * 6 + 3);
    });
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    return g;
  }, [nodes]);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

/* ─────────────────────────  Orbital guide rings  ───────────────────────── */

function GuideRing({ tilt, speed, color = '#00d166' }: { tilt: [number, number, number]; speed: number; color?: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.z += dt * speed;
  });
  return (
    <mesh ref={ref} rotation={tilt}>
      <torusGeometry args={[2.7, 0.006, 8, 128]} />
      <meshBasicMaterial color={color} transparent opacity={0.35} />
    </mesh>
  );
}

/* ─────────────────────────  Cluster  ───────────────────────── */

function Cluster({ categories }: { categories: SkillCategory[] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const kick = scrollKick.v;
    ref.current.rotation.y += dt * (0.12 + kick * 1.6);
    ref.current.rotation.x += dt * (0.03 + kick * 0.4);
  });

  const nodes = useMemo<NodeProps[]>(() => {
    const out: NodeProps[] = [];
    const all = categories.flatMap((c) => c.skills.map((s) => ({ ...s, color: c.color })));
    const n = all.length;
    const phi = Math.PI * (3 - Math.sqrt(5));
    all.forEach((s, i) => {
      const y = 1 - (i / (n - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      const R = 2.6;
      out.push({
        position: [x * R, y * R, z * R],
        color: s.color,
        label: s.name,
        level: s.level,
        index: i,
      });
    });
    return out;
  }, [categories]);

  return (
    <group ref={ref}>
      {/* Rays from the hub to every node — subtle depth cues. */}
      <RayLines nodes={nodes} />
      {/* Skill icosahedra. */}
      {nodes.map((n, i) => (
        <SkillNode key={i} {...n} />
      ))}
      {/* Central hub. */}
      <CoreHub />
      {/* Three orbital guide rings at different tilts. */}
      <GuideRing tilt={[Math.PI / 2, 0, 0]}         speed={0.15}  color="#00d166" />
      <GuideRing tilt={[Math.PI / 2, Math.PI / 4, 0]} speed={-0.09} color="#a855f7" />
      <GuideRing tilt={[Math.PI / 2, -Math.PI / 4, 0]} speed={0.06} color="#38bdf8" />
      {/* Very faint outer wireframe sphere — kept from the original design
          because it "holds" the volume of the cluster visually. */}
      <mesh>
        <sphereGeometry args={[2.6, 24, 24]} />
        <meshBasicMaterial wireframe color="#c8d4d0" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────  Canvas  ───────────────────────── */

export default function SkillsCanvas({ categories = defaultSkillCategories }: { categories?: SkillCategory[] }) {
  useScrollVelocity();
  return (
    <>
      {/* Screen-reader equivalent of the WebGL cluster — the canvas itself
          exposes nothing to assistive tech. */}
      <ul className="sr-only" aria-label="Skills shown in the 3D cluster">
        {categories.flatMap((c) => c.skills.map((s) => (
          <li key={`${c.label}-${s.name}`}>{s.name} — {c.label}, {s.level}%</li>
        )))}
      </ul>
    <Canvas
      aria-hidden
      dpr={[1, 1.8]}
      camera={{ position: [0, 0, 7], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      {/* Lights — brighter primary key + a soft blue rim + warm fill. */}
      <ambientLight intensity={0.55} />
      <pointLight position={[6, 6, 6]}   intensity={2.2} color="#00d166" />
      <pointLight position={[-6, -4, 4]} intensity={1.4} color="#0a5ccf" />
      <pointLight position={[0, 4, -6]}  intensity={0.9} color="#a855f7" />
      <directionalLight position={[0, 0, 8]} intensity={0.7} color="#ffffff" />

      {/* Ambient particles — drift through the volume for depth. */}
      <Sparkles count={70} scale={9} size={2.6} speed={0.35} opacity={0.55} color="#00d166" />
      <Sparkles count={30} scale={12} size={1.4} speed={0.18} opacity={0.35} color="#a855f7" />

      {/* Wrap the cluster in Float for a gentle overall drift. */}
      <Float speed={0.6} rotationIntensity={0.15} floatIntensity={0.3}>
        <Cluster categories={categories} />
      </Float>

      <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
    </Canvas>
    </>
  );
}
