import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Circle, Layer, Line, Rect, Stage, Text } from 'react-konva';
import CadToolbar from './CadToolbar';
import PipeInfoPopup from './CadPipeDialog';
import SprinklerInfoPopup from './SprinklerInfoPopup';
import PumpInfoPopup from './PumpInfoPopup';
import CalculationResultPopup from './CalculationResultPopup';
import { calculateProjectData } from '../domain/hydraulicCalculator';
import { getPipeProfile } from '../domain/hydraulicStandards';
import {
  applyAutomaticPipeDiameters,
  elementMatchesSelection,
  elementSelectionKey,
  findCadCommand,
  getCommandSuggestions,
  normalizeSelectionBox,
} from '../domain/cadTools';
import { exportProject, getProject, saveProject } from '../services/projectStore';

const GRID = 50;
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;

const CadWorkspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const commandRef = useRef(null);
  const initial = useMemo(() => getProject(id), [id]);
  const [project, setProject] = useState(initial || { customId: id, name: 'Proje', information: {}, elements: [] });
  const [elements, setElements] = useState(() => (initial?.elements || []).map((item, index) => ({ ...item, id: item.id || index + 1 })));
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);
  const [selectedTool, setSelectedTool] = useState('select');
  const [lastCommand, setLastCommand] = useState('pipe');
  const [startPoint, setStartPoint] = useState(null);
  const [previewPoint, setPreviewPoint] = useState(null);
  const [ortho, setOrtho] = useState(true);
  const [osnap, setOsnap] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight - 166 });
  const [command, setCommand] = useState('');
  const [status, setStatus] = useState('Bir araç seçin veya komut yazın.');
  const [dirty, setDirty] = useState(false);
  const [editPipe, setEditPipe] = useState(null);
  const [editSprinkler, setEditSprinkler] = useState(null);
  const [editPump, setEditPump] = useState(null);
  const [result, setResult] = useState(null);
  const [cursorPoint, setCursorPoint] = useState(null);
  const pipeProfile = useMemo(() => getPipeProfile(project.information), [project.information]);
  const commandSuggestions = useMemo(() => getCommandSuggestions(command), [command]);
  const selectionRectangle = useMemo(() => selectionBox ? normalizeSelectionBox(selectionBox.start, selectionBox.current) : null, [selectionBox]);
  const activeSprinklerIds = useMemo(() => new Set((result?.activeSprinklers || []).map(String)), [result]);
  const activePipeIds = useMemo(() => new Set((result?.activePipeIds || []).map(String)), [result]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    const resize = () => setSize({ width: node.clientWidth, height: node.clientHeight });
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const commit = useCallback((next) => {
    const nextElements = typeof next === 'function' ? next(elements) : next;
    setHistory((items) => [...items.slice(-49), elements]);
    setFuture([]);
    setElements(applyAutomaticPipeDiameters(nextElements, pipeProfile));
    setResult(null);
    setDirty(true);
  }, [elements, pipeProfile]);

  const undo = useCallback(() => {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setFuture((items) => [elements, ...items]);
    setHistory((items) => items.slice(0, -1));
    setElements(previous); setSelectedKeys([]); setDirty(true); setStatus('Son işlem geri alındı.');
  }, [elements, history]);

  const redo = useCallback(() => {
    if (!future.length) return;
    const next = future[0];
    setHistory((items) => [...items, elements]);
    setFuture((items) => items.slice(1));
    setElements(next); setSelectedKeys([]); setDirty(true); setStatus('İşlem yinelendi.');
  }, [elements, future]);

  const currentProject = useCallback((extra = {}) => ({ ...project, elements, ...extra }), [elements, project]);
  const persist = useCallback((extra = {}) => {
    const saved = saveProject(currentProject(extra));
    setProject(saved); setDirty(false); setStatus('Proje kaydedildi.');
    return saved;
  }, [currentProject]);

  useEffect(() => {
    if (!dirty) return undefined;
    const timer = window.setTimeout(() => {
      const saved = saveProject(currentProject());
      setProject(saved);
      setDirty(false);
      setStatus('Değişiklikler otomatik kaydedildi.');
    }, 800);
    return () => window.clearTimeout(timer);
  }, [currentProject, dirty]);

  useEffect(() => {
    const saveBeforeClose = () => {
      if (dirty) saveProject(currentProject());
    };
    window.addEventListener('beforeunload', saveBeforeClose);
    return () => window.removeEventListener('beforeunload', saveBeforeClose);
  }, [currentProject, dirty]);

  const activateTool = useCallback((tool) => {
    setSelectedTool(tool); setStartPoint(null); setPreviewPoint(null); setSelectionBox(null); setSelectedKeys([]);
    if (tool !== 'select') setLastCommand(tool);
    const labels = { select: 'Nesneye tıklayın veya boş alanda seçim penceresi çizin.', pipe: 'Borunun başlangıç noktasını seçin.', sprinkler: 'Sprinkler konumunu seçin.', pump: 'Pompa konumunu seçin.' };
    setStatus(labels[tool]);
  }, []);

  const pointFromEvent = (event) => {
    const stage = event.target.getStage();
    const transform = stage.getAbsoluteTransform().copy().invert();
    return transform.point(stage.getPointerPosition());
  };

  const snapPoint = useCallback((raw, origin = null) => {
    let point = { x: Math.round(raw.x / GRID) * GRID, y: Math.round(raw.y / GRID) * GRID };
    if (osnap) {
      const candidates = [];
      elements.forEach((item) => {
        if (item.type === 'pipe') candidates.push({ x: item.points[0], y: item.points[1] }, { x: item.points[2], y: item.points[3] });
        else candidates.push({ x: item.x, y: item.y });
      });
      const close = candidates.map((item) => ({ ...item, distance: Math.hypot(item.x - raw.x, item.y - raw.y) })).sort((a, b) => a.distance - b.distance)[0];
      if (close?.distance < 24 / scale) point = { x: close.x, y: close.y };
    }
    if (origin && ortho) {
      if (Math.abs(point.x - origin.x) >= Math.abs(point.y - origin.y)) point.y = origin.y;
      else point.x = origin.x;
    }
    return point;
  }, [elements, ortho, osnap, scale]);

  const nextId = (type) => Math.max(0, ...elements.filter((item) => item.type === type).map((item) => Number(item.id) || 0)) + 1;
  const occupied = (point) => elements.some((item) => item.type !== 'pipe' && item.x === point.x && item.y === point.y);

  const handleStageMouseDown = (event) => {
    if (event.evt.button === 1) { setPanning(true); event.target.getStage().draggable(true); return; }
    if (event.evt.button !== 0) return;
    if (selectedTool === 'select' && event.target !== event.target.getStage()) return;
    const rawPoint = pointFromEvent(event);
    const point = snapPoint(rawPoint, startPoint);
    if (selectedTool === 'select') { setSelectionBox({ start: rawPoint, current: rawPoint }); return; }
    if (selectedTool === 'sprinkler') {
      if (occupied(point)) { setStatus('Bu noktada zaten bir eleman var.'); return; }
      commit([...elements, { type: 'sprinkler', id: nextId('sprinkler'), x: point.x, y: point.y, data: {} }]);
      setStatus('Sprinkler eklendi. Sağ tıkla komutu yineleyebilirsiniz.'); return;
    }
    if (selectedTool === 'pump') {
      if (elements.some((item) => item.type === 'pump')) { setStatus('Projede yalnızca bir pompa olabilir.'); return; }
      commit([...elements, { type: 'pump', id: 1, x: point.x, y: point.y, data: {} }]);
      setStatus('Pompa eklendi.'); return;
    }
    if (selectedTool === 'pipe') {
      if (!startPoint) { setStartPoint(point); setPreviewPoint(point); setStatus('Borunun bitiş noktasını seçin.'); return; }
      if (point.x === startPoint.x && point.y === startPoint.y) { setStatus('Boru uzunluğu sıfır olamaz.'); return; }
      const duplicate = elements.some((item) => item.type === 'pipe' && ((item.points[0] === startPoint.x && item.points[1] === startPoint.y && item.points[2] === point.x && item.points[3] === point.y) || (item.points[2] === startPoint.x && item.points[3] === startPoint.y && item.points[0] === point.x && item.points[1] === point.y)));
      if (duplicate) { setStatus('Bu boru zaten çizilmiş.'); setStartPoint(null); return; }
      const drawnLength = Math.hypot(point.x - startPoint.x, point.y - startPoint.y);
      commit([...elements, { type: 'pipe', id: nextId('pipe'), points: [startPoint.x, startPoint.y, point.x, point.y], data: { diameter: Object.keys(pipeProfile.sizes)[0], diameterMode: 'auto', pipeProfile: pipeProfile.id, length: drawnLength, planLength: drawnLength, startElevation: 0, endElevation: 0, height: 0, equivalentLength: 0, fittings: {} } }]);
      setStartPoint(point); setPreviewPoint(point); setStatus('Boru eklendi. Sonraki bitiş noktasını seçin veya Esc ile bitirin.');
    }
  };

  const handleStageMouseMove = (event) => {
    const rawPoint = pointFromEvent(event);
    if (selectionBox) setSelectionBox((box) => ({ ...box, current: rawPoint }));
    const point = snapPoint(rawPoint, selectedTool === 'pipe' ? startPoint : null);
    setCursorPoint(point);
    if (selectedTool === 'pipe' && startPoint) setPreviewPoint(point);
  };

  const handleStageMouseUp = (event) => {
    if (event.evt.button === 1) { setPanning(false); event.target.getStage().draggable(false); return; }
    if (event.evt.button !== 0 || !selectionBox) return;
    const box = normalizeSelectionBox(selectionBox.start, pointFromEvent(event));
    setSelectionBox(null);
    if (box.width < 4 / scale && box.height < 4 / scale) {
      setSelectedKeys([]);
      setStatus('Seçim temizlendi.');
      return;
    }
    const matches = elements.filter((item) => elementMatchesSelection(item, box)).map(elementSelectionKey);
    setSelectedKeys(matches);
    setStatus(matches.length
      ? `${matches.length} eleman ${box.crossing ? 'kesişen seçimle' : 'pencere seçimiyle'} seçildi. Delete ile silebilirsiniz.`
      : 'Seçim penceresinde eleman bulunamadı.');
  };

  const removeSelected = useCallback(() => {
    if (!selectedKeys.length) return;
    const keys = new Set(selectedKeys);
    commit(elements.filter((item) => !keys.has(elementSelectionKey(item))));
    setSelectedKeys([]); setStatus(`${selectedKeys.length} seçili eleman silindi.`);
  }, [commit, elements, selectedKeys]);

  const selectElement = (event, item) => {
    if (selectedTool !== 'select') return;
    event.cancelBubble = true;
    const key = elementSelectionKey(item);
    if (event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey) {
      setSelectedKeys((keys) => keys.includes(key) ? keys.filter((value) => value !== key) : [...keys, key]);
      setStatus('Çoklu seçim güncellendi. Delete ile seçili elemanları silebilirsiniz.');
    } else {
      setSelectedKeys([key]);
      setStatus(`${item.type === 'pipe' ? 'Boru' : item.type === 'sprinkler' ? 'Sprinkler' : 'Pompa'} seçildi. Delete ile silebilir, çift tıklayarak bilgilerini açabilirsiniz.`);
    }
  };

  const editElement = (event, item) => {
    if (selectedTool !== 'select') return;
    event.cancelBubble = true;
    if (item.type === 'pipe') setEditPipe(item);
    if (item.type === 'sprinkler') setEditSprinkler(item);
    if (item.type === 'pump') setEditPump(item);
  };

  const executeCommand = useCallback((value) => {
    const definition = findCadCommand(value);
    if (definition?.tool) activateTool(definition.tool);
    else if (definition?.action === 'erase') removeSelected();
    else if (definition?.action === 'save') persist();
    else if (definition?.action === 'calculate') { setResult(calculateProjectData(currentProject())); setStatus('Kritik devre ön hesabı ve hesap föyü hazırlandı.'); }
    else if (value.trim()) setStatus(`“${value}” komutu bulunamadı.`);
    setCommand('');
  }, [activateTool, currentProject, persist, removeSelected]);

  useEffect(() => {
    const keydown = (event) => {
      const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName);
      if (event.key === 'F8') { event.preventDefault(); setOrtho((value) => !value); setStatus(`Dik çizim (ORTHO) ${ortho ? 'kapandı' : 'açıldı'}.`); return; }
      if (event.key === 'F3') { event.preventDefault(); setOsnap((value) => !value); return; }
      if (event.key === 'F7') { event.preventDefault(); setShowGrid((value) => !value); return; }
      if (typing) return;
      if (event.ctrlKey && event.key.toLowerCase() === 's') { event.preventDefault(); persist(); return; }
      if (event.ctrlKey && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); return; }
      if (event.ctrlKey && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); return; }
      if (event.key === 'Delete') { removeSelected(); return; }
      if (event.key === 'Escape') { setStartPoint(null); setPreviewPoint(null); setSelectionBox(null); setSelectedKeys([]); setStatus('Komut iptal edildi.'); return; }
      const shortcuts = { l: 'pipe', b: 'pipe', s: 'sprinkler', p: 'pump', v: 'select' };
      if (shortcuts[event.key.toLowerCase()]) activateTool(shortcuts[event.key.toLowerCase()]);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [activateTool, ortho, persist, redo, removeSelected, undo]);

  const handleWheel = (event) => {
    event.evt.preventDefault();
    const stage = event.target.getStage();
    const pointer = stage.getPointerPosition();
    const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * (event.evt.deltaY > 0 ? 0.9 : 1.1)));
    const world = { x: (pointer.x - stagePos.x) / scale, y: (pointer.y - stagePos.y) / scale };
    setScale(nextScale); setStagePos({ x: pointer.x - world.x * nextScale, y: pointer.y - world.y * nextScale });
  };

  const gridLines = useMemo(() => {
    if (!showGrid) return [];
    const lines = [];
    for (let value = -2000; value <= 5000; value += GRID) {
      lines.push(<Line key={`v${value}`} points={[value, -2000, value, 5000]} stroke={value % 250 === 0 ? '#344451' : '#263640'} strokeWidth={1 / scale} listening={false} />);
      lines.push(<Line key={`h${value}`} points={[-2000, value, 5000, value]} stroke={value % 250 === 0 ? '#344451' : '#263640'} strokeWidth={1 / scale} listening={false} />);
    }
    return lines;
  }, [scale, showGrid]);

  const selectedMatch = (item) => selectedKeys.includes(elementSelectionKey(item));
  const previewOccupied = cursorPoint ? occupied(cursorPoint) : false;
  const previewInvalid = selectedTool === 'sprinkler'
    ? previewOccupied
    : selectedTool === 'pump' && (previewOccupied || elements.some((item) => item.type === 'pump'));
  const previewSnapped = cursorPoint && osnap && elements.some((item) => {
    if (item.type === 'pipe') return (item.points[0] === cursorPoint.x && item.points[1] === cursorPoint.y) || (item.points[2] === cursorPoint.x && item.points[3] === cursorPoint.y);
    return item.x === cursorPoint.x && item.y === cursorPoint.y;
  });
  const pipePreviewLength = startPoint && previewPoint ? Math.hypot(previewPoint.x - startPoint.x, previewPoint.y - startPoint.y) : 0;
  const pipePreviewAngle = startPoint && previewPoint ? Math.atan2(previewPoint.y - startPoint.y, previewPoint.x - startPoint.x) * 180 / Math.PI : 0;
  const savePipe = (data) => { commit(elements.map((item) => item.type === 'pipe' && item.id === editPipe.id ? { ...item, data } : item)); setEditPipe(null); };
  const deleteBy = (type, idToDelete) => { commit(elements.filter((item) => !(item.type === type && item.id === idToDelete))); setEditPipe(null); setEditSprinkler(null); setEditPump(null); setSelectedKeys([]); };
  const savePumpProject = (updated) => { setProject(updated); saveProject({ ...updated, elements }); setEditPump(null); setDirty(false); };

  if (!initial) return <main className="missing-project"><h2>Proje bulunamadı</h2><button className="primary-button" onClick={() => navigate('/')}>Projelere dön</button></main>;

  return <main className="cad-shell">
    <CadToolbar selectedTool={selectedTool} onTool={activateTool} onHome={() => { persist(); navigate('/'); }} onUndo={undo} onRedo={redo} canUndo={history.length > 0} canRedo={future.length > 0} onSave={() => persist()} onExport={() => exportProject(persist())} onCalculate={() => { const calculation = calculateProjectData(currentProject()); setResult(calculation); persist({ calculations: calculation }); }} dirty={dirty} />
    <div className="drawing-tab"><span><i className="bi bi-file-earmark" /> {project.name}</span><small>{elements.filter((item) => item.type === 'pipe').length} boru · {elements.filter((item) => item.type === 'sprinkler').length} sprinkler</small></div>
    <div className={`canvas-wrap ${selectedTool !== 'select' ? 'drawing-mode' : ''}`} ref={containerRef} onContextMenu={(event) => { event.preventDefault(); activateTool(lastCommand); setStatus('Son komut yinelendi.'); }}>
      <Stage width={size.width} height={size.height} x={stagePos.x} y={stagePos.y} scaleX={scale} scaleY={scale} draggable={panning} onDragEnd={(event) => { setStagePos(event.target.position()); setPanning(false); event.target.draggable(false); }} onMouseUp={handleStageMouseUp} onMouseDown={handleStageMouseDown} onMouseMove={handleStageMouseMove} onMouseLeave={() => setCursorPoint(null)} onWheel={handleWheel}>
        <Layer><Rect x={-2000} y={-2000} width={7000} height={7000} fill="#1c2a33" listening={false} />{gridLines}
          {result?.operationRectangle && <Rect {...result.operationRectangle} fill="rgba(69, 224, 168, .08)" stroke="#45e0a8" strokeWidth={2 / scale} dash={[10 / scale, 6 / scale]} listening={false} />}
          {selectedTool === 'pipe' && startPoint && previewPoint && <React.Fragment>
            <Line points={[startPoint.x, startPoint.y, previewPoint.x, previewPoint.y]} stroke="rgba(88, 166, 255, .2)" strokeWidth={10 / scale} lineCap="round" listening={false} />
            <Line points={[startPoint.x, startPoint.y, previewPoint.x, previewPoint.y]} stroke="#f7d154" strokeWidth={2 / scale} dash={[9 / scale, 5 / scale]} lineCap="round" listening={false} />
            <Circle x={startPoint.x} y={startPoint.y} radius={6 / scale} fill="#1c2a33" stroke="#58a6ff" strokeWidth={2 / scale} listening={false} />
            <Circle x={previewPoint.x} y={previewPoint.y} radius={7 / scale} fill="#f7d154" stroke="#fff4b8" strokeWidth={2 / scale} listening={false} />
            {pipePreviewLength > 0 && <React.Fragment>
              <Rect x={(startPoint.x + previewPoint.x) / 2 - 63 / scale} y={(startPoint.y + previewPoint.y) / 2 - 31 / scale} width={126 / scale} height={23 / scale} cornerRadius={4 / scale} fill="rgba(12, 25, 33, .9)" stroke="#536b78" strokeWidth={1 / scale} listening={false} />
              <Text x={(startPoint.x + previewPoint.x) / 2 - 57 / scale} y={(startPoint.y + previewPoint.y) / 2 - 26 / scale} width={114 / scale} align="center" text={`${Math.round(pipePreviewLength)} cm  ·  ${Math.round(pipePreviewAngle)}°`} fill="#f5f8fa" fontSize={11 / scale} listening={false} />
            </React.Fragment>}
          </React.Fragment>}
          {elements.filter((item) => item.type === 'pipe').map((item) => { const selectedItem = selectedMatch(item); const critical = activePipeIds.has(String(item.id)); const [x1, y1, x2, y2] = item.points; return <React.Fragment key={`pipe-${item.id}`}><Line points={item.points} stroke={selectedItem ? '#f7d154' : critical ? '#45e0a8' : '#d5e1e7'} strokeWidth={(selectedItem || critical ? 5 : 3) / scale} hitStrokeWidth={18 / scale} lineCap="round" onClick={(event) => selectElement(event, item)} onDblClick={(event) => editElement(event, item)} /><Text x={(x1 + x2) / 2 + 8} y={(y1 + y2) / 2 - 22} text={`${item.data?.diameter || 'Çap?'}${item.data?.diameterMode === 'auto' ? ' · OTO' : ''} · ${Number(item.data?.length || 0).toFixed(0)} cm`} fill={critical ? '#8ff0ce' : '#9fb4c0'} fontSize={12 / scale} listening={false} /></React.Fragment>; })}
          {elements.filter((item) => item.type === 'sprinkler').map((item) => { const critical = activeSprinklerIds.has(String(item.id)); return <React.Fragment key={`sprinkler-${item.id}`}><Circle x={item.x} y={item.y} radius={(critical ? 12 : 9) / scale} fill={selectedMatch(item) ? '#f7d154' : critical ? '#ff9f43' : '#58a6ff'} stroke={critical ? '#fff0d8' : '#dbeeff'} strokeWidth={2 / scale} onClick={(event) => selectElement(event, item)} onDblClick={(event) => editElement(event, item)} /><Line points={[item.x - 14 / scale, item.y, item.x + 14 / scale, item.y]} stroke="#dbeeff" strokeWidth={2 / scale} listening={false} /><Text x={item.x + 13 / scale} y={item.y - 22 / scale} text={`SP-${item.id}${critical ? ' · KRİTİK' : ''}`} fill={critical ? '#ffd19e' : '#b9cbd4'} fontSize={12 / scale} listening={false} /></React.Fragment>; })}
          {elements.filter((item) => item.type === 'pump').map((item) => <React.Fragment key={`pump-${item.id}`}><Circle x={item.x} y={item.y} radius={19 / scale} fill={selectedMatch(item) ? '#f7d154' : '#ec6b5f'} stroke="#ffe1dd" strokeWidth={2 / scale} onClick={(event) => selectElement(event, item)} onDblClick={(event) => editElement(event, item)} /><Text x={item.x - 8 / scale} y={item.y - 8 / scale} text="P" fill="#fff" fontStyle="bold" fontSize={16 / scale} listening={false} /><Text x={item.x + 25 / scale} y={item.y - 9 / scale} text="POMPA" fill="#b9cbd4" fontSize={12 / scale} listening={false} /></React.Fragment>)}
          {selectionRectangle && (selectionRectangle.width > 0 || selectionRectangle.height > 0) && <Rect x={selectionRectangle.x} y={selectionRectangle.y} width={selectionRectangle.width} height={selectionRectangle.height} fill={selectionRectangle.crossing ? 'rgba(65, 190, 125, .16)' : 'rgba(68, 145, 230, .16)'} stroke={selectionRectangle.crossing ? '#64d69c' : '#6eb6ff'} strokeWidth={1 / scale} dash={selectionRectangle.crossing ? [7 / scale, 4 / scale] : undefined} listening={false} />}
          {selectedTool !== 'select' && cursorPoint && <React.Fragment>
            <Line points={[cursorPoint.x - 18 / scale, cursorPoint.y, cursorPoint.x + 18 / scale, cursorPoint.y]} stroke={previewInvalid ? '#ff7066' : '#8bc6ff'} strokeWidth={1 / scale} listening={false} />
            <Line points={[cursorPoint.x, cursorPoint.y - 18 / scale, cursorPoint.x, cursorPoint.y + 18 / scale]} stroke={previewInvalid ? '#ff7066' : '#8bc6ff'} strokeWidth={1 / scale} listening={false} />
            {previewSnapped && <Circle x={cursorPoint.x} y={cursorPoint.y} radius={11 / scale} stroke="#45e0a8" strokeWidth={2 / scale} dash={[3 / scale, 3 / scale]} listening={false} />}
            {selectedTool === 'pipe' && !startPoint && <React.Fragment>
              <Circle x={cursorPoint.x} y={cursorPoint.y} radius={7 / scale} fill="rgba(88, 166, 255, .25)" stroke="#58a6ff" strokeWidth={2 / scale} listening={false} />
              <Text x={cursorPoint.x + 17 / scale} y={cursorPoint.y - 25 / scale} text={previewSnapped ? '1 · BAŞLANGIÇ · YAKALA' : '1 · BAŞLANGIÇ NOKTASI'} fill="#dbeeff" fontSize={11 / scale} listening={false} />
            </React.Fragment>}
            {selectedTool === 'pipe' && startPoint && <Text x={cursorPoint.x + 17 / scale} y={cursorPoint.y + 12 / scale} text={previewSnapped ? '2 · BİTİŞ · YAKALA' : '2 · BİTİŞ NOKTASI'} fill="#fff4b8" fontSize={11 / scale} listening={false} />}
            {selectedTool === 'sprinkler' && <React.Fragment>
              <Circle x={cursorPoint.x} y={cursorPoint.y} radius={9 / scale} fill={previewInvalid ? 'rgba(255, 112, 102, .45)' : 'rgba(88, 166, 255, .55)'} stroke={previewInvalid ? '#ff7066' : '#dbeeff'} strokeWidth={2 / scale} listening={false} />
              <Line points={[cursorPoint.x - 14 / scale, cursorPoint.y, cursorPoint.x + 14 / scale, cursorPoint.y]} stroke={previewInvalid ? '#ffb1ab' : '#dbeeff'} strokeWidth={2 / scale} listening={false} />
              <Text x={cursorPoint.x + 18 / scale} y={cursorPoint.y - 27 / scale} text={previewInvalid ? 'DOLU NOKTA' : previewSnapped ? 'SPRİNKLER · YAKALA' : 'SPRİNKLER YERLEŞTİR'} fill={previewInvalid ? '#ffb1ab' : '#dbeeff'} fontSize={11 / scale} listening={false} />
            </React.Fragment>}
            {selectedTool === 'pump' && <React.Fragment>
              <Circle x={cursorPoint.x} y={cursorPoint.y} radius={19 / scale} fill={previewInvalid ? 'rgba(255, 112, 102, .32)' : 'rgba(236, 107, 95, .55)'} stroke={previewInvalid ? '#ff7066' : '#ffe1dd'} strokeWidth={2 / scale} listening={false} />
              <Text x={cursorPoint.x - 8 / scale} y={cursorPoint.y - 8 / scale} text="P" fill="#fff" fontStyle="bold" fontSize={16 / scale} listening={false} />
              <Text x={cursorPoint.x + 26 / scale} y={cursorPoint.y - 23 / scale} text={previewInvalid ? 'POMPA YERLEŞTİRİLEMEZ' : previewSnapped ? 'POMPA · YAKALA' : 'POMPA YERLEŞTİR'} fill={previewInvalid ? '#ffb1ab' : '#ffe1dd'} fontSize={11 / scale} listening={false} />
            </React.Fragment>}
          </React.Fragment>}
        </Layer>
      </Stage>
      <div className="tool-guide" aria-live="polite">
        {selectedTool === 'select' && <><strong><i className="bi bi-bounding-box" /> Pencereyle seç</strong><small>Soldan sağa: yalnız tamamen içeride kalanlar. Sağdan sola: çerçeveyle kesişenler. Shift/Ctrl ile seçime ekleyin.</small></>}
        {selectedTool === 'pipe' && <><strong><i className="bi bi-slash-lg" /> Boru çiz</strong><div className="guide-steps"><span className={!startPoint ? 'current' : 'done'}><b>1</b> Başlangıca tıkla</span><span className={startPoint ? 'current' : ''}><b>2</b> Bitişe tıkla</span></div><small>Yeni parçalar uçtan devam eder. Bitirmek için Esc.</small></>}
        {selectedTool === 'sprinkler' && <><strong><i className="bi bi-bullseye" /> Sprinkler yerleştir</strong><small>Hayalet sembolü istediğiniz noktaya getirip tıklayın.</small></>}
        {selectedTool === 'pump' && <><strong><i className="bi bi-gear-wide-connected" /> Pompa yerleştir</strong><small>Pompayı bir boru ucuna yaklaştırıp tıklayın.</small></>}
      </div>
      <div className="view-controls"><button onClick={() => { setScale(1); setStagePos({ x: 0, y: 0 }); }} title="Görünümü sıfırla"><i className="bi bi-house" /></button><span>%{Math.round(scale * 100)}</span></div>
    </div>
    <div className="command-area">{command && commandSuggestions.length > 0 && <div className="command-suggestions" role="listbox">{commandSuggestions.map((suggestion, index) => <button type="button" key={suggestion.name} className={index === 0 ? 'active' : ''} onMouseDown={(event) => event.preventDefault()} onClick={() => { setCommand(suggestion.name); commandRef.current?.focus(); }}><strong>{suggestion.name}</strong><span>{suggestion.description}</span>{index === 0 && <kbd>Tab</kbd>}</button>)}</div>}<div className="command-message"><span>Komut:</span> {status}</div><div className="command-input"><span>&gt;</span><input ref={commandRef} value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === 'Tab' && commandSuggestions[0]) { event.preventDefault(); setCommand(commandSuggestions[0].name); } else if (event.key === 'Enter') executeCommand(command); else if (event.key === 'Escape') setCommand(''); }} placeholder="Komut yazın; tamamlamak için Tab'a basın" aria-label="Komut" /></div></div>
    <footer className="cad-status"><span>X: {Math.round(cursorPoint?.x || 0)} cm&nbsp;&nbsp; Y: {Math.round(cursorPoint?.y || 0)} cm&nbsp;&nbsp; Izgara: {GRID} cm</span><div><button className={showGrid ? 'on' : ''} onClick={() => setShowGrid(!showGrid)}>F7 IZGARA</button><button className={ortho ? 'on' : ''} onClick={() => setOrtho(!ortho)}>F8 DİK</button><button className={osnap ? 'on' : ''} onClick={() => setOsnap(!osnap)}>F3 YAKALA</button></div></footer>
    {editPipe && <PipeInfoPopup line={editPipe} pipeProfileId={pipeProfile.id} onClose={() => setEditPipe(null)} onSave={savePipe} onDelete={() => deleteBy('pipe', editPipe.id)} />}
    {editSprinkler && <SprinklerInfoPopup sprinkler={editSprinkler} onClose={() => setEditSprinkler(null)} onDelete={(value) => deleteBy('sprinkler', value)} />}
    {editPump && <PumpInfoPopup project={{ ...project, elements }} onClose={() => setEditPump(null)} onDelete={() => deleteBy('pump', editPump.id)} onSave={savePumpProject} />}
    {result && <CalculationResultPopup result={result} onClose={() => setResult(null)} />}
  </main>;
};

export default CadWorkspace;
