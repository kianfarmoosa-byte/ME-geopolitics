import * as THREE from 'three';
import { GraphNode, GraphLink, ActorData, RelationType, ActorCategory } from '../types';
import { CATEGORY_COLORS, RELATION_CONFIG } from '../data';

export type ThreeLayoutType = 'sphere' | 'force' | 'concentric' | 'plane';

// Monochrome Palette for High-Tactical Aesthetic
export const MONOCHROME_NODE_COLORS: { [score: number]: { color: string; emissive: string; halo: string } } = {
  5: { color: '#f8fafc', emissive: '#cbd5e1', halo: '#e2e8f0' }, // Superpower Platinum White
  4: { color: '#e2e8f0', emissive: '#94a3b8', halo: '#cbd5e1' }, // High Power Silver
  3: { color: '#94a3b8', emissive: '#64748b', halo: '#94a3b8' }, // Medium Power Titanium
  2: { color: '#64748b', emissive: '#475569', halo: '#64748b' }, // Low Power Steel
  1: { color: '#475569', emissive: '#334155', halo: '#475569' }, // Minimal Power Dark Charcoal
};

export const MONOCHROME_RELATION_COLORS: { [type in RelationType]: string } = {
  alliance: '#f8fafc',    // Solid Radiant Silver White
  conflict: '#a1a1aa',    // Zinc Graphite (Contrast Dashed)
  economic: '#e2e8f0',    // Luminous Platinum Trade Flow
  diplomatic: '#cbd5e1',  // Silver Gray Channel
  proxy_cyber: '#94a3b8', // Slate Titanium
  volatile: '#71717a',    // Dark Zinc
};

export interface Node3DPosition {
  x: number;
  y: number;
  z: number;
}

// Compute 3D positions according to layout
export function compute3DLayout(
  nodes: GraphNode[],
  links: GraphLink[],
  layoutType: ThreeLayoutType,
  allActorsMap: Map<string, ActorData>
): Map<string, Node3DPosition> {
  const positions = new Map<string, Node3DPosition>();
  const total = nodes.length;
  if (total === 0) return positions;

  switch (layoutType) {
    case 'concentric': {
      // Group by influence score (5 to 1)
      const rings: { [score: number]: GraphNode[] } = { 5: [], 4: [], 3: [], 2: [], 1: [] };
      nodes.forEach((n) => {
        const score = Math.max(1, Math.min(5, Math.round(n.influenceScore || 3)));
        rings[score].push(n);
      });

      const radiusMap: { [score: number]: { r: number; ySpread: number } } = {
        5: { r: 160, ySpread: 30 },
        4: { r: 300, ySpread: 90 },
        3: { r: 440, ySpread: 160 },
        2: { r: 560, ySpread: 220 },
        1: { r: 660, ySpread: 260 },
      };

      Object.entries(rings).forEach(([scoreStr, ringNodes]) => {
        const score = Number(scoreStr);
        const { r, ySpread } = radiusMap[score] || { r: 400, ySpread: 100 };
        const count = ringNodes.length;
        ringNodes.forEach((node, i) => {
          const angle = (i / Math.max(1, count)) * Math.PI * 2;
          const y = Math.sin(angle * 3) * ySpread;
          positions.set(node.id, {
            x: Math.cos(angle) * r,
            y,
            z: Math.sin(angle) * r,
          });
        });
      });
      break;
    }

    case 'plane': {
      // 2.5D Strategic Plane: X/Z spread, Y height = power tier elevation
      const cols = Math.ceil(Math.sqrt(total * 1.3));
      const spacing = 180;
      const sorted = [...nodes].sort((a, b) => (b.influenceScore || 0) - (a.influenceScore || 0));

      sorted.forEach((node, idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        const x = (col - cols / 2) * spacing + (row % 2 === 1 ? spacing * 0.4 : 0);
        const z = (row - cols / 2) * spacing;
        const score = node.influenceScore || 3;
        // Superpowers elevated high above ground
        const y = (score - 3) * 80;
        positions.set(node.id, { x, y, z });
      });
      break;
    }

    case 'force': {
      // 3D Spring-embedder force simulation
      // 1. Initial random / spherical positions
      const tempPos: { [id: string]: THREE.Vector3 } = {};
      const tempVel: { [id: string]: THREE.Vector3 } = {};

      nodes.forEach((node, i) => {
        const phi = Math.acos(-1 + (2 * i) / total);
        const theta = Math.sqrt(total * Math.PI) * phi;
        const r = 320 + ((i % 3) * 60);
        tempPos[node.id] = new THREE.Vector3(
          r * Math.cos(theta) * Math.sin(phi),
          r * Math.sin(theta) * Math.sin(phi),
          r * Math.cos(phi)
        );
        tempVel[node.id] = new THREE.Vector3(0, 0, 0);
      });

      // Quick 60 iterations of 3D force relaxation
      const iterations = 65;
      const kRepulsion = 180000;
      const kAttraction = 0.0035;
      const damping = 0.82;

      for (let iter = 0; iter < iterations; iter++) {
        // Repulsion between all pairs
        for (let i = 0; i < total; i++) {
          const idA = nodes[i].id;
          const posA = tempPos[idA];
          for (let j = i + 1; j < total; j++) {
            const idB = nodes[j].id;
            const posB = tempPos[idB];
            const delta = posA.clone().sub(posB);
            const distSq = Math.max(delta.lengthSq(), 400);
            const dist = Math.sqrt(distSq);
            const force = (kRepulsion / distSq) * 0.5;
            const dir = delta.normalize().multiplyScalar(force);
            tempVel[idA].add(dir);
            tempVel[idB].sub(dir);
          }
        }

        // Attraction along links
        links.forEach((l) => {
          const sId = typeof l.source === 'object' ? (l.source as { id: string }).id : l.source;
          const tId = typeof l.target === 'object' ? (l.target as { id: string }).id : l.target;
          if (tempPos[sId] && tempPos[tId]) {
            const posS = tempPos[sId];
            const posT = tempPos[tId];
            const delta = posT.clone().sub(posS);
            const dist = delta.length();
            const strength = (l.intensity || 3) * kAttraction;
            const force = delta.multiplyScalar(dist * strength);
            tempVel[sId].add(force);
            tempVel[tId].sub(force);
          }
        });

        // Center gravity
        nodes.forEach((node) => {
          const pos = tempPos[node.id];
          const gravity = pos.clone().multiplyScalar(-0.015);
          tempVel[node.id].add(gravity);
          // Apply velocity
          pos.add(tempVel[node.id]);
          tempVel[node.id].multiplyScalar(damping);
        });
      }

      nodes.forEach((node) => {
        const p = tempPos[node.id];
        positions.set(node.id, { x: p.x, y: p.y, z: p.z });
      });
      break;
    }

    case 'sphere':
    default: {
      // Golden Spiral / Fibonacci Sphere with Semantic Grouping
      // Category cluster polar angle biasing
      const categoryClusters: { [cat in ActorCategory]?: number } = {
        'قدرت‌ها/بازیگران دولتی فرامنطقه‌ای': 0.15,
        'دولت‌ها/اقتدارهای سطح دولتی منطقه‌ای': 0.45,
        'بازیگران مسلح غیردولتی/شبه‌دولتی': 0.75,
        'بازیگران اقتصادی/انرژی/مالی': 0.3,
        'سازمان‌های بین‌المللی/منطقه‌ای': 0.6,
        'شبکه‌های فراملی ایدئولوژیک/قومی/سایبری/رسانه‌ای': 0.9,
      };

      const phi = (1 + Math.sqrt(5)) / 2; // golden ratio

      nodes.forEach((node, i) => {
        const score = node.influenceScore || 3;
        // High-power actors sit closer to core (R=220-300), lower power at outer shell (R=380-480)
        const baseRadius = 460 - (score - 1) * 55;
        
        const theta = 2 * Math.PI * i / phi;
        const yNorm = 1 - (i / Math.max(1, total - 1)) * 2; // from 1 to -1
        const radiusAtY = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));

        const clusterBias = categoryClusters[node.category] ?? 0.5;
        const adjustedY = yNorm * (0.75 + clusterBias * 0.5);

        positions.set(node.id, {
          x: Math.cos(theta) * radiusAtY * baseRadius,
          y: adjustedY * baseRadius,
          z: Math.sin(theta) * radiusAtY * baseRadius,
        });
      });
      break;
    }
  }

  return positions;
}

// Generate high-resolution HTML5 canvas texture for 3D Billboard Sprite
export function createActorSpriteTexture(
  actor: GraphNode,
  isSelected: boolean,
  isHovered: boolean,
  isMonochrome: boolean = true
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const width = 380;
  const height = 110;
  canvas.width = width;
  canvas.height = height;

  // Background pill
  const catConfig = CATEGORY_COLORS[actor.category];
  const score = Math.max(1, Math.min(5, Math.round(actor.influenceScore || 3)));
  const monoConfig = MONOCHROME_NODE_COLORS[score] || MONOCHROME_NODE_COLORS[3];
  const catColor = isMonochrome ? monoConfig.color : (catConfig?.hex || '#38bdf8');

  ctx.clearRect(0, 0, width, height);

  // Rounded pill background
  const r = 24;
  const paddingX = 14;
  const paddingY = 12;
  const pillW = width - paddingX * 2;
  const pillH = height - paddingY * 2;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(paddingX, paddingY, pillW, pillH, r);

  if (isSelected) {
    ctx.fillStyle = isMonochrome ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = isMonochrome ? '#ffffff' : '#38bdf8';
    ctx.lineWidth = 4;
    ctx.shadowColor = isMonochrome ? '#ffffff' : '#38bdf8';
    ctx.shadowBlur = 18;
  } else if (isHovered) {
    ctx.fillStyle = isMonochrome ? 'rgba(24, 24, 27, 0.94)' : 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = catColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = catColor;
    ctx.shadowBlur = 14;
  } else {
    ctx.fillStyle = isMonochrome ? 'rgba(9, 9, 11, 0.88)' : 'rgba(10, 15, 30, 0.82)';
    ctx.strokeStyle = isMonochrome ? 'rgba(113, 113, 122, 0.45)' : 'rgba(71, 85, 105, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 8;
  }

  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Draw Flag emoji & Name
  ctx.font = 'bold 26px "Vazirmatn", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';

  const flag = actor.flagEmoji || '🌐';
  const nameText = `${flag} ${actor.nameFa}`;
  // Right-aligned Persian text
  ctx.fillText(nameText, width - paddingX - 18, paddingY + pillH * 0.38);

  // Subtitle: English acronym / power rating
  ctx.font = '600 16px "SF Pro", system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = isMonochrome ? '#a1a1aa' : '#94a3b8';

  const acronym = actor.acronym ? `(${actor.acronym})` : '';
  const scoreBadge = `سطح نفوذ: ${score}/۵`;
  ctx.fillText(`${acronym} • ${scoreBadge}`, width - paddingX - 18, paddingY + pillH * 0.74);

  // Left status pill indicator
  ctx.beginPath();
  ctx.arc(paddingX + 24, paddingY + pillH * 0.5, 7, 0, Math.PI * 2);
  ctx.fillStyle = catColor;
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// Generate Quadratic Bezier curve points in 3D with outward lofting
export function getLinkCurve(
  startPos: Node3DPosition,
  endPos: Node3DPosition,
  intensity: number = 3
): THREE.QuadraticBezierCurve3 {
  const v1 = new THREE.Vector3(startPos.x, startPos.y, startPos.z);
  const v2 = new THREE.Vector3(endPos.x, endPos.y, endPos.z);

  const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
  const dist = v1.distanceTo(v2);

  // Loft the curve outward from origin so lines don't collide or intersect through core
  const midNormal = mid.clone().normalize();
  if (midNormal.lengthSq() < 0.001) {
    midNormal.set(0, 1, 0);
  }

  // Loft proportional to distance and power
  const loftDistance = Math.min(140, Math.max(25, dist * 0.18));
  const controlPoint = mid.add(midNormal.multiplyScalar(loftDistance));

  return new THREE.QuadraticBezierCurve3(v1, controlPoint, v2);
}
