/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Station, Connection } from '../types/metro';

export interface ShortestPathStep {
  station: Station;
  connection?: Connection;
  isTransfer?: boolean;
  distanceFromPrev?: number;
}

export interface ShortestPathResult {
  startStation: Station;
  endStation: Station;
  stationIds: string[];
  connectionIds: string[];
  steps: ShortestPathStep[];
  totalDistance: number;
  stopsCount: number;
  transfersCount: number;
  linesUsed: { color: string; count: number }[];
  isDirectSuggested: boolean;
}

/**
 * Calculates the Euclidean distance between two points/stations.
 */
export function getDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Finds the shortest path between startStationId and endStationId.
 * If connected in the existing network, computes Dijkstra path along connections.
 * If not connected, calculates the optimal geometric connecting order.
 */
export function findShortestPath(
  stations: Station[],
  connections: Connection[],
  startStationId: string,
  endStationId: string
): ShortestPathResult | null {
  if (!startStationId || !endStationId) return null;
  if (stations.length === 0) return null;

  const startStation = stations.find((s) => s.id === startStationId);
  const endStation = stations.find((s) => s.id === endStationId);

  if (!startStation || !endStation) return null;

  // Case 1: Start and End are the same station
  if (startStationId === endStationId) {
    return {
      startStation,
      endStation,
      stationIds: [startStationId],
      connectionIds: [],
      steps: [{ station: startStation }],
      totalDistance: 0,
      stopsCount: 1,
      transfersCount: 0,
      linesUsed: [],
      isDirectSuggested: false,
    };
  }

  // 1. Build Adjacency Graph from existing connections
  // Station ID -> Array of { neighborId, connection, weight }
  const adj = new Map<string, { neighborId: string; connection: Connection; weight: number }[]>();
  stations.forEach((st) => adj.set(st.id, []));

  connections.forEach((conn) => {
    const fromSt = stations.find((s) => s.id === conn.fromStationId);
    const toSt = stations.find((s) => s.id === conn.toStationId);
    if (!fromSt || !toSt) return;

    let dist = getDistance(fromSt, toSt);
    if (conn.waypoints && conn.waypoints.length > 0) {
      // Calculate length through waypoints
      let d = 0;
      let prevPt: { x: number; y: number } = fromSt;
      conn.waypoints.forEach((wp) => {
        d += getDistance(prevPt, wp);
        prevPt = wp;
      });
      d += getDistance(prevPt, toSt);
      dist = d;
    }

    const listFrom = adj.get(conn.fromStationId) || [];
    listFrom.push({ neighborId: conn.toStationId, connection: conn, weight: dist });
    adj.set(conn.fromStationId, listFrom);

    const listTo = adj.get(conn.toStationId) || [];
    listTo.push({ neighborId: conn.fromStationId, connection: conn, weight: dist });
    adj.set(conn.toStationId, listTo);
  });

  // 2. Dijkstra Algorithm for existing network
  interface QueueItem {
    id: string;
    dist: number;
    lastColor?: string;
  }

  const distances = new Map<string, number>();
  const previous = new Map<
    string,
    { prevId: string; connection: Connection; weight: number; color: string }
  >();

  stations.forEach((st) => distances.set(st.id, Infinity));
  distances.set(startStationId, 0);

  const unvisited = new Set<string>(stations.map((s) => s.id));

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let currentId: string | null = null;
    let minDist = Infinity;

    unvisited.forEach((id) => {
      const d = distances.get(id) ?? Infinity;
      if (d < minDist) {
        minDist = d;
        currentId = id;
      }
    });

    if (!currentId || minDist === Infinity) {
      break; // Remaining nodes are unreachable
    }

    if (currentId === endStationId) {
      break; // Reached target destination
    }

    unvisited.delete(currentId);

    const neighbors = adj.get(currentId) || [];
    const prevInfo = previous.get(currentId);
    const currentColor = prevInfo?.color;

    for (const { neighborId, connection, weight } of neighbors) {
      if (!unvisited.has(neighborId)) continue;

      // Small transfer penalty (15px equivalent) to favor remaining on the same line
      const transferPenalty = currentColor && currentColor !== connection.color ? 15 : 0;
      const alt = minDist + weight + transferPenalty;

      if (alt < (distances.get(neighborId) ?? Infinity)) {
        distances.set(neighborId, alt);
        previous.set(neighborId, {
          prevId: currentId,
          connection,
          weight,
          color: connection.color,
        });
      }
    }
  }

  // 3. If path found through existing network
  if (previous.has(endStationId)) {
    const pathStationIds: string[] = [];
    const pathConnectionIds: string[] = [];
    const steps: ShortestPathStep[] = [];

    let curr: string | undefined = endStationId;
    let totalDist = 0;

    while (curr && curr !== startStationId) {
      pathStationIds.unshift(curr);
      const edge = previous.get(curr);
      if (edge) {
        pathConnectionIds.unshift(edge.connection.id);
        totalDist += edge.weight;
        curr = edge.prevId;
      } else {
        break;
      }
    }
    pathStationIds.unshift(startStationId);

    // Calculate line transfers
    let transfersCount = 0;
    const linesUsedMap = new Map<string, number>();

    pathConnectionIds.forEach((connId, idx) => {
      const conn = connections.find((c) => c.id === connId);
      if (conn) {
        const c = conn.color || '#94A3B8';
        linesUsedMap.set(c, (linesUsedMap.get(c) || 0) + 1);

        if (idx > 0) {
          const prevConn = connections.find((c) => c.id === pathConnectionIds[idx - 1]);
          if (prevConn && prevConn.color !== conn.color) {
            transfersCount++;
          }
        }
      }
    });

    // Build step-by-step itinerary
    pathStationIds.forEach((stId, idx) => {
      const st = stations.find((s) => s.id === stId);
      if (!st) return;

      if (idx === 0) {
        steps.push({ station: st, distanceFromPrev: 0 });
      } else {
        const connId = pathConnectionIds[idx - 1];
        const conn = connections.find((c) => c.id === connId);
        const prevConn = idx > 1 ? connections.find((c) => c.id === pathConnectionIds[idx - 2]) : undefined;
        const isTransfer = Boolean(prevConn && conn && prevConn.color !== conn.color);
        const prevSt = stations.find((s) => s.id === pathStationIds[idx - 1]);
        const dist = prevSt ? getDistance(prevSt, st) : 0;

        steps.push({
          station: st,
          connection: conn,
          isTransfer,
          distanceFromPrev: Math.round(dist),
        });
      }
    });

    const linesUsed = Array.from(linesUsedMap.entries()).map(([color, count]) => ({
      color,
      count,
    }));

    return {
      startStation,
      endStation,
      stationIds: pathStationIds,
      connectionIds: pathConnectionIds,
      steps,
      totalDistance: Math.round(totalDist),
      stopsCount: pathStationIds.length,
      transfersCount,
      linesUsed,
      isDirectSuggested: false,
    };
  }

  // 4. Case 2: No network connection exists between the two stations.
  // Calculate recommended connecting sequence (direct or through aligned intermediate stations)
  const directDist = getDistance(startStation, endStation);

  // Check if any station lies nicely between start and end (within a corridor)
  const intermediates: { station: Station; proj: number; perpDist: number }[] = [];
  const dx = endStation.x - startStation.x;
  const dy = endStation.y - startStation.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq > 0) {
    stations.forEach((st) => {
      if (st.id === startStationId || st.id === endStationId) return;

      const px = st.x - startStation.x;
      const py = st.y - startStation.y;
      const t = (px * dx + py * dy) / lenSq;

      // Between 0.15 and 0.85 of the segment
      if (t > 0.15 && t < 0.85) {
        const projX = startStation.x + t * dx;
        const projY = startStation.y + t * dy;
        const perp = Math.hypot(st.x - projX, st.y - projY);

        // Within 60px corridor
        if (perp < 60) {
          intermediates.push({ station: st, proj: t, perpDist: perp });
        }
      }
    });
  }

  // Sort intermediates along projection
  intermediates.sort((a, b) => a.proj - b.proj);

  // Take at most 2 best aligned intermediate stations for clean routing
  const chosenIntermediates = intermediates.slice(0, 2).map((item) => item.station);
  const suggestedStationIds = [
    startStationId,
    ...chosenIntermediates.map((s) => s.id),
    endStationId,
  ];

  let suggestedDist = 0;
  const steps: ShortestPathStep[] = [];
  suggestedStationIds.forEach((stId, idx) => {
    const st = stations.find((s) => s.id === stId);
    if (!st) return;

    if (idx === 0) {
      steps.push({ station: st });
    } else {
      const prevSt = stations.find((s) => s.id === suggestedStationIds[idx - 1]);
      const d = prevSt ? getDistance(prevSt, st) : 0;
      suggestedDist += d;
      steps.push({
        station: st,
        distanceFromPrev: Math.round(d),
      });
    }
  });

  return {
    startStation,
    endStation,
    stationIds: suggestedStationIds,
    connectionIds: [],
    steps,
    totalDistance: Math.round(suggestedDist || directDist),
    stopsCount: suggestedStationIds.length,
    transfersCount: 0,
    linesUsed: [],
    isDirectSuggested: true,
  };
}
