import { useRef, useEffect } from 'react';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

export type ViewPreset = 'xy' | 'xz' | 'yz' | 'xy_rear' | 'xz_top' | 'yz_right' | null;

interface MeshViewerProps {
  mesh: THREE.BufferGeometry | null;
  showEdges?: boolean;
  showGrid?: boolean;
  asymmetryHeatmap?: number[] | null;
  landmarks?: { nasion?: number[]; left_tragus?: number[]; right_tragus?: number[] } | null;
  viewPreset?: ViewPreset;
  onMeshClick?: (point: THREE.Vector3) => void;
  pickingMode?: boolean;
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

function CameraController({ preset }: { preset: ViewPreset }) {
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
  }, [preset, camera]);
  return null;
}

function SceneContent({
  mesh,
  showEdges = true,
  showGrid = true,
  asymmetryHeatmap = null,
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

  if (!mesh) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#333" wireframe />
      </mesh>
    );
  }

  const geo = mesh.clone();
  if (!geo.attributes.normal) {
    geo.computeVertexNormals();
  }

  if (asymmetryHeatmap && asymmetryHeatmap.length >= geo.attributes.position.count) {
    const posCount = geo.attributes.position.count;
    const colors = new Float32Array(posCount * 3);
    const min = Math.min(...asymmetryHeatmap);
    const max = Math.max(...asymmetryHeatmap);
    for (let i = 0; i < posCount; i++) {
      const [r, g, b] = scalarToColor(asymmetryHeatmap[i], min, max);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geo}
        onPointerDown={handlePointerDown}
      >
        <meshStandardMaterial
          vertexColors={!!geo.attributes.color}
          color="#f5f5dc"
          side={THREE.DoubleSide}
          wireframe={false}
        />
      </mesh>
      {showEdges && (
        <lineSegments
          geometry={new THREE.EdgesGeometry(geo, 15)}
          material={new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 })}
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
        <CameraController preset={props.viewPreset ?? null} />
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
