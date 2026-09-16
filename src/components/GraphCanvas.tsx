import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GraphNode, GraphLink, ActorData, RelationType } from '../types';
import { CATEGORY_COLORS, RELATION_CONFIG } from '../data';
import { 
  FocusViewOverlay, 
  StrategicLayerType, 
  getLinkLayer 
} from './FocusViewOverlay';
import { GraphTooltip } from './GraphTooltip';
import { 
  compute3DLayout, 
  createActorSpriteTexture, 
  getLinkCurve, 
  ThreeLayoutType, 
  Node3DPosition 
} from '../utils/threeGraphHelpers';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Compass, 
  CircleDot, 
  Grid, 
  Play, 
  Pause,
  Layers,
  Activity
} from 'lucide-react';

interface GraphCanvasProps {
  nodes: GraphNode[];
  links: GraphLink[];
  allActorsMap: Map<string, ActorData>;
  selectedActor: ActorData | null;
  onSelectActor: (actor: ActorData | null) => void;
  onOpenDetailsModal?: (actor: ActorData) => void;
  highlightedPathNodeIds?: string[];
  searchQuery?: string;
  clusterMode?: 'free' | 'category';
}

interface ParticlePulse {
  curve: THREE.QuadraticBezierCurve3;
  progress: number;
  speed: number;
  color: THREE.Color;
  mesh: THREE.Mesh;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  links,
  allActorsMap,
  selectedActor,
  onSelectActor,
  onOpenDetailsModal,
  highlightedPathNodeIds = [],
  searchQuery = '',
  clusterMode = 'free',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Layout mode: 'sphere' (منظومه کروی), 'force' (فیزیک تعادلی), 'concentric' (مدارهای نفوذ), 'plane' (صفحه راهبردی)
  const [layoutType, setLayoutType] = useState<ThreeLayoutType>('sphere');
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [labelDensityMode, setLabelDensityMode] = useState<'auto' | 'all' | 'none'>('auto');

  // Tooltip & Hover state
  const [hoveredActor, setHoveredActor] = useState<ActorData | null>(null);
  const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Focus View State
  const [focusedActor, setFocusedActor] = useState<ActorData | null>(null);
  const [focusLayer, setFocusLayer] = useState<StrategicLayerType>('all');
  const isFocusMode = Boolean(focusedActor);

  // References for Three.js engine
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // 3D Objects Storage
  const nodeMeshesRef = useRef<Map<string, {
    group: THREE.Group;
    sphere: THREE.Mesh;
    halo?: THREE.Mesh;
    sprite: THREE.Sprite;
    baseScale: number;
    colorHex: string;
  }>>(new Map());

  const linkObjectsRef = useRef<Map<string, {
    line: THREE.Line;
    curve: THREE.QuadraticBezierCurve3;
    sourceId: string;
    targetId: string;
    baseColor: string;
    baseWidth: number;
    link: GraphLink;
  }>>(new Map());

  const pulsesRef = useRef<ParticlePulse[]>([]);
  const nodePositionsRef = useRef<Map<string, Node3DPosition>>(new Map());

  // Camera animation target
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

  // Sync state refs for animation loop & event listeners
  const selectedActorRef = useRef(selectedActor);
  useEffect(() => { selectedActorRef.current = selectedActor; }, [selectedActor]);

  const focusedActorRef = useRef(focusedActor);
  useEffect(() => { focusedActorRef.current = focusedActor; }, [focusedActor]);

  const allActorsMapRef = useRef(allActorsMap);
  useEffect(() => { allActorsMapRef.current = allActorsMap; }, [allActorsMap]);

  const linksRef = useRef(links);
  useEffect(() => { linksRef.current = links; }, [links]);

  const nodesRef = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  const onSelectActorRef = useRef(onSelectActor);
  useEffect(() => { onSelectActorRef.current = onSelectActor; }, [onSelectActor]);

  const highlightedPathNodeIdsRef = useRef(highlightedPathNodeIds);
  useEffect(() => { highlightedPathNodeIdsRef.current = highlightedPathNodeIds; }, [highlightedPathNodeIds]);

  const searchQueryRef = useRef(searchQuery);
  useEffect(() => { searchQueryRef.current = searchQuery; }, [searchQuery]);

  // Compute direct links & neighbors for focusedActor
  const focusedDirectLinks = useMemo(() => {
    if (!focusedActor) return [];
    return links.filter((l) => {
      const srcId = typeof l.source === 'object' ? (l.source as { id: string }).id : l.source;
      const tgtId = typeof l.target === 'object' ? (l.target as { id: string }).id : l.target;
      return srcId === focusedActor.id || tgtId === focusedActor.id;
    });
  }, [focusedActor, links]);

  const focusedNeighborsMap = useMemo(() => {
    if (!focusedActor) return new Map<string, { neighbor: ActorData; links: GraphLink[]; layer: StrategicLayerType }>();
    const map = new Map<string, { neighbor: ActorData; links: GraphLink[]; layer: StrategicLayerType }>();

    focusedDirectLinks.forEach((l) => {
      const srcId = typeof l.source === 'object' ? (l.source as { id: string }).id : l.source;
      const tgtId = typeof l.target === 'object' ? (l.target as { id: string }).id : l.target;
      const neighborId = srcId === focusedActor.id ? tgtId : srcId;
      const neighbor = allActorsMap.get(neighborId);
      if (!neighbor) return;

      const layer = getLinkLayer(l.type);
      if (!map.has(neighborId)) {
        map.set(neighborId, { neighbor, links: [l], layer });
      } else {
        map.get(neighborId)!.links.push(l);
      }
    });

    return map;
  }, [focusedActor, focusedDirectLinks, allActorsMap]);

  // Handle entering Focus View (Fly to actor in 3D)
  const handleEnterFocusView = useCallback((actor: ActorData) => {
    setFocusedActor(actor);
    onSelectActor(actor);
    setFocusLayer('all');

    const pos = nodePositionsRef.current.get(actor.id);
    if (pos && cameraRef.current && controlsRef.current) {
      const targetVec = new THREE.Vector3(pos.x, pos.y, pos.z);
      const camOffset = new THREE.Vector3(pos.x, pos.y, pos.z).normalize().multiplyScalar(280);
      if (camOffset.lengthSq() < 10) camOffset.set(0, 80, 260);
      targetCamPosRef.current = targetVec.clone().add(camOffset);
      targetLookAtRef.current = targetVec;
    }
  }, [onSelectActor]);

  // Handle exiting Focus View
  const handleExitFocusView = useCallback(() => {
    setFocusedActor(null);
    setFocusLayer('all');
    targetCamPosRef.current = new THREE.Vector3(0, 240, 880);
    targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
  }, []);

  // Compute 3D node positions when nodes/links/layout changes
  useEffect(() => {
    const computedPositions = compute3DLayout(nodes, links, layoutType, allActorsMap);
    nodePositionsRef.current = computedPositions;

    // Reposition node meshes
    computedPositions.forEach((pos, id) => {
      const nodeObj = nodeMeshesRef.current.get(id);
      if (nodeObj) {
        nodeObj.group.position.set(pos.x, pos.y, pos.z);
      }
    });

    // Rebuild links with new curves
    linkObjectsRef.current.forEach((edgeObj, linkId) => {
      const sPos = computedPositions.get(edgeObj.sourceId);
      const tPos = computedPositions.get(edgeObj.targetId);
      if (sPos && tPos) {
        const newCurve = getLinkCurve(sPos, tPos, edgeObj.link.intensity);
        edgeObj.curve = newCurve;
        const pts = newCurve.getPoints(32);
        edgeObj.line.geometry.dispose();
        edgeObj.line.geometry = new THREE.BufferGeometry().setFromPoints(pts);
      }
    });

    // Update pulses
    pulsesRef.current.forEach((p, idx) => {
      const link = links[idx % Math.max(1, links.length)];
      if (link) {
        const sId = typeof link.source === 'object' ? (link.source as { id: string }).id : link.source;
        const tId = typeof link.target === 'object' ? (link.target as { id: string }).id : link.target;
        const sPos = computedPositions.get(sId);
        const tPos = computedPositions.get(tId);
        if (sPos && tPos) {
          p.curve = getLinkCurve(sPos, tPos, link.intensity);
        }
      }
    });
  }, [nodes, links, layoutType, allActorsMap]);

  // Main Three.js Scene Setup & Animation Loop
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x030712); // Deep Obsidian
    scene.fog = new THREE.FogExp2(0x030712, 0.00065);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(52, width / height, 5, 5000);
    camera.position.set(0, 240, 880);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 140;
    controls.maxDistance = 2200;
    controls.autoRotate = isAutoRotate;
    controls.autoRotateSpeed = 0.45;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.8);
    dirLight1.position.set(400, 600, 500);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 1.2);
    dirLight2.position.set(-500, -300, -400);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x38bdf8, 2.0, 1400);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // 6. Tactical Starfield / Dust Background Particles
    const starCount = 650;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 3200;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 2400;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 3200;

      // Soft cyan / lavender tint
      starColors[i * 3] = 0.4 + Math.random() * 0.4;
      starColors[i * 3 + 1] = 0.6 + Math.random() * 0.4;
      starColors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // 7. Tactical Circular Coordinate Rings in Core
    const ringGroup = new THREE.Group();
    [240, 420, 600].forEach((radius) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.75, radius + 0.75, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x1e293b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringGroup.add(ringMesh);
    });
    scene.add(ringGroup);

    // 8. Shared Geometries for Particle Pulses
    const pulseGeo = new THREE.SphereGeometry(2.6, 12, 12);
    const pulseMeshes: ParticlePulse[] = [];

    // Create 18 active traveling energy pulses
    const initialLinks = linksRef.current;
    const pulseCount = Math.min(22, Math.max(10, initialLinks.length));
    for (let i = 0; i < pulseCount; i++) {
      const link = initialLinks[i % Math.max(1, initialLinks.length)];
      if (!link) continue;
      const relConfig = RELATION_CONFIG[link.type];
      const pColor = new THREE.Color(relConfig?.color || '#38bdf8');

      const pMat = new THREE.MeshBasicMaterial({
        color: pColor,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
      const pMesh = new THREE.Mesh(pulseGeo, pMat);
      scene.add(pMesh);

      // Dummy initial curve, will update
      const dummyCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 50, 0),
        new THREE.Vector3(0, 100, 0)
      );

      pulseMeshes.push({
        curve: dummyCurve,
        progress: (i / pulseCount),
        speed: 0.0035 + Math.random() * 0.003,
        color: pColor,
        mesh: pMesh,
      });
    }
    pulsesRef.current = pulseMeshes;

    // 9. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // 10. Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera interpolation towards target
      if (targetCamPosRef.current && targetLookAtRef.current) {
        camera.position.lerp(targetCamPosRef.current, 0.06);
        controls.target.lerp(targetLookAtRef.current, 0.06);

        if (camera.position.distanceTo(targetCamPosRef.current) < 3) {
          targetCamPosRef.current = null;
          targetLookAtRef.current = null;
        }
      }

      // Update controls
      controls.update();

      // Slowly rotate starfield & core rings for ambient space movement
      starField.rotation.y = elapsedTime * 0.015;
      ringGroup.rotation.y = -elapsedTime * 0.02;

      // Animate pulses along edge curves
      pulsesRef.current.forEach((pulse) => {
        pulse.progress += pulse.speed;
        if (pulse.progress > 1) pulse.progress = 0;
        try {
          const pt = pulse.curve.getPoint(pulse.progress);
          pulse.mesh.position.copy(pt);
        } catch {
          // ignore
        }
      });

      // Animate halos on superpower nodes
      nodeMeshesRef.current.forEach(({ halo, sphere }) => {
        if (halo) {
          halo.rotation.z = elapsedTime * 0.8;
          const scale = 1 + Math.sin(elapsedTime * 3) * 0.06;
          halo.scale.set(scale, scale, 1);
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      resizeObserver.disconnect();
      controls.dispose();

      // Clean up meshes & textures
      nodeMeshesRef.current.forEach(({ group, sprite, sphere }) => {
        scene.remove(group);
        sphere.geometry.dispose();
        (sphere.material as THREE.Material).dispose();
        if (sprite.material.map) sprite.material.map.dispose();
        sprite.material.dispose();
      });
      nodeMeshesRef.current.clear();

      linkObjectsRef.current.forEach(({ line }) => {
        scene.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });
      linkObjectsRef.current.clear();

      pulseMeshes.forEach((p) => {
        scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
      });
      pulseGeo.dispose();

      starGeometry.dispose();
      starMaterial.dispose();

      renderer.dispose();
    };
  }, []); // Run once on mount

  // Sync auto-rotate toggle to OrbitControls
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotate;
    }
  }, [isAutoRotate]);

  // Populate or Update 3D Nodes in Scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Build or update nodes
    const currentNodeIds = new Set(nodes.map((n) => n.id));

    // Remove obsolete nodes
    nodeMeshesRef.current.forEach((obj, id) => {
      if (!currentNodeIds.has(id)) {
        scene.remove(obj.group);
        obj.sphere.geometry.dispose();
        (obj.sphere.material as THREE.Material).dispose();
        if (obj.sprite.material.map) obj.sprite.material.map.dispose();
        obj.sprite.material.dispose();
        nodeMeshesRef.current.delete(id);
      }
    });

    // Add or update active nodes
    nodes.forEach((node) => {
      const catConfig = CATEGORY_COLORS[node.category];
      const colorHex = catConfig?.hex || '#38bdf8';
      const score = Math.max(1, Math.min(5, node.influenceScore || 3));
      const radius = 13 + score * 3.6; // 16.6 to 31 units

      let nodeObj = nodeMeshesRef.current.get(node.id);

      if (!nodeObj) {
        const group = new THREE.Group();

        // 1. Sphere Mesh
        const sphereGeo = new THREE.SphereGeometry(radius, 32, 32);
        const sphereMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorHex),
          emissive: new THREE.Color(colorHex),
          emissiveIntensity: 0.35,
          roughness: 0.25,
          metalness: 0.65,
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.userData = { type: 'node', actorId: node.id };
        group.add(sphere);

        // 2. Halo ring for superpowers (score >= 4)
        let halo: THREE.Mesh | undefined;
        if (score >= 4) {
          const haloGeo = new THREE.RingGeometry(radius * 1.35, radius * 1.5, 32);
          const haloMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(colorHex),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending,
          });
          halo = new THREE.Mesh(haloGeo, haloMat);
          group.add(halo);
        }

        // 3. Billboard Sprite Label
        const texture = createActorSpriteTexture(node, false, false);
        const spriteMat = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          opacity: 0.95,
          depthTest: false,
        });
        const sprite = new THREE.Sprite(spriteMat);
        // Position below or above sphere
        sprite.position.set(0, -radius - 18, 0);
        sprite.scale.set(70, 20, 1);
        group.add(sprite);

        scene.add(group);

        nodeObj = {
          group,
          sphere,
          halo,
          sprite,
          baseScale: 1,
          colorHex,
        };
        nodeMeshesRef.current.set(node.id, nodeObj);
      }

      // Position from layout
      const pos = nodePositionsRef.current.get(node.id) || { x: 0, y: 0, z: 0 };
      nodeObj.group.position.set(pos.x, pos.y, pos.z);
    });
  }, [nodes]);

  // Populate or Update 3D Links in Scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentLinkIds = new Set(links.map((l) => l.id));

    // Remove obsolete links
    linkObjectsRef.current.forEach((obj, id) => {
      if (!currentLinkIds.has(id)) {
        scene.remove(obj.line);
        obj.line.geometry.dispose();
        (obj.line.material as THREE.Material).dispose();
        linkObjectsRef.current.delete(id);
      }
    });

    // Add or update active links
    links.forEach((link) => {
      const sId = typeof link.source === 'object' ? (link.source as { id: string }).id : link.source;
      const tId = typeof link.target === 'object' ? (link.target as { id: string }).id : link.target;
      const sPos = nodePositionsRef.current.get(sId) || { x: 0, y: 0, z: 0 };
      const tPos = nodePositionsRef.current.get(tId) || { x: 0, y: 0, z: 0 };

      const relConfig = RELATION_CONFIG[link.type];
      const baseColor = relConfig?.color || '#64748b';
      const curve = getLinkCurve(sPos, tPos, link.intensity);

      let edgeObj = linkObjectsRef.current.get(link.id);

      if (!edgeObj) {
        const pts = curve.getPoints(32);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const lineMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(baseColor),
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending,
        });
        const line = new THREE.Line(lineGeo, lineMat);
        line.userData = { type: 'edge', linkId: link.id };
        scene.add(line);

        edgeObj = {
          line,
          curve,
          sourceId: sId,
          targetId: tId,
          baseColor,
          baseWidth: link.intensity,
          link,
        };
        linkObjectsRef.current.set(link.id, edgeObj);
      } else {
        edgeObj.curve = curve;
        const pts = curve.getPoints(32);
        edgeObj.line.geometry.dispose();
        edgeObj.line.geometry = new THREE.BufferGeometry().setFromPoints(pts);
      }
    });
  }, [links]);

  // Update Dynamic Visual Highlights (Selected Actor, Hover, Focus View, Path Analysis, Search)
  useEffect(() => {
    const isSelected = Boolean(selectedActor);
    const selectedId = selectedActor?.id;
    const isFocused = Boolean(focusedActor);
    const focusedId = focusedActor?.id;

    // Find direct neighbors of selected actor
    const directNeighborIds = new Set<string>();
    if (selectedId) {
      links.forEach((l) => {
        const sId = typeof l.source === 'object' ? (l.source as { id: string }).id : l.source;
        const tId = typeof l.target === 'object' ? (l.target as { id: string }).id : l.target;
        if (sId === selectedId) directNeighborIds.add(tId);
        if (tId === selectedId) directNeighborIds.add(sId);
      });
    }

    const pathSet = new Set(highlightedPathNodeIds);
    const isPathActive = pathSet.size > 0;
    const searchTrimmed = searchQuery.trim().toLowerCase();
    const isSearchActive = searchTrimmed.length > 0;

    // 1. Update Nodes
    nodeMeshesRef.current.forEach((nodeObj, id) => {
      const nodeData = allActorsMap.get(id);
      const isTargetNodeSelected = id === selectedId;
      const isTargetNodeFocused = id === focusedId;
      const isNeighbor = directNeighborIds.has(id);
      const isHovered = hoveredActor?.id === id;
      const isInPath = pathSet.has(id);
      const matchesSearch = isSearchActive && (
        nodeData?.nameFa.toLowerCase().includes(searchTrimmed) ||
        nodeData?.nameEn.toLowerCase().includes(searchTrimmed) ||
        nodeData?.acronym?.toLowerCase().includes(searchTrimmed)
      );

      const sphereMat = nodeObj.sphere.material as THREE.MeshStandardMaterial;

      if (isTargetNodeSelected || isTargetNodeFocused) {
        sphereMat.emissiveIntensity = 0.95;
        sphereMat.opacity = 1.0;
        nodeObj.group.scale.set(1.25, 1.25, 1.25);
      } else if (isNeighbor || isInPath || matchesSearch) {
        sphereMat.emissiveIntensity = 0.65;
        sphereMat.opacity = 1.0;
        nodeObj.group.scale.set(1.1, 1.1, 1.1);
      } else if (isSelected || isFocused || isPathActive || isSearchActive) {
        // Dim unselected / non-neighbor actors
        sphereMat.emissiveIntensity = 0.1;
        sphereMat.opacity = 0.25;
        nodeObj.group.scale.set(0.9, 0.9, 0.9);
      } else {
        sphereMat.emissiveIntensity = 0.35;
        sphereMat.opacity = 0.95;
        nodeObj.group.scale.set(1.0, 1.0, 1.0);
      }

      // Sprite LOD visibility
      if (labelDensityMode === 'none') {
        nodeObj.sprite.visible = false;
      } else if (labelDensityMode === 'all') {
        nodeObj.sprite.visible = true;
      } else {
        // 'auto': show if superpower, selected, neighbor, hovered, or in path
        const score = nodeData?.influenceScore || 3;
        const shouldShow = score >= 4 || isTargetNodeSelected || isNeighbor || isInPath || isHovered || isTargetNodeFocused || matchesSearch;
        nodeObj.sprite.visible = shouldShow;
      }
    });

    // 2. Update Edges
    linkObjectsRef.current.forEach((edgeObj, linkId) => {
      const { line, sourceId, targetId, baseColor } = edgeObj;
      const lineMat = line.material as THREE.LineBasicMaterial;

      const isConnectedToSelected = selectedId && (sourceId === selectedId || targetId === selectedId);
      const isConnectedToFocused = focusedId && (sourceId === focusedId || targetId === focusedId);
      const isBothInPath = isPathActive && pathSet.has(sourceId) && pathSet.has(targetId);

      if (isBothInPath) {
        lineMat.color.set('#38bdf8');
        lineMat.opacity = 0.95;
      } else if (isConnectedToSelected || isConnectedToFocused) {
        lineMat.color.set(baseColor);
        lineMat.opacity = 0.9;
      } else if (isSelected || isFocused || isPathActive) {
        // Dim unrelated edges
        lineMat.opacity = 0.08;
      } else {
        lineMat.color.set(baseColor);
        lineMat.opacity = 0.42;
      }
    });
  }, [selectedActor, focusedActor, hoveredActor, highlightedPathNodeIds, searchQuery, labelDensityMode, allActorsMap, links]);

  // Pointer Movement & Raycasting for 3D Hover & Tooltip
  const handlePointerMove = useCallback((evt: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !cameraRef.current || !containerRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

    // 1. Check Node spheres
    const nodeSpheres: THREE.Mesh[] = [];
    nodeMeshesRef.current.forEach((obj) => nodeSpheres.push(obj.sphere));
    const intersects = raycaster.intersectObjects(nodeSpheres, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const actorId = hitMesh.userData?.actorId;
      if (actorId) {
        const actor = allActorsMapRef.current.get(actorId);
        if (actor) {
          setHoveredActor(actor);
          setHoveredLink(null);

          // Compute screen position of node
          const worldPos = new THREE.Vector3();
          hitMesh.getWorldPosition(worldPos);
          const screenPos = worldPos.project(cameraRef.current);
          const x = (screenPos.x * 0.5 + 0.5) * rect.width;
          const y = (-(screenPos.y * 0.5) + 0.5) * rect.height;

          setTooltipPos({ x, y });
          return;
        }
      }
    }

    // 2. Check Edges
    const edgeLines: THREE.Line[] = [];
    linkObjectsRef.current.forEach((obj) => edgeLines.push(obj.line));
    const edgeIntersects = raycaster.intersectObjects(edgeLines, false);

    if (edgeIntersects.length > 0) {
      const hitLine = edgeIntersects[0].object as THREE.Line;
      const linkId = hitLine.userData?.linkId;
      if (linkId) {
        const link = linksRef.current.find((l) => l.id === linkId);
        if (link) {
          setHoveredLink(link);
          setHoveredActor(null);
          setTooltipPos({ x: evt.clientX - rect.left, y: evt.clientY - rect.top });
          return;
        }
      }
    }

    // Clear hover if nothing intersected
    setHoveredActor(null);
    setHoveredLink(null);
    setTooltipPos(null);
  }, []);

  // Pointer Click & Double Click for Selection and Focus View
  const lastClickTimeRef = useRef<number>(0);
  const lastClickedNodeIdRef = useRef<string | null>(null);

  const handlePointerDown = useCallback((evt: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !cameraRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

    const nodeSpheres: THREE.Mesh[] = [];
    nodeMeshesRef.current.forEach((obj) => nodeSpheres.push(obj.sphere));
    const intersects = raycaster.intersectObjects(nodeSpheres, false);

    const now = Date.now();
    const elapsed = now - lastClickTimeRef.current;
    lastClickTimeRef.current = now;

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const actorId = hitMesh.userData?.actorId;
      if (actorId) {
        const actor = allActorsMapRef.current.get(actorId);
        if (actor) {
          if (elapsed < 350 && lastClickedNodeIdRef.current === actorId) {
            // Double Click -> Focus Mode!
            handleEnterFocusView(actor);
          } else {
            // Single Click -> Toggle Selection
            const currentSelected = selectedActorRef.current;
            onSelectActorRef.current(currentSelected?.id === actor.id ? null : actor);

            // Smooth camera pan to selected node
            const pos = nodePositionsRef.current.get(actor.id);
            if (pos && cameraRef.current) {
              const nodeVec = new THREE.Vector3(pos.x, pos.y, pos.z);
              targetLookAtRef.current = nodeVec;
            }
          }
        }
      }
      lastClickedNodeIdRef.current = actorId;
    } else {
      // Clicked on empty space
      if (elapsed < 350) {
        if (focusedActorRef.current) {
          handleExitFocusView();
        } else {
          onSelectActorRef.current(null);
        }
      }
      lastClickedNodeIdRef.current = null;
    }
  }, [handleEnterFocusView, handleExitFocusView]);

  // Zoom In / Out Handlers
  const handleZoomIn = useCallback(() => {
    if (cameraRef.current && controlsRef.current) {
      const cam = cameraRef.current;
      const target = controlsRef.current.target;
      const dir = cam.position.clone().sub(target).multiplyScalar(0.75);
      cam.position.copy(target.clone().add(dir));
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (cameraRef.current && controlsRef.current) {
      const cam = cameraRef.current;
      const target = controlsRef.current.target;
      const dir = cam.position.clone().sub(target).multiplyScalar(1.3);
      cam.position.copy(target.clone().add(dir));
    }
  }, []);

  const handleResetCamera = useCallback(() => {
    targetCamPosRef.current = new THREE.Vector3(0, 240, 880);
    targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-950 select-none"
      id="threejs-graph-viewport"
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
        id="geopolitical-threejs-canvas"
      />

      {/* Top Floating Control Bar: 3D Layout Engines & Orbit Controls */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-2xl">
        {/* 3D Layout Engines */}
        <div className="flex items-center gap-1 border-l border-slate-700/60 pl-1.5">
          <button
            onClick={() => setLayoutType('sphere')}
            className={`px-2.5 py-1 text-xs rounded-lg font-vazir transition-all flex items-center gap-1.5 ${
              layoutType === 'sphere'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="چیدمان منظومه کروی سه‌بعدی (3D Planetary Galaxy)"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>منظومه کروی</span>
          </button>

          <button
            onClick={() => setLayoutType('force')}
            className={`px-2.5 py-1 text-xs rounded-lg font-vazir transition-all flex items-center gap-1.5 ${
              layoutType === 'force'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="شبیه‌سازی تعادلی فیزیک ذرات سه‌بعدی (3D Force-Directed)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>فیزیک تعادلی</span>
          </button>

          <button
            onClick={() => setLayoutType('concentric')}
            className={`px-2.5 py-1 text-xs rounded-lg font-vazir transition-all flex items-center gap-1.5 ${
              layoutType === 'concentric'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="مدارهای هم‌مرکز قدرت و نفوذ (3D Concentric Orbits)"
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>مدارهای نفوذ</span>
          </button>

          <button
            onClick={() => setLayoutType('plane')}
            className={`px-2.5 py-1 text-xs rounded-lg font-vazir transition-all flex items-center gap-1.5 ${
              layoutType === 'plane'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="صفحه راهبردی با ارتفاع متناسب با سطح اقتدار (2.5D Strategic Elevation)"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>صفحه راهبردی</span>
          </button>
        </div>

        {/* Auto Rotate Toggle */}
        <button
          onClick={() => setIsAutoRotate((prev) => !prev)}
          className={`px-2 py-1 text-xs rounded-lg font-vazir transition-all flex items-center gap-1.5 border ${
            isAutoRotate
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-semibold'
              : 'text-slate-400 border-transparent hover:bg-slate-800'
          }`}
          title="چرخش خودکار دوربین سه‌بعدی"
        >
          {isAutoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isAutoRotate ? 'چرخش فعال' : 'چرخش ایستا'}</span>
        </button>

        {/* Label LOD Density Toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setLabelDensityMode((prev) => (prev === 'auto' ? 'all' : prev === 'all' ? 'none' : 'auto'));
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-vazir text-slate-300 hover:bg-slate-800 transition-colors"
            title="تراکم نمایش برچسب‌های سه‌بعدی (LOD)"
          >
            {labelDensityMode === 'none' ? (
              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span className="text-[11px]">
              برچسب: {labelDensityMode === 'auto' ? 'هوشمند' : labelDensityMode === 'all' ? 'کامل' : 'مخفی'}
            </span>
          </button>
        </div>
      </div>

      {/* Floating 3D Camera Controls */}
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-2xl">
        <button
          onClick={handleZoomIn}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="بزرگ‌نمایی سه‌بعدی"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="کوچک‌نمایی سه‌بعدی"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetCamera}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="بازنشانی زاویه دید و مرکزنمایی"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* 3D Engine Badge / HUD */}
      <div className="absolute top-3 right-16 z-10 hidden sm:flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-mono text-sky-400/90 shadow-md">
        <Activity className="w-3 h-3 text-sky-400 animate-pulse" />
        <span>THREE.JS 3D WEBGL ENGINE</span>
      </div>

      {/* Advanced Hover Tooltip (Smart Boundary Safe) */}
      <GraphTooltip
        activeHoveredActor={hoveredActor}
        hoveredLink={hoveredLink}
        tooltipPos={tooltipPos}
        containerRef={containerRef}
        selectedActor={selectedActor}
        focusedActor={focusedActor}
        allActorsMap={allActorsMap}
        links={links}
        onOpenDetailsModal={onOpenDetailsModal}
        onEnterFocusView={handleEnterFocusView}
      />

      {/* Focus View Overlay (when focusedActor is active) */}
      {focusedActor && (
        <FocusViewOverlay
          focusedActor={focusedActor}
          focusLayer={focusLayer}
          onSelectLayer={setFocusLayer}
          onClose={handleExitFocusView}
          neighborEntries={Array.from(focusedNeighborsMap.values())}
          onSelectActor={(neighbor) => {
            onSelectActor(neighbor);
          }}
          onOpenDetailsModal={onOpenDetailsModal}
        />
      )}

      {/* Bottom Hint Banner */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden md:flex items-center gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 px-4 py-1.5 rounded-full text-[11px] text-slate-300 font-vazir shadow-xl">
        <span className="flex items-center gap-1">
          <span className="text-sky-400">🖱️</span>
          <span>درگ چپ = چرخش ۳۶۰ درجه • چرخ ماوس = زوم</span>
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span className="flex items-center gap-1">
          <span className="text-cyan-400">👆</span>
          <span>کلیک = انتخاب و فوکوس دوربین</span>
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span className="flex items-center gap-1">
          <span className="text-amber-400">🎯</span>
          <span>دبل‌کلیک = نمای تمرکز (Focus View)</span>
        </span>
      </div>
    </div>
  );
};
