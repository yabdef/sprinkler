const pointKey = (x, y) => `${Number(x)},${Number(y)}`;

export const CAD_COMMANDS = [
  { name: 'BORU', aliases: ['L', 'LINE'], tool: 'pipe', description: 'Boru çiz' },
  { name: 'SPRINKLER', aliases: ['S'], tool: 'sprinkler', description: 'Sprinkler yerleştir' },
  { name: 'POMPA', aliases: ['P'], tool: 'pump', description: 'Pompa yerleştir' },
  { name: 'SEÇ', aliases: ['V', 'SELECT'], tool: 'select', description: 'Nesne seç' },
  { name: 'SİL', aliases: ['E', 'ERASE'], action: 'erase', description: 'Seçimi sil' },
  { name: 'KAYDET', aliases: ['SAVE'], action: 'save', description: 'Projeyi kaydet' },
  { name: 'HESAPLA', aliases: ['CALC'], action: 'calculate', description: 'Hidrolik ön hesap' },
];

export const normalizeCadCommand = (value) => String(value || '').trim().toLocaleUpperCase('tr-TR');

const editDistance = (left, right) => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
};

const commonPrefixLength = (left, right) => {
  let length = 0;
  while (length < left.length && length < right.length && left[length] === right[length]) length += 1;
  return length;
};

export const getCommandSuggestions = (value, limit = 4) => {
  const query = normalizeCadCommand(value);
  if (!query) return [];
  return CAD_COMMANDS.map((command, order) => {
    const terms = [command.name, ...command.aliases];
    const exact = terms.includes(query);
    const prefix = terms.some((term) => term.startsWith(query));
    const contains = terms.some((term) => term.includes(query));
    const distance = Math.min(...terms.map((term) => editDistance(query, term) - commonPrefixLength(query, term) * 0.1));
    return { ...command, order, score: exact ? -3 : prefix ? -2 : contains ? -1 : distance };
  }).sort((a, b) => a.score - b.score || a.order - b.order).slice(0, limit);
};

export const findCadCommand = (value) => {
  const normalized = normalizeCadCommand(value);
  return CAD_COMMANDS.find((command) => command.name === normalized || command.aliases.includes(normalized));
};

export const elementSelectionKey = (element) => `${element.type}:${element.id}`;

export const normalizeSelectionBox = (start, end) => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y),
  crossing: end.x < start.x,
});

const pointInside = (x, y, box) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;

const segmentIntersectsBox = ([x1, y1, x2, y2], box) => {
  if (pointInside(x1, y1, box) || pointInside(x2, y2, box)) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  let minimum = 0;
  let maximum = 1;
  const clip = (p, q) => {
    if (p === 0) return q >= 0;
    const ratio = q / p;
    if (p < 0) {
      if (ratio > maximum) return false;
      if (ratio > minimum) minimum = ratio;
    } else {
      if (ratio < minimum) return false;
      if (ratio < maximum) maximum = ratio;
    }
    return true;
  };
  return clip(-dx, x1 - box.x)
    && clip(dx, box.x + box.width - x1)
    && clip(-dy, y1 - box.y)
    && clip(dy, box.y + box.height - y1);
};

export const elementMatchesSelection = (element, box) => {
  if (element.type === 'pipe' && Array.isArray(element.points)) {
    const [x1, y1, x2, y2] = element.points;
    return box.crossing
      ? segmentIntersectsBox(element.points, box)
      : pointInside(x1, y1, box) && pointInside(x2, y2, box);
  }
  return pointInside(Number(element.x), Number(element.y), box);
};

const PIPE_SCHEDULE_THRESHOLDS = [1, 2, 3, 5, 10, 20, 40, 80, 160, 320, 640, Infinity];

export const scheduledDiameter = (sprinklerCount, pipeProfile) => {
  const sizes = Object.keys(pipeProfile.sizes);
  const index = PIPE_SCHEDULE_THRESHOLDS.findIndex((maximum) => sprinklerCount <= maximum);
  return sizes[Math.min(Math.max(0, index), sizes.length - 1)];
};

export const applyAutomaticPipeDiameters = (elements, pipeProfile) => {
  const pipes = elements.filter((element) => element.type === 'pipe' && Array.isArray(element.points) && element.points.length === 4);
  const nodes = new Map();
  const nodeFor = (x, y) => {
    const key = pointKey(x, y);
    if (!nodes.has(key)) nodes.set(key, { key, edges: [], sprinklerCount: 0, parent: null, parentEdge: null, depth: 0 });
    return nodes.get(key);
  };

  const edges = pipes.map((pipe) => {
    const a = nodeFor(pipe.points[0], pipe.points[1]);
    const b = nodeFor(pipe.points[2], pipe.points[3]);
    const edge = { pipe, a, b, child: null };
    a.edges.push(edge);
    b.edges.push(edge);
    return edge;
  });
  elements.filter((element) => element.type === 'sprinkler').forEach((sprinkler) => {
    const node = nodes.get(pointKey(sprinkler.x, sprinkler.y));
    if (node) node.sprinklerCount += 1;
  });
  const pump = elements.find((element) => element.type === 'pump');
  const root = pump ? nodes.get(pointKey(pump.x, pump.y)) : null;
  const downstreamByPipe = new Map();

  if (root) {
    const ordered = [];
    const seen = new Set([root.key]);
    const queue = [root];
    while (queue.length) {
      const parent = queue.shift();
      ordered.push(parent);
      parent.edges.forEach((edge) => {
        const child = edge.a === parent ? edge.b : edge.a;
        if (seen.has(child.key)) return;
        seen.add(child.key);
        child.parent = parent;
        child.parentEdge = edge;
        child.depth = parent.depth + 1;
        edge.child = child;
        queue.push(child);
      });
    }
    [...ordered].sort((a, b) => b.depth - a.depth).forEach((node) => {
      const childTotal = node.edges.reduce((sum, edge) => sum + (edge.child?.parent === node ? (edge.child.downstreamCount || 0) : 0), 0);
      node.downstreamCount = node.sprinklerCount + childTotal;
      if (node.parentEdge) downstreamByPipe.set(node.parentEdge.pipe, node.downstreamCount);
    });
  }

  return elements.map((element) => {
    if (element.type !== 'pipe' || element.data?.diameterMode === 'manual') return element;
    const sprinklerCount = downstreamByPipe.get(element) || 1;
    const diameter = scheduledDiameter(sprinklerCount, pipeProfile);
    if (element.data?.diameter === diameter && element.data?.diameterMode === 'auto') return element;
    return { ...element, data: { ...element.data, diameter, diameterMode: 'auto', pipeProfile: pipeProfile.id } };
  });
};
