import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectPopup from './ProjectEditorDialog';
import { deleteProject, importProjectFile, listProjects, saveProject } from '../services/projectStore';

const Home = () => {
  const [projects, setProjects] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [message, setMessage] = useState('Yeni bir proje oluşturun veya yedeğinizi açın.');
  const importInput = useRef(null);
  const navigate = useNavigate();
  const refresh = () => setProjects(listProjects());

  useEffect(refresh, []);

  const handleSaveProject = (form) => {
    const project = saveProject({
      ...(selectedProject || {}), customId: selectedProject?.customId || `${Date.now()}`, name: form.name,
      information: {
        tehlikeSinifi: form.tehlikeSinifi, korumaAlani: form.korumaAlani, boruMalzemesi: form.boruMalzemesi,
        sprinklerKorumaAlani: Number(form.sprinklerKorumaAlani), sprinklerFaktoru: Number(form.sprinklerFaktoru),
        uygulamaAlani: Number(form.uygulamaAlani), tasarimYogunlugu: Number(form.tasarimYogunlugu),
        hazenWilliamsKatsayisi: Number(form.hazenWilliamsKatsayisi), kritikAlanSprinklerSayisi: Number(form.kritikAlanSprinklerSayisi),
        ilaveYanginDolabiDebisi: Number(form.ilaveYanginDolabiDebisi), ilaveHidrantDebisi: Number(form.ilaveHidrantDebisi),
        yanginDolabiDahil: Boolean(form.yanginDolabiDahil), hidrantDahil: Boolean(form.hidrantDahil),
        sistemCalismaSuresi: Number(form.sistemCalismaSuresi), pompaVerimi: Number(form.pompaVerimi),
      },
      elements: selectedProject?.elements || [],
    });
    setShowPopup(false); refresh(); navigate(`/project/${project.customId}`);
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { const project = await importProjectFile(file); refresh(); navigate(`/project/${project.customId}`); }
    catch (error) { setMessage(error.message); }
    finally { event.target.value = ''; }
  };

  const remove = (project) => {
    if (!window.confirm(`“${project.name}” projesi silinsin mi?`)) return;
    deleteProject(project.customId); refresh();
  };

  return <main className="home-shell">
    <header className="home-header"><div className="brand-mark"><i className="bi bi-droplet-half" /></div><div><p className="eyebrow">SPRINKLER TASARIMI</p><h1>Yangın Tesisatı</h1></div></header>
    <section className="home-hero"><div><h2>Projeler</h2><p>{message}</p></div><div className="home-actions">
      <button className="secondary-button" onClick={() => importInput.current?.click()}><i className="bi bi-folder2-open" /> Proje Aç</button>
      <button className="primary-button" onClick={() => { setSelectedProject(null); setShowPopup(true); }}><i className="bi bi-plus-lg" /> Yeni Proje</button>
      <input ref={importInput} hidden type="file" accept=".json,.sprinkler.json" onChange={handleImport} />
    </div></section>
    <section className="project-grid">
      {projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).map((project) => <article className="project-card" key={project.customId}>
        <button className="project-open" onClick={() => navigate(`/project/${project.customId}`)}><span className="project-icon"><i className="bi bi-bezier2" /></span><span><strong>{project.name}</strong><small>{project.elements?.length || 0} eleman · {new Date(project.updatedAt).toLocaleString('tr-TR')}</small></span></button>
        <div className="project-card-actions"><button title="Bilgileri düzenle" onClick={() => { setSelectedProject(project); setShowPopup(true); }}><i className="bi bi-pencil" /></button><button title="Sil" onClick={() => remove(project)}><i className="bi bi-trash3" /></button></div>
      </article>)}
      {!projects.length && <div className="empty-projects"><i className="bi bi-grid-1x2" /><strong>Henüz proje yok</strong><span>Başlamak için “Yeni Proje”ye tıklayın.</span></div>}
    </section>
    {showPopup && <ProjectPopup project={selectedProject} onSave={handleSaveProject} onClose={() => setShowPopup(false)} />}
  </main>;
};
export default Home;
