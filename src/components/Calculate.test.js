import { calculateProjectData, hazenWilliamsLoss } from '../domain/hydraulicCalculator';

const information = {
  standardProfile: 'BYKHY_2024_TS_EN_12845',
  tehlikeSinifi: 'Orta Tehlike-1',
  korumaAlani: 'Islak veya Ön Etkili',
  boruMalzemesi: 'Siyah çelik boru (ıslak veya baskın)',
  sprinklerKorumaAlani: 12,
  sprinklerFaktoru: 80,
  pompaVerimi: 0.55,
  uygulamaAlani: 72,
  tasarimYogunlugu: 5,
  hazenWilliamsKatsayisi: 120,
  kritikAlanSprinklerSayisi: 6,
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
      ...Array.from({ length: 6 }, (_, index) => pipe(index + 1, [index * 100, 0, (index + 1) * 100, 0])),
      ...Array.from({ length: 6 }, (_, index) => ({ type: 'sprinkler', id: `S${index + 1}`, x: (index + 1) * 100, y: 0 })),
    ],
  });

  expect(result.errors).toEqual([]);
  expect(result.criteria.baseFlow).toBe(60);
  expect(result.criteria.minimumPressure).toBeCloseTo(0.5625, 4);
  expect(result.criteria.calculatedCount).toBe(6);
  expect(result.rows).toHaveLength(6);
  expect(result.rows.find((row) => row.pipeId === 1).flow).toBeGreaterThan(result.rows.find((row) => row.pipeId === 2).flow);
  expect(result.pompaBasinci).toBeGreaterThan(result.criteria.minimumPressure);
  expect(result.pompaDebisi).toBeCloseTo(result.sprinklerFlow, 6);
});

test('loop/grid ağı ön hesapta açık hata ile reddeder', () => {
  const result = calculateProjectData({
    information,
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

test('eksik operasyon alanında yanıltıcı pompa sonucu üretmez', () => {
  const result = calculateProjectData({
    information,
    elements: [
      { type: 'pump', id: 'P', x: 0, y: 0 },
      pipe(1, [0, 0, 100, 0]),
      { type: 'sprinkler', id: 'S1', x: 100, y: 0 },
    ],
  });
  expect(result.errors.join(' ')).toMatch(/6 sprinkler gerektiriyor/);
  expect(result.pompaDebisi).toBeUndefined();
});

test('düşük tehlike kuru sistemi OH1 tasarım ve basınç profiline geçirir', () => {
  const dryInformation = { ...information, tehlikeSinifi: 'Düşük Tehlike', korumaAlani: 'Kuru veya Değişken', uygulamaAlani: 90, tasarimYogunlugu: 5, sprinklerKorumaAlani: 12 };
  const elements = [
    { type: 'pump', id: 'P', x: 0, y: 0 },
    ...Array.from({ length: 8 }, (_, index) => pipe(index + 1, [index * 100, 0, (index + 1) * 100, 0])),
    ...Array.from({ length: 8 }, (_, index) => ({ type: 'sprinkler', id: `S${index + 1}`, x: (index + 1) * 100, y: 0 })),
  ];
  const result = calculateProjectData({ information: dryInformation, elements });
  expect(result.errors).toEqual([]);
  expect(result.criteria.effectiveHazard).toBe('Orta Tehlike-1');
  expect(result.criteria.maximumCoverage).toBe(12);
  expect(result.criteria.minimumPressure).toBeCloseTo(0.5625, 4);
});

test('OH4 kuru ve yüksek tehlike hesaplarını uzman tasarımına yönlendirir', () => {
  const result = calculateProjectData({
    information: { ...information, tehlikeSinifi: 'Orta Tehlike-4', korumaAlani: 'Kuru veya Değişken', uygulamaAlani: 325, tasarimYogunlugu: 7.7 },
    elements: [{ type: 'pump', id: 'P', x: 0, y: 0 }, pipe(1, [0, 0, 100, 0]), { type: 'sprinkler', id: 'S1', x: 100, y: 0 }],
  });
  expect(result.errors.join(' ')).toMatch(/Yüksek tehlike/);
});

test('azami sprinkler aralığını aşan dağınık alanı reddeder', () => {
  const elements = [
    { type: 'pump', id: 'P', x: 0, y: 0 },
    ...Array.from({ length: 6 }, (_, index) => pipe(index + 1, [index * 500, 0, (index + 1) * 500, 0], 500)),
    ...Array.from({ length: 6 }, (_, index) => ({ type: 'sprinkler', id: `S${index + 1}`, x: (index + 1) * 500, y: 0 })),
  ];
  const result = calculateProjectData({ information, elements });
  expect(result.errors.join(' ')).toMatch(/sürekli bir operasyon alanı/);
});

test('Hazen–Williams kaybı debi ve uzunluk arttığında büyür', () => {
  const base = { length: 10, flow: 60, c: 120, insideDiameter: 27.2 };
  expect(hazenWilliamsLoss(base)).toBeCloseTo(0.173180632, 8);
  expect(hazenWilliamsLoss({ ...base, flow: 120 })).toBeGreaterThan(hazenWilliamsLoss(base));
  expect(hazenWilliamsLoss({ ...base, length: 20 })).toBeCloseTo(hazenWilliamsLoss(base) * 2, 8);
});
