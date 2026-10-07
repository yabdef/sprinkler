import { createCalculationWorkbook } from './calculationWorkbook';

test('hesap föyünü iki sayfalı gerçek bir xlsx çalışma kitabına dönüştürür', async () => {
  const result = {
    projectName: 'Deneme', standard: 'BYKHY Ek-8/B', standardRevision: 'Kılavuz Aralık 2024', calculationEngineVersion: '3.0.0', sourceUrl: 'https://example.test/guide.pdf', scope: 'Ağaç tipi ön hesap', warnings: ['Kontrol notu'],
    criteria: { hazard: 'Orta Tehlike-2', effectiveHazard: 'Orta Tehlike-2', system: 'Islak', operationArea: 144, density: 5, coverage: 12, calculatedCount: 12, targetCount: 12, kFactor: 80, baseFlow: 60, minimumPressure: 0.5625, hazenWilliams: 120, equivalentCorrectionFactor: 1 },
    rows: [{ order: 1, pipeId: 1, kind: 'SPR', flow: 60, flowM3h: 3.6, diameter: '1"', insideDiameter: 27.2, physicalLength: 3, equivalentLength: 0.6, totalLength: 3.6, unitLoss: 0.01, frictionLoss: 0.036, staticLoss: 0, inletPressure: 0.6, outletPressure: 0.564, velocity: 1.7, status: 'Uygun' }],
    sprinklerRows: [{ id: 1, active: true, x: 100, y: 0, elevation: 0, flow: 60, pressure: 0.5625, pathLoss: 1.5375 }],
    dutyPoints: [{ key: 'sprinkler', label: 'Sprinkler sistemi', flow: 720, pressure: 2.1, source: 'Hidrolik hesap' }],
    pumpSelection: { status: 'Pompa eğrisi girilmedi', checks: [] },
    sprinklerFlow: 720, additionalFlow: 0, waterSupplyFlow: 720, waterSupplyFlowM3: 43.2, pompaDebisi: 720, pompaDebisiM3: 43.2, pompaBasinci: 2.1, teorikPompaGucu: 2.52, gercekPompaGucu: 4.58, depoHacmi: 43.2,
  };
  const workbook = createCalculationWorkbook(result);
  const buffer = await workbook.xlsx.writeBuffer();

  expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Hesap Föyü', 'Sprinkler Sonuçları', 'Pompa Görevleri', 'Uyarılar ve Esaslar']);
  expect(workbook.getWorksheet('Hesap Föyü').getCell('A2').value).toContain('DENEME');
  expect(buffer.byteLength).toBeGreaterThan(5000);
});
