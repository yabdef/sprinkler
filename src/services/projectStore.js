import { PROJECT_SCHEMA_VERSION } from '../domain/hydraulicStandards';
import { migrateProject, projectChecksum } from './projectMigrations';

const STORAGE_KEY = 'sprinkler-projects-v3';
const LEGACY_KEYS = ['sprinkler-projects-v2', 'sprinkler-projects'];
const BACKUP_KEY = 'sprinkler-project-backups-v3';

const now = () => new Date().toISOString();
const readAll = () => {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) raw = LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean) || '[]';
    const value = JSON.parse(raw);
    const projects = Array.isArray(value) ? value.map(migrateProject) : [];
    if (!localStorage.getItem(STORAGE_KEY) && projects.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return projects;
  } catch {
    return [];
  }
};
const backup = (project) => {
  if (!project?.customId) return;
  try {
    const all = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
    const entry = { project: migrateProject(project), savedAt: now(), checksum: projectChecksum(project) };
    const next = [entry, ...(Array.isArray(all) ? all : [])]
      .filter((item, index, items) => items.findIndex((candidate) => candidate.project?.customId === item.project?.customId && candidate.checksum === item.checksum) === index)
      .filter((item, index, items) => items.slice(0, index).filter((candidate) => candidate.project?.customId === item.project?.customId).length < 5)
      .slice(0, 50);
    localStorage.setItem(BACKUP_KEY, JSON.stringify(next));
  } catch {
    // Yedek alanı doluysa aktif proje kaydı yine devam eder.
  }
};
const writeAll = (projects) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return projects;
};

export const listProjects = () => readAll();
export const getProject = (customId) => readAll().find((project) => project.customId === customId) || null;
export const saveProject = (project) => {
  const projects = readAll();
  const index = projects.findIndex((item) => item.customId === project.customId);
  const previous = index >= 0 ? projects[index] : null;
  if (previous && projectChecksum(previous) !== projectChecksum(project)) backup(previous);
  const saved = migrateProject({ ...previous, ...project, customId: project.customId || `${Date.now()}`, elements: project.elements || [], createdAt: previous?.createdAt || project.createdAt || now(), updatedAt: now() });
  if (index >= 0) projects[index] = saved;
  else projects.push(saved);
  writeAll(projects);
  return saved;
};
export const deleteProject = (customId) => writeAll(readAll().filter((project) => project.customId !== customId));
export const exportProject = (project) => {
  const migrated = migrateProject(project);
  const envelope = { format: 'sprinkler-project', schemaVersion: PROJECT_SCHEMA_VERSION, exportedAt: now(), checksum: projectChecksum(migrated), project: migrated };
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${(project.name || 'sprinkler-projesi').replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ_-]+/gi, '-')}.sprinkler.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};
export const importProjectFile = async (file) => {
  const parsed = JSON.parse(await file.text());
  const imported = parsed?.format === 'sprinkler-project' ? parsed.project : parsed;
  if (!imported || typeof imported !== 'object' || !Array.isArray(imported.elements)) throw new Error('Bu dosya geçerli bir sprinkler projesi değil.');
  if (parsed?.checksum && projectChecksum(imported) !== parsed.checksum) throw new Error('Proje dosyasının bütünlük kontrolü başarısız. Dosya bozulmuş veya değiştirilmiş olabilir.');
  return saveProject({ ...migrateProject(imported), customId: `${Date.now()}`, name: imported.name || 'İçe aktarılan proje' });
};

export const listProjectBackups = (customId) => {
  try {
    const backups = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
    return (Array.isArray(backups) ? backups : []).filter((item) => item.project?.customId === customId);
  } catch { return []; }
};

export const restoreLatestProjectBackup = (customId) => {
  const latest = listProjectBackups(customId)[0];
  if (!latest?.project) throw new Error('Bu proje için geri yüklenebilir otomatik yedek bulunamadı.');
  return saveProject({ ...latest.project, customId, updatedAt: now() });
};
