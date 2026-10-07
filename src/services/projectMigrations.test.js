import { migrateProject, projectChecksum } from './projectMigrations';

test('v2 boru verisini şema 3 mutlak kot ve geometrik uzunluk modeline taşır', () => {
  const migrated = migrateProject({
    customId: '1',
    information: { boruMalzemesi: 'Siyah çelik boru (kuru veya ön etkili)' },
    elements: [{ type: 'pipe', id: 1, points: [0, 0, 300, 400], data: { diameter: '1"', length: 0, height: 250 } }],
  });
  expect(migrated.schemaVersion).toBe(3);
  expect(migrated.information.pipeProfile).toBe('STEEL_DRY');
  expect(migrated.elements[0].data.diameterMode).toBe('manual');
  expect(migrated.elements[0].data.length).toBe(500);
  expect(migrated.elements[0].data.startElevation).toBe(0);
  expect(migrated.elements[0].data.endElevation).toBe(250);
  expect(projectChecksum(migrated)).toMatch(/^[0-9a-f]{8}$/);
});
