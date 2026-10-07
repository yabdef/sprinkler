const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const idKey = (value) => String(value);

export const selectedGeometryIsContinuous = (selected, direction, maximumSpacing) => {
  if (selected.length <= 1) return true;
  const branchCoordinate = direction === 'vertical' ? 'x' : 'y';
  const alongCoordinate = direction === 'vertical' ? 'y' : 'x';
  const groups = new Map();
  selected.forEach((item) => {
    const key = number(item[branchCoordinate]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(number(item[alongCoordinate]));
  });
  const limit = maximumSpacing * 100 + 1;
  const branchKeys = [...groups.keys()].sort((a, b) => a - b);
  if (branchKeys.some((value, index) => index > 0 && value - branchKeys[index - 1] > limit)) return false;
  return [...groups.values()].every((values) => values.sort((a, b) => a - b)
    .every((value, index) => index === 0 || value - values[index - 1] <= limit));
};

export const buildOperationAreaCandidates = ({ sprinklers, targetCount, operationArea, direction, maximumSpacing, score }) => {
  if (targetCount === 1) return sprinklers.map((sprinkler) => ({
    sprinklers: [sprinkler],
    rectangle: { x: sprinkler.x, y: sprinkler.y, width: 0, height: 0 },
  }));
  const longSide = 1.2 * Math.sqrt(operationArea) * 100;
  const shortSide = operationArea * 10000 / longSide;
  const width = direction === 'vertical' ? shortSide : longSide;
  const height = direction === 'vertical' ? longSide : shortSide;
  const candidates = new Map();
  sprinklers.forEach((anchor) => {
    const startsX = [anchor.x, anchor.x - width, anchor.x - width / 2];
    const startsY = [anchor.y, anchor.y - height, anchor.y - height / 2];
    startsX.forEach((x) => startsY.forEach((y) => {
      const inside = sprinklers.filter((item) => item.x >= x - 1 && item.x <= x + width + 1 && item.y >= y - 1 && item.y <= y + height + 1);
      if (inside.length < targetCount) return;
      const selected = [...inside].sort((a, b) => score(b) - score(a)).slice(0, targetCount);
      if (!selectedGeometryIsContinuous(selected, direction, maximumSpacing)) return;
      const key = selected.map((item) => idKey(item.id)).sort().join('|');
      if (!candidates.has(key)) candidates.set(key, { sprinklers: selected, rectangle: { x, y, width, height } });
    }));
  });
  return [...candidates.values()];
};
