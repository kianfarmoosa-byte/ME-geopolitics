import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink, ActorData, RelationType } from '../types';
import { CATEGORY_COLORS, RELATION_CONFIG } from '../data';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Sparkles, 
  Eye, 
  EyeOff, 
  X,
  Target,
  FileText,
  Network,
  Share2
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
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showRipples, setShowRipples] = useState(true);
  const [expandToSecondDegree, setExpandToSecondDegree] = useState(false);

  // Compute connected nodes for hovered or selected node
  const activeFocusId = selectedActor?.id || hoveredNodeId || null;

  // 1st-degree connected neighbors
  const firstDegreeNeighbors = useMemo(() => {
    if (!activeFocusId) return new Set<string>();
    const set = new Set<string>();
    links.forEach((l) => {
      const srcId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const tgtId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      if (srcId === activeFocusId) set.add(tgtId);
      if (tgtId === activeFocusId) set.add(srcId);
    });
    return set;
  }, [activeFocusId, links]);

  // 2nd-degree connected neighbors (if enabled)
  const secondDegreeNeighbors = useMemo(() => {
    if (!activeFocusId || !expandToSecondDegree) return new Set<string>();
    const set = new Set<string>();
    firstDegreeNeighbors.forEach((neighborId) => {
      links.forEach((l) => {
        const srcId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
        const tgtId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
        if (srcId === neighborId && tgtId !== activeFocusId) set.add(tgtId);
        if (tgtId === neighborId && srcId !== activeFocusId) set.add(srcId);
      });
    });
    return set;
  }, [activeFocusId, expandToSecondDegree, firstDegreeNeighbors, links]);

  // All active connected neighbors
  const connectedNeighbors = useMemo(() => {
    if (!activeFocusId) return new Set<string>();
    const combined = new Set<string>([activeFocusId, ...Array.from(firstDegreeNeighbors)]);
    if (expandToSecondDegree) {
      secondDegreeNeighbors.forEach((id) => combined.add(id));
    }
    return combined;
  }, [activeFocusId, firstDegreeNeighbors, secondDegreeNeighbors, expandToSecondDegree]);

  // Relationship breakdown for selected actor
  const selectedActorLinkBreakdown = useMemo(() => {
    if (!selectedActor) return null;
    let alliances = 0;
    let conflicts = 0;
    let economic = 0;
    let diplomatic = 0;
    let proxy = 0;
    let volatile = 0;

    links.forEach((l) => {
      const srcId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const tgtId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      if (srcId === selectedActor.id || tgtId === selectedActor.id) {
        if (l.type === 'alliance') alliances++;
        else if (l.type === 'conflict') conflicts++;
        else if (l.type === 'economic') economic++;
        else if (l.type === 'diplomatic') diplomatic++;
        else if (l.type === 'proxy_cyber') proxy++;
        else if (l.type === 'volatile') volatile++;
      }
    });

    return { alliances, conflicts, economic, diplomatic, proxy, volatile };
  }, [selectedActor, links]);

  // Keyboard shortcut: Esc to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedActor) {
        onSelectActor(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedActor, onSelectActor]);

  // Set up D3 simulation
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const width = containerRef.current.clientWidth || 900;
    const height = containerRef.current.clientHeight || 700;

    // Clone data to avoid mutation issues in React 19
    const simNodes: (GraphNode & d3.SimulationNodeDatum)[] = nodes.map((d) => ({ ...d }));
    const simLinks: (d3.SimulationLinkDatum<d3.SimulationNodeDatum> & GraphLink)[] = links.map((l) => ({
      ...l,
      source: l.source,
      target: l.target,
    }));

    // Group center targets for cluster mode
    const categoryAngles: Record<string, { x: number; y: number }> = {};
    const categories = Object.keys(CATEGORY_COLORS);
    const radius = Math.min(width, height) * 0.32;
    categories.forEach((cat, idx) => {
      const angle = (idx / categories.length) * 2 * Math.PI - Math.PI / 2;
      categoryAngles[cat] = {
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
      };
    });

    // Create D3 Force Simulation
    const simulation = d3
      .forceSimulation(simNodes as d3.SimulationNodeDatum[])
      .force(
        'link',
        d3
          .forceLink(simLinks)
          .id((d) => (d as GraphNode).id)
          .distance((d) => {
            const link = d as unknown as GraphLink;
            return 85 + (5 - (link.intensity || 3)) * 25;
          })
          .strength(0.4)
      )
      .force(
        'charge',
        d3.forceManyBody().strength((d) => {
          const node = d as unknown as GraphNode;
          return -140 - (node.influenceScore || 3) * 35;
        })
      )
      .force(
        'collision',
        d3.forceCollide().radius((d) => {
          const node = d as unknown as GraphNode;
          return 28 + (node.influenceScore || 3) * 5;
        })
      )
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.08));

    // Optional cluster positioning
    if (clusterMode === 'category') {
      simulation.force(
        'clusterX',
        d3.forceX((d) => {
          const node = d as unknown as GraphNode;
          return categoryAngles[node.category]?.x || width / 2;
        }).strength(0.35)
      );
      simulation.force(
        'clusterY',
        d3.forceY((d) => {
          const node = d as unknown as GraphNode;
          return categoryAngles[node.category]?.y || height / 2;
        }).strength(0.35)
      );
    }

    simulationRef.current = simulation;

    // SVG elements setup
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    // Zoom setup
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Drag setup
    const drag = d3
      .drag<SVGGElement, GraphNode & d3.SimulationNodeDatum>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    // Draw Links
    const linkSelection = g
      .select<SVGGElement>('.links-layer')
      .selectAll<SVGPathElement, GraphLink>('.graph-link')
      .data(simLinks, (d) => d.id);

    linkSelection.exit().remove();

    const linkEnter = linkSelection
      .enter()
      .append('path')
      .attr('class', 'graph-link cursor-pointer transition-opacity duration-200')
      .attr('fill', 'none');

    const allLinks = linkEnter.merge(linkSelection);

    // Draw Nodes
    const nodeSelection = g
      .select<SVGGElement>('.nodes-layer')
      .selectAll<SVGGElement, GraphNode & d3.SimulationNodeDatum>('g.node-group')
      .data(simNodes, (d) => d.id);

    nodeSelection.exit().remove();

    const nodeEnter = nodeSelection
      .enter()
      .append('g')
      .attr('class', 'node-group cursor-pointer select-none')
      .call(drag as unknown as (selection: d3.Selection<SVGGElement, GraphNode & d3.SimulationNodeDatum, SVGGElement, unknown>) => void);

    // Animated Pulse Ring (visible only when clicked/selected)
    nodeEnter
      .append('circle')
      .attr('class', 'node-pulse-ring')
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('display', 'none')
      .attr('pointer-events', 'none');

    // Animated Neighbor Glow Ring (visible when connected to selected actor)
    nodeEnter
      .append('circle')
      .attr('class', 'node-neighbor-ring')
      .attr('fill', 'none')
      .attr('display', 'none')
      .attr('pointer-events', 'none');

    // Node outer ripple circle
    nodeEnter
      .append('circle')
      .attr('class', 'node-ripple')
      .attr('fill', 'none')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.25);

    // Node main circle
    nodeEnter
      .append('circle')
      .attr('class', 'node-core')
      .attr('stroke-width', 2.5);

    // Flag emoji or initials text
    nodeEnter
      .append('text')
      .attr('class', 'node-icon')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('pointer-events', 'none')
      .style('font-family', 'sans-serif');

    // Persian text label
    nodeEnter
      .append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none')
      .style('font-family', 'Vazirmatn, sans-serif')
      .style('font-weight', '600');

    // Subtitle label (Acronym or Category)
    nodeEnter
      .append('text')
      .attr('class', 'node-sublabel')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none')
      .style('font-family', 'sans-serif')
      .style('font-size', '9px')
      .attr('fill', '#94a3b8');

    // Degree Badge circle
    const badgeGroup = nodeEnter.append('g').attr('class', 'degree-badge');
    badgeGroup.append('circle').attr('r', 8).attr('fill', '#0f172a').attr('stroke', '#475569').attr('stroke-width', 1);
    badgeGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#f8fafc')
      .style('font-size', '8px')
      .style('font-family', 'sans-serif')
      .style('font-weight', '700');

    const allNodes = nodeEnter.merge(nodeSelection);

    // Simulation tick loop
    simulation.on('tick', () => {
      // Curved paths for links
      allLinks.attr('d', (d: unknown) => {
        const link = d as { source: { x: number; y: number }; target: { x: number; y: number } };
        const sx = link.source.x;
        const sy = link.source.y;
        const tx = link.target.x;
        const ty = link.target.y;
        const dx = tx - sx;
        const dy = ty - sy;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
        return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`;
      });

      // Update node positions
      allNodes.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, clusterMode]);

  // Update styles, animated highlight effects, and interactions
  useEffect(() => {
    if (!gRef.current) return;
    const g = d3.select(gRef.current);

    const isActorSelected = !!selectedActor;

    // Style Links
    g.selectAll<SVGPathElement, GraphLink>('.graph-link')
      .attr('stroke', (d) => RELATION_CONFIG[d.type]?.color || '#64748b')
      .attr('stroke-width', (d) => {
        const srcId = typeof d.source === 'object' ? (d.source as GraphNode).id : d.source;
        const tgtId = typeof d.target === 'object' ? (d.target as GraphNode).id : d.target;
        const isConnectedToSelected =
          isActorSelected && (srcId === selectedActor.id || tgtId === selectedActor.id);

        if (isConnectedToSelected) {
          return Math.max(3, d.intensity * 1.25);
        }
        return Math.max(1.5, d.intensity * 0.9);
      })
      .attr('stroke-dasharray', (d) => {
        const srcId = typeof d.source === 'object' ? (d.source as GraphNode).id : d.source;
        const tgtId = typeof d.target === 'object' ? (d.target as GraphNode).id : d.target;
        const isConnectedToSelected =
          isActorSelected && (srcId === selectedActor.id || tgtId === selectedActor.id);

        if (isConnectedToSelected) {
          // Flowing dashed stream for animated highlight
          return '8,4';
        }
        return RELATION_CONFIG[d.type]?.strokeDash || 'none';
      })
      .attr('marker-end', (d) => `url(#arrow-${d.type})`)
      .attr('class', (d) => {
        const srcId = typeof d.source === 'object' ? (d.source as GraphNode).id : d.source;
        const tgtId = typeof d.target === 'object' ? (d.target as GraphNode).id : d.target;
        const isConnectedToSelected =
          isActorSelected && (srcId === selectedActor.id || tgtId === selectedActor.id);

        return `graph-link cursor-pointer transition-opacity duration-200 ${
          isConnectedToSelected ? 'link-flowing' : ''
        }`;
      })
      .attr('opacity', (d) => {
        const srcId = typeof d.source === 'object' ? (d.source as GraphNode).id : d.source;
        const tgtId = typeof d.target === 'object' ? (d.target as GraphNode).id : d.target;

        // Path highlighting
        if (highlightedPathNodeIds.length >= 2) {
          const inPath =
            highlightedPathNodeIds.includes(srcId) && highlightedPathNodeIds.includes(tgtId);
          return inPath ? 1 : 0.06;
        }

        if (isActorSelected) {
          const isDirect = srcId === selectedActor.id || tgtId === selectedActor.id;
          if (isDirect) return 1;

          if (expandToSecondDegree) {
            const isSecond = firstDegreeNeighbors.has(srcId) && firstDegreeNeighbors.has(tgtId);
            if (isSecond) return 0.45;
          }
          return 0.05; // Fade out unrelated links
        }

        if (hoveredNodeId) {
          const isConnected = srcId === hoveredNodeId || tgtId === hoveredNodeId;
          return isConnected ? 1 : 0.1;
        }

        return 0.55;
      })
      .on('mouseenter', (event, d) => {
        setHoveredLink(d);
        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x, y });
      })
      .on('mouseleave', () => {
        setHoveredLink(null);
        setTooltipPos(null);
      });

    // Style Nodes
    g.selectAll<SVGGElement, GraphNode & d3.SimulationNodeDatum>('g.node-group')
      .attr('opacity', (d) => {
        if (highlightedPathNodeIds.length > 0) {
          return highlightedPathNodeIds.includes(d.id) ? 1 : 0.1;
        }
        if (isActorSelected) {
          return connectedNeighbors.has(d.id) ? 1 : 0.08;
        }
        if (hoveredNodeId) {
          return connectedNeighbors.has(d.id) ? 1 : 0.15;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            d.nameFa.toLowerCase().includes(q) ||
            d.nameEn.toLowerCase().includes(q) ||
            (d.acronym && d.acronym.toLowerCase().includes(q));
          return match ? 1 : 0.2;
        }
        return 1;
      })
      .on('mouseenter', (event, d) => {
        setHoveredNodeId(d.id);
        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x, y });
      })
      .on('mouseleave', () => {
        setHoveredNodeId(null);
        setTooltipPos(null);
      })
      .on('click', (_event, d) => {
        const fullActor = allActorsMap.get(d.id);
        if (fullActor) {
          // Toggle selection: click same actor clears, click different actor selects
          onSelectActor(selectedActor?.id === d.id ? null : fullActor);
        }
      });

    // Animated Pulse Halo for Selected Node
    g.selectAll<SVGCircleElement, GraphNode>('.node-pulse-ring')
      .attr('display', (d) => (selectedActor?.id === d.id ? 'block' : 'none'))
      .attr('r', (d) => 24 + (d.influenceScore || 3) * 4);

    // Animated Glowing Halo for Connected Neighbor Nodes
    g.selectAll<SVGCircleElement, GraphNode>('.node-neighbor-ring')
      .attr('display', (d) => {
        if (!isActorSelected || d.id === selectedActor.id) return 'none';
        return firstDegreeNeighbors.has(d.id) ? 'block' : 'none';
      })
      .attr('r', (d) => 20 + (d.influenceScore || 3) * 3.5);

    // Update Circle Sizes & Colors
    g.selectAll<SVGCircleElement, GraphNode>('.node-core')
      .attr('r', (d) => 16 + (d.influenceScore || 3) * 3)
      .attr('fill', (d) => {
        const isSelected = selectedActor?.id === d.id;
        const color = CATEGORY_COLORS[d.category]?.hex || '#3b82f6';
        return isSelected ? '#ffffff' : color;
      })
      .attr('stroke', (d) => {
        const isSelected = selectedActor?.id === d.id;
        if (isSelected) return '#38bdf8';
        if (isActorSelected && firstDegreeNeighbors.has(d.id)) return '#38bdf8';
        return '#0f172a';
      })
      .attr('stroke-width', (d) => {
        if (selectedActor?.id === d.id) return 4;
        if (isActorSelected && firstDegreeNeighbors.has(d.id)) return 2.5;
        return 2;
      });

    // Update Ripple Circles
    g.selectAll<SVGCircleElement, GraphNode>('.node-ripple')
      .attr('r', (d) => 22 + (d.influenceScore || 3) * 4.5)
      .attr('stroke', (d) => CATEGORY_COLORS[d.category]?.hex || '#3b82f6')
      .attr('display', showRipples ? 'block' : 'none');

    // Update Icons/Flags
    g.selectAll<SVGTextElement, GraphNode>('.node-icon')
      .text((d) => d.flagEmoji || d.acronym || '★')
      .attr('font-size', (d) => (d.flagEmoji ? '14px' : '10px'))
      .attr('fill', (d) => (selectedActor?.id === d.id ? '#0f172a' : '#ffffff'));

    // Update Main Persian Labels
    g.selectAll<SVGTextElement, GraphNode>('.node-label')
      .text((d) => d.nameFa)
      .attr('y', (d) => 22 + (d.influenceScore || 3) * 3 + 12)
      .attr('fill', (d) => {
        if (selectedActor?.id === d.id) return '#38bdf8';
        if (isActorSelected && firstDegreeNeighbors.has(d.id)) return '#f8fafc';
        if (hoveredNodeId === d.id) return '#f8fafc';
        return '#cbd5e1';
      })
      .attr('font-weight', (d) => {
        if (selectedActor?.id === d.id || (isActorSelected && firstDegreeNeighbors.has(d.id))) return '700';
        return '600';
      })
      .attr('font-size', (d) => (d.influenceScore >= 5 ? '12px' : '10.5px'))
      .attr('display', showLabels ? 'block' : 'none');

    // Update Sublabels (English/Acronym)
    g.selectAll<SVGTextElement, GraphNode>('.node-sublabel')
      .text((d) => d.acronym || d.nameEn.slice(0, 18))
      .attr('y', (d) => 22 + (d.influenceScore || 3) * 3 + 24)
      .attr('display', showLabels ? 'block' : 'none');

    // Update Degree Badges
    g.selectAll<SVGGElement, GraphNode>('.degree-badge')
      .attr('transform', (d) => {
        const r = 16 + (d.influenceScore || 3) * 3;
        return `translate(${r * 0.72}, ${-r * 0.72})`;
      })
      .select('text')
      .text((d) => d.degree || 0);

  }, [
    activeFocusId,
    connectedNeighbors,
    firstDegreeNeighbors,
    selectedActor,
    hoveredNodeId,
    highlightedPathNodeIds,
    searchQuery,
    showLabels,
    showRipples,
    expandToSecondDegree,
    allActorsMap,
    onSelectActor,
  ]);

  // Zoom control helpers
  const handleZoom = useCallback((factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy, factor);
  }, []);

  const handleResetZoom = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(500)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  }, []);

  const handleFitView = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current || nodes.length === 0) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    d3.select(svgRef.current)
      .transition()
      .duration(600)
      .call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85).translate(-width / 2, -height / 2)
      );
  }, [nodes]);

  // Center on Selected Actor
  const handleCenterOnActor = useCallback((actorId: string) => {
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
    const nodeEl = nodes.find((n) => n.id === actorId);
    if (!nodeEl || nodeEl.x === undefined || nodeEl.y === undefined) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    d3.select(svgRef.current)
      .transition()
      .duration(700)
      .call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(1.4)
          .translate(-nodeEl.x, -nodeEl.y)
      );
  }, [nodes]);

  const activeHoveredActor = hoveredNodeId ? allActorsMap.get(hoveredNodeId) : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-950 select-none"
      id="graph-viewport-container"
    >
      {/* Background Geopolitical Grid & Radial Glow */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.12) 0%, transparent 70%),
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 48px 48px, 48px 48px'
        }}
      />

      {/* D3 SVG Canvas */}
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" id="geopolitical-d3-svg">
        <defs>
          {/* Arrow markers for each relation type */}
          {(Object.keys(RELATION_CONFIG) as RelationType[]).map((relType) => (
            <marker
              key={relType}
              id={`arrow-${relType}`}
              viewBox="0 -5 10 10"
              refX={22}
              refY={0}
              markerWidth={6}
              markerHeight={6}
              orient="auto"
            >
              <path d="M0,-5L10,0L0,5" fill={RELATION_CONFIG[relType].color} />
            </marker>
          ))}
          {/* Node shadow filter */}
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.4" />
          </filter>
        </defs>

        <g ref={gRef}>
          <g className="links-layer" />
          <g className="nodes-layer" />
        </g>
      </svg>

      {/* Floating Interactive Connection HUD (Displays upon Node Click) */}
      {selectedActor && (
        <div
          className="absolute top-4 right-4 z-30 bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 p-4 rounded-2xl shadow-2xl max-w-sm w-80 text-right font-vazir animate-in fade-in slide-in-from-top-2 duration-300"
          id="actor-connection-hud"
        >
          {/* HUD Header */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0 shadow-inner">
                {selectedActor.flagEmoji || '🏛️'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-slate-100 text-sm">{selectedActor.nameFa}</h3>
                  {selectedActor.acronym && (
                    <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950 px-1 rounded">
                      {selectedActor.acronym}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-sans">{selectedActor.nameEn}</p>
              </div>
            </div>

            <button
              onClick={() => onSelectActor(null)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="لغو هایلایت و بستن (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Connection Stats & Highlight Indicator */}
          <div className="space-y-2.5 mb-3">
            <div className="flex items-center justify-between text-xs bg-slate-950/70 px-3 py-2 rounded-xl border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-cyan-400" />
                بازیگران در شبکه هایلایت‌شده:
              </span>
              <strong className="text-cyan-300 font-bold">
                {firstDegreeNeighbors.size} بازیگر مستقیم
              </strong>
            </div>

            {/* Direct Relationship Type Breakdown Pills */}
            {selectedActorLinkBreakdown && (
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {selectedActorLinkBreakdown.conflicts > 0 && (
                  <div className="bg-rose-950/40 border border-rose-800/40 text-rose-300 px-2.5 py-1 rounded-lg flex items-center justify-between">
                    <span>⚔️ تقابل و منازعه:</span>
                    <strong>{selectedActorLinkBreakdown.conflicts}</strong>
                  </div>
                )}
                {selectedActorLinkBreakdown.alliances > 0 && (
                  <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 px-2.5 py-1 rounded-lg flex items-center justify-between">
                    <span>🤝 هم‌پیمانی:</span>
                    <strong>{selectedActorLinkBreakdown.alliances}</strong>
                  </div>
                )}
                {selectedActorLinkBreakdown.economic > 0 && (
                  <div className="bg-amber-950/40 border border-amber-800/40 text-amber-300 px-2.5 py-1 rounded-lg flex items-center justify-between">
                    <span>💼 اقتصادی و انرژی:</span>
                    <strong>{selectedActorLinkBreakdown.economic}</strong>
                  </div>
                )}
                {selectedActorLinkBreakdown.diplomatic > 0 && (
                  <div className="bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 px-2.5 py-1 rounded-lg flex items-center justify-between">
                    <span>🕊️ دیپلماتیک:</span>
                    <strong>{selectedActorLinkBreakdown.diplomatic}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2nd Degree Neighborhood Toggle */}
          <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-xl border border-slate-800/60 mb-3 text-xs">
            <span className="text-slate-400 text-[11px]">گسترش به شبکه درجه ۲:</span>
            <button
              onClick={() => setExpandToSecondDegree(!expandToSecondDegree)}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                expandToSecondDegree
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {expandToSecondDegree ? 'فعال (شبکه گسترده)' : 'خاموش'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-xs">
            <button
              onClick={() => handleCenterOnActor(selectedActor.id)}
              className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1 text-[11px] font-semibold"
              title="مرکزیت و زوم روی گره"
            >
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span>تمرکز نما</span>
            </button>

            {onOpenDetailsModal && (
              <button
                onClick={() => onOpenDetailsModal(selectedActor)}
                className="flex-1 py-1.5 px-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-colors flex items-center justify-center gap-1 text-[11px] font-semibold shadow-md"
                title="مشاهده پرونده کامل"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>پرونده کامل</span>
              </button>
            )}

            <button
              onClick={() => onSelectActor(null)}
              className="py-1.5 px-2.5 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 rounded-xl transition-colors text-[11px]"
              title="لغو هایلایت"
            >
              لغو
            </button>
          </div>
        </div>
      )}

      {/* Floating Canvas Controls */}
      <div 
        className="absolute top-4 left-4 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-2xl z-20"
        id="graph-controls-panel"
      >
        <button
          onClick={() => handleZoom(1.3)}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="بزرگ‌نمایی (Zoom In)"
          id="btn-zoom-in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(0.7)}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="کوچک‌نمایی (Zoom Out)"
          id="btn-zoom-out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFitView}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="تنظیم نمای کامل (Fit View)"
          id="btn-fit-view"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="بازنشانی موقعیت (Reset View)"
          id="btn-reset-view"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-800 my-1" />
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`p-2 rounded-lg transition-colors ${
            showLabels ? 'text-cyan-400 bg-cyan-950/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title={showLabels ? 'مخفی‌سازی برچسب‌ها' : 'نمایش برچسب‌ها'}
          id="btn-toggle-labels"
        >
          {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setShowRipples(!showRipples)}
          className={`p-2 rounded-lg transition-colors ${
            showRipples ? 'text-emerald-400 bg-emerald-950/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="حلقه‌های شعاع نفوذ"
          id="btn-toggle-ripples"
        >
          <Sparkles className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Status & Node Count Badge */}
      <div 
        className="absolute bottom-4 left-4 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 px-3.5 py-2 rounded-lg text-xs text-slate-400 z-10 font-sans"
        id="graph-status-bar"
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-200 font-medium">{nodes.length} بازیگر فعال</span>
        </div>
        <span className="text-slate-600">|</span>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-200 font-medium">{links.length} رابطه ژئوپلیتیک</span>
        </div>
        {selectedActor && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400 font-medium font-vazir truncate max-w-[140px]">
              انتخاب: {selectedActor.nameFa}
            </span>
          </>
        )}
      </div>

      {/* Floating Node Hover Tooltip (Only if not clicked on node) */}
      {activeHoveredActor && tooltipPos && !selectedActor && (
        <div
          className="absolute z-40 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-3.5 rounded-xl shadow-2xl max-w-sm w-72 text-right transition-opacity duration-150"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y - 12}px` }}
          id="graph-node-tooltip"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base">{activeHoveredActor.flagEmoji}</span>
                <span className="font-bold text-slate-100 text-sm font-vazir">{activeHoveredActor.nameFa}</span>
              </div>
              <p className="text-[11px] text-slate-400">{activeHoveredActor.nameEn}</p>
            </div>
            <span 
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: `${CATEGORY_COLORS[activeHoveredActor.category]?.hex}20`,
                color: CATEGORY_COLORS[activeHoveredActor.category]?.hex,
              }}
            >
              قدرت: {activeHoveredActor.influenceScore}/5
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-2 font-vazir">
            {activeHoveredActor.geopoliticalRole}
          </p>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] border-t border-slate-800/80 pt-2 text-slate-400">
            <div>
              <span className="text-slate-500">جغرافیا: </span>
              <span className="text-slate-300 font-vazir">{activeHoveredActor.geography}</span>
            </div>
            <div>
              <span className="text-slate-500">جهت‌گیری: </span>
              <span className="text-slate-300 font-vazir">{activeHoveredActor.alignment}</span>
            </div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-cyan-400 flex items-center justify-between">
            <span>کلیک جهت هایلایت و بررسی شبکه روابط</span>
            <span>{firstDegreeNeighbors.size} پیوند مستقیم</span>
          </div>
        </div>
      )}

      {/* Floating Link Hover Tooltip */}
      {hoveredLink && tooltipPos && !activeHoveredActor && (
        <div
          className="absolute z-40 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-3 rounded-xl shadow-2xl max-w-xs w-64 text-right"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y - 10}px` }}
          id="graph-link-tooltip"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span 
              className="w-2.5 h-2.5 rounded-full shrink-0" 
              style={{ backgroundColor: RELATION_CONFIG[hoveredLink.type]?.color }} 
            />
            <span className="font-semibold text-xs text-slate-200 font-vazir">{hoveredLink.typeFa}</span>
            <span className="text-[10px] text-slate-400 mr-auto">شدت {hoveredLink.intensity}/5</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-vazir">{hoveredLink.description}</p>
        </div>
      )}
    </div>
  );
};
