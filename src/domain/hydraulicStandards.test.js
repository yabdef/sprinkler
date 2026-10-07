import { getDesignCriteria, getEquivalentLengthFactor } from './hydraulicStandards';

test.each([
  ['Düşük Tehlike', 'Islak veya Ön Etkili', 2.25, 84, 'Düşük Tehlike', true],
  ['Düşük Tehlike', 'Kuru veya Değişken', 5, 90, 'Orta Tehlike-1', true],
  ['Orta Tehlike-2', 'Islak veya Ön Etkili', 5, 144, 'Orta Tehlike-2', true],
  ['Orta Tehlike-2', 'Kuru veya Değişken', 5, 180, 'Orta Tehlike-2', true],
  ['Orta Tehlike-4', 'Kuru veya Değişken', 7.7, 325, 'Yüksek Tehlike-1', false],
  ['Yüksek Tehlike-1', 'Islak veya Ön Etkili', 7.7, 260, 'Yüksek Tehlike-1', false],
])('BYKHY profilini ve kuru sistem geçişini uygular: %s / %s', (hazard, system, density, area, effectiveHazard, supported) => {
  const result = getDesignCriteria({ tehlikeSinifi: hazard, korumaAlani: system });
  expect(result.density).toBe(density);
  expect(result.area).toBe(area);
  expect(result.effectiveHazard).toBe(effectiveHazard);
  expect(result.supported).toBe(supported);
});

test('C=120 tabanlı fitting eşdeğer uzunluğu için kaynak çarpanlarını döndürür', () => {
  expect(getEquivalentLengthFactor(100)).toBe(0.713);
  expect(getEquivalentLengthFactor(120)).toBe(1);
  expect(getEquivalentLengthFactor(150)).toBe(1.51);
});
