import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

export function useMeshLoader() {
  const [mesh, setMesh] = useState<THREE.BufferGeometry | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback((file: File) => {
    setLoading(true);
    setError(null);
    const ext = file.name.toLowerCase().split('.').pop();

    const loadPly = () => {
      const loader = new PLYLoader();
      const reader = new FileReader();
      reader.onerror = () => {
        setError('Failed to read file');
        setLoading(false);
      };
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const geo = loader.parse(buffer);
          setMesh(geo);
          setFileName(file.name);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load PLY');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    };

    const loadObj = () => {
      const loader = new OBJLoader();
      const reader = new FileReader();
      reader.onerror = () => {
        setError('Failed to read file');
        setLoading(false);
      };
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const obj = loader.parse(text);
          let geo: THREE.BufferGeometry | null = null;
          obj.traverse((child) => {
            if (!geo && child instanceof THREE.Mesh && child.geometry) {
              const g = child.geometry.clone();
              g.applyMatrix4(child.matrixWorld);
              geo = g;
            }
          });
          if (geo) {
            setMesh(geo);
            setFileName(file.name);
          } else {
            setError('No geometry in OBJ');
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load OBJ');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(file);
    };

    const loadStl = () => {
      const loader = new STLLoader();
      const reader = new FileReader();
      reader.onerror = () => {
        setError('Failed to read file');
        setLoading(false);
      };
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const geo = loader.parse(buffer);
          setMesh(geo);
          setFileName(file.name);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load STL');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    };

    if (ext === 'ply') loadPly();
    else if (ext === 'obj') loadObj();
    else if (ext === 'stl') loadStl();
    else {
      setError('Unsupported format. Use .ply, .obj, or .stl');
      setLoading(false);
    }
  }, []);

  const loadFromBlob = useCallback((blob: Blob, name: string) => {
    setLoading(true);
    setError(null);
    const file = new File([blob], name, { type: 'application/octet-stream' });
    loadFile(file);
  }, [loadFile]);

  const clear = useCallback(() => {
    setMesh(null);
    setFileName(null);
    setError(null);
  }, []);

  return { mesh, fileName, loading, error, loadFile, loadFromBlob, clear };
}

