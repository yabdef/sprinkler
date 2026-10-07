import { calculateProjectData, hazenWilliamsLoss } from './Calculate';

const information = {
  tehlikeSinifi: 'Orta Tehlike-2',
  korumaAlani: 'Islak veya Ön Etkili',
  boruMalzemesi: 'Siyah çelik boru (ıslak veya baskın)',
  sprinklerKorumaAlani: 12,
  sprinklerFaktoru: 80,
  pompaVerimi: 0.55,
  uygulamaAlani: 24,
  tasarimYogunlugu: 5,
  hazenWilliamsKatsayisi: 120,
  kritikAlanSprinklerSayisi: 2,
  ilaveYanginDolabiDebisi: 100,
  ilaveHidrantDebisi: 400,
  yanginDolabiDahil: false,
  hidrantDahil: false,
  sistemCalismaSuresi: 60,
};

const pipe = (id, points, length = 300) => ({ type: 'pipe', id, points, data: { diameter: '1"', length, height: 0, equivalentLength: 0, fittings: {} } });

test('ağaç tipi devrede kritik boru satırlarını ve pompa ön hesabını üretir', () => {
  const result = calculateProjectData({
    name: 'OH2 örneği',
    information,
    elements: [
      { type: 'pump', id: 'P', x: 0, y: 0 },
      pipe(1, [0, 0, 100, 0]),
      pipe(2, [100, 0, 200, 0]),
      { type: 'sprinkler', id: 'S1', x: 100, y: 0 },
      { type: 'sprinkler', id: 'S2', x: 200, y: 0 },
    ],
  });

  expect(result.errors).toEqual([]);
  expect(result.criteria.baseFlow).toBe(60);
  expect(result.criteria.minimumPressure).toBeCloseTo(0.5625, 4);
  expect(result.criteria.calculatedCount).toBe(2);
  expect(result.rows).toHaveLength(2);
  expect(result.rows.find((row) => row.pipeId === 1).flow).toBeGreaterThan(result.rows.find((row) => row.pipeId === 2).flow);
  expect(result.pompaBasinci).toBeGreaterThan(result.criteria.minimumPressure);
  expect(result.pompaDebisi).toBeCloseTo(result.sprinklerFlow, 6);
});

test('loop/grid ağı ön hesapta açık hata ile reddeder', () => {
  const result = calculateProjectData({
    information: { ...information, uygulamaAlani: 12 },
    elements: [
      { type: 'pump', id: 'P', x: 0, y: 0 },
      pipe(1, [0, 0, 100, 0]),
      pipe(2, [100, 0, 50, 100]),
      pipe(3, [50, 100, 0, 0]),
      { type: 'sprinkler', id: 'S1', x: 100, y: 0 },
    ],
  });

  expect(result.errors.join(' ')).toMatch(/Loop\/grid/);
});

test('Hazen–Williams kaybı debi ve uzunluk arttığında büyür', () => {
  const base = { length: 10, flow: 60, c: 120, insideDiameter: 27.2 };
  expect(hazenWilliamsLoss({ ...base, flow: 120 })).toBeGreaterThan(hazenWilliamsLoss(base));
  expect(hazenWilliamsLoss({ ...base, length: 20 })).toBeCloseTo(hazenWilliamsLoss(base) * 2, 8);
});
