export const PROJECT_SCHEMA_VERSION = 3;
export const CALCULATION_ENGINE_VERSION = '3.0.0';
export const DEFAULT_STANDARD_PROFILE = 'BYKHY_2024_TS_EN_12845';

export const OFFICIAL_GUIDE_URL = 'https://webdosya.csb.gov.tr/v2/meslekihizmetler/2026/05/Binalar-n-Yang-n-Korunmas-Hakk-nda-Y-netmelik-K-lavuzu-20260507112134.pdf';

const steelSizes = {
  '1"': { nominal: 25, outside: 33.7, inside: 27.2 },
  '11/4"': { nominal: 32, outside: 42.4, inside: 35.9 },
  '11/2"': { nominal: 40, outside: 48.3, inside: 41.8 },
  '2"': { nominal: 50, outside: 60.3, inside: 53.0 },
  '21/2"': { nominal: 65, outside: 76.1, inside: 68.8 },
  '3"': { nominal: 80, outside: 88.9, inside: 80.8 },
  '4"': { nominal: 100, outside: 114.3, inside: 105.3 },
  '5"': { nominal: 125, outside: 139.7, inside: 129.7 },
  '6"': { nominal: 150, outside: 165.1, inside: 155.1 },
  '8"': { nominal: 200, outside: 219.1, inside: 207.1 },
  '10"': { nominal: 250, outside: 273.0, inside: 260.4 },
  '12"': { nominal: 300, outside: 323.9, inside: 309.7 },
};

const pe100Pn16Sizes = {
  '2"': { nominal: 50, outside: 63, inside: 51.4 },
  '21/2"': { nominal: 65, outside: 75, inside: 61.4 },
  '3"': { nominal: 80, outside: 90, inside: 73.6 },
  '4"': { nominal: 100, outside: 110, inside: 90.0 },
  '5"': { nominal: 125, outside: 160, inside: 130.8 },
  '6"': { nominal: 150, outside: 180, inside: 147.2 },
  '8"': { nominal: 200, outside: 200, inside: 163.6 },
};

export const PIPE_PROFILES = {
  STEEL_WET: { id: 'STEEL_WET', label: 'Siyah çelik — ıslak/baskın', material: 'Siyah çelik boru (ıslak veya baskın)', series: 'Kaynak Tablo 11', c: 120, minimumDiameter: '1"', sizes: steelSizes },
  STEEL_DRY: { id: 'STEEL_DRY', label: 'Siyah çelik — kuru/ön etkili', material: 'Siyah çelik boru (kuru veya ön etkili)', series: 'Kaynak Tablo 11', c: 100, minimumDiameter: '1"', sizes: steelSizes },
  GALVANIZED: { id: 'GALVANIZED', label: 'Galvaniz çelik', material: 'Galvaniz boru', series: 'Kaynak Tablo 11', c: 120, minimumDiameter: '1"', sizes: steelSizes },
  PE100_PN16: { id: 'PE100_PN16', label: 'PE100 PN16', material: 'PE100', series: 'Kaynak Tablo 12', c: 150, minimumDiameter: '2"', sizes: pe100Pn16Sizes },
};

export const C_EQUIVALENT_LENGTH_FACTORS = { 100: 0.713, 120: 1, 130: 1.16, 140: 1.33, 150: 1.51 };

const hazardLimits = {
  low: { label: 'Düşük tehlike', minimumPressure: 0.7, maximumCoverage: 21, maximumSpacing: 4.6 },
  ordinary: { label: 'Orta tehlike', minimumPressure: 0.35, maximumCoverage: 12, maximumSpacing: 4.0 },
  high: { label: 'Yüksek tehlike', minimumPressure: 0.5, maximumCoverage: 9, maximumSpacing: 3.7 },
};

const hazards = {
  'Düşük Tehlike': { wet: { area: 84, density: 2.25, group: 'low' }, dry: { area: 90, density: 5, group: 'ordinary', effectiveHazard: 'Orta Tehlike-1' }, cabinet: 100, hydrant: 400, duration: 30, supported: true },
  'Orta Tehlike-1': { wet: { area: 72, density: 5, group: 'ordinary' }, dry: { area: 90, density: 5, group: 'ordinary' }, cabinet: 100, hydrant: 400, duration: 60, supported: true },
  'Orta Tehlike-2': { wet: { area: 144, density: 5, group: 'ordinary' }, dry: { area: 180, density: 5, group: 'ordinary' }, cabinet: 100, hydrant: 400, duration: 60, supported: true },
  'Orta Tehlike-3': { wet: { area: 216, density: 5, group: 'ordinary' }, dry: { area: 270, density: 5, group: 'ordinary' }, cabinet: 100, hydrant: 1000, duration: 60, supported: true },
  'Orta Tehlike-4': { wet: { area: 360, density: 5, group: 'ordinary' }, dry: { area: 325, density: 7.7, group: 'high', effectiveHazard: 'Yüksek Tehlike-1' }, cabinet: 100, hydrant: 1000, duration: 60, supported: true },
  'Yüksek Tehlike-1': { wet: { area: 260, density: 7.7, group: 'high' }, dry: { area: 325, density: 7.7, group: 'high' }, cabinet: 200, hydrant: 1500, duration: 90, supported: false },
  'Yüksek Tehlike-2': { wet: { area: 260, density: 10, group: 'high' }, dry: { area: 325, density: 10, group: 'high' }, cabinet: 200, hydrant: 1500, duration: 90, supported: false },
  'Yüksek Tehlike-3': { wet: { area: 260, density: 12.5, group: 'high' }, dry: { area: 325, density: 12.5, group: 'high' }, cabinet: 200, hydrant: 1500, duration: 90, supported: false },
};

export const STANDARD_PROFILES = {
  [DEFAULT_STANDARD_PROFILE]: {
    id: DEFAULT_STANDARD_PROFILE,
    label: 'BYKHY Ek-8 + TS EN 12845 hidrolik ön hesap',
    revision: 'BYKHY Kılavuzu Aralık 2024; TS EN 12845 proje baskısı',
    sourceUrl: OFFICIAL_GUIDE_URL,
    hazards,
    limits: hazardLimits,
  },
};

export const getStandardProfile = (id = DEFAULT_STANDARD_PROFILE) => STANDARD_PROFILES[id] || STANDARD_PROFILES[DEFAULT_STANDARD_PROFILE];

export const getDesignCriteria = (information = {}) => {
  const standard = getStandardProfile(information.standardProfile);
  const hazard = standard.hazards[information.tehlikeSinifi] || standard.hazards['Orta Tehlike-1'];
  const dry = String(information.korumaAlani || '').startsWith('Kuru');
  const design = dry ? hazard.dry : hazard.wet;
  return {
    ...design,
    originalHazard: information.tehlikeSinifi || 'Orta Tehlike-1',
    effectiveHazard: design.effectiveHazard || information.tehlikeSinifi || 'Orta Tehlike-1',
    systemKey: dry ? 'dry' : 'wet',
    cabinet: hazard.cabinet,
    hydrant: hazard.hydrant,
    duration: hazard.duration,
    supported: hazard.supported && design.group !== 'high',
    limits: standard.limits[design.group],
    standard,
  };
};

export const getPipeProfile = (information = {}) => {
  if (PIPE_PROFILES[information.pipeProfile]) return PIPE_PROFILES[information.pipeProfile];
  return Object.values(PIPE_PROFILES).find((item) => item.material === information.boruMalzemesi) || PIPE_PROFILES.STEEL_WET;
};

export const getEquivalentLengthFactor = (c) => C_EQUIVALENT_LENGTH_FACTORS[Number(c)] || Math.pow(Number(c || 120) / 120, 1.85);

export { hazards as HAZARD_DATA, hazardLimits as HAZARD_LIMITS, steelSizes as PIPE_SIZES };
