import { DEFAULT_STANDARD_PROFILE, PIPE_PROFILES, PROJECT_SCHEMA_VERSION } from '../domain/hydraulicStandards';

const profileForMaterial = (material) => Object.values(PIPE_PROFILES).find((profile) => profile.material === material)?.id || 'STEEL_WET';

const migratePipe = (element, pipeProfile) => {
  if (element.type !== 'pipe' || !Array.isArray(element.points)) return element;
  const planLength = Math.hypot(Number(element.points[2]) - Number(element.points[0]), Number(element.points[3]) - Number(element.points[1]));
  const oldHeight = Number(element.data?.height) || 0;
  const legacyAbsoluteElevation = element.data?.elevationMode !== 'difference';
  return {
    ...element,
    data: {
      ...element.data,
      pipeProfile: element.data?.pipeProfile || pipeProfile,
      diameterMode: element.data?.diameterMode || (element.data?.diameter ? 'manual' : 'auto'),
      planLength: Number(element.data?.planLength) || planLength,
      length: Number(element.data?.length) > 0 ? Number(element.data.length) : planLength,
      elevationMode: legacyAbsoluteElevation ? 'absolute' : 'difference',
      ...(legacyAbsoluteElevation ? {
        startElevation: Number(element.data?.startElevation) || 0,
        endElevation: Number.isFinite(Number(element.data?.endElevation)) ? Number(element.data.endElevation) : oldHeight,
      } : { height: Number(element.data?.height) || 0 }),
      equivalentLength: Number(element.data?.equivalentLength) || 0,
      fittings: element.data?.fittings || {},
    },
  };
};

export const migrateProject = (project = {}) => {
  const information = project.information || {};
  const pipeProfile = information.pipeProfile || profileForMaterial(information.boruMalzemesi);
  return {
    ...project,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    information: {
      ...information,
      standardProfile: information.standardProfile || DEFAULT_STANDARD_PROFILE,
      pipeProfile,
      branchDirection: information.branchDirection || 'horizontal',
    },
    elements: (Array.isArray(project.elements) ? project.elements : []).map((element) => migratePipe(element, pipeProfile)),
  };
};

export const projectChecksum = (project) => {
  const text = JSON.stringify(project);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};
