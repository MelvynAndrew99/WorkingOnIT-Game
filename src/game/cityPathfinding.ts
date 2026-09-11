import {allowsRoadStep, directionSignature} from './cityDirections.ts';
/** Reusable BFS trees for ordinary unweighted paths. No persisted state or vehicle occupancy. */
import type {City, Point} from './cityModel.ts';

const key = (p: Point) => `${p.x},${p.y}`;
const MAX_TREES = 64;
type Graph = {
  signature: string; points: Point[]; ids: Map<string, number>;
  edges: number[][]; blocked: Set<number>; trees: Map<number, Int32Array>;
};
const graphs = new WeakMap<City, Map<number, Graph>>();
const readScopes = new WeakMap<City, Map<number, Graph>>();

/** Only for synchronous read-only reports/drawing: no roads, closures or incidents may change. */
export function withRoadPathRead<T>(city: City, action: () => T): T {
  if (readScopes.has(city)) return action();
  readScopes.set(city, new Map());
  try { return action(); }
  finally { readScopes.delete(city); }
}

function graphFor(city: City, responding: boolean, ignoreBlocked: boolean): Graph {
  const mode = ignoreBlocked ? 2 : responding ? 1 : 0;
  const scope = readScopes.get(city);
  const prepared = scope?.get(mode);
  if (prepared) return prepared;
  // Inspect values, not array identities/counts: tools and save migration can mutate in place.
  // Keeping this exact also notices incident creation/clearance within a simulation tick.
  const roadKeys = city.roads.map(key);
  const blockedKeys = ignoreBlocked ? [] : [
    ...(responding ? [] : city.closures.map(key)),
    ...city.incidents.filter(i => i.status === 'active').map(key),
  ];
  const signature = roadKeys.join(';') + '|' + blockedKeys.join(';') + '|' + directionSignature(city);
  let views = graphs.get(city);
  if (!views) { views = new Map(); graphs.set(city, views); }
  const cached = views.get(mode);
  if (cached?.signature === signature) { scope?.set(mode, cached); return cached; }
  const points = city.roads.map(p => ({x:p.x, y:p.y}));
  const ids = new Map(roadKeys.map((k, i) => [k, i]));
  const blocked = new Set(blockedKeys.flatMap(k => ids.has(k) ? [ids.get(k)!] : []));
  const edges = points.map(p => [
    `${p.x + 1},${p.y}`, `${p.x},${p.y + 1}`, `${p.x - 1},${p.y}`, `${p.x},${p.y - 1}`,
  ].flatMap(k => ids.has(k) && allowsRoadStep(city,p,points[ids.get(k)!]) ? [ids.get(k)!] : []));
  const graph = {signature, points, ids, edges, blocked, trees:new Map<number, Int32Array>()};
  views.set(mode, graph); scope?.set(mode, graph);
  return graph;
}

/** Same E/S/W/N tie order and blocked-start escape as findPath, with fresh output points. */
export function cachedRoadPath(city: City, start: Point, end: Point, responding: boolean, ignoreBlocked = false): Point[] | null {
  const graph = graphFor(city, responding, ignoreBlocked);
  const from = graph.ids.get(key(start)), to = graph.ids.get(key(end));
  if (from === undefined || to === undefined || graph.blocked.has(to)) return null;
  let previous = graph.trees.get(from);
  if (previous) {
    graph.trees.delete(from); // bounded LRU: moving vehicles cannot accumulate a tree per old position
  } else {
    previous = new Int32Array(graph.points.length).fill(-1);
    previous[from] = from;
    const queue = new Int32Array(graph.points.length);
    queue[0] = from;
    let tail = 1;
    for (let head = 0; head < tail; head++) {
      const at = queue[head];
      for (const next of graph.edges[at]) {
        if (previous[next] !== -1 || graph.blocked.has(next)) continue;
        previous[next] = at; queue[tail++] = next;
      }
    }
  }
  graph.trees.set(from, previous);
  if (graph.trees.size > MAX_TREES) graph.trees.delete(graph.trees.keys().next().value!);
  if (previous[to] === -1) return null;
  const path: Point[] = [];
  for (let at = to;; at = previous[at]) {
    path.push({...graph.points[at]});
    if (at === from) break;
  }
  return path.reverse();
}
