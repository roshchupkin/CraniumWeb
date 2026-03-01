import { useRef } from 'react';

interface MenuBarProps {
  onImportMesh: (file: File) => void;
  onReloadMesh: () => void;
  onScreenshot: () => void;
  onRegisterCranial: () => void;
  onRegisterFacial: () => void;
  onCranialCut: () => void;
  onFacialClip: () => void;
  onCephalometrics: () => void;
  onSliceOnly: () => void;
  onAsymmetry: () => void;
  onNICPCranium: () => void;
  onNICPFace: () => void;
  onViewXY: () => void;
  onViewXZ: () => void;
  onViewYZ: () => void;
  onShowGrid: () => void;
  onHideGrid: () => void;
  hasMesh: boolean;
  hasLandmarks: boolean;
  hasRegisteredMesh: boolean;
}

export function MenuBar(props: MenuBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="menubar">
      <input
        ref={fileInputRef}
        type="file"
        accept=".ply,.obj,.stl"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) props.onImportMesh(f);
          e.target.value = '';
        }}
      />
      <nav>
        <div className="menu">
          <span className="menu-label">File</span>
          <button onClick={() => fileInputRef.current?.click()}>Import mesh</button>
          <button onClick={props.onReloadMesh}>Re-load mesh</button>
          <button onClick={props.onScreenshot}>Screenshot</button>
        </div>
        <div className="menu">
          <span className="menu-label">Global alignment</span>
          <div className="submenu">
            <span>(1) Landmark selection</span>
            <span className="hint">Use landmark panel</span>
          </div>
          <div className="submenu">
            <span>(2) Register</span>
            <button onClick={props.onRegisterCranial} disabled={!props.hasLandmarks}>
              Cranial analysis
            </button>
            <button onClick={props.onRegisterFacial} disabled={!props.hasLandmarks}>
              Facial analysis
            </button>
          </div>
          <div className="submenu">
            <span>(3) Clip, Repair, Resample</span>
            <button onClick={props.onCranialCut} disabled={!props.hasRegisteredMesh}>
              Cranium
            </button>
            <button onClick={props.onFacialClip} disabled={!props.hasRegisteredMesh}>
              Face
            </button>
          </div>
        </div>
        <div className="menu">
          <span className="menu-label">Compute</span>
          <button onClick={props.onCephalometrics} disabled={!props.hasMesh}>
            Cephalometrics
          </button>
          <button onClick={props.onSliceOnly} disabled={!props.hasMesh}>
            2D slice
          </button>
          <button onClick={props.onAsymmetry} disabled={!props.hasMesh}>
            Evaluate Asymmetry
          </button>
          <div className="submenu">
            <span>Non-rigid ICP</span>
            <button onClick={props.onNICPCranium} disabled={!props.hasMesh}>
              NICP cranium
            </button>
            <button onClick={props.onNICPFace} disabled={!props.hasMesh}>
              NICP face
            </button>
          </div>
        </div>
        <div className="menu">
          <span className="menu-label">View</span>
          <button onClick={props.onViewXY}>XY plane (front)</button>
          <button onClick={props.onViewXZ}>XZ plane (bottom)</button>
          <button onClick={props.onViewYZ}>YZ plane (right)</button>
          <button onClick={props.onShowGrid}>Show grid</button>
          <button onClick={props.onHideGrid}>Hide grid</button>
        </div>
      </nav>
    </div>
  );
}
