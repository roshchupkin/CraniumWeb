import type { Metrics, AsymmetryResult } from '../lib/api';

interface MetricsPanelProps {
  metrics: Metrics | null;
  asymmetry: AsymmetryResult | null;
  onExportMetrics: () => void;
}

export function MetricsPanel(props: MetricsPanelProps) {
  const { metrics, asymmetry, onExportMetrics } = props;

  const hasData = metrics || asymmetry;

  if (!hasData) {
    return (
      <div className="panel metrics-panel">
        <h3>Measurements</h3>
        <p className="hint">Run Cephalometrics or Evaluate Asymmetry to see results.</p>
      </div>
    );
  }

  return (
    <div className="panel metrics-panel">
      <h3>Measurements</h3>
      {metrics && (
        <div className="metrics-section">
          <h4>Cephalometrics</h4>
          <dl>
            <dt>OFD (depth)</dt>
            <dd>{metrics.OFD_depth_mm} mm</dd>
            <dt>BPD (breadth)</dt>
            <dd>{metrics.BPD_breadth_mm} mm</dd>
            <dt>Cephalic Index</dt>
            <dd>{metrics.Cephalic_Index}</dd>
            <dt>Circumference</dt>
            <dd>{metrics.Circumference_cm} cm</dd>
            <dt>Mesh volume</dt>
            <dd>{metrics.MeshVolume_cc} cc</dd>
          </dl>
        </div>
      )}
      {asymmetry && (
        <div className="metrics-section">
          <h4>Facial Asymmetry</h4>
          <dl>
            <dt>Mean Asymmetry Index</dt>
            <dd>{asymmetry.Mean_Asymmetry_Index}</dd>
          </dl>
        </div>
      )}
      <button onClick={onExportMetrics}>Export JSON</button>
    </div>
  );
}
