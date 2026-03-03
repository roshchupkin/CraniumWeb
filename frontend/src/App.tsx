import { useState, useCallback } from 'react';
import { MeshViewer } from './components/MeshViewer';
import { MenuBar } from './components/MenuBar';
import { LandmarkPanel } from './components/LandmarkPanel';
import { MetricsPanel } from './components/MetricsPanel';
import { useMeshLoader } from './hooks/useMeshLoader';
import { useLandmarkPicker } from './hooks/useLandmarkPicker';
import * as api from './lib/api';
import * as THREE from 'three';

function App() {
  const {
    mesh,
    loading,
    error,
    loadFile,
    loadFromBlob,
  } = useMeshLoader();

  const {
    landmarks,
    pickingTarget,
    startPicking,
    pick,
    clear: clearLandmarks,
    hasAllThree,
  } = useLandmarkPicker();

  const [currentMeshFile, setCurrentMeshFile] = useState<File | null>(null);
  const [registrationLandmarks, setRegistrationLandmarks] = useState<api.RegistrationLandmarks | null>(null);
  const [metrics, setMetrics] = useState<api.Metrics | null>(null);
  const [asymmetry, setAsymmetry] = useState<api.AsymmetryResult | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [viewPreset, setViewPreset] = useState<import('./components/MeshViewer').ViewPreset>(null);

  const handleImportMesh = useCallback(
    (file: File) => {
      setCurrentMeshFile(file);
      loadFile(file);
      setRegistrationLandmarks(null);
      setMetrics(null);
      setAsymmetry(null);
    },
    [loadFile]
  );

  const handleMeshClick = useCallback(
    (point: THREE.Vector3) => {
      if (pickingTarget) {
        pick([point.x, point.y, point.z]);
      }
    },
    [pickingTarget, pick]
  );

  const runApi = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      initialStatus?: string
    ): Promise<T | null> => {
      setProcessing(true);
      setStatusMessage(initialStatus ?? null);
      let hadError = false;
      try {
        const result = await fn();
        return result;
      } catch (err) {
        hadError = true;
        setStatusMessage(err instanceof Error ? err.message : 'Error');
        return null;
      } finally {
        setProcessing(false);
        if (!hadError) setStatusMessage(null);
      }
    },
    []
  );

  const handleRegisterCranial = useCallback(async () => {
    if (!currentMeshFile || !landmarks) return;
    const result = await runApi(() =>
      api.registerMesh(currentMeshFile, landmarks, 'cranium')
    );
    if (result) {
      const blob = result.meshBlob;
      const name = (currentMeshFile.name || 'mesh.ply').replace(/\.[^.]+$/, '_rg.ply');
      const newFile = new File([blob], name, { type: 'application/octet-stream' });
      setCurrentMeshFile(newFile);
      loadFromBlob(blob, name);
      setRegistrationLandmarks(result.landmarks);
    }
  }, [currentMeshFile, landmarks, runApi, loadFromBlob]);

  const handleRegisterFacial = useCallback(async () => {
    if (!currentMeshFile || !landmarks) return;
    const result = await runApi(() =>
      api.registerMesh(currentMeshFile, landmarks, 'face')
    );
    if (result) {
      const blob = result.meshBlob;
      const name = (currentMeshFile.name || 'mesh.ply').replace(/\.[^.]+$/, '_rgF.ply');
      const newFile = new File([blob], name, { type: 'application/octet-stream' });
      setCurrentMeshFile(newFile);
      loadFromBlob(blob, name);
      setRegistrationLandmarks(result.landmarks);
    }
  }, [currentMeshFile, landmarks, runApi, loadFromBlob]);

  const handleCranialCut = useCallback(async () => {
    if (!currentMeshFile) return;
    const blob = await runApi(() => api.cranialCut(currentMeshFile));
    if (blob) {
      const name = (currentMeshFile.name || 'mesh.ply').replace(/\.[^.]+$/, '_C.ply');
      const newFile = new File([blob], name, { type: 'application/octet-stream' });
      setCurrentMeshFile(newFile);
      loadFromBlob(blob, name);
    }
  }, [currentMeshFile, runApi, loadFromBlob]);

  const handleFacialClip = useCallback(async () => {
    if (!currentMeshFile || !registrationLandmarks) return;
    const blob = await runApi(() =>
      api.facialClip(currentMeshFile, registrationLandmarks)
    );
    if (blob) {
      const name = (currentMeshFile.name || 'mesh.ply').replace(/\.[^.]+$/, '_CF.ply');
      const newFile = new File([blob], name, { type: 'application/octet-stream' });
      setCurrentMeshFile(newFile);
      loadFromBlob(blob, name);
    }
  }, [currentMeshFile, registrationLandmarks, runApi, loadFromBlob]);

  const handleCephalometrics = useCallback(async () => {
    if (!currentMeshFile) return;
    const m = await runApi(() => api.getCraniometrics(currentMeshFile));
    if (m) setMetrics(m);
  }, [currentMeshFile, runApi]);

  const handleAsymmetry = useCallback(async () => {
    if (!currentMeshFile) return;
    const a = await runApi(() => api.getAsymmetry(currentMeshFile));
    if (a) setAsymmetry(a);
  }, [currentMeshFile, runApi]);

  const handleNICPCranium = useCallback(async () => {
    if (!currentMeshFile) return;
    const blob = await runApi(
      () => api.runNICP(currentMeshFile, 'cranium'),
      'NICP in progress...'
    );
    if (blob) {
      const name = (currentMeshFile.name || 'mesh.ply').replace(/\.[^.]+$/, '_c_nicp.ply');
      const newFile = new File([blob], name, { type: 'application/octet-stream' });
      setCurrentMeshFile(newFile);
      loadFromBlob(blob, name);
    }
  }, [currentMeshFile, runApi, loadFromBlob]);

  const handleNICPFace = useCallback(async () => {
    if (!currentMeshFile) return;
    const blob = await runApi(
      () => api.runNICP(currentMeshFile, 'face'),
      'NICP in progress...'
    );
    if (blob) {
      const name = (currentMeshFile.name || 'mesh.ply').replace(/\.[^.]+$/, '_f_nicp.ply');
      const newFile = new File([blob], name, { type: 'application/octet-stream' });
      setCurrentMeshFile(newFile);
      loadFromBlob(blob, name);
    }
  }, [currentMeshFile, runApi, loadFromBlob]);

  const handleReloadMesh = useCallback(() => {
    if (currentMeshFile) loadFile(currentMeshFile);
  }, [currentMeshFile, loadFile]);

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `cranium_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  }, []);

  const handleViewXY = useCallback(() => setViewPreset('xy'), []);
  const handleViewXZ = useCallback(() => setViewPreset('xz'), []);

  const handleExportMetrics = useCallback(() => {
    if (!metrics && !asymmetry) return;
    const data = { metrics, asymmetry };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    link.download = `cranium_metrics_${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [metrics, asymmetry]);

  return (
    <div className="app">
      <header className="header">
        <h1>CraniumWeb</h1>
        <MenuBar
          onImportMesh={handleImportMesh}
          onReloadMesh={handleReloadMesh}
          onScreenshot={handleScreenshot}
          onRegisterCranial={handleRegisterCranial}
          onRegisterFacial={handleRegisterFacial}
          onCranialCut={handleCranialCut}
          onFacialClip={handleFacialClip}
          onCephalometrics={handleCephalometrics}
          onSliceOnly={handleCephalometrics} // Same as cephalometrics until distinct 2D slice feature exists
          onAsymmetry={handleAsymmetry}
          onNICPCranium={handleNICPCranium}
          onNICPFace={handleNICPFace}
          onViewXY={handleViewXY}
          onViewXZ={handleViewXZ}
          onViewYZ={() => setViewPreset('yz')}
          onShowGrid={() => setShowGrid(true)}
          onHideGrid={() => setShowGrid(false)}
          hasMesh={!!mesh}
          hasLandmarks={hasAllThree}
          hasRegisteredMesh={!!registrationLandmarks}
        />
      </header>

      <div className="content">
        <aside className="sidebar">
          <LandmarkPanel
            landmarks={landmarks}
            pickingTarget={pickingTarget}
            onStartPicking={startPicking}
            onClear={clearLandmarks}
            hasAllThree={hasAllThree}
          />
          <MetricsPanel
            metrics={metrics}
            asymmetry={asymmetry}
            onExportMetrics={handleExportMetrics}
          />
        </aside>
        <main className="viewer-area">
          <MeshViewer
            mesh={mesh}
            showEdges
            showGrid={showGrid}
            asymmetryHeatmap={asymmetry?.asymmetry_heatmap ?? null}
            cephalometricLine={metrics?.hc_line ?? null}
            landmarks={landmarks}
            viewPreset={viewPreset}
            onPresetApplied={() => setViewPreset(null)}
            onMeshClick={handleMeshClick}
            pickingMode={!!pickingTarget}
          />
          {(loading || processing || error || statusMessage) && (
            <div className={`overlay ${error ? 'error' : ''} ${statusMessage && !error ? 'status' : ''}`}>
              {error || statusMessage || (loading ? 'Loading mesh...' : 'Processing...')}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
