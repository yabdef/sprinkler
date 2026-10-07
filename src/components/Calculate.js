const PIPE_SIZES = {
  '1"': { nominal: 25, inside: 27.2 },
  '11/4"': { nominal: 32, inside: 35.9 },
  '11/2"': { nominal: 40, inside: 41.8 },
  '2"': { nominal: 50, inside: 53.0 },
  '21/2"': { nominal: 65, inside: 68.8 },
  '3"': { nominal: 80, inside: 80.8 },
  '4"': { nominal: 100, inside: 105.3 },
  '5"': { nominal: 125, inside: 129.7 },
  '6"': { nominal: 150, inside: 155.1 },
  '8"': { nominal: 200, inside: 207.1 },
  '10"': { nominal: 250, inside: 260.4 },
  '12"': { nominal: 300, inside: 309.7 },
};

const HAZARD_LIMITS = {
  low: { label: 'Düşük tehlike', minimumPressure: 0.7, maximumCoverage: 21 },
  ordinary: { label: 'Orta tehlike', minimumPressure: 0.35, maximumCoverage: 12 },
  high: { label: 'Yüksek tehlike', minimumPressure: 0.5, maximumCoverage: 9 },
};

const pointKey = (point) => `${Number(point.x)},${Number(point.y)}`;
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const hazardGroup = (hazard = '') => hazard.startsWith('Düşük') ? 'low' : hazard.startsWith('Yüksek') ? 'high' : 'ordinary';
const pipeProperties = (diameter) => PIPE_SIZES[diameter] || null;

export const hazenWilliamsLoss = ({ length, flow, c, insideDiameter }) => {
  if (length <= 0 || flow <= 0) return 0;
  return 6.05e5 * length * Math.pow(flow, 1.85) /
    (Math.pow(c, 1.85) * Math.pow(insideDiameter, 4.87));
};

const waterVelocity = (flow, insideDiameter) => {
  const cubicMetresPerSecond = flow / 60000;
  const area = Math.PI * Math.pow(insideDiameter / 1000, 2) / 4;
  return area > 0 ? cubicMetresPerSecond / area : 0;
};

const validateAndBuildGraph = (project) => {
  const errors = [];
  const elements = Array.isArray(project?.elements) ? project.elements : [];
  const pipes = elements.filter((element) => element.type === 'pipe');
  const sprinklers = elements.filter((element) => element.type === 'sprinkler');
  const pumps = elements.filter((element) => element.type === 'pump');
  const nodes = new Map();

  const getNode = (point) => {
    const key = pointKey(point);
    if (!nodes.has(key)) nodes.set(key, { key, point, edges: [], sprinklers: [], pump: null });
    return nodes.get(key);
  };

  if (pumps.length !== 1) errors.push(pumps.length ? 'Ön hesap için yalnızca bir pompa bulunmalıdır.' : 'Pompa eklenmemiş.');
  if (!pipes.length) errors.push('Hesaplanacak boru bulunamadı.');
  if (!sprinklers.length) errors.push('Sprinkler eklenmemiş.');

  pipes.forEach((pipe, index) => {
    if (!Array.isArray(pipe.points) || pipe.points.length !== 4 || pipe.points.some((value) => !Number.isFinite(Number(value)))) {
      errors.push(`Boru ${pipe.id || index + 1} geçerli iki uç noktasına sahip değil.`);
      return;
    }
    const props = pipeProperties(pipe.data?.diameter);
    if (!props) errors.push(`Boru ${pipe.id || index + 1} için desteklenen bir çap seçilmemiş.`);
    if (number(pipe.data?.length) <= 0) errors.push(`Boru ${pipe.id || index + 1} uzunluğu sıfırdan büyük olmalıdır.`);
    const a = getNode({ x: pipe.points[0], y: pipe.points[1] });
    const b = getNode({ x: pipe.points[2], y: pipe.points[3] });
    const edge = { pipe, a, b, index };
    a.edges.push(edge);
    b.edges.push(edge);
  });

  sprinklers.forEach((sprinkler, index) => {
    if (!Number.isFinite(Number(sprinkler.x)) || !Number.isFinite(Number(sprinkler.y))) {
      errors.push(`Sprinkler ${sprinkler.id || index + 1} için konum tanımlanmamış.`);
      return;
    }
    const node = nodes.get(pointKey(sprinkler));
    if (!node) errors.push(`Sprinkler ${sprinkler.id || index + 1} bir boru ucuna bağlı değil.`);
    else node.sprinklers.push(sprinkler);
  });

  pumps.forEach((pump) => {
    const node = nodes.get(pointKey(pump));
    if (!node) errors.push('Pompa bir boru ucuna bağlı değil.');
    else if (node.pump) errors.push('Aynı düğümde birden fazla pompa bulunuyor.');
    else node.pump = pump;
  });

  const root = pumps.length === 1 ? nodes.get(pointKey(pumps[0])) : null;
  if (root) {
    const visitedNodes = new Set();
    const visitedEdges = new Set();
    const queue = [root];
    while (queue.length) {
      const node = queue.shift();
      if (visitedNodes.has(node.key)) continue;
      visitedNodes.add(node.key);
      node.edges.forEach((edge) => {
        visitedEdges.add(edge);
        const next = edge.a === node ? edge.b : edge.a;
        if (!visitedNodes.has(next.key)) queue.push(next);
      });
    }
    if (visitedEdges.size !== pipes.length || sprinklers.some((sprinkler) => !visitedNodes.has(pointKey(sprinkler)))) {
      errors.push('Tüm borular ve sprinklerler pompaya bağlı tek bir devre oluşturmalıdır.');
    }
    if (visitedEdges.size && visitedEdges.size !== visitedNodes.size - 1) {
      errors.push('Loop/grid devre algılandı. Bu ön hesap yalnızca ağaç tipi boru ağlarını destekler.');
    }
  }

  return { errors: [...new Set(errors)], pipes, sprinklers, root };
};

const orientTree = (root) => {
  const orderedNodes = [];
  const orientedEdges = [];
  root.parent = null;
  root.depth = 0;
  root.path = [];
  const queue = [root];
  const seen = new Set([root.key]);
  while (queue.length) {
    const parent = queue.shift();
    orderedNodes.push(parent);
    parent.edges.forEach((edge) => {
      const child = edge.a === parent ? edge.b : edge.a;
      if (seen.has(child.key)) return;
      seen.add(child.key);
      child.parent = parent;
      child.parentEdge = edge;
      child.depth = parent.depth + 1;
      child.path = [...parent.path, edge];
      edge.parent = parent;
      edge.child = child;
      edge.heightMetres = (number(edge.pipe.data?.height) / 100) * (edge.a === parent ? 1 : -1);
      orientedEdges.push(edge);
      queue.push(child);
    });
  }
  return { orderedNodes, orientedEdges };
};

const resistanceScore = (node, baseFlow, c) => node.path.reduce((score, edge) => {
  const props = pipeProperties(edge.pipe.data?.diameter);
  const length = number(edge.pipe.data?.length) / 100 + number(edge.pipe.data?.equivalentLength);
  return score + hazenWilliamsLoss({ length, flow: baseFlow, c, insideDiameter: props.inside }) + Math.max(0, edge.heightMetres * 0.0981);
}, 0);

const smallestSuitableDiameter = (flow) => {
  const requiredInside = Math.sqrt((4 * (flow / 60000)) / (Math.PI * 10)) * 1000;
  const suitable = Object.entries(PIPE_SIZES).find(([, props]) => props.inside >= requiredInside);
  return { requiredInside, nominal: suitable?.[0] || '>6"' };
};

const solveTree = ({ orderedNodes, orientedEdges, activeSprinklers, baseFlow, minimumPressure, kFactor, c }) => {
  const activeIds = new Set(activeSprinklers.map((sprinkler) => sprinkler.id));
  const demandById = new Map(activeSprinklers.map((sprinkler) => [sprinkler.id, baseFlow]));
  const edgeFlow = new Map();
  const edgeLoss = new Map();
  const nodePressure = new Map();
  let pumpPressure = minimumPressure;
  let converged = false;

  for (let iteration = 0; iteration < 80; iteration += 1) {
    const subtreeFlow = new Map();
    [...orderedNodes].sort((a, b) => b.depth - a.depth).forEach((node) => {
      const ownDemand = node.sprinklers.reduce((sum, sprinkler) => sum + (activeIds.has(sprinkler.id) ? demandById.get(sprinkler.id) : 0), 0);
      const childrenDemand = orientedEdges.filter((edge) => edge.parent === node).reduce((sum, edge) => sum + number(subtreeFlow.get(edge.child.key)), 0);
      subtreeFlow.set(node.key, ownDemand + childrenDemand);
      if (node.parentEdge) edgeFlow.set(node.parentEdge, ownDemand + childrenDemand);
    });

    orientedEdges.forEach((edge) => {
      const props = pipeProperties(edge.pipe.data?.diameter);
      const physicalLength = number(edge.pipe.data?.length) / 100;
      const equivalentLength = number(edge.pipe.data?.equivalentLength);
      const friction = hazenWilliamsLoss({ length: physicalLength + equivalentLength, flow: number(edgeFlow.get(edge)), c, insideDiameter: props.inside });
      const staticLoss = edge.heightMetres * 0.0981;
      edgeLoss.set(edge, { friction, staticLoss, total: friction + staticLoss });
    });

    pumpPressure = Math.max(0, ...activeSprinklers.map((sprinkler) => {
      const node = orderedNodes.find((item) => item.sprinklers.includes(sprinkler));
      return minimumPressure + node.path.reduce((sum, edge) => sum + edgeLoss.get(edge).total, 0);
    }));
    nodePressure.set(orderedNodes[0].key, pumpPressure);
    orderedNodes.slice(1).forEach((node) => {
      nodePressure.set(node.key, nodePressure.get(node.parent.key) - edgeLoss.get(node.parentEdge).total);
    });

    let maximumDifference = 0;
    activeSprinklers.forEach((sprinkler) => {
      const pressure = Math.max(0, nodePressure.get(pointKey(sprinkler)));
      const target = Math.max(baseFlow, kFactor * Math.sqrt(pressure));
      const previous = demandById.get(sprinkler.id);
      const next = previous * 0.55 + target * 0.45;
      maximumDifference = Math.max(maximumDifference, Math.abs(next - previous));
      demandById.set(sprinkler.id, next);
    });
    if (maximumDifference < 0.005) {
      converged = true;
      break;
    }
  }

  return { activeIds, demandById, edgeFlow, edgeLoss, nodePressure, pumpPressure, converged };
};

export const calculateProjectData = (project) => {
  const graph = validateAndBuildGraph(project);
  if (graph.errors.length) return { errors: graph.errors };

  const info = project.information || {};
  const density = number(info.tasarimYogunlugu);
  const coverage = number(info.sprinklerKorumaAlani);
  const kFactor = number(info.sprinklerFaktoru);
  const c = number(info.hazenWilliamsKatsayisi);
  const efficiency = number(info.pompaVerimi);
  const duration = number(info.sistemCalismaSuresi);
  const inputErrors = [];
  if (density <= 0) inputErrors.push('Tasarım yoğunluğu sıfırdan büyük olmalıdır.');
  if (coverage <= 0) inputErrors.push('Sprinkler koruma alanı sıfırdan büyük olmalıdır.');
  if (kFactor <= 0) inputErrors.push('Sprinkler K faktörü sıfırdan büyük olmalıdır.');
  if (c <= 0) inputErrors.push('Hazen–Williams C katsayısı sıfırdan büyük olmalıdır.');
  if (efficiency <= 0 || efficiency > 1) inputErrors.push('Pompa verimi 0 ile 1 arasında olmalıdır.');
  if (duration <= 0) inputErrors.push('Sistem çalışma süresi sıfırdan büyük olmalıdır.');
  if (!['Siyah çelik boru (ıslak veya baskın)', 'Siyah çelik boru (kuru veya ön etkili)', 'Galvaniz boru'].includes(info.boruMalzemesi)) {
    inputErrors.push('Seçilen boru malzemesi için gerçek iç çap tablosu tanımlı değil. Bu ön hesapta siyah çelik veya galvaniz boru seçin.');
  }
  if (inputErrors.length) return { errors: inputErrors };

  const { orderedNodes, orientedEdges } = orientTree(graph.root);
  const limits = HAZARD_LIMITS[hazardGroup(info.tehlikeSinifi)];
  const targetCount = Math.max(1, Math.ceil(number(info.uygulamaAlani) / coverage));
  const selectedCount = Math.min(targetCount, graph.sprinklers.length);
  const articleMinimumFlow = selectedCount === 1 ? 68 : 49;
  const densityFlow = density * coverage;
  const pressureFloorFlow = kFactor * Math.sqrt(limits.minimumPressure);
  const baseFlow = Math.max(densityFlow, pressureFloorFlow, articleMinimumFlow);
  const minimumPressure = Math.max(limits.minimumPressure, Math.pow(baseFlow / kFactor, 2));
  const ranked = [...graph.sprinklers].sort((a, b) => {
    const aNode = orderedNodes.find((node) => node.sprinklers.includes(a));
    const bNode = orderedNodes.find((node) => node.sprinklers.includes(b));
    return resistanceScore(bNode, baseFlow, c) - resistanceScore(aNode, baseFlow, c);
  });
  const activeSprinklers = ranked.slice(0, selectedCount);
  const solved = solveTree({ orderedNodes, orientedEdges, activeSprinklers, baseFlow, minimumPressure, kFactor, c });
  const warnings = [];

  if (graph.sprinklers.length < targetCount) warnings.push(`Operasyon alanı ${targetCount} sprinkler gerektiriyor; çizimde yalnızca ${graph.sprinklers.length} sprinkler bulundu.`);
  if (coverage > limits.maximumCoverage) warnings.push(`${limits.label} için bir sprinklerin koruma alanı ${limits.maximumCoverage} m² sınırını aşıyor.`);
  if (!solved.converged) warnings.push('Basınç/debi dengelemesi iterasyon sınırı içinde yakınsamadı; sonuçları kontrol edin.');
  warnings.push('Operasyon alanı, çizimdeki hidrolik dirence göre seçildi; mimari alan şekli ve engeller otomatik doğrulanamaz.');
  if (hazardGroup(info.tehlikeSinifi) === 'high') warnings.push('Yüksek tehlike ve depolama uygulamaları TS EN 12845 kapsamında ayrıca uzman doğrulaması gerektirir.');

  const activeEdges = orientedEdges.filter((edge) => number(solved.edgeFlow.get(edge)) > 0)
    .sort((a, b) => b.child.depth - a.child.depth || a.index - b.index);
  const rows = activeEdges.map((edge, index) => {
    const props = pipeProperties(edge.pipe.data?.diameter);
    const flow = solved.edgeFlow.get(edge);
    const losses = solved.edgeLoss.get(edge);
    const velocity = waterVelocity(flow, props.inside);
    const selection = smallestSuitableDiameter(flow);
    const hasValve = Object.entries(edge.pipe.data?.fittings || {}).some(([name, count]) => name.toLocaleLowerCase('tr-TR').includes('vana') && number(count) > 0);
    const speedLimit = hasValve ? 6 : 10;
    const status = velocity > speedLimit ? `Hız > ${speedLimit} m/s` : props.inside < selection.requiredInside ? 'Çap yetersiz' : 'Uygun';
    if (status !== 'Uygun') warnings.push(`Boru ${edge.pipe.id}: ${status}.`);
    return {
      order: index + 1,
      pipeId: edge.pipe.id,
      kind: edge.child.sprinklers.some((sprinkler) => solved.activeIds.has(sprinkler.id)) ? 'SPR' : 'BORU',
      flow,
      flowM3h: flow * 0.06,
      diameter: edge.pipe.data.diameter,
      nominalDiameter: props.nominal,
      insideDiameter: props.inside,
      physicalLength: number(edge.pipe.data?.length) / 100,
      equivalentLength: number(edge.pipe.data?.equivalentLength),
      totalLength: number(edge.pipe.data?.length) / 100 + number(edge.pipe.data?.equivalentLength),
      unitLoss: losses.friction / Math.max(0.0001, number(edge.pipe.data?.length) / 100 + number(edge.pipe.data?.equivalentLength)),
      frictionLoss: losses.friction,
      staticLoss: losses.staticLoss,
      inletPressure: solved.nodePressure.get(edge.parent.key),
      outletPressure: solved.nodePressure.get(edge.child.key),
      velocity,
      requiredInsideDiameter: selection.requiredInside,
      recommendedDiameter: selection.nominal,
      status,
    };
  });

  const sprinklerFlow = [...solved.demandById.values()].reduce((sum, value) => sum + value, 0);
  const cabinetFlow = info.yanginDolabiDahil ? number(info.ilaveYanginDolabiDebisi) : 0;
  const hydrantFlow = info.hidrantDahil ? number(info.ilaveHidrantDebisi) : 0;
  const additionalFlow = cabinetFlow + hydrantFlow;
  if (additionalFlow > 0) warnings.push('Yangın dolabı/hidrant debisi toplam talebe eklendi; bu sistemlerin ayrı basınç görev noktaları projede tanımlı olmadığı için pompa eğrisi ayrıca kontrol edilmelidir.');
  const totalFlow = sprinklerFlow + additionalFlow;
  const theoreticalPower = totalFlow * solved.pumpPressure / 600;
  const actualPower = theoreticalPower / efficiency;

  return {
    errors: [],
    projectName: project.name || 'Sprinkler Projesi',
    standard: 'BYKHY Ek-8/B ve tesisat.org hesap adımları',
    scope: 'Ağaç tipi sprinkler ağı ön hesabı',
    warnings: [...new Set(warnings)],
    activeSprinklers: activeSprinklers.map((sprinkler) => sprinkler.id),
    criteria: {
      hazard: info.tehlikeSinifi,
      system: info.korumaAlani,
      material: info.boruMalzemesi,
      operationArea: number(info.uygulamaAlani),
      density,
      coverage,
      targetCount,
      calculatedCount: selectedCount,
      kFactor,
      hazenWilliams: c,
      baseFlow,
      minimumPressure,
      cabinetIncluded: Boolean(info.yanginDolabiDahil),
      hydrantIncluded: Boolean(info.hidrantDahil),
      duration,
    },
    rows,
    sprinklerFlow,
    additionalFlow,
    pompaDebisi: totalFlow,
    pompaDebisiM3: totalFlow * 0.06,
    pompaBasinci: solved.pumpPressure,
    teorikPompaGucu: theoreticalPower,
    gercekPompaGucu: actualPower,
    depoHacmi: totalFlow * duration / 1000,
  };
};

export { PIPE_SIZES, HAZARD_LIMITS };
