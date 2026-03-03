const API_BASE = '/api';

export interface Landmarks {
  nasion: [number, number, number];
  left_tragus: [number, number, number];
  right_tragus: [number, number, number];
}

export interface RegistrationLandmarks {
  datetime?: string;
  CoM?: string;
  initial_nasion?: number[];
  initial_lh_coord?: number[];
  initial_rh_coord?: number[];
  new_nasion: number[];
  new_lh_coord: number[];
  new_rh_coord: number[];
}

export interface Metrics {
  Datetime?: string;
  Filepath?: string;
  OFD_depth_mm?: number;
  BPD_breadth_mm?: number;
  Cephalic_Index?: number;
  Circumference_cm?: number;
  MeshVolume_cc?: number;
  /** Head circumference slice points [[x,y,z], ...] for red line visualization */
  hc_line?: [number, number, number][];
}

export interface AsymmetryResult {
  Datetime?: string;
  Filepath?: string;
  Mean_Asymmetry_Index?: number;
  asymmetry_heatmap?: number[];
}

export async function registerMesh(
  meshFile: File,
  landmarks: Landmarks,
  target: 'cranium' | 'face' = 'cranium'
): Promise<{ meshBlob: Blob; landmarks: RegistrationLandmarks }> {
  const form = new FormData();
  form.append('mesh', meshFile);
  form.append('landmarks', JSON.stringify(landmarks));
  form.append('target', target);

  const res = await fetch(`${API_BASE}/registration/register`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  const landmarksHeader = res.headers.get('X-Landmarks');
  const landmarksData: RegistrationLandmarks = landmarksHeader
    ? JSON.parse(atob(landmarksHeader))
    : {};
  return { meshBlob: await res.blob(), landmarks: landmarksData };
}

export async function cranialCut(meshFile: File, initialClip = false): Promise<Blob> {
  const form = new FormData();
  form.append('mesh', meshFile);
  form.append('initial_clip', String(initialClip));

  const res = await fetch(`${API_BASE}/registration/cranial-cut`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
}

export async function facialClip(
  meshFile: File,
  landmarks: RegistrationLandmarks | Landmarks
): Promise<Blob> {
  const form = new FormData();
  form.append('mesh', meshFile);
  form.append('landmarks', JSON.stringify(landmarks));

  const res = await fetch(`${API_BASE}/registration/facial-clip`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
}

export async function getCraniometrics(meshFile: File): Promise<Metrics> {
  const form = new FormData();
  form.append('mesh', meshFile);

  const res = await fetch(`${API_BASE}/craniometrics`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function runNICP(
  meshFile: File,
  target: 'cranium' | 'face' | 'head' = 'cranium'
): Promise<Blob> {
  const form = new FormData();
  form.append('mesh', meshFile);
  form.append('target', target);

  const res = await fetch(`${API_BASE}/nicp`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
}

export async function getAsymmetry(meshFile: File): Promise<AsymmetryResult> {
  const form = new FormData();
  form.append('mesh', meshFile);

  const res = await fetch(`${API_BASE}/asymmetry`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const json = JSON.parse(text);
      if (json.detail) message = json.detail;
    } catch {
      /* use raw text */
    }
    if (res.status === 501) {
      message = message || 'Asymmetry requires menpo3d (not installed). Use local dev with conda env, or see README.';
    }
    throw new Error(message);
  }
  return res.json();
}
