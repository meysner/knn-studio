export enum ClassLabel {
  A = 'Class A',
  B = 'Class B',
  C = 'Class C',
  D = 'Class D'
}

export const CLASS_COLORS: Record<ClassLabel, string> = {
  [ClassLabel.A]: '#ef4444',
  [ClassLabel.B]: '#3b82f6',
  [ClassLabel.C]: '#22c55e',
  [ClassLabel.D]: '#eab308',
};

export type PointType = 'train' | 'test';

export interface NeighborLink {
  point: DataPoint;
  distance: number;
  round: number;
}

export interface DataPoint {
  id: string;
  x: number;
  y: number;
  label: ClassLabel;
  type: PointType;
  predictedLabel?: ClassLabel | 'Uncertain';
  neighbors?: NeighborLink[];
  hasTie?: boolean;
  isCorrect?: boolean;
  isUserCreated?: boolean;
}

export type MetricType = 'euclidean' | 'manhattan' | 'minkowski' | 'cosine';
export type WeightingType = 'uniform' | 'distance';

export interface KNNConfig {
  k: number;
  metric: MetricType;
  minkowskiP: number;
  weighting: WeightingType;
  weights: { x: number; y: number };
  visualizeWeights: boolean;
}

export interface VisualSettings {
  pointRadius: number;
  lineWidth: number;
  showLines: boolean;
}

export interface DatasetState {
  rawRows: any[];
  headers: string[];
  xCol: string;
  yCol: string;
  labelCol: string;
  classMapping: Record<string, ClassLabel>;
}

export interface DatasetMetadata {
  name: string;
  description: string;
}

export interface DataFilter {
  min?: number;
  max?: number;
}

export interface FilterState {
  x: DataFilter;
  y: DataFilter;
}
