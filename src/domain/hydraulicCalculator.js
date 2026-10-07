import {
  CALCULATION_ENGINE_VERSION,
  DEFAULT_STANDARD_PROFILE,
  HAZARD_LIMITS,
  PIPE_SIZES,
  getDesignCriteria,
  getEquivalentLengthFactor,
  getPipeProfile,
} from './hydraulicStandards';
import { buildOperationAreaCandidates } from './operationArea';

const pointKey = (point) => `${Number(point.x)},${Number(point.y)}`;
const idKey = (value) => String(value);
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const isNumber = (value) => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));

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

const validateAndBuildGraph = (project, pipeProfile) => {
  const errors = [];
  const elements = Array.isArray(project?.elements) ? project.elements : [];
  const pipes = elements.filter((element) => element.type === 'pipe');
  const sprinklers = elements.filter((element) => element.type === 'sprinkler');
  const pumps = elements.filter((element) => element.type === 'pump');
  const nodes = new Map();
  const getNode = (point) => {
    const key = pointKey(point);
    if (!nodes.has(key)) nodes.set(key, { key, point, edges: [], sprinklers: [], pump: null, elevation: null });
    return nodes.get(key);
  };
  const assignElevation = (node, elevation, source) => {
    if (!isNumber(elevation)) return;
    const next = number(elevation);
    if (node.elevation !== null && Math.abs(node.elevation - next) > 1) errors.push(`${source} kotu aynı düğümdeki diğer kotlarla uyuşmuyor.`);
    else node.elevation = next;
  };

  if (pumps.length !== 1) errors.push(pumps.length ? 'Hidrolik hesap için yalnızca bir su besleme/pompa düğümü bulunmalıdır.' : 'Su besleme/pompa düğümü eklenmemiş.');
  if (!pipes.length) errors.push('Hesaplanacak boru bulunamadı.');
  if (!sprinklers.length) errors.push('Sprinkler eklenmemiş.');
  pipes.forEach((pipe, index) => {
    if (!Array.isArray(pipe.points) || pipe.points.length !== 4 || pipe.points.some((value) => !Number.isFinite(Number(value)))) {
      errors.push(`Boru ${pipe.id || index + 1} geçerli iki uç noktasına sahip değil.`);
      return;
    }
    if (!pipeProfile.sizes[pipe.data?.diameter]) errors.push(`Boru ${pipe.id || index + 1} çapı ${pipeProfile.label} profilinde bulunmuyor.`);
    if (number(pipe.data?.length) <= 0) errors.push(`Boru ${pipe.id || index + 1} uzunluğu sıfırdan büyük olmalıdır.`);
    const a = getNode({ x: pipe.points[0], y: pipe.points[1] });
    const b = getNode({ x: pipe.points[2], y: pipe.points[3] });
    if (pipe.data?.elevationMode !== 'difference') {
      assignElevation(a, pipe.data?.startElevation, `Boru ${pipe.id || index + 1} başlangıç`);
      assignElevation(b, pipe.data?.endElevation, `Boru ${pipe.id || index + 1} bitiş`);
    }
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
    else {
      node.sprinklers.push(sprinkler);
      assignElevation(node, sprinkler.data?.elevation, `Sprinkler ${sprinkler.id || index + 1}`);
    }
  });
  pumps.forEach((pump) => {
    const node = nodes.get(pointKey(pump));
    if (!node) errors.push('Su besleme/pompa düğümü bir boru ucuna bağlı değil.');
    else if (node.pump) errors.push('Aynı düğümde birden fazla pompa bulunuyor.');
    else {
      node.pump = pump;
      assignElevation(node, pump.data?.elevation, 'Pompa');
    }
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
    if (visitedEdges.size !== pipes.length || sprinklers.some((sprinkler) => !visitedNodes.has(pointKey(sprinkler)))) errors.push('Tüm borular ve sprinklerler pompaya bağlı tek bir devre oluşturmalıdır.');
    if (visitedEdges.size && visitedEdges.size !== visitedNodes.size - 1) errors.push('Loop/grid devre algılandı. Bu hesap motoru yalnızca ağaç tipi boru ağlarını destekler.');
  }
  return { errors: [...new Set(errors)], pipes, sprinklers, root };
};

const orientTree = (root) => {
  const orderedNodes = [];
  const orientedEdges = [];
  root.parent = null;
  root.depth = 0;
  root.path = [];
  if (root.elevation === null) root.elevation = 0;
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
      const parentIsStart = edge.a === parent;
      if (edge.pipe.data?.elevationMode !== 'difference' && isNumber(edge.pipe.data?.startElevation) && isNumber(edge.pipe.data?.endElevation)) {
        const start = number(edge.pipe.data.startElevation);
        const end = number(edge.pipe.data.endElevation);
        edge.heightMetres = (parentIsStart ? end - start : start - end) / 100;
        child.elevation = parentIsStart ? end : start;
      } else {
        edge.heightMetres = (number(edge.pipe.data?.height) / 100) * (parentIsStart ? 1 : -1);
        if (child.elevation === null) child.elevation = parent.elevation + edge.heightMetres * 100;
      }
      orientedEdges.push(edge);
      queue.push(child);
    });
  }
  return { orderedNodes, orientedEdges };
};

const correctedEquivalentLength = (edge, c) => number(edge.pipe.data?.equivalentLength) * getEquivalentLengthFactor(c);
const resistanceScore = (node, baseFlow, c, pipeProfile) => node.path.reduce((score, edge) => {
  const props = pipeProfile.sizes[edge.pipe.data?.diameter];
  const length = number(edge.pipe.data?.length) / 100 + correctedEquivalentLength(edge, c);
  return score + hazenWilliamsLoss({ length, flow: baseFlow, c, insideDiameter: props.inside }) + Math.max(0, edge.heightMetres * 0.0981);
}, 0);

const smallestSuitableDiameter = (flow, pipeProfile) => {
  const requiredInside = Math.sqrt((4 * (flow / 60000)) / (Math.PI * 10)) * 1000;
  const suitable = Object.entries(pipeProfile.sizes).find(([, props]) => props.inside >= requiredInside);
  return { requiredInside, nominal: suitable?.[0] || `>${Object.keys(pipeProfile.sizes).at(-1)}` };
};

const solveTree = ({ orderedNodes, orientedEdges, activeSprinklers, baseFlow, minimumPressure, kFactor, c, pipeProfile }) => {
  const activeIds = new Set(activeSprinklers.map((sprinkler) => idKey(sprinkler.id)));
  const demandById = new Map(activeSprinklers.map((sprinkler) => [idKey(sprinkler.id), baseFlow]));
  const edgeFlow = new Map();
  const edgeLoss = new Map();
  const nodePressure = new Map();
  const children = new Map(orderedNodes.map((node) => [node.key, []]));
  const sprinklerNode = new Map();
  orientedEdges.forEach((edge) => children.get(edge.parent.key).push(edge));
  orderedNodes.forEach((node) => node.sprinklers.forEach((sprinkler) => sprinklerNode.set(idKey(sprinkler.id), node)));
  const descendingNodes = [...orderedNodes].sort((a, b) => b.depth - a.depth);
  let pumpPressure = minimumPressure;
  let converged = false;
  const recompute = () => {
    const subtreeFlow = new Map();
    descendingNodes.forEach((node) => {
      const own = node.sprinklers.reduce((sum, sprinkler) => sum + (activeIds.has(idKey(sprinkler.id)) ? number(demandById.get(idKey(sprinkler.id))) : 0), 0);
      const childFlow = children.get(node.key).reduce((sum, edge) => sum + number(subtreeFlow.get(edge.child.key)), 0);
      subtreeFlow.set(node.key, own + childFlow);
      if (node.parentEdge) edgeFlow.set(node.parentEdge, own + childFlow);
    });
    orientedEdges.forEach((edge) => {
      const props = pipeProfile.sizes[edge.pipe.data?.diameter];
      const physicalLength = number(edge.pipe.data?.length) / 100;
      const equivalentLength = correctedEquivalentLength(edge, c);
      const friction = hazenWilliamsLoss({ length: physicalLength + equivalentLength, flow: number(edgeFlow.get(edge)), c, insideDiameter: props.inside });
      const staticLoss = edge.heightMetres * 0.0981;
      edgeLoss.set(edge, { friction, staticLoss, total: friction + staticLoss });
    });
    pumpPressure = Math.max(0, ...activeSprinklers.map((sprinkler) => minimumPressure + sprinklerNode.get(idKey(sprinkler.id)).path.reduce((sum, edge) => sum + edgeLoss.get(edge).total, 0)));
    nodePressure.set(orderedNodes[0].key, pumpPressure);
    orderedNodes.slice(1).forEach((node) => nodePressure.set(node.key, nodePressure.get(node.parent.key) - edgeLoss.get(node.parentEdge).total));
  };
  for (let iteration = 0; iteration < 100; iteration += 1) {
    recompute();
    let maximumDifference = 0;
    activeSprinklers.forEach((sprinkler) => {
      const pressure = Math.max(0, number(nodePressure.get(pointKey(sprinkler))));
      const target = Math.max(baseFlow, kFactor * Math.sqrt(pressure));
      const previous = demandById.get(idKey(sprinkler.id));
      const next = previous * 0.55 + target * 0.45;
      maximumDifference = Math.max(maximumDifference, Math.abs(next - previous));
      demandById.set(idKey(sprinkler.id), next);
    });
    if (maximumDifference < 0.001) { converged = true; break; }
  }
  recompute();
  return { activeIds, demandById, edgeFlow, edgeLoss, nodePressure, pumpPressure, converged, sprinklerNode };
};

const pumpPressureAt = (flow, curve) => {
  if (flow < 0 || flow > curve.ratedFlow * 1.5) return null;
  if (flow <= curve.ratedFlow) return curve.shutoffPressure + (curve.ratedPressure - curve.shutoffPressure) * flow / curve.ratedFlow;
  return curve.ratedPressure + (curve.pressureAt150 - curve.ratedPressure) * ((flow / curve.ratedFlow) - 1) / 0.5;
};

const buildPumpSelection = (information, dutyPoints) => {
  const curve = {
    ratedFlow: number(information.pompaAnmaDebisi),
    ratedPressure: number(information.pompaAnmaBasinci),
    shutoffPressure: number(information.pompaKapaliVanaBasinci),
    pressureAt150: number(information.pompaYuzde150Basinci),
  };
  if (!Object.values(curve).every((value) => value > 0)) return { entered: false, status: 'Pompa eğrisi girilmedi', checks: [], curve };
  const checks = [
    { label: 'Kapalı vana basıncı ≤ %140 anma basıncı', passed: curve.shutoffPressure <= curve.ratedPressure * 1.4 + 1e-9 },
    { label: '%150 debide basınç ≥ %65 anma basıncı', passed: curve.pressureAt150 >= curve.ratedPressure * 0.65 - 1e-9 },
    ...dutyPoints.filter((point) => point.pressure > 0).map((point) => {
      const available = pumpPressureAt(point.flow, curve);
      return { label: `${point.label} görev noktası`, passed: available !== null && available >= point.pressure, requiredFlow: point.flow, requiredPressure: point.pressure, availablePressure: available };
    }),
  ];
  return { entered: true, status: checks.every((item) => item.passed) ? 'Uygun' : 'Uygun değil', checks, curve };
};

export const calculateProjectData = (project) => {
  const info = project?.information || {};
  const design = getDesignCriteria(info);
  const pipeProfile = getPipeProfile(info);
  const graph = validateAndBuildGraph(project, pipeProfile);
  if (graph.errors.length) return { errors: graph.errors };
  const density = number(info.tasarimYogunlugu, design.density);
  const coverage = number(info.sprinklerKorumaAlani);
  const kFactor = number(info.sprinklerFaktoru);
  const c = number(info.hazenWilliamsKatsayisi, pipeProfile.c);
  const efficiency = number(info.pompaVerimi);
  const duration = number(info.sistemCalismaSuresi, design.duration);
  const inputErrors = [];
  if (!design.supported) inputErrors.push('Yüksek tehlike, depolama, raf içi, ESFR ve CMSA sistemleri bu hesap motorunda desteklenmez; TS EN 12845 kapsamındaki uzman hidrolik tasarım kullanılmalıdır.');
  if (Math.abs(density - design.density) > 0.001 || Math.abs(number(info.uygulamaAlani, design.area) - design.area) > 0.001) inputErrors.push('Projedeki yoğunluk veya operasyon alanı seçilen BYKHY profiliyle uyuşmuyor. Proje ayarlarını yeniden kaydedin.');
  if (density <= 0) inputErrors.push('Tasarım yoğunluğu sıfırdan büyük olmalıdır.');
  if (coverage <= 0) inputErrors.push('Sprinkler koruma alanı sıfırdan büyük olmalıdır.');
  if (coverage > design.limits.maximumCoverage) inputErrors.push(`${design.limits.label} için ${coverage} m² sprinkler koruma alanı, ${design.limits.maximumCoverage} m² sınırını aşıyor.`);
  if (kFactor <= 0) inputErrors.push('Sprinkler K faktörü sıfırdan büyük olmalıdır.');
  if (c <= 0) inputErrors.push('Hazen–Williams C katsayısı sıfırdan büyük olmalıdır.');
  if (efficiency <= 0 || efficiency > 1) inputErrors.push('Pompa verimi 0 ile 1 arasında olmalıdır.');
  if (duration <= 0) inputErrors.push('Sistem çalışma süresi sıfırdan büyük olmalıdır.');
  if (inputErrors.length) return { errors: [...new Set(inputErrors)] };

  const { orderedNodes, orientedEdges } = orientTree(graph.root);
  const targetCount = Math.max(1, Math.ceil(design.area / coverage));
  if (graph.sprinklers.length < targetCount) return { errors: [`BYKHY operasyon alanı ${targetCount} sprinkler gerektiriyor; çizimde yalnızca ${graph.sprinklers.length} sprinkler var. Hesap üretilmedi.`] };
  const baseFlow = density * coverage;
  const minimumPressure = Math.max(design.limits.minimumPressure, Math.pow(baseFlow / kFactor, 2));
  const nodeBySprinkler = new Map();
  orderedNodes.forEach((node) => node.sprinklers.forEach((sprinkler) => nodeBySprinkler.set(idKey(sprinkler.id), node)));
  const score = (sprinkler) => resistanceScore(nodeBySprinkler.get(idKey(sprinkler.id)), baseFlow, c, pipeProfile);
  const branchDirection = info.branchDirection === 'vertical' ? 'vertical' : 'horizontal';
  const candidates = buildOperationAreaCandidates({ sprinklers: graph.sprinklers, targetCount, operationArea: design.area, direction: branchDirection, maximumSpacing: design.limits.maximumSpacing, score });
  if (!candidates.length) return { errors: [`${targetCount} sprinkler içeren, ${branchDirection === 'horizontal' ? 'yatay' : 'dikey'} branşman yönünde sürekli bir operasyon alanı oluşturulamadı. Sprinkler aralıklarını ve branşman yönünü kontrol edin.`] };
  let critical = null;
  candidates.forEach((candidate) => {
    const solution = solveTree({ orderedNodes, orientedEdges, activeSprinklers: candidate.sprinklers, baseFlow, minimumPressure, kFactor, c, pipeProfile });
    if (!critical || solution.pumpPressure > critical.solution.pumpPressure) critical = { ...candidate, solution };
  });
  const activeSprinklers = critical.sprinklers;
  const solved = critical.solution;
  const warnings = [];
  if (!solved.converged) warnings.push('Basınç/debi dengelemesi iterasyon sınırı içinde yakınsamadı; sonuçlar kullanılmamalıdır.');
  warnings.push('Duvar mesafeleri, tavan engelleri, sprinkler sıcaklık sınıfı ve mimari yangın bölmeleri çizim modelinde bulunmadığı için ayrıca doğrulanmalıdır.');

  const activeEdges = orientedEdges.filter((edge) => number(solved.edgeFlow.get(edge)) > 0)
    .sort((a, b) => b.child.depth - a.child.depth || a.index - b.index);
  const rows = activeEdges.map((edge, index) => {
    const props = pipeProfile.sizes[edge.pipe.data?.diameter];
    const flow = solved.edgeFlow.get(edge);
    const losses = solved.edgeLoss.get(edge);
    const velocity = waterVelocity(flow, props.inside);
    const selection = smallestSuitableDiameter(flow, pipeProfile);
    const hasValve = Object.entries(edge.pipe.data?.fittings || {}).some(([name, count]) => name.toLocaleLowerCase('tr-TR').includes('vana') && number(count) > 0);
    const speedLimit = hasValve ? 6 : 10;
    const status = velocity > speedLimit ? `Hız > ${speedLimit} m/s` : props.inside < selection.requiredInside ? 'Çap yetersiz' : 'Uygun';
    if (status !== 'Uygun') warnings.push(`Boru ${edge.pipe.id}: ${status}.`);
    const rawEquivalentLength = number(edge.pipe.data?.equivalentLength);
    const equivalentLength = correctedEquivalentLength(edge, c);
    return { order: index + 1, pipeId: edge.pipe.id, kind: edge.child.sprinklers.some((sprinkler) => solved.activeIds.has(idKey(sprinkler.id))) ? 'SPR' : 'BORU', flow, flowM3h: flow * 0.06, diameter: edge.pipe.data.diameter, nominalDiameter: props.nominal, insideDiameter: props.inside, physicalLength: number(edge.pipe.data?.length) / 100, rawEquivalentLength, equivalentCorrectionFactor: getEquivalentLengthFactor(c), equivalentLength, totalLength: number(edge.pipe.data?.length) / 100 + equivalentLength, unitLoss: losses.friction / Math.max(0.0001, number(edge.pipe.data?.length) / 100 + equivalentLength), frictionLoss: losses.friction, staticLoss: losses.staticLoss, elevationChange: edge.heightMetres, inletPressure: solved.nodePressure.get(edge.parent.key), outletPressure: solved.nodePressure.get(edge.child.key), velocity, requiredInsideDiameter: selection.requiredInside, recommendedDiameter: selection.nominal, status };
  });
  const sprinklerRows = graph.sprinklers.map((sprinkler) => {
    const active = solved.activeIds.has(idKey(sprinkler.id));
    const node = nodeBySprinkler.get(idKey(sprinkler.id));
    const pressure = active ? solved.nodePressure.get(node.key) : null;
    return { id: sprinkler.id, active, x: sprinkler.x, y: sprinkler.y, elevation: number(node.elevation) / 100, pressure, flow: active ? solved.demandById.get(idKey(sprinkler.id)) : 0, pathLoss: active ? solved.pumpPressure - pressure : null };
  }).sort((a, b) => Number(b.active) - Number(a.active) || number(a.id) - number(b.id));

  const sprinklerFlow = [...solved.demandById.values()].reduce((sum, value) => sum + value, 0);
  const cabinetFlow = info.yanginDolabiDahil ? design.cabinet : 0;
  const hydrantFlow = info.hidrantDahil ? design.hydrant : 0;
  const additionalFlow = cabinetFlow + hydrantFlow;
  const totalFlow = sprinklerFlow + additionalFlow;
  const dutyPoints = [{ key: 'sprinkler', label: 'Sprinkler sistemi', flow: sprinklerFlow, pressure: solved.pumpPressure, source: 'Hidrolik hesap' }];
  if (cabinetFlow > 0) dutyPoints.push({ key: 'cabinet', label: 'Yangın dolabı', flow: cabinetFlow, pressure: number(info.yanginDolabiGorevBasinci), source: 'Kullanıcı görev basıncı' });
  if (hydrantFlow > 0) dutyPoints.push({ key: 'hydrant', label: 'Hidrant', flow: hydrantFlow, pressure: number(info.hidrantGorevBasinci), source: 'Kullanıcı görev basıncı' });
  if (dutyPoints.some((point) => point.key !== 'sprinkler' && point.pressure <= 0)) warnings.push('Yangın dolabı/hidrant görev basıncı girilmedi; ilave debi depo hesabına katıldı, pompa uygunluğu bu görev noktaları için doğrulanamadı.');
  const pumpSelection = buildPumpSelection(info, dutyPoints);
  if (pumpSelection.entered && pumpSelection.status !== 'Uygun') warnings.push('Girilen pompa eğrisi mevzuat karakteristiğini veya görev noktalarından en az birini karşılamıyor.');
  const pumpDutyPressure = Math.max(solved.pumpPressure, ...dutyPoints.map((point) => number(point.pressure)));
  const theoreticalPower = totalFlow * pumpDutyPressure / 600;
  const actualPower = theoreticalPower / efficiency;
  return {
    errors: [], projectName: project.name || 'Sprinkler Projesi', standard: design.standard.label, standardProfile: design.standard.id || DEFAULT_STANDARD_PROFILE, standardRevision: design.standard.revision, sourceUrl: design.standard.sourceUrl, calculationEngineVersion: CALCULATION_ENGINE_VERSION, scope: 'Ağaç tipi sprinkler ağı hidrolik ön hesabı', warnings: [...new Set(warnings)], activeSprinklers: activeSprinklers.map((sprinkler) => sprinkler.id), activePipeIds: rows.map((row) => row.pipeId), operationRectangle: critical.rectangle,
    criteria: { hazard: design.originalHazard, effectiveHazard: design.effectiveHazard, system: info.korumaAlani, material: pipeProfile.material, pipeSeries: pipeProfile.series, operationArea: design.area, density, coverage, maximumCoverage: design.limits.maximumCoverage, maximumSpacing: design.limits.maximumSpacing, branchDirection, targetCount, calculatedCount: activeSprinklers.length, kFactor, hazenWilliams: c, equivalentCorrectionFactor: getEquivalentLengthFactor(c), baseFlow, minimumPressure, cabinetIncluded: Boolean(info.yanginDolabiDahil), hydrantIncluded: Boolean(info.hidrantDahil), duration },
    rows, sprinklerRows, dutyPoints, pumpSelection, sprinklerFlow, additionalFlow, waterSupplyFlow: totalFlow, waterSupplyFlowM3: totalFlow * 0.06, pompaDebisi: totalFlow, pompaDebisiM3: totalFlow * 0.06, pompaBasinci: solved.pumpPressure, pompaGorevBasinci: pumpDutyPressure, teorikPompaGucu: theoreticalPower, gercekPompaGucu: actualPower, depoHacmi: totalFlow * duration / 1000,
  };
};

export { PIPE_SIZES, HAZARD_LIMITS };
