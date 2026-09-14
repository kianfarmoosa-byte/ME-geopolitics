import { ActorData, GeopoliticalRelationship, GraphNode, GraphLink, FilterState } from '../types';

export function prepareGraphData(
  actors: ActorData[],
  relationships: GeopoliticalRelationship[],
  filters: FilterState
): { nodes: GraphNode[]; links: GraphLink[] } {
  // 1. Calculate degree for all actors first
  const degreeMap = new Map<string, number>();
  const actorMap = new Map<string, ActorData>();

  actors.forEach((actor) => {
    degreeMap.set(actor.id, 0);
    actorMap.set(actor.id, actor);
  });

  relationships.forEach((rel) => {
    degreeMap.set(rel.source, (degreeMap.get(rel.source) || 0) + 1);
    degreeMap.set(rel.target, (degreeMap.get(rel.target) || 0) + 1);
  });

  // 2. Filter actors
  const filteredActors = actors.filter((actor) => {
    // Search query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchName = actor.nameFa.toLowerCase().includes(q) || actor.nameEn.toLowerCase().includes(q);
      const matchAcronym = actor.acronym ? actor.acronym.toLowerCase().includes(q) : false;
      const matchLeader = actor.leader ? actor.leader.toLowerCase().includes(q) : false;
      const matchRole = actor.geopoliticalRole ? actor.geopoliticalRole.toLowerCase().includes(q) : false;
      if (!matchName && !matchAcronym && !matchLeader && !matchRole) {
        return false;
      }
    }

    // Category
    if (filters.categories.length > 0 && !filters.categories.includes(actor.category)) {
      return false;
    }

    // Min influence
    if (actor.influenceScore < filters.minInfluence) {
      return false;
    }

    // Geography
    if (filters.geographies.length > 0) {
      const actorGeo = actor.geography.split('/')[0].trim();
      const matched = filters.geographies.some(g => actorGeo.includes(g) || actor.geography.includes(g));
      if (!matched) return false;
    }

    // Alignment
    if (filters.alignments.length > 0 && !filters.alignments.includes(actor.alignment)) {
      return false;
    }

    // Status
    if (filters.statuses.length > 0 && !filters.statuses.includes(actor.status)) {
      return false;
    }

    return true;
  });

  const validActorIds = new Set(filteredActors.map((a) => a.id));

  // 3. Filter relationships
  const filteredLinks: GraphLink[] = [];
  relationships.forEach((rel) => {
    // Check if relationship type is active
    if (!filters.relationTypes.includes(rel.type)) {
      return;
    }

    // Both source and target must be in the valid actors list
    if (validActorIds.has(rel.source) && validActorIds.has(rel.target)) {
      filteredLinks.push({
        id: rel.id,
        source: rel.source,
        target: rel.target,
        type: rel.type,
        typeFa: rel.typeFa,
        intensity: rel.intensity,
        description: rel.description,
      });
    }
  });

  // Convert filtered actors to GraphNodes
  const nodes: GraphNode[] = filteredActors.map((actor) => {
    const degree = degreeMap.get(actor.id) || 0;
    return {
      ...actor,
      degree,
    };
  });

  return { nodes, links: filteredLinks };
}

// Find path between two actors using Breadth-First Search
export function findPathBetweenActors(
  startId: string,
  endId: string,
  relationships: GeopoliticalRelationship[]
): { pathNodeIds: string[]; pathLinks: GeopoliticalRelationship[] } | null {
  if (startId === endId) return { pathNodeIds: [startId], pathLinks: [] };

  const adj = new Map<string, { neighbor: string; link: GeopoliticalRelationship }[]>();

  relationships.forEach((rel) => {
    if (!adj.has(rel.source)) adj.set(rel.source, []);
    if (!adj.has(rel.target)) adj.set(rel.target, []);
    adj.get(rel.source)!.push({ neighbor: rel.target, link: rel });
    adj.get(rel.target)!.push({ neighbor: rel.source, link: rel });
  });

  const visited = new Set<string>([startId]);
  const queue: { current: string; path: string[]; links: GeopoliticalRelationship[] }[] = [
    { current: startId, path: [startId], links: [] },
  ];

  while (queue.length > 0) {
    const { current, path, links } = queue.shift()!;

    const neighbors = adj.get(current) || [];
    for (const { neighbor, link } of neighbors) {
      if (neighbor === endId) {
        return {
          pathNodeIds: [...path, neighbor],
          pathLinks: [...links, link],
        };
      }
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({
          current: neighbor,
          path: [...path, neighbor],
          links: [...links, link],
        });
      }
    }
  }

  return null;
}
