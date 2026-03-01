import type { Landmarks } from '../lib/api';

interface LandmarkPanelProps {
  landmarks: Landmarks | null;
  pickingTarget: 'nasion' | 'left_tragus' | 'right_tragus' | null;
  onStartPicking: (target: 'nasion' | 'left_tragus' | 'right_tragus') => void;
  onClear: () => void;
  hasAllThree: boolean;
}

export function LandmarkPanel(props: LandmarkPanelProps) {
  const { landmarks, pickingTarget, onStartPicking, onClear, hasAllThree } = props;

  return (
    <div className="panel landmark-panel">
      <h3>Landmark Selection</h3>
      <p className="hint">Select 3 landmarks: Nasion, LH tragus, RH tragus</p>
      <div className="landmark-buttons">
        <button
          className={pickingTarget === 'nasion' ? 'active' : ''}
          onClick={() => onStartPicking('nasion')}
        >
          Nasion (Ctrl+N)
        </button>
        <button
          className={pickingTarget === 'left_tragus' ? 'active' : ''}
          onClick={() => onStartPicking('left_tragus')}
        >
          LH tragus (Ctrl+L)
        </button>
        <button
          className={pickingTarget === 'right_tragus' ? 'active' : ''}
          onClick={() => onStartPicking('right_tragus')}
        >
          RH tragus (Ctrl+R)
        </button>
      </div>
      {pickingTarget && (
        <p className="picking-hint">Click on mesh to pick {pickingTarget.replace('_', ' ')}</p>
      )}
      {landmarks && (
        <div className="landmark-list">
          {landmarks.nasion && (
            <div>Nasion: [{landmarks.nasion.map((v) => v.toFixed(2)).join(', ')}]</div>
          )}
          {landmarks.left_tragus && (
            <div>LH: [{landmarks.left_tragus.map((v) => v.toFixed(2)).join(', ')}]</div>
          )}
          {landmarks.right_tragus && (
            <div>RH: [{landmarks.right_tragus.map((v) => v.toFixed(2)).join(', ')}]</div>
          )}
        </div>
      )}
      {hasAllThree && (
        <p className="success">All 3 landmarks selected. Ready for registration.</p>
      )}
      <button onClick={onClear} className="secondary">
        Clear landmarks
      </button>
    </div>
  );
}
