import {
  applyAutomaticPipeDiameters,
  elementMatchesSelection,
  getCommandSuggestions,
  normalizeSelectionBox,
} from './cadTools';
import { PIPE_PROFILES } from './hydraulicStandards';

test('Tab önerisi yazılan komuta en yakın komutu önce döndürür', () => {
  expect(getCommandSuggestions('bor')[0].name).toBe('BORU');
  expect(getCommandSuggestions('hesp')[0].name).toBe('HESAPLA');
  expect(getCommandSuggestions('e')[0].name).toBe('SİL');
});

test('soldan sağa yalnız içeride kalanları, sağdan sola kesişenleri seçer', () => {
  const pipe = { type: 'pipe', id: 1, points: [0, 20, 100, 20] };
  const windowBox = normalizeSelectionBox({ x: 10, y: 0 }, { x: 80, y: 40 });
  const crossingBox = normalizeSelectionBox({ x: 80, y: 0 }, { x: 10, y: 40 });
  expect(elementMatchesSelection(pipe, windowBox)).toBe(false);
  expect(elementMatchesSelection(pipe, crossingBox)).toBe(true);
});

test('otomatik çaplar pompadan uzağa doğru taşınan sprinkler sayısına göre büyür ve manuel çap korunur', () => {
  const elements = [
    { type: 'pump', id: 1, x: 0, y: 0 },
    { type: 'pipe', id: 1, points: [0, 0, 100, 0], data: { diameterMode: 'auto' } },
    { type: 'pipe', id: 2, points: [100, 0, 200, 0], data: { diameterMode: 'auto' } },
    { type: 'pipe', id: 3, points: [200, 0, 300, 0], data: { diameter: '3"', diameterMode: 'manual' } },
    { type: 'sprinkler', id: 1, x: 100, y: 0 },
    { type: 'sprinkler', id: 2, x: 200, y: 0 },
    { type: 'sprinkler', id: 3, x: 300, y: 0 },
  ];
  const sized = applyAutomaticPipeDiameters(elements, PIPE_PROFILES.STEEL_WET);
  expect(sized.find((item) => item.id === 1 && item.type === 'pipe').data.diameter).toBe('11/2"');
  expect(sized.find((item) => item.id === 2 && item.type === 'pipe').data.diameter).toBe('11/4"');
  expect(sized.find((item) => item.id === 3 && item.type === 'pipe').data.diameter).toBe('3"');
});
