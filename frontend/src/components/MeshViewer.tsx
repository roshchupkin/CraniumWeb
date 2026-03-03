import { useRef, useEffect, useMemo } from 'react';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

export type ViewPreset = 'xy' | 'xz' | 'yz' | 'xy_rear' | 'xz_top' | 'yz_right' | null;

interface MeshViewerProps {
  mesh: THREE.BufferGeometry | null;
  showEdges?: boolean;
  showGrid?: boolean;
  asymmetryHeatmap?: number[] | null;
  /** Cephalometric HC line points [[x,y,z], ...] - rendered in red */
  cephalometricLine?: [number, number, number][] | null;
  landmarks?: { nasion?: number[]; left_tragus?: number[]; right_tragus?: number[] } | null;
  viewPreset?: ViewPreset;
  onPresetApplied?: () => void;
  onMeshClick?: (point: THREE.Vector3) => void;
  pickingMode?: boolean;
}

function CephalometricLine({ points }: { points: [number, number, number][] }) {
  const geometry = useMemo(() => {
    const pts = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color="#e53935" linewidth={2} />
    </lineLoop>
  );
}

function scalarToColor(t: number, min: number, max: number): [number, number, number] {
  const mid = (min + max) / 2;
  const range = max - min || 1;
  const v = (t - mid) / range;
  if (v < 0) {
    const s = Math.max(0, 1 + v);
    return [0.2 + 0.8 * s, 0.2, 0.8 - 0.6 * s];
  }
  const s = Math.max(0, 1 - v);
  return [0.8 - 0.6 * s, 0.2, 0.2 + 0.8 * s];
}

function CameraController({
  preset,
  onPresetApplied,
}: {
  preset: ViewPreset;
  onPresetApplied?: () => void;
}) {
  const { camera } = useThree();
  useEffect(() => {
    if (!preset) return;
    const dist = 80;
    switch (preset) {
      case 'xy':
        camera.position.set(0, 0, dist);
        camera.lookAt(0, 0, 0);
        break;
      case 'xy_rear':
        camera.position.set(0, 0, -dist);
        camera.lookAt(0, 0, 0);
        break;
      case 'xz':
        camera.position.set(0, dist, 0);
        camera.lookAt(0, 0, 0);
        break;
      case 'xz_top':
        camera.position.set(0, -dist, 0);
        camera.lookAt(0, 0, 0);
        break;
      case 'yz':
        camera.position.set(dist, 0, 0);
        camera.lookAt(0, 0, 0);
        break;
      case 'yz_right':
        camera.position.set(-dist, 0, 0);
        camera.lookAt(0, 0, 0);
        break;
    }
    camera.updateProjectionMatrix();
    onPresetApplied?.();
  }, [preset, camera, onPresetApplied]);
  return null;
}

function SceneContent({
  mesh,
  showEdges = true,
  showGrid = true,
  asymmetryHeatmap = null,
  cephalometricLine = null,
  landmarks = null,
  onMeshClick,
  pickingMode = false,
}: MeshViewerProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (pickingMode && onMeshClick && e.point) {
      onMeshClick(e.point);
    }
  };

  const meshGeometries = useMemo(() => {
    if (!mesh) return null;
    const geo = mesh.clone();
    if (!geo.attributes.normal) {
      geo.computeVertexNormals();
    }
    if (asymmetryHeatmap && asymmetryHeatmap.length >= geo.attributes.position.count) {
      const posCount = geo.attributes.position.count;
      const colors = new Float32Array(posCount * 3);
      const min = asymmetryHeatmap.reduce((a, b) => (a < b ? a : b), Infinity);
      const max = asymmetryHeatmap.reduce((a, b) => (a > b ? a : b), -Infinity);
      for (let i = 0; i < posCount; i++) {
        const [r, g, b] = scalarToColor(asymmetryHeatmap[i], min, max);
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }
    const edgesGeometry = new THREE.EdgesGeometry(geo, 15);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
    return { geometry: geo, edgesGeometry, edgesMaterial };
  }, [mesh, asymmetryHeatmap]);

  useEffect(() => {
    return () => {
      if (meshGeometries) {
        meshGeometries.geometry.dispose();
        meshGeometries.edgesGeometry.dispose();
        meshGeometries.edgesMaterial.dispose();
      }
    };
  }, [meshGeometries]);

  if (!mesh) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#333" wireframe />
      </mesh>
    );
  }

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={meshGeometries!.geometry}
        onPointerDown={handlePointerDown}
      >
        <meshStandardMaterial
          vertexColors={!!meshGeometries!.geometry.attributes.color}
          color="#f5f5dc"
          side={THREE.DoubleSide}
          wireframe={false}
        />
      </mesh>
      {showEdges && (
        <lineSegments
          geometry={meshGeometries!.edgesGeometry}
          material={meshGeometries!.edgesMaterial}
        />
      )}
      {showGrid && <Grid infiniteGrid cellSize={10} cellThickness={0.5} sectionSize={50} sectionThickness={1} fadeDistance={150} fadeStrength={0.5} />}
      {landmarks &&
        [landmarks.nasion, landmarks.left_tragus, landmarks.right_tragus]
          .filter((pt): pt is number[] => !!pt && pt.length >= 3)
          .map((pt, i) => (
            <mesh key={i} position={[pt[0], pt[1], pt[2]]}>
              <sphereGeometry args={[2, 16, 16]} />
              <meshStandardMaterial color="#22c55e" />
            </mesh>
          ))}
      {cephalometricLine && cephalometricLine.length >= 2 && (
        <CephalometricLine points={cephalometricLine} />
      )}
    </>
  );
}

export function MeshViewer(props: MeshViewerProps) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 400 }}>
      <Canvas
        camera={{ position: [0, 0, 80], fov: 45 }}
        gl={{ antialias: true }}
      >
        <CameraController
          preset={props.viewPreset ?? null}
          onPresetApplied={props.onPresetApplied}
        />
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 50, 50]} intensity={0.8} />
        <directionalLight position={[-50, -50, 50]} intensity={0.4} />
        <SceneContent {...props} />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={500}
        />
      </Canvas>
    </div>
  );
}
