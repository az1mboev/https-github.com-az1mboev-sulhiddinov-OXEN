import { OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import * as THREE from "three";

import { COUNTRIES, type Country } from "@/data/countries";

const RADIUS = 2;
const BORDER_OFFSET = 0.015;
const FILL_OFFSET = 0.008;
const CAPITAL_OFFSET = 0.015;
const EARTH_TEXTURE = "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg";
const CLOUDS_TEXTURE = "https://threejs.org/examples/textures/planets/earth_clouds_1024.png";

/* ------------------------------------------------------------------ */
/*  Colors                                                            */
/* ------------------------------------------------------------------ */

const APPLE_RED = "#FF3B30";
const HOVER_WHITE = "#ffffff";
const FILL_OPACITY_TARGET = 0.18;
const HOVER_BORDER_OPACITY = 0.82;
const SELECTED_BORDER_OPACITY = 0.95;
const HOVER_GLOW_OPACITY = 0.32;
const SELECTED_GLOW_OPACITY = 0.28;
const CAPITAL_COLOR = "#a0d8ff";

/* Travel status marker colors — green=not visited, yellow=wishlist, red=visited */
const MARKER_GREEN = new THREE.Color("#34C759");
const MARKER_YELLOW = new THREE.Color("#FFCC00");
const MARKER_RED = new THREE.Color("#FF3B30");
const MARKER_OFFSET = 0.03;
const EMPTY_SET: Set<string> = new Set();

/* ------------------------------------------------------------------ */
/*  Camera zoom range (must match OrbitControls)                      */
/* ------------------------------------------------------------------ */

const MIN_DISTANCE = 2.3;
const MAX_DISTANCE = 12;
const BASE_ROTATION_SPEED = 0.55;

/* ------------------------------------------------------------------ */
/*  Coordinate helpers                                                 */
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

function vec3ToLatLng(pos: THREE.Vector3, radius: number): { lat: number; lng: number } {
  const y = THREE.MathUtils.clamp(pos.y / radius, -1, 1);
  const phi = Math.acos(y);
  const lat = 90 - (phi * 180) / Math.PI;
  const theta = Math.atan2(pos.z, -pos.x);
  let lng = (theta * 180) / Math.PI - 180;
  if (lng < -180) lng += 360;
  if (lng > 180) lng -= 360;
  return { lat, lng };
}

function greatCircleDistDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const haversine =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng * sinDLng;
  return (2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)) * 180) / Math.PI;
}

function findNearestCountry(lat: number, lng: number, maxDist: number = 28): Country | null {
  let nearest: Country | null = null;
  let minDist = Infinity;
  for (const c of COUNTRIES) {
    const dist = greatCircleDistDeg({ lat, lng }, { lat: c.lat, lng: c.lng });
    if (dist < minDist) {
      minDist = dist;
      nearest = c;
    }
  }
  return minDist < maxDist ? nearest : null;
}

/* ------------------------------------------------------------------ */
/*  Point-in-polygon (ray-casting) for border accuracy                 */
/* ------------------------------------------------------------------ */

function isPointInBorderPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [lati, lngi] = polygon[i];
    const [latj, lngj] = polygon[j];
    if ((lngi > lng) !== (lngj > lng) &&
        lat < ((latj - lati) * (lng - lngi)) / (lngj - lngi) + lati) {
      inside = !inside;
    }
  }
  return inside;
}

function findCountryByPoint(lat: number, lng: number): Country | null {
  for (const c of COUNTRIES) {
    const dist = greatCircleDistDeg({ lat, lng }, { lat: c.lat, lng: c.lng });
    if (dist > 40) continue;
    if (c.border && isPointInBorderPolygon(lat, lng, c.border)) {
      return c;
    }
  }
  return findNearestCountry(lat, lng, 16);
}

/* ------------------------------------------------------------------ */
/*  Geometry builders for country fill & border                        */
/* ------------------------------------------------------------------ */

function createCountryFillGeometry(
  border: [number, number][],
  radius: number,
): THREE.BufferGeometry {
  const pts3D = border.map(([lat, lng]) => latLngToVec3(lat, lng, radius));
  const centre = new THREE.Vector3();
  for (const p of pts3D) centre.add(p);
  centre.normalize().multiplyScalar(radius);

  const n = pts3D.length;
  const positions: number[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts3D[i];
    const p1 = pts3D[(i + 1) % n];
    positions.push(centre.x, centre.y, centre.z);
    positions.push(p0.x, p0.y, p0.z);
    positions.push(p1.x, p1.y, p1.z);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.computeVertexNormals();
  return geo;
}

function createCountryLineGeometry(
  border: [number, number][],
  radius: number,
): THREE.BufferGeometry {
  const pts3D = border.map(([lat, lng]) => latLngToVec3(lat, lng, radius));
  pts3D.push(pts3D[0].clone());
  return new THREE.BufferGeometry().setFromPoints(pts3D);
}

/* ------------------------------------------------------------------ */
/*  Capital markers — all capitals as a single points cloud            */
/* ------------------------------------------------------------------ */

function CapitalMarkers() {
  const points = useMemo(() => {
    const positions: number[] = [];
    for (const country of COUNTRIES) {
      const v = latLngToVec3(country.lat, country.lng, RADIUS + CAPITAL_OFFSET);
      positions.push(v.x, v.y, v.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    const mat = new THREE.PointsMaterial({
      color: CAPITAL_COLOR,
      size: 0.03,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const obj = new THREE.Points(geo, mat);
    obj.renderOrder = 2;
    obj.raycast = () => {};
    return obj;
  }, []);

  return <primitive object={points} />;
}

/* ------------------------------------------------------------------ */
/*  Status markers — small glowing dots at each country's lat/lng       */
/*  Green = not visited, Yellow = wishlist, Red = visited              */
/*  Clicking a marker selects the country and opens the info panel      */
/* ------------------------------------------------------------------ */

function StatusMarkers({
  visitedIds,
  wishlistIds,
  onMarkerClick,
}: {
  visitedIds: Set<string>;
  wishlistIds: Set<string>;
  onMarkerClick: (country: Country) => void;
}) {
  const markersRef = useRef<THREE.Group>(null);
  const pulseRefs = useRef<THREE.Mesh[]>([]);
  const dotRefs = useRef<THREE.Mesh[]>([]);
  const colorRefs = useRef<THREE.MeshBasicMaterial[]>([]);

  // Build marker data once
  const markerData = useMemo(() => {
    return COUNTRIES.map((country) => {
      const pos = latLngToVec3(country.lat, country.lng, RADIUS + MARKER_OFFSET);
      return { country, pos };
    });
  }, []);

  // Determine marker color for each country
  const getMarkerColor = useCallback(
    (countryId: string): THREE.Color => {
      if (visitedIds.has(countryId)) return MARKER_RED;
      if (wishlistIds.has(countryId)) return MARKER_YELLOW;
      return MARKER_GREEN;
    },
    [visitedIds, wishlistIds],
  );

  // Update colors when travel status changes
  useEffect(() => {
    colorRefs.current.forEach((mat, i) => {
      if (!mat) return;
      const col = getMarkerColor(markerData[i].country.id);
      mat.color.copy(col);
    });
    dotRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const col = getMarkerColor(markerData[i].country.id);
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
  });

  const handleClick = useCallback(
    (country: Country) => (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onMarkerClick(country);
    },
    [onMarkerClick],
  );

  return (
    <group ref={markersRef}>
      {markerData.map(({ country, pos }, i) => {
        const col = getMarkerColor(country.id);
        return (
          <group key={country.id} position={pos}>
            {/* Pulsing halo ring */}
            <mesh
              ref={(m) => { if (m) pulseRefs.current[i] = m; }}
              raycast={() => {}}
            >
              <sphereGeometry args={[0.028, 16, 16]} />
              <meshBasicMaterial
                color={col}
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
              onClick={handleClick(country)}
              onPointerOver={() => { document.body.style.cursor = "pointer"; }}
              onPointerOut={() => { document.body.style.cursor = "auto"; }}
            >
              <sphereGeometry args={[0.014, 12, 12]} />
              <meshBasicMaterial
                ref={(m) => { if (m) colorRefs.current[i] = m as unknown as THREE.MeshBasicMaterial; }}
                color={col}
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
/*  Country highlight — fill + border + glow                           */
/*                                                                     */
/*  Hover:  white border + white additive glow, no fill                */
/*  Select: red border + red additive glow + semi-transparent red fill */
/* ------------------------------------------------------------------ */

function CountryHighlight({
  country,
  isSelected,
  isHovered,
}: {
  country: Country;
  isSelected: boolean;
  isHovered: boolean;
}) {
  const border = country.border;
  if (!border || border.length < 3) return null;

  const fillRadius = RADIUS + FILL_OFFSET;
  const lineRadius = RADIUS + BORDER_OFFSET;

  const fillGeo = useMemo(() => createCountryFillGeometry(border, fillRadius), [border, fillRadius]);
  const lineGeo = useMemo(() => createCountryLineGeometry(border, lineRadius), [border, lineRadius]);

  const fillMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: APPLE_RED,
        transparent: true,
        opacity: 0,
        depthTest: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const borderColor = isSelected ? APPLE_RED : HOVER_WHITE;
  const borderMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: borderColor,
        transparent: true,
        opacity: 0,
        depthTest: true,
        depthWrite: false,
      }),
    [borderColor],
  );

  const glowColor = isSelected ? APPLE_RED : HOVER_WHITE;
  const glowMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [glowColor],
  );

  const fillMesh = useMemo(() => new THREE.Mesh(fillGeo, fillMat), [fillGeo, fillMat]);
  const borderLine = useMemo(() => new THREE.Line(lineGeo, borderMat), [lineGeo, borderMat]);
  const glowLine = useMemo(() => new THREE.Line(lineGeo, glowMat), [lineGeo, glowMat]);

  useMemo(() => {
    fillMesh.renderOrder = 3;
    borderLine.renderOrder = 4;
    glowLine.renderOrder = 4;
  }, [fillMesh, borderLine, glowLine]);

  const targetFillOpacity = isSelected ? FILL_OPACITY_TARGET : 0;
  const targetBorderOpacity = isSelected
    ? SELECTED_BORDER_OPACITY
    : isHovered
      ? HOVER_BORDER_OPACITY
      : 0;
  const targetGlowOpacity = isSelected
    ? SELECTED_GLOW_OPACITY
    : isHovered
      ? HOVER_GLOW_OPACITY
      : 0;

  useFrame((_, delta) => {
    const speed = isHovered && !isSelected ? 16 : 11;
    fillMat.opacity += (targetFillOpacity - fillMat.opacity) * Math.min(delta * speed, 1);
    borderMat.opacity += (targetBorderOpacity - borderMat.opacity) * Math.min(delta * speed, 1);
    glowMat.opacity += (targetGlowOpacity - glowMat.opacity) * Math.min(delta * speed, 1);
  });

  const showBorder = isSelected || isHovered;

  return (
    <group>
      {showBorder && <primitive object={glowLine} />}
      {showBorder && <primitive object={borderLine} />}
      {isSelected && <primitive object={fillMesh} />}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Dynamic clouds layer — slowly rotating, semi-transparent            */
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
/*  Day/night cycle — animated directional light orbiting the globe     */
/* ------------------------------------------------------------------ */

function DayNightCycle() {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);

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
      <ambientLight ref={ambientRef} intensity={0.55} />
      <directionalLight ref={lightRef} intensity={1.8} color="#fff8e7" />
      <directionalLight position={[-3, -1, -5]} intensity={0.5} color="#88bbff" />
      <directionalLight position={[0, -5, 0]} intensity={0.3} color="#225588" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Earth sphere with interactions                                     */
/* ------------------------------------------------------------------ */

function EarthSphere({
  onCountrySelect,
  onCountryDoubleClick,
  onBackgroundTap,
  selectedCountry,
  hoveredCountry,
  onHoverCountry,
}: {
  onCountrySelect: (c: Country) => void;
  onCountryDoubleClick: (c: Country) => void;
  onBackgroundTap?: () => void;
  selectedCountry: Country | null;
  hoveredCountry: Country | null;
  onHoverCountry: (c: Country | null) => void;
}) {
  const texture = useTexture(EARTH_TEXTURE);
  const meshRef = useRef<THREE.Mesh>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const lastClickTime = useRef<number>(0);
  const lastClickCountry = useRef<Country | null>(null);

  useMemo(() => {
    texture.anisotropy = 16;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
  }, [texture]);

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const point = e.point.clone();
      if (meshRef.current) meshRef.current.worldToLocal(point);
      const { lat, lng } = vec3ToLatLng(point, RADIUS);
      const country = findCountryByPoint(lat, lng);
      onHoverCountry(country);
    },
    [onHoverCountry],
  );

  const handlePointerLeave = useCallback(() => {
    onHoverCountry(null);
  }, [onHoverCountry]);

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
      const point = e.point.clone();
      if (meshRef.current) meshRef.current.worldToLocal(point);
      const { lat, lng } = vec3ToLatLng(point, RADIUS);

      const now = Date.now();
      const country = findCountryByPoint(lat, lng);

      if (country && lastClickCountry.current?.id === country.id && now - lastClickTime.current < 350) {
        onCountryDoubleClick(country);
        lastClickTime.current = 0;
        lastClickCountry.current = null;
      } else {
        if (country) onCountrySelect(country);
        else onBackgroundTap?.();
        lastClickTime.current = now;
        lastClickCountry.current = country;
      }
    },
    [onCountrySelect, onCountryDoubleClick, onBackgroundTap],
  );

  return (
    <group>
      {/* Earth textured sphere */}
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <sphereGeometry args={[RADIUS, 128, 128]} />
        <meshStandardMaterial map={texture} roughness={0.65} metalness={0.03} />
      </mesh>

      {/* Dynamic clouds */}
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

      {/* Selected country highlight (red) */}
      {selectedCountry && (
        <CountryHighlight country={selectedCountry} isSelected isHovered={false} />
      )}
      {/* Hovered country highlight (white) — only if different from selected */}
      {hoveredCountry && hoveredCountry.id !== selectedCountry?.id && (
        <CountryHighlight country={hoveredCountry} isSelected={false} isHovered />
      )}

    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Starfield                                                         */
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
/*  Rotation controller — slow down as user zooms in                   */
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
/*  Zoom controller — smooth double-click & search-triggered zoom      */
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

    if (t >= 1) {
      a.active = false;
    }
  });

  return null;
}

/* ------------------------------------------------------------------ */
/*  Scene                                                             */
/* ------------------------------------------------------------------ */

function Scene({
  onCountrySelect,
  onCountryDoubleClick,
  onBackgroundTap,
  selectedCountry,
  hoveredCountry,
  onHoverCountry,
  zoomTarget,
  controlsRef,
  visitedIds,
  wishlistIds,
}: {
  onCountrySelect: (c: Country) => void;
  onCountryDoubleClick: (c: Country) => void;
  onBackgroundTap?: () => void;
  selectedCountry: Country | null;
  hoveredCountry: Country | null;
  onHoverCountry: (c: Country | null) => void;
  zoomTarget: { lat: number; lng: number } | null;
  controlsRef: React.RefObject<any>;
  visitedIds: Set<string>;
  wishlistIds: Set<string>;
}) {
  return (
    <>
      <DayNightCycle />
      <EarthSphere
        onCountrySelect={onCountrySelect}
        onCountryDoubleClick={onCountryDoubleClick}
        onBackgroundTap={onBackgroundTap}
        selectedCountry={selectedCountry}
        hoveredCountry={hoveredCountry}
        onHoverCountry={onHoverCountry}
      />
      <StatusMarkers
        visitedIds={visitedIds}
        wishlistIds={wishlistIds}
        onMarkerClick={onCountrySelect}
      />
      <CapitalMarkers />
      <Starfield />
      <RotationController controlsRef={controlsRef} />
      <ZoomController zoomTarget={zoomTarget} controlsRef={controlsRef} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Public component                                                  */
/* ------------------------------------------------------------------ */

export default function Globe({
  onCountrySelect,
  onBackgroundTap,
  selectedCountry,
  zoomTarget,
  visitedIds,
  wishlistIds,
}: {
  onCountrySelect: (c: Country) => void;
  onBackgroundTap?: () => void;
  selectedCountry: Country | null;
  zoomTarget?: { lat: number; lng: number } | null;
  visitedIds?: Set<string>;
  wishlistIds?: Set<string>;
}) {
  const controlsRef = useRef<any>(null);
  const hoveredCountryRef = useRef<Country | null>(null);
  const [internalZoomTarget, setInternalZoomTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<Country | null>(null);

  // Manual rotation is locked until the user taps the "Click" button.
  // Auto-rotate, zoom, animations, and country selection remain active.
  const [interactionEnabled, setInteractionEnabled] = useState<boolean>(false);
  const [showCheckmark, setShowCheckmark] = useState<boolean>(false);

  const handleActivate = useCallback(() => {
    if (interactionEnabled) return;
    setInteractionEnabled(true);
    setShowCheckmark(true);
    setTimeout(() => setShowCheckmark(false), 1000);
  }, [interactionEnabled]);

  // External zoom target (from search) takes priority
  const activeZoomTarget = zoomTarget ?? internalZoomTarget;

  const handleDoubleClick = useCallback((c: Country) => {
    setInternalZoomTarget({ lat: c.lat, lng: c.lng });
  }, []);

  const handleHoverWithState = useCallback((c: Country | null) => {
    hoveredCountryRef.current = c;
    setHoveredCountry(c);
  }, []);

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0.5, 5.4], fov: 40, near: 0.01, far: 200 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <Scene
            onCountrySelect={onCountrySelect}
            onCountryDoubleClick={handleDoubleClick}
            onBackgroundTap={onBackgroundTap}
            selectedCountry={selectedCountry}
            hoveredCountry={hoveredCountry}
            onHoverCountry={handleHoverWithState}
            zoomTarget={activeZoomTarget}
            controlsRef={controlsRef}
            visitedIds={visitedIds ?? EMPTY_SET}
            wishlistIds={wishlistIds ?? EMPTY_SET}
          />
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom
            enableRotate={interactionEnabled}
            minDistance={MIN_DISTANCE}
            maxDistance={MAX_DISTANCE}
            rotateSpeed={0.4}
            zoomSpeed={1.1}
            autoRotate
            autoRotateSpeed={BASE_ROTATION_SPEED}
            enableDamping
            dampingFactor={0.08}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
          />
        </Suspense>
      </Canvas>

      {/* "Click" activation button — locks manual rotation until pressed */}
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
