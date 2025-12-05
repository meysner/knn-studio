import { DataPoint, MetricType, WeightingType, ClassLabel, NeighborLink } from '../types';

export const calculateDistance = (
  p1: DataPoint,
  p2: DataPoint,
  metric: MetricType,
  p: number = 2,
  weights: { x: number; y: number } = { x: 1, y: 1 }
): number => {
  const dx = Math.abs(p1.x - p2.x) * weights.x;
  const dy = Math.abs(p1.y - p2.y) * weights.y;

  switch (metric) {
    case 'manhattan':
      return dx + dy;
    case 'minkowski':
      return Math.pow(Math.pow(dx, p) + Math.pow(dy, p), 1 / p);
    case 'cosine': {
      const wx = weights.x;
      const wy = weights.y;
      
      const v1x = p1.x * wx;
      const v1y = p1.y * wy;
      const v2x = p2.x * wx;
      const v2y = p2.y * wy;

      const dot = v1x * v2x + v1y * v2y;
      const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
      const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
      
      if (mag1 === 0 || mag2 === 0) return 1; 
      return 1 - dot / (mag1 * mag2);
    }
    case 'euclidean':
    default:
      return Math.sqrt(dx * dx + dy * dy);
  }
};

interface NeighborWithDist {
  point: DataPoint;
  dist: number;
}

export const classifyPoint = (
  testPoint: DataPoint,
  trainPoints: DataPoint[],
  k: number,
  metric: MetricType,
  minkowskiP: number,
  weighting: WeightingType,
  weights: { x: number; y: number } = { x: 1, y: 1 }
): { predictedLabel: ClassLabel | 'Uncertain'; neighbors: NeighborLink[]; hasTie: boolean } => {
  if (trainPoints.length === 0) return { predictedLabel: 'Uncertain', neighbors: [], hasTie: false };

  let allNeighbors: NeighborWithDist[] = trainPoints.map((tp) => ({
    point: tp,
    dist: calculateDistance(testPoint, tp, metric, minkowskiP, weights),
  }));

  allNeighbors.sort((a, b) => a.dist - b.dist);

  let cursor = 0;
  let round = 0;
  let hasTie = false;
  
  let visualNeighbors: NeighborLink[] = [];
  
  let finalLabel: ClassLabel | 'Uncertain' = 'Uncertain';
  let lastWinners: ClassLabel[] = [];

  while (cursor < allNeighbors.length) {
      
      const batchEnd = Math.min(cursor + k, allNeighbors.length);
      const batch = allNeighbors.slice(cursor, batchEnd);
      
      batch.forEach(n => {
          visualNeighbors.push({
              point: n.point,
              distance: n.dist,
              round: round
          });
      });

      const votes: Record<string, number> = {};
      
      Object.values(ClassLabel).forEach(c => votes[c] = 0);
      
      batch.forEach(n => {
          let weight = 1;
          if (weighting === 'distance') {
              weight = n.dist === 0 ? 10000 : 1 / (n.dist * n.dist);
          }
          votes[n.point.label] = (votes[n.point.label] || 0) + weight;
      });

      let maxVote = -1;
      let winners: ClassLabel[] = [];

      Object.values(ClassLabel).forEach(c => {
          const score = votes[c];
          if (score > maxVote) {
              maxVote = score;
              winners = [c as ClassLabel];
          } else if (Math.abs(score - maxVote) < 0.0001) {
              winners.push(c as ClassLabel);
          }
      });
      
      lastWinners = winners;

      if (winners.length === 1) {
          finalLabel = winners[0];
          break;
      }
      
      if (round > 0 || winners.length > 1) {
          hasTie = true;
      }

      cursor += k;
      round++;
  }

  if (finalLabel === 'Uncertain') {
      if (lastWinners.length > 0) {
        finalLabel = lastWinners[0];
      } else if (allNeighbors.length > 0) {
        finalLabel = allNeighbors[0].point.label; 
      }
  }

  return { predictedLabel: finalLabel, neighbors: visualNeighbors, hasTie };
};

export const generateRandomPoints = (
  count: number,
  width: number,
  height: number,
  pattern: 'random' | 'clusters' | 'circles' = 'random'
): DataPoint[] => {
  const points: DataPoint[] = [];
  const classes = Object.values(ClassLabel);

  for (let i = 0; i < count; i++) {
    let x = 0,
      y = 0,
      label = classes[Math.floor(Math.random() * classes.length)];

    if (pattern === 'random') {
      x = Math.random() * width - width / 2;
      y = Math.random() * height - height / 2;
    } else if (pattern === 'clusters') {
      const centers = [
        { x: -width / 4, y: -height / 4, l: ClassLabel.A },
        { x: width / 4, y: height / 4, l: ClassLabel.B },
        { x: -width / 4, y: height / 4, l: ClassLabel.C },
        { x: width / 4, y: -height / 4, l: ClassLabel.D },
      ];
      const center = centers[i % centers.length];
      label = center.l;
      const r1 = Math.random();
      const r2 = Math.random();
      const randStdNormal =
        Math.sqrt(-2.0 * Math.log(r1)) * Math.sin(2.0 * Math.PI * r2);
      const randStdNormal2 =
        Math.sqrt(-2.0 * Math.log(r1)) * Math.cos(2.0 * Math.PI * r2);

      x = center.x + randStdNormal * (width / 10);
      y = center.y + randStdNormal2 * (height / 10);
    } else if (pattern === 'circles') {
        const radius = Math.random() * (Math.min(width, height) / 2);
        const angle = Math.random() * Math.PI * 2;
        x = Math.cos(angle) * radius;
        y = Math.sin(angle) * radius;

        if (radius < Math.min(width, height) / 6) label = ClassLabel.A;
        else if (radius < Math.min(width, height) / 3) label = ClassLabel.B;
        else label = ClassLabel.C;
    }

    points.push({
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      label,
      type: 'train',
    });
  }
  return points;
};
