export interface FaceCounts {
  referenceFaceCount: number;
  candidateFaceCount: number;
}

export type DeepFaceResult = (FaceCounts & { status: 'invalid_faces' }) | (FaceCounts & {
  status: 'compared';
  distance: number;
  threshold: number;
  verified: boolean;
  model: 'VGG-Face';
  detector: 'opencv';
  metric: 'cosine';
});
