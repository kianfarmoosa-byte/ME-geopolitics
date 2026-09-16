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
import { Camera360Controls } from './Camera360Controls';
import { ParticleFlowControls, ParticleFlowSettings } from './ParticleFlowControls';
import { 
  compute3DLayout, 
  createActorSpriteTexture, 
  getLinkCurve, 
  ThreeLayoutType, 
  Node3DPosition,
  MONOCHROME_NODE_COLORS,
  MONOCHROME_RELATION_COLORS
} from '../utils/threeGraphHelpers';
import { 
  Eye, 
  EyeOff, 
  Sparkles, 
  Compass, 
  CircleDot, 
  Grid, 
  Activity, 
  Palette,
  Layers
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
  mesh: THREE.Mesh;
  curve: THREE.QuadraticBezierCurve3;
  progress: number;
  speed: number;
  direction: 1 | -1;
  baseColor: THREE.Color;
  linkId: string;
  sourceId: string;
  targetId: string;
  relType: RelationType;
  intensity: number;
  baseScale: number;
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Layout Mode & Themes
  const [layoutType, setLayoutType] = useState<ThreeLayoutType>('sphere');
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState<number>(0.5);
  const [isMonochrome, setIsMonochrome] = useState<boolean>(true); // Default Monochrome as requested
  const [labelDensityMode, setLabelDensityMode] = useState<'auto' | 'all' | 'none'>('auto');

  // 2. Camera 360 Telemetry State
  const [azimuthAngle, setAzimuthAngle] = useState<number>(0);
  const [polarAngle, setPolarAngle] = useState<number>(45);
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  // 3. Dynamic Particle Flow Stream Settings
  const [particleSettings, setParticleSettings] = useState<ParticleFlowSettings>({
    isEnabled: true,
    speedMultiplier: 1.0,
    filterType: 'all',
  });
  const [activeParticleCount, setActiveParticleCount] = useState<number>(0);

  // Tooltip & Hover state
  const [hoveredActor, setHoveredActor] = useState<ActorData | null>(null);
  const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Focus View State
  const [focusedActor, setFocusedActor] = useState<ActorData | null>(null);
  const [focusLayer, setFocusLayer] = useState<StrategicLayerType>('all');

  // References for Three.js engine
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Lighting References for theme switching
  const lightsRef = useRef<{
    ambient: THREE.AmbientLight;
    dir1: THREE.DirectionalLight;
    dir2: THREE.DirectionalLight;
    point: THREE.PointLight;
  } | null>(null);

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

  // Particle System Storage
  const pulsesRef = useRef<ParticlePulse[]>([]);
  const nodePositionsRef = useRef<Map<string, Node3DPosition>>(new Map());

  // Camera animation target
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);
  const frameCountRef = useRef<number>(0);

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

  const isMonochromeRef = useRef(isMonochrome);
  useEffect(() => { isMonochromeRef.current = isMonochrome; }, [isMonochrome]);

  const particleSettingsRef = useRef(particleSettings);
  useEffect(() => { particleSettingsRef.current = particleSettings; }, [particleSettings]);

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
    linkObjectsRef.current.forEach((edgeObj) => {
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

    // Update particle stream curves to match new positions
    pulsesRef.current.forEach((p) => {
      const sPos = computedPositions.get(p.sourceId);
      const tPos = computedPositions.get(p.targetId);
      if (sPos && tPos) {
        p.curve = getLinkCurve(sPos, tPos, p.intensity);
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

    // 1. Scene with Obsidian Dark Canvas
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const bgCol = isMonochromeRef.current ? 0x050508 : 0x030712;
    scene.background = new THREE.Color(bgCol);
    scene.fog = new THREE.FogExp2(bgCol, 0.0006);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 5, 5000);
    camera.position.set(0, 240, 880);
    cameraRef.current = camera;

    // 3. High Performance WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    // 4. OrbitControls with 360 Navigation
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 120;
    controls.maxDistance = 2400;
    controls.autoRotate = isAutoRotate;
    controls.autoRotateSpeed = autoRotateSpeed;
    controlsRef.current = controls;

    // 5. Lighting Setup (Monochrome Titanium / Silver tuned)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.9);
    dirLight1.position.set(400, 600, 500);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xd4d4d8, 1.1);
    dirLight2.position.set(-500, -300, -400);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xffffff, 1.8, 1400);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    lightsRef.current = { ambient: ambientLight, dir1: dirLight1, dir2: dirLight2, point: pointLight };

    // 6. Tactical Ground Grid & Coordinate Plane
    const gridHelper = new THREE.GridHelper(1600, 32, 0x3f3f46, 0x18181b);
    gridHelper.position.y = -220;
    scene.add(gridHelper);

    // 7. Tactical Starfield / Dust Field Particles
    const starCount = 700;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 3400;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 2600;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 3400;

      // Pure monochrome starlight (silver & platinum luminescence)
      const brightness = 0.5 + Math.random() * 0.5;
      starColors[i * 3] = brightness;
      starColors[i * 3 + 1] = brightness;
      starColors[i * 3 + 2] = brightness;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 2.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // 8. Tactical Coordinate Concentric Rings in Core
    const ringGroup = new THREE.Group();
    [240, 440, 640].forEach((radius) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.8, radius + 0.8, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x27272a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringGroup.add(ringMesh);
    });
    scene.add(ringGroup);

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

    // 10. Continuous Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Camera Lerp fly-to animation
      if (targetCamPosRef.current && targetLookAtRef.current) {
        camera.position.lerp(targetCamPosRef.current, 0.065);
        controls.target.lerp(targetLookAtRef.current, 0.065);

        if (camera.position.distanceTo(targetCamPosRef.current) < 3.5) {
          targetCamPosRef.current = null;
          targetLookAtRef.current = null;
        }
      }

      controls.update();

      // Ambient background movement
      starField.rotation.y = elapsedTime * 0.012;
      ringGroup.rotation.y = -elapsedTime * 0.018;

      // Telemetry Calculation (Throttled for React State)
      frameCountRef.current++;
      if (frameCountRef.current % 12 === 0 && cameraRef.current && controlsRef.current) {
        const camPos = camera.position.clone().sub(controls.target);
        let az = Math.atan2(camPos.x, camPos.z) * (180 / Math.PI);
        if (az < 0) az += 360;
        const pol = Math.acos(Math.max(-1, Math.min(1, camPos.y / Math.max(1, camPos.length())))) * (180 / Math.PI);
        const dist = camPos.length();
        const zoom = Math.round((880 / Math.max(80, dist)) * 100);

        setAzimuthAngle(az);
        setPolarAngle(pol);
        setZoomPercent(zoom);
      }

      // 11. Animate Particle Flow System along Relation Curves
      const currentSelected = selectedActorRef.current;
      const currentFocused = focusedActorRef.current;
      const focusActorId = currentFocused?.id || currentSelected?.id;
      const pSettings = particleSettingsRef.current;

      if (pSettings.isEnabled) {
        pulsesRef.current.forEach((pulse) => {
          // Check Relation Filter
          if (pSettings.filterType !== 'all' && pulse.relType !== pSettings.filterType) {
            pulse.mesh.visible = false;
            return;
          }
          pulse.mesh.visible = true;

          // Advance progress along curve
          const speedFactor = pulse.speed * pSettings.speedMultiplier;
          pulse.progress += speedFactor * pulse.direction;
          if (pulse.direction === 1 && pulse.progress > 1) pulse.progress = 0;
          if (pulse.direction === -1 && pulse.progress < 0) pulse.progress = 1;

          try {
            const pt = pulse.curve.getPoint(pulse.progress);
            pulse.mesh.position.copy(pt);
          } catch {
            // ignore
          }

          // Surge visual intensity when connected to selected/focused actor
          const mat = pulse.mesh.material as THREE.MeshBasicMaterial;
          const isConnected = focusActorId && (pulse.sourceId === focusActorId || pulse.targetId === focusActorId);

          if (isConnected) {
            const surgeScale = pulse.baseScale * 1.8;
            pulse.mesh.scale.set(surgeScale, surgeScale, surgeScale);
            mat.opacity = 1.0;
          } else if (focusActorId) {
            const dimScale = pulse.baseScale * 0.7;
            pulse.mesh.scale.set(dimScale, dimScale, dimScale);
            mat.opacity = 0.18;
          } else {
            pulse.mesh.scale.set(pulse.baseScale, pulse.baseScale, pulse.baseScale);
            mat.opacity = 0.85;
          }
        });
      } else {
        pulsesRef.current.forEach((p) => {
          p.mesh.visible = false;
        });
      }

      // Halos pulsation on superpower nodes
      nodeMeshesRef.current.forEach(({ halo }) => {
        if (halo) {
          halo.rotation.z = elapsedTime * 0.7;
          const scale = 1 + Math.sin(elapsedTime * 2.8) * 0.05;
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

      pulsesRef.current.forEach((p) => {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
      });
      pulsesRef.current = [];

      starGeometry.dispose();
      starMaterial.dispose();
      gridHelper.dispose();

      renderer.dispose();
    };
  }, []); // Run once on mount

  // Sync auto-rotate and speed
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotate;
      controlsRef.current.autoRotateSpeed = autoRotateSpeed;
    }
  }, [isAutoRotate, autoRotateSpeed]);

  // Sync Scene background & lights with Monochrome Theme
  useEffect(() => {
    const scene = sceneRef.current;
    const lights = lightsRef.current;
    if (!scene || !lights) return;

    const bgCol = isMonochrome ? 0x050508 : 0x030712;
    scene.background.set(bgCol);
    if (scene.fog) scene.fog.color.set(bgCol);

    if (isMonochrome) {
      lights.ambient.color.set(0xffffff);
      lights.dir1.color.set(0xffffff);
      lights.dir2.color.set(0xd4d4d8);
      lights.point.color.set(0xffffff);
    } else {
      lights.ambient.color.set(0xffffff);
      lights.dir1.color.set(0x38bdf8);
      lights.dir2.color.set(0xa855f7);
      lights.point.color.set(0x38bdf8);
    }
  }, [isMonochrome]);

  // Populate or Update 3D Nodes in Scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

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
      const score = Math.max(1, Math.min(5, Math.round(node.influenceScore || 3)));
      const catConfig = CATEGORY_COLORS[node.category];
      const monoConfig = MONOCHROME_NODE_COLORS[score] || MONOCHROME_NODE_COLORS[3];

      const colorHex = isMonochrome ? monoConfig.color : (catConfig?.hex || '#38bdf8');
      const emissiveHex = isMonochrome ? monoConfig.emissive : (catConfig?.hex || '#38bdf8');
      const radius = 13 + score * 3.6; // 16.6 to 31 units

      let nodeObj = nodeMeshesRef.current.get(node.id);

      if (!nodeObj) {
        const group = new THREE.Group();

        // 1. Metallic Sphere Mesh
        const sphereGeo = new THREE.SphereGeometry(radius, 32, 32);
        const sphereMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorHex),
          emissive: new THREE.Color(emissiveHex),
          emissiveIntensity: isMonochrome ? 0.4 : 0.35,
          roughness: isMonochrome ? 0.22 : 0.28,
          metalness: isMonochrome ? 0.78 : 0.65,
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.userData = { type: 'node', actorId: node.id };
        group.add(sphere);

        // 2. Halo ring for superpowers (score >= 4)
        let halo: THREE.Mesh | undefined;
        if (score >= 4) {
          const haloGeo = new THREE.RingGeometry(radius * 1.35, radius * 1.5, 32);
          const haloColor = isMonochrome ? monoConfig.halo : colorHex;
          const haloMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(haloColor),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending,
          });
          halo = new THREE.Mesh(haloGeo, haloMat);
          group.add(halo);
        }

        // 3. Billboard Sprite Label
        const texture = createActorSpriteTexture(node, false, false, isMonochrome);
        const spriteMat = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          opacity: 0.95,
          depthTest: false,
        });
        const sprite = new THREE.Sprite(spriteMat);
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
      } else {
        // Update materials if theme changed
        const sphereMat = nodeObj.sphere.material as THREE.MeshStandardMaterial;
        sphereMat.color.set(colorHex);
        sphereMat.emissive.set(emissiveHex);
        sphereMat.metalness = isMonochrome ? 0.78 : 0.65;
        sphereMat.roughness = isMonochrome ? 0.22 : 0.28;

        if (nodeObj.halo) {
          const haloColor = isMonochrome ? monoConfig.halo : colorHex;
          (nodeObj.halo.material as THREE.MeshBasicMaterial).color.set(haloColor);
        }

        // Regenerate sprite texture
        const texture = createActorSpriteTexture(
          node, 
          selectedActor?.id === node.id, 
          hoveredActor?.id === node.id, 
          isMonochrome
        );
        if (nodeObj.sprite.material.map) nodeObj.sprite.material.map.dispose();
        nodeObj.sprite.material.map = texture;
        nodeObj.sprite.material.needsUpdate = true;
      }

      // Position from computed 3D layout
      const pos = nodePositionsRef.current.get(node.id) || { x: 0, y: 0, z: 0 };
      nodeObj.group.position.set(pos.x, pos.y, pos.z);
    });
  }, [nodes, isMonochrome, selectedActor, hoveredActor]);

  // Populate or Update 3D Links and Particle Flow System in Scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentLinkIds = new Set(links.map((l) => l.id));

    // 1. Remove obsolete links
    linkObjectsRef.current.forEach((obj, id) => {
      if (!currentLinkIds.has(id)) {
        scene.remove(obj.line);
        obj.line.geometry.dispose();
        (obj.line.material as THREE.Material).dispose();
        linkObjectsRef.current.delete(id);
      }
    });

    // 2. Add or update active links
    links.forEach((link) => {
      const sId = typeof link.source === 'object' ? (link.source as { id: string }).id : link.source;
      const tId = typeof link.target === 'object' ? (link.target as { id: string }).id : link.target;
      const sPos = nodePositionsRef.current.get(sId) || { x: 0, y: 0, z: 0 };
      const tPos = nodePositionsRef.current.get(tId) || { x: 0, y: 0, z: 0 };

      const relConfig = RELATION_CONFIG[link.type];
      const baseColor = isMonochrome
        ? (MONOCHROME_RELATION_COLORS[link.type] || '#cbd5e1')
        : (relConfig?.color || '#64748b');

      const curve = getLinkCurve(sPos, tPos, link.intensity);

      let edgeObj = linkObjectsRef.current.get(link.id);

      if (!edgeObj) {
        const pts = curve.getPoints(32);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const lineMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(baseColor),
          transparent: true,
          opacity: isMonochrome ? 0.48 : 0.42,
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
        edgeObj.baseColor = baseColor;
        const pts = curve.getPoints(32);
        edgeObj.line.geometry.dispose();
        edgeObj.line.geometry = new THREE.BufferGeometry().setFromPoints(pts);
        (edgeObj.line.material as THREE.LineBasicMaterial).color.set(baseColor);
      }
    });

    // 3. Clear existing particle pulses
    pulsesRef.current.forEach((p) => {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    pulsesRef.current = [];

    // 4. Generate Multi-Particle Flow System along Link Curves
    // Direction & Intensity Modeling:
    // - Intensity 1: 2 particles
    // - Intensity 2-3: 3-4 particles
    // - Intensity 4-5: 5-7 particles
    // - Economic & Energy relations get +1 particle with smooth streaming flow
    // - Conflict relations get counter-directional particles (both directions)
    const newPulses: ParticlePulse[] = [];

    links.forEach((link) => {
      const sId = typeof link.source === 'object' ? (link.source as { id: string }).id : link.source;
      const tId = typeof link.target === 'object' ? (link.target as { id: string }).id : link.target;
      const edgeObj = linkObjectsRef.current.get(link.id);
      if (!edgeObj) return;

      const intensity = Math.max(1, Math.min(5, link.intensity || 3));
      let particleCount = Math.max(2, Math.min(7, Math.round(intensity * 1.3)));
      if (link.type === 'economic') particleCount += 1;

      // Color selection
      let pColorHex = '#ffffff';
      if (isMonochrome) {
        if (link.type === 'economic') pColorHex = '#ffffff'; // Radiant Diamond White
        else if (link.type === 'alliance') pColorHex = '#f8fafc'; // Silver White
        else if (link.type === 'conflict') pColorHex = '#d4d4d8'; // Zinc High Contrast
        else if (link.type === 'diplomatic') pColorHex = '#cbd5e1'; // Silver Gray
        else if (link.type === 'proxy_cyber') pColorHex = '#a1a1aa'; // Titanium
        else pColorHex = '#71717a';
      } else {
        pColorHex = RELATION_CONFIG[link.type]?.color || '#38bdf8';
      }

      const pColor = new THREE.Color(pColorHex);
      const baseRadius = 1.6 + intensity * 0.35; // Size reflects intensity

      for (let j = 0; j < particleCount; j++) {
        const pGeo = new THREE.SphereGeometry(baseRadius, 10, 10);
        const pMat = new THREE.MeshBasicMaterial({
          color: pColor,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
        });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        scene.add(pMesh);

        // Direction:
        // Conflicts have counter-directional pulses colliding along the arc
        // Other types flow from source to target (direction = 1)
        const direction: 1 | -1 = link.type === 'conflict' ? (j % 2 === 0 ? 1 : -1) : 1;
        const progressOffset = (j / particleCount) + (Math.random() * 0.08);

        newPulses.push({
          mesh: pMesh,
          curve: edgeObj.curve,
          progress: progressOffset % 1.0,
          speed: 0.0022 + intensity * 0.0008,
          direction,
          baseColor: pColor,
          linkId: link.id,
          sourceId: sId,
          targetId: tId,
          relType: link.type,
          intensity,
          baseScale: 1.0,
        });
      }
    });

    pulsesRef.current = newPulses;
    setActiveParticleCount(newPulses.length);
  }, [links, isMonochrome]);

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
        sphereMat.emissiveIntensity = 0.08;
        sphereMat.opacity = 0.22;
        nodeObj.group.scale.set(0.9, 0.9, 0.9);
      } else {
        sphereMat.emissiveIntensity = isMonochrome ? 0.4 : 0.35;
        sphereMat.opacity = 0.95;
        nodeObj.group.scale.set(1.0, 1.0, 1.0);
      }

      // Sprite LOD visibility
      if (labelDensityMode === 'none') {
        nodeObj.sprite.visible = false;
      } else if (labelDensityMode === 'all') {
        nodeObj.sprite.visible = true;
      } else {
        const score = nodeData?.influenceScore || 3;
        const shouldShow = score >= 4 || isTargetNodeSelected || isNeighbor || isInPath || isHovered || isTargetNodeFocused || matchesSearch;
        nodeObj.sprite.visible = shouldShow;
      }
    });

    // 2. Update Edges
    linkObjectsRef.current.forEach((edgeObj) => {
      const { line, sourceId, targetId, baseColor } = edgeObj;
      const lineMat = line.material as THREE.LineBasicMaterial;

      const isConnectedToSelected = selectedId && (sourceId === selectedId || targetId === selectedId);
      const isConnectedToFocused = focusedId && (sourceId === focusedId || targetId === focusedId);
      const isBothInPath = isPathActive && pathSet.has(sourceId) && pathSet.has(targetId);

      if (isBothInPath) {
        lineMat.color.set(isMonochrome ? '#ffffff' : '#38bdf8');
        lineMat.opacity = 0.95;
      } else if (isConnectedToSelected || isConnectedToFocused) {
        lineMat.color.set(baseColor);
        lineMat.opacity = 0.95;
      } else if (isSelected || isFocused || isPathActive) {
        lineMat.opacity = 0.06;
      } else {
        lineMat.color.set(baseColor);
        lineMat.opacity = isMonochrome ? 0.48 : 0.42;
      }
    });
  }, [selectedActor, focusedActor, hoveredActor, highlightedPathNodeIds, searchQuery, labelDensityMode, allActorsMap, links, isMonochrome]);

  // Pointer Movement & Raycasting for 3D Hover & Tooltip
  const handlePointerMove = useCallback((evt: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !cameraRef.current || !containerRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

    // 1. Check Node Intersection
    const nodeSpheres: THREE.Mesh[] = [];
    nodeMeshesRef.current.forEach((obj) => nodeSpheres.push(obj.sphere));
    const nodeIntersects = raycaster.intersectObjects(nodeSpheres, false);

    if (nodeIntersects.length > 0) {
      const hitMesh = nodeIntersects[0].object as THREE.Mesh;
      const actorId = hitMesh.userData?.actorId;
      if (actorId) {
        const actor = allActorsMapRef.current.get(actorId);
        if (actor) {
          setHoveredActor(actor);
          setHoveredLink(null);
          setTooltipPos({ x: evt.clientX - rect.left, y: evt.clientY - rect.top });
          return;
        }
      }
    }

    // 2. Check Edge Intersection
    const edgeLines: THREE.Line[] = [];
    linkObjectsRef.current.forEach((obj) => edgeLines.push(obj.line));
    raycaster.params.Line = { threshold: 14 };
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
            handleEnterFocusView(actor);
          } else {
            const currentSelected = selectedActorRef.current;
            onSelectActorRef.current(currentSelected?.id === actor.id ? null : actor);

            // Smooth camera pan to selected node
            const pos = nodePositionsRef.current.get(actor.id);
            if (pos && cameraRef.current) {
              targetLookAtRef.current = new THREE.Vector3(pos.x, pos.y, pos.z);
            }
          }
        }
      }
      lastClickedNodeIdRef.current = actorId;
    } else {
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

  // 360 Camera Controls Handlers
  const handleRotateStep = useCallback((deltaDegrees: number) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const rad = (deltaDegrees * Math.PI) / 180;
    const cam = cameraRef.current;
    const target = controlsRef.current.target;
    const offset = cam.position.clone().sub(target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rad);
    targetCamPosRef.current = target.clone().add(offset);
    targetLookAtRef.current = target.clone();
  }, []);

  const handleSetAzimuth = useCallback((degrees: number) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const rad = (degrees * Math.PI) / 180;
    const cam = cameraRef.current;
    const target = controlsRef.current.target;
    const offset = cam.position.clone().sub(target);
    const radius = Math.sqrt(offset.x * offset.x + offset.z * offset.z);
    const y = offset.y;
    targetCamPosRef.current = new THREE.Vector3(
      target.x + radius * Math.sin(rad),
      target.y + y,
      target.z + radius * Math.cos(rad)
    );
    targetLookAtRef.current = target.clone();
  }, []);

  const handleApplyPreset = useCallback((preset: 'top' | 'front' | 'side' | 'isometric' | 'selected') => {
    if (preset === 'top') {
      targetCamPosRef.current = new THREE.Vector3(0, 1150, 0.1);
      targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
    } else if (preset === 'front') {
      targetCamPosRef.current = new THREE.Vector3(0, 100, 950);
      targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
    } else if (preset === 'side') {
      targetCamPosRef.current = new THREE.Vector3(950, 100, 0);
      targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
    } else if (preset === 'isometric') {
      targetCamPosRef.current = new THREE.Vector3(650, 500, 650);
      targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
    } else if (preset === 'selected' && selectedActor) {
      const pos = nodePositionsRef.current.get(selectedActor.id);
      if (pos) {
        targetLookAtRef.current = new THREE.Vector3(pos.x, pos.y, pos.z);
        targetCamPosRef.current = new THREE.Vector3(pos.x + 220, pos.y + 130, pos.z + 220);
      }
    }
  }, [selectedActor]);

  const handleZoomIn = useCallback(() => {
    if (cameraRef.current && controlsRef.current) {
      const cam = cameraRef.current;
      const target = controlsRef.current.target;
      const dir = cam.position.clone().sub(target).multiplyScalar(0.75);
      targetCamPosRef.current = target.clone().add(dir);
      targetLookAtRef.current = target.clone();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (cameraRef.current && controlsRef.current) {
      const cam = cameraRef.current;
      const target = controlsRef.current.target;
      const dir = cam.position.clone().sub(target).multiplyScalar(1.3);
      targetCamPosRef.current = target.clone().add(dir);
      targetLookAtRef.current = target.clone();
    }
  }, []);

  const handleResetCamera = useCallback(() => {
    targetCamPosRef.current = new THREE.Vector3(0, 240, 880);
    targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
  }, []);

  // Theme-adaptive classes
  const topBarBg = isMonochrome
    ? 'bg-zinc-950/92 border-zinc-800/90 text-zinc-200'
    : 'bg-slate-900/92 border-slate-800/90 text-slate-200';

  const badgeBg = isMonochrome
    ? 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
    : 'bg-slate-900/80 border-slate-800 text-sky-400/90';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none transition-colors duration-500 ${
        isMonochrome ? 'bg-[#050508]' : 'bg-slate-950'
      }`}
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

      {/* Top Floating Control Bar: 3D Layout Engines & Monochrome Mode */}
      <div className={`absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 backdrop-blur-md p-1.5 rounded-2xl border shadow-2xl transition-colors ${topBarBg}`}>
        {/* 3D Layout Engines */}
        <div className="flex items-center gap-1 border-l border-zinc-700/60 pl-1.5">
          <button
            onClick={() => setLayoutType('sphere')}
            className={`px-2.5 py-1 text-xs rounded-xl font-vazir transition-all flex items-center gap-1.5 ${
              layoutType === 'sphere'
                ? isMonochrome ? 'bg-zinc-100 text-zinc-950 font-bold' : 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="چیدمان منظومه کروی سه‌بعدی (3D Planetary Galaxy)"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>منظومه کروی</span>
          </button>

          <button
            onClick={() => setLayoutType('force')}
            className={`px-2.5 py-1 text-xs rounded-xl font-vazir transition-all flex items-center gap-1.5 ${
              layoutType === 'force'
                ? isMonochrome ? 'bg-zinc-100 text-zinc-950 font-bold' : 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="شبیه‌سازی تعادلی فیزیک ذرات سه‌بعدی (3D Force-Directed)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>فیزیک تعادلی</span>
          </button>

          <button
            onClick={() => setLayoutType('concentric')}
            className={`px-2.5 py-1 text-xs rounded-xl font-vazir transition-all flex items-center gap-1.5 ${
              layoutType === 'concentric'
                ? isMonochrome ? 'bg-zinc-100 text-zinc-950 font-bold' : 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="مدارهای هم‌مرکز قدرت و نفوذ (3D Concentric Orbits)"
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>مدارهای نفوذ</span>
          </button>

          <button
            onClick={() => setLayoutType('plane')}
            className={`px-2.5 py-1 text-xs rounded-xl font-vazir transition-all flex items-center gap-1.5 ${
              layoutType === 'plane'
                ? isMonochrome ? 'bg-zinc-100 text-zinc-950 font-bold' : 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="صفحه راهبردی با ارتفاع متناسب با سطح اقتدار (2.5D Strategic Elevation)"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>صفحه راهبردی</span>
          </button>
        </div>

        {/* Monochrome Theme Switcher */}
        <button
          onClick={() => setIsMonochrome((prev) => !prev)}
          className={`px-2.5 py-1 text-xs rounded-xl font-vazir transition-all flex items-center gap-1.5 border ${
            isMonochrome
              ? 'bg-zinc-200 text-zinc-950 border-zinc-100 font-bold'
              : 'text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
          }`}
          title="تغییر حالت تم: مونوکروم تاکتیکال / چندرنگ راهبردی"
        >
          <Palette className="w-3.5 h-3.5" />
          <span>{isMonochrome ? 'تم مونوکروم (فعال)' : 'تم چندرنگ'}</span>
        </button>

        {/* Label LOD Density Toggle */}
        <button
          onClick={() => {
            setLabelDensityMode((prev) => (prev === 'auto' ? 'all' : prev === 'all' ? 'none' : 'auto'));
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-xl font-vazir text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="تراکم نمایش برچسب‌های سه‌بعدی (LOD)"
        >
          {labelDensityMode === 'none' ? (
            <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <Eye className={`w-3.5 h-3.5 ${isMonochrome ? 'text-zinc-100' : 'text-sky-400'}`} />
          )}
          <span className="text-[11px]">
            برچسب: {labelDensityMode === 'auto' ? 'هوشمند' : labelDensityMode === 'all' ? 'کامل' : 'مخفی'}
          </span>
        </button>
      </div>

      {/* 3D Engine Badge / HUD */}
      <div className={`absolute top-3 right-3 z-10 hidden sm:flex items-center gap-2 backdrop-blur-md px-3 py-1.5 rounded-xl border text-[11px] font-mono shadow-md ${badgeBg}`}>
        <Activity className={`w-3.5 h-3.5 ${isMonochrome ? 'text-zinc-200' : 'text-sky-400'} animate-pulse`} />
        <span>3D WEBGL ENGINE • {isMonochrome ? 'MONOCHROME TACTICAL' : 'CHROMATIC'}</span>
      </div>

      {/* Advanced 360 Camera Controls Deck (Floating Bottom-Right) */}
      <Camera360Controls
        azimuthAngle={azimuthAngle}
        polarAngle={polarAngle}
        zoomPercent={zoomPercent}
        isAutoRotate={isAutoRotate}
        onToggleAutoRotate={() => setIsAutoRotate((prev) => !prev)}
        autoRotateSpeed={autoRotateSpeed}
        onChangeAutoRotateSpeed={setAutoRotateSpeed}
        onRotateStep={handleRotateStep}
        onSetAzimuth={handleSetAzimuth}
        onApplyPreset={handleApplyPreset}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetCamera={handleResetCamera}
        hasSelectedActor={Boolean(selectedActor)}
        isMonochrome={isMonochrome}
      />

      {/* Advanced Live Particle Flow Controls (Floating Bottom-Left) */}
      <ParticleFlowControls
        settings={particleSettings}
        onChangeSettings={setParticleSettings}
        activeParticleCount={activeParticleCount}
        isMonochrome={isMonochrome}
      />

      {/* Advanced Hover Tooltip */}
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
      <div className={`absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden xl:flex items-center gap-3 backdrop-blur-md border px-4 py-1.5 rounded-full text-[11px] font-vazir shadow-xl ${
        isMonochrome ? 'bg-zinc-950/80 border-zinc-800 text-zinc-300' : 'bg-slate-900/80 border-slate-800 text-slate-300'
      }`}>
        <span className="flex items-center gap-1">
          <span>🖱️</span>
          <span>درگ چپ = گردش ۳۶۰° • چرخ ماوس = زوم</span>
        </span>
        <span className="w-1 h-1 rounded-full bg-zinc-700" />
        <span className="flex items-center gap-1">
          <span>✨</span>
          <span>ذرات جاری = جهت و شدت مبادلات</span>
        </span>
        <span className="w-1 h-1 rounded-full bg-zinc-700" />
        <span className="flex items-center gap-1">
          <span>🎯</span>
          <span>دبل‌کلیک = نمای تمرکز اختصاصی</span>
        </span>
      </div>
    </div>
  );
};
