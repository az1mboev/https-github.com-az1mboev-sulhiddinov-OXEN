import { OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import * as THREE from "three";

import { UNIVERSITIES, type University } from "@/data/universities";

const RADIUS = 2;
const MARKER_OFFSET = 0.03;
const MIN_DISTANCE = 2.3;
const MAX_DISTANCE = 12;
const BASE_ROTATION_SPEED = 0.55;

const EARTH_TEXTURE = "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg";
const CLOUDS_TEXTURE = "https://threejs.org/examples/textures/planets/earth_clouds_1024.png";

/* University marker colors */
const MARKER_BLUE = new THREE.Color("#007AFF");
const MARKER_GOLD = new THREE.Color("#FFD700");
const MARKER_GREEN = new THREE.Color("#34C759");

/* ------------------------------------------------------------------ */
/*  Coordinate helpers (same as Globe.tsx)                             */
/* ------------------------------------------------------------------ */

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/* ------------------------------------------------------------------ */
/*  University markers — floating glowing dots at each uni's GPS loc   */
/*  Clicking a marker selects the university and flies camera to it    */
/* ------------------------------------------------------------------ */

function UniversityMarkers({
  universities,
  selectedId,
  wishlistIds,
  visitedIds,
  onMarkerClick,
  interactionEnabled,
}: {
  universities: University[];
  selectedId: string | null;
  wishlistIds: Set<string>;
  visitedIds: Set<string>;
  onMarkerClick: (uni: University) => void;
  interactionEnabled: boolean;
}) {
  const pulseRefs = useRef<THREE.Mesh[]>([]);
  const dotRefs = useRef<THREE.Mesh[]>([]);
  const colorRefs = useRef<THREE.MeshBasicMaterial[]>([]);

  const markerData = useMemo(() => {
    return universities.map((uni) => {
      const pos = latLngToVec3(uni.latitude, uni.longitude, RADIUS + MARKER_OFFSET);
      return { uni, pos };
    });
  }, [universities]);

  const getMarkerColor = useCallback(
    (uniId: string): THREE.Color => {
      if (visitedIds.has(uniId)) return MARKER_GREEN;
      if (wishlistIds.has(uniId)) return MARKER_GOLD;
      return MARKER_BLUE;
    },
    [visitedIds, wishlistIds],
  );

  useEffect(() => {
    colorRefs.current.forEach((mat, i) => {
      if (!mat) return;
      const col = getMarkerColor(markerData[i].uni.id);
      mat.color.copy(col);
    });
    dotRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const col = getMarkerColor(markerData[i].uni.id);
      mat.color.copy(col);
    });
  }, [visitedIds, wishlistIds, getMarkerColor, markerData]);

  useFrame(() => {
    const t = Date.now() * 0.003;
    pulseRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const phase = t + i * 0.15;
      const s = 1 + Math.sin(phase) * 0.25;
      mesh.scale.setScalar(s);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(phase) * 0.15;
    });
    // Selected marker pulses more intensely
    if (selectedId) {
      const idx = markerData.findIndex((m) => m.uni.id === selectedId);
      if (idx >= 0 && pulseRefs.current[idx]) {
        const mesh = pulseRefs.current[idx];
        const s = 1.5 + Math.sin(Date.now() * 0.006) * 0.35;
        mesh.scale.setScalar(s);
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(Date.now() * 0.006) * 0.2;
      }
    }
  });

  const handleClick = useCallback(
    (uni: University) => (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (interactionEnabled) onMarkerClick(uni);
    },
    [onMarkerClick, interactionEnabled],
  );

  return (
    <group>
      {markerData.map(({ uni, pos }, i) => {
        const col = getMarkerColor(uni.id);
        const isSelected = selectedId === uni.id;
        return (
          <group key={uni.id} position={pos}>
            {/* Pulsing halo ring */}
            <mesh
              ref={(m) => { if (m) pulseRefs.current[i] = m; }}
              raycast={() => {}}
              scale={isSelected ? 1.5 : 1}
            >
              <sphereGeometry args={[0.03, 16, 16]} />
              <meshBasicMaterial
                color={isSelected ? MARKER_GOLD : col}
                transparent
                opacity={0.3}
                depthTest
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            {/* Solid dot */}
            <mesh
              ref={(m) => { if (m) dotRefs.current[i] = m; }}
              onClick={handleClick(uni)}
              onPointerOver={() => { if (interactionEnabled) document.body.style.cursor = "pointer"; }}
              onPointerOut={() => { document.body.style.cursor = "auto"; }}
            >
              <sphereGeometry args={[0.016, 12, 12]} />
              <meshBasicMaterial
                ref={(m) => { if (m) colorRefs.current[i] = m as unknown as THREE.MeshBasicMaterial; }}
                color={isSelected ? MARKER_GOLD : col}
                transparent
                opacity={0.9}
                depthTest
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Dynamic clouds layer (same as Globe.tsx)                           */
/* ------------------------------------------------------------------ */

function CloudsLayer() {
  const cloudsRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(CLOUDS_TEXTURE);

  useMemo(() => {
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.018;
    }
  });

  return (
    <mesh ref={cloudsRef} scale={1.01}>
      <sphereGeometry args={[RADIUS, 64, 64]} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={0.35}
        depthTest
        depthWrite={false}
        blending={THREE.NormalBlending}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Day/night cycle (same as Globe.tsx)                                */
/* ------------------------------------------------------------------ */

function DayNightCycle() {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 0.08;
    if (lightRef.current) {
      lightRef.current.position.set(
        Math.cos(t) * 8,
        Math.sin(t * 0.4) * 3,
        Math.sin(t) * 8,
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight ref={lightRef} intensity={1.8} color="#fff8e7" />
      <directionalLight position={[-3, -1, -5]} intensity={0.5} color="#88bbff" />
      <directionalLight position={[0, -5, 0]} intensity={0.3} color="#225588" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Earth sphere — interactive, detects background taps                */
/* ------------------------------------------------------------------ */

function EarthSphere({
  onBackgroundTap,
  interactionEnabled,
}: {
  onBackgroundTap?: () => void;
  interactionEnabled: boolean;
}) {
  const texture = useTexture(EARTH_TEXTURE);
  const meshRef = useRef<THREE.Mesh>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  useMemo(() => {
    texture.anisotropy = 16;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
  }, [texture]);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    pointerStart.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
  }, []);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (pointerStart.current) {
        const dx = e.nativeEvent.clientX - pointerStart.current.x;
        const dy = e.nativeEvent.clientY - pointerStart.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 5) return;
      }
      e.stopPropagation();
      if (interactionEnabled) onBackgroundTap?.();
    },
    [onBackgroundTap, interactionEnabled],
  );

  return (
    <group>
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      >
        <sphereGeometry args={[RADIUS, 128, 128]} />
        <meshStandardMaterial map={texture} roughness={0.65} metalness={0.03} />
      </mesh>

      <CloudsLayer />

      {/* Inner atmosphere */}
      <mesh scale={1.025}>
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshBasicMaterial color="#6eb4f0" transparent opacity={0.09} side={THREE.BackSide} />
      </mesh>
      {/* Outer atmosphere */}
      <mesh scale={1.12}>
        <sphereGeometry args={[RADIUS, 48, 48]} />
        <meshBasicMaterial color="#4a90d9" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Starfield (same as Globe.tsx)                                      */
/* ------------------------------------------------------------------ */

function Starfield() {
  const points = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 600; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 8 + Math.random() * 6;
      pts.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
    }
    return new Float32Array(pts);
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={points} count={points.length / 3} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.025} sizeAttenuation transparent opacity={0.7} />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/*  Rotation controller (same as Globe.tsx)                            */
/* ------------------------------------------------------------------ */

function RotationController({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const { camera } = useThree();

  useFrame(() => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;
    const dist = camera.position.distanceTo(ctrl.target);
    const t = THREE.MathUtils.clamp((dist - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE), 0, 1);
    const speed = BASE_ROTATION_SPEED * Math.pow(t, 1.4);
    ctrl.autoRotateSpeed = speed;
    ctrl.autoRotate = dist > MIN_DISTANCE + 0.8;
  });

  return null;
}

/* ------------------------------------------------------------------ */
/*  Zoom controller — flies camera to a university's GPS location      */
/* ------------------------------------------------------------------ */

function ZoomController({
  zoomTarget: target,
  controlsRef,
}: {
  zoomTarget: { lat: number; lng: number } | null;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const animRef = useRef({
    active: false,
    progress: 0,
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    startDistance: 5.4,
    endDistance: 2.8,
  });

  useEffect(() => {
    if (!target || !controlsRef.current) return;
    const ctrl = controlsRef.current;
    const endPos = latLngToVec3(target.lat, target.lng, RADIUS);
    animRef.current = {
      active: true,
      progress: 0,
      startTarget: ctrl.target.clone(),
      endTarget: endPos.clone(),
      startDistance: camera.position.distanceTo(ctrl.target),
      endDistance: 2.8,
    };
  }, [target, controlsRef, camera]);

  useFrame((_, delta) => {
    const a = animRef.current;
    if (!a.active || !controlsRef.current) return;
    a.progress += delta * 2.2;
    const t = Math.min(a.progress, 1);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const ctrl = controlsRef.current;
    ctrl.target.lerpVectors(a.startTarget, a.endTarget, eased);
    const dir = camera.position.clone().sub(a.startTarget).normalize();
    const dist = a.startDistance + (a.endDistance - a.startDistance) * eased;
    camera.position.copy(ctrl.target).add(dir.multiplyScalar(dist));
    ctrl.update();
    if (t >= 1) a.active = false;
  });

  return null;
}

/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */

function Scene({
  universities,
  selectedUniversityId,
  wishlistIds,
  visitedIds,
  onMarkerClick,
  onBackgroundTap,
  zoomTarget,
  controlsRef,
  interactionEnabled,
}: {
  universities: University[];
  selectedUniversityId: string | null;
  wishlistIds: Set<string>;
  visitedIds: Set<string>;
  onMarkerClick: (uni: University) => void;
  onBackgroundTap?: () => void;
  zoomTarget: { lat: number; lng: number } | null;
  controlsRef: React.RefObject<any>;
  interactionEnabled: boolean;
}) {
  return (
    <>
      <DayNightCycle />
      <EarthSphere
        onBackgroundTap={onBackgroundTap}
        interactionEnabled={interactionEnabled}
      />
      <UniversityMarkers
        universities={universities}
        selectedId={selectedUniversityId}
        wishlistIds={wishlistIds}
        visitedIds={visitedIds}
        onMarkerClick={onMarkerClick}
        interactionEnabled={interactionEnabled}
      />
      <Starfield />
      <RotationController controlsRef={controlsRef} />
      <ZoomController zoomTarget={zoomTarget} controlsRef={controlsRef} />
    </>
  );
}

const EMPTY_SET: Set<string> = new Set();

/* ------------------------------------------------------------------ */
/*  Public component — UniversityGlobe                                  */
/* ------------------------------------------------------------------ */

export default function UniversityGlobe({
  universities = UNIVERSITIES,
  selectedUniversityId,
  onUniversitySelect,
  onBackgroundTap,
  zoomTarget,
  wishlistIds,
  visitedIds,
}: {
  universities?: University[];
  selectedUniversityId: string | null;
  onUniversitySelect: (uni: University) => void;
  onBackgroundTap?: () => void;
  zoomTarget?: { lat: number; lng: number } | null;
  wishlistIds?: Set<string>;
  visitedIds?: Set<string>;
}) {
  const controlsRef = useRef<any>(null);
  const [internalZoomTarget, setInternalZoomTarget] = useState<{ lat: number; lng: number } | null>(null);

  const [interactionEnabled, setInteractionEnabled] = useState<boolean>(false);
  const [showCheckmark, setShowCheckmark] = useState<boolean>(false);

  const handleActivate = useCallback(() => {
    if (interactionEnabled) return;
    setInteractionEnabled(true);
    setShowCheckmark(true);
    setTimeout(() => setShowCheckmark(false), 1000);
  }, [interactionEnabled]);

  const activeZoomTarget = zoomTarget ?? internalZoomTarget;

  const handleMarkerClick = useCallback(
    (uni: University) => {
      setInternalZoomTarget({ lat: uni.latitude, lng: uni.longitude });
      onUniversitySelect(uni);
    },
    [onUniversitySelect],
  );

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0.5, 5.4], fov: 40, near: 0.01, far: 200 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <Scene
            universities={universities}
            selectedUniversityId={selectedUniversityId}
            wishlistIds={wishlistIds ?? EMPTY_SET}
            visitedIds={visitedIds ?? EMPTY_SET}
            onMarkerClick={handleMarkerClick}
            onBackgroundTap={onBackgroundTap}
            zoomTarget={activeZoomTarget}
            controlsRef={controlsRef}
            interactionEnabled={interactionEnabled}
          />
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={interactionEnabled}
            enableRotate={interactionEnabled}
            enableDamping={interactionEnabled}
            minDistance={MIN_DISTANCE}
            maxDistance={MAX_DISTANCE}
            rotateSpeed={0.4}
            zoomSpeed={1.1}
            autoRotate
            autoRotateSpeed={BASE_ROTATION_SPEED}
            dampingFactor={0.08}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
          />
        </Suspense>
      </Canvas>

      {/* "Click" activation button — same as Globe.tsx */}
      {!interactionEnabled && (
        <button
          onClick={handleActivate}
          className="globe-click-btn"
          aria-label="Click to interact with the globe"
        >
          <span className="globe-click-btn__label">Click</span>
        </button>
      )}
      {showCheckmark && (
        <div className="globe-click-check" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12.5L10 17.5L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
