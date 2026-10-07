import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Stage, Layer, Line, Circle, Text } from 'react-konva';
import Toolbar from './Toolbar';
import PipeInfoPopup from './PipeInfoPopup';
import SprinklerInfoPopup from './SprinklerInfoPopup';
import PumpInfoPopup from './PumpInfoPopup';
import ToolMenu from './ToolMenu';
import { calculateProjectData } from './Calculate';
import axios from 'axios';

const DrawingCanvas = () => {
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

  const handleContextMenu = (event) => {
    event.evt.preventDefault();  // Varsayılan sağ tıklama menüsünü engelle
    setContextMenu({
      visible: true,
      x: event.evt.clientX,
      y: event.evt.clientY,
    });
  };

  const handleOutsideClick = useCallback(() => {
    if (contextMenu.visible) {
      setContextMenu({ visible: false, x: 0, y: 0 });
    }
  }, [contextMenu.visible]);

  const handleStageClick = () => {
    if (contextMenu.visible) {
      setContextMenu({ visible: false, x: 0, y: 0 });
    }
  };

  useEffect(() => {
    if (contextMenu.visible) {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('scroll', handleOutsideClick, { capture: true });  // Capture mode for scroll
      document.addEventListener('input', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('scroll', handleOutsideClick, { capture: true });
      document.removeEventListener('input', handleOutsideClick);
    };
  }, [contextMenu.visible, handleOutsideClick]);

  const { id } = useParams();
  const [projectData, setProjectData] = useState({
    customId: id,
    name: '',
    elements: [],
  });
  const [lines, setLines] = useState([]);
  const [sprinklers, setSprinklers] = useState([]);
  const [selectedTool, setSelectedTool] = useState('sprinkler');
  const [pumps, setPumps] = useState([]);
  const [startPoint, setStartPoint] = useState(null);
  const [previewLine, setPreviewLine] = useState(null);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [selectedLine, setSelectedLine] = useState(null);
  const [selectedSprinkler, setSelectedSprinkler] = useState(null);
  const [selectedPump, setSelectedPump] = useState(null);
  const [scale, setScale] = useState(1);

  // Ölçekleme işlemi
  const handleWheel = (e) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: pointer.x / oldScale - stage.x() / oldScale,
      y: pointer.y / oldScale - stage.y() / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    setScale(newScale);
    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: -(mousePointTo.x - pointer.x / newScale) * newScale,
      y: -(mousePointTo.y - pointer.y / newScale) * newScale,
    });
    stage.batchDraw();
  };

  const gridSize = 200;  
  const gridCount = 200;

  const alignToGrid = (value) => {
    return Math.round(value / gridSize) * gridSize;
  };

  const saveState = () => {
    setHistory([...history, { lines, sprinklers, pumps }]);
    setFuture([]); // Yeni bir işlem yapıldığında geleceği temizle
  };

  const undo = () => {
    if (history.length > 0) {
      const lastState = history.pop();
      setFuture([{ lines, sprinklers, pumps }, ...future]);
      setLines(lastState.lines);
      setSprinklers(lastState.sprinklers);
      setPumps(lastState.pumps); // Pompa durumu geri alınır
    }
  };

  const redo = () => {
    if (future.length > 0) {
      const nextState = future.shift();
      setHistory([...history, { lines, sprinklers, pumps }]);
      setLines(nextState.lines);
      setSprinklers(nextState.sprinklers);
      setPumps(nextState.pumps); // Pompa durumu yineleme işlemiyle geri getirilir
    }
  };

  const isLineOverlapping = (startX, startY, endX, endY) => {
    return lines.some(line => 
      (line.points[0] === startX && line.points[1] === startY && line.points[2] === endX && line.points[3] === endY) ||
      (line.points[0] === endX && line.points[1] === endY && line.points[2] === startX && line.points[3] === startY)
    );
  };

  const isPositionOccupiedBySprinkler = (x, y) => {
    return sprinklers.some(sprinkler => sprinkler.x === x && sprinkler.y === y);
  };

  const handleMouseDown = (e) => {
    if (e.evt.buttons === 4) {  // Orta teker basılıysa
      e.target.getStage().draggable(true);
      return;
    }
  
    if (e.evt.button === 2) {
      return;  // Sağ tıklama ise hiçbir şey yapma
    }
  
    e.target.getStage().draggable(false);
    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);
    const alignedX = alignToGrid(pos.x);
    const alignedY = alignToGrid(pos.y);
  
    if (selectedTool === 'sprinkler') {
      if (isPositionOccupiedBySprinkler(alignedX, alignedY)) {
        return;
      }
      saveState();
      const newSprinkler = {
        x: alignedX,
        y: alignedY,
        id: sprinklers.length > 0 ? Math.max(...sprinklers.map(s => s.id)) + 1 : 1,
        type: 'sprinkler',
        data: {}
      };
      setSprinklers([...sprinklers, newSprinkler]);
      addElement(newSprinkler);  // Elements array'ine ekliyoruz
    } else if (selectedTool === 'pipe') {
      if (!startPoint) {
        // İlk tıklamada başlangıç noktasını belirliyoruz
        setStartPoint({ x: alignedX, y: alignedY });
      } else {
        // İkinci tıklamada bitiş noktasını belirliyoruz
        const endPos = getRelativePointerPosition(stage);
        const endPoint = { x: alignToGrid(endPos.x), y: alignToGrid(endPos.y) };
  
        // Tanımsız olan start veya end noktalarını kontrol edin
        if (!startPoint || !endPoint) {
          resetDrawing();
          return;
        }
  
        if (isLineOverlapping(startPoint.x, startPoint.y, endPoint.x, endPoint.y) || 
            (startPoint.x === endPoint.x && startPoint.y === endPoint.y)) {
          resetDrawing();
          return;
        }
  
        if (startPoint.x === endPoint.x || startPoint.y === endPoint.y) {
          saveState();
          const newLine = { 
            points: [startPoint.x, startPoint.y, endPoint.x, endPoint.y], 
            type: 'pipe', 
            id: lines.length > 0 ? Math.max(...lines.map(s => s.id)) + 1 : 1,
            data: { 
              diameter: '',
              length: 0,
              height: 0
            } 
          };
          setLines([...lines, newLine]);
          addElement(newLine);  // Elements array'ine ekliyoruz
        }
  
        resetDrawing();
      }
    } else if (selectedTool === 'pump') {
      if (pumps.length > 0) {
        return;
      }
      const newPump = {
        x: alignedX,
        y: alignedY,
        id: pumps.length > 0 ? pumps.length + 1 : 1, // Benzersiz ID
        type: 'pump',
        data: {}
      };
      setPumps([newPump]); // Pompa eklenir
      addElement(newPump);  // projectData.elements array'ine ekliyoruz
      saveState();
    }
  };
  

  const getRelativePointerPosition = (stage) => {
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const pos = stage.getPointerPosition();
    return transform.point(pos);
  };

  const handlePumpDragEnd = (e, pumpIndex) => {
    const { x, y } = e.target.position();
    const updatedPumps = pumps.map((pump, i) => {
      if (i === pumpIndex) {
        return { ...pump, x, y };
      }
      return pump;
    });
    setPumps(updatedPumps);
    saveState();
  };

  const handleDeleteLine = (index) => {
    if (index >= 0 && index < lines.length) {
      const lineToDelete = lines[index];
  
      setLines(currentLines => currentLines.filter((_, i) => i !== index));
      setSelectedLine(null);
  
      setProjectData(prevData => ({
        ...prevData,
        elements: prevData.elements.filter(el => 
          !(el.type === 'pipe' && 
            el.points[0] === lineToDelete.points[0] && 
            el.points[1] === lineToDelete.points[1] && 
            el.points[2] === lineToDelete.points[2] && 
            el.points[3] === lineToDelete.points[3])
        )
      }));
    } else {
      console.error('Geçersiz boru indexi:', index);
    }
  };  

  const handleMouseMove = (e) => {
    if (selectedTool !== 'pipe' || !startPoint) return;
    const stage = e.target.getStage();
    const point = getRelativePointerPosition(stage); 
    const alignedX = alignToGrid(point.x);
    const alignedY = alignToGrid(point.y);

    if (startPoint.x === alignedX || startPoint.y === alignedY) {
      setPreviewLine({ points: [startPoint.x, startPoint.y, alignedX, alignedY] });
    }
  };

  const handleLineClick = (e, lineIndex) => {
    if (selectedTool !== 'pipe') return;  // Eğer boru aracı seçili değilse hiçbir şey yapma
    e.cancelBubble = true;
    setSelectedLine(lineIndex);
    setPreviewLine(null);  // Önizleme çizgisini sıfırla
  };

  const handleSprinklerClick = (e, sprinklerIndex) => {
    if (selectedTool !== 'sprinkler') return;  // Eğer sprinkler aracı seçili değilse hiçbir şey yapma
    e.cancelBubble = true;
    setSelectedSprinkler(sprinklerIndex);
  };

  const handlePumpClick = (e, pumpIndex) => {
    if (selectedTool !== 'pump') return;  // Eğer pompa aracı seçili değilse hiçbir şey yapma
    e.cancelBubble = true;
    setSelectedPump(pumpIndex);
  };

  const handlePopupSave = (data) => {
      if (selectedLine !== null) {
          const updatedLines = lines.map((line, index) => {
              if (index === selectedLine) {
                  return { ...line, data };
              }
              return line;
          });
          setLines(updatedLines);
          setProjectData(prevData => ({
              ...prevData,
              elements: prevData.elements.map(el => 
                  el.type === 'pipe' && el.points.join(',') === updatedLines[selectedLine].points.join(',')
                  ? { ...el, data: updatedLines[selectedLine].data }
                  : el
              )
          }));
          setSelectedLine(null);
      } else if (selectedSprinkler !== null) {
          const updatedSprinklers = sprinklers.map((sprinkler, index) => {
              if (index === selectedSprinkler) {
                  return { ...sprinkler, data };
              }
              return sprinkler;
          });
          setSprinklers(updatedSprinklers);
          setProjectData(prevData => ({
              ...prevData,
              elements: prevData.elements.map(el => 
                  el.type === 'sprinkler' && el.id === updatedSprinklers[selectedSprinkler].id
                  ? { ...el, data: updatedSprinklers[selectedSprinkler].data }
                  : el
              )
          }));
          setSelectedSprinkler(null);
      }
  };
  
  const handleDeleteSprinkler = (id) => {
    setSprinklers((currentSprinklers) =>
      currentSprinklers.filter((sprinkler) => sprinkler.id !== id)
    );
    setSelectedSprinkler(null);  // Silinen sprinkler seçili durumdan çıkarılır
    updateSprinklerNumbers();  // Numaralandırmaları güncelle
  
    // Silinen sprinkleri projectData.elements array'inden de kaldırıyoruz
    setProjectData(prevData => ({
      ...prevData,
      elements: prevData.elements.filter(el => !(el.type === 'sprinkler' && el.id === id))
    }));
  };

  const handleDeletePump = () => {
    setPumps([]); // Pompa array'ini boşaltarak tüm pompaları sil
    setSelectedPump(null); // Seçili pompayı sıfırla
    setProjectData(prevData => ({
      ...prevData,
      elements: prevData.elements.filter(el => el.type !== 'pump') // ProjectData'dan pompayı çıkar
    }));
    saveState(); // Durumu kaydet
  };
  
  const updateSprinklerNumbers = () => {
    setSprinklers((currentSprinklers) =>
      currentSprinklers
        .sort((a, b) => a.id - b.id)  // İd'lere göre sıralama
        .map((sprinkler, index) => ({
          ...sprinkler,
          id: index + 1
        }))
    );
  };
  
  const resetDrawing = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
    setStartPoint(null);  // İlk noktayı sıfırla
    setPreviewLine(null); // Önizleme çizgisini sıfırla
  };
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        resetDrawing();  // Esc'ye basıldığında çizim durumunu sıfırla
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
  
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/projects/${id}`);
        const loadedProject = response.data;

        setProjectData({
          ...loadedProject, // Tüm mevcut projectData özelliklerini korur
          information: loadedProject.information || {},
          name: loadedProject.name || 'Proje Adı', // Proje ismini korur
          elements: loadedProject.elements || []
        });
  
        // Boru ve sprinkler verilerini geri yükleyin
        const loadedLines = loadedProject.elements.filter(element => element.type === 'pipe');
        const loadedSprinklers = loadedProject.elements.filter(element => element.type === 'sprinkler');
        const loadedPumps = loadedProject.elements.filter(element => element.type === 'pump');
  
        setLines(loadedLines);
        setSprinklers(loadedSprinklers);
        setPumps(loadedPumps);
      } catch (error) {
        console.error('Proje verisi alınamadı:', error);
      }
    };
  
    fetchProjectData();
  }, [id]);
  
  const renderElements = () => {
    if (!projectData || !projectData.elements) return null;

    return projectData.elements.map((element, index) => {
      if (element.type === 'sprinkler' && element.x !== undefined && element.y !== undefined) {
        return (
          <Circle
            key={index}
            x={element.x}
            y={element.y}
            radius={10}
            fill="blue"
          />
        );
      } else if (element.type === 'pipe' && element.start && element.end) {
        return (
          <Line
            key={index}
            points={[element.start.x, element.start.y, element.end.x, element.end.y]}
            stroke="black"
            strokeWidth={4}
          />
        );
      }
      return null; // Eğer eleman gerekli özelliklere sahip değilse, null döndür
    });
  };

  useEffect(() => {
    // ProjectData güncellendiğinde gerekli işlemleri burada yapabilirsiniz
  }, [projectData]);
  
  const handleSave = async () => {
    try {
      // Hesaplamaları yapmak için calculateProjectData fonksiyonunu çağırın
      const updatedCalculations = calculateProjectData(projectData);
  
      // Hesaplama sonuçlarını projectData içinde güncelleyin
      setProjectData(prevData => ({
        ...prevData,
        calculations: updatedCalculations
      }));
  
      const updatedProjectData = {
        ...projectData, // Mevcut projectData özelliklerini korur
        name: projectData.name, // Proje ismini korur
        elements: [
          ...sprinklers.map(sprinkler => ({
            type: 'sprinkler',
            x: sprinkler.x,
            y: sprinkler.y,
            id: sprinkler.id,
            data: sprinkler.data || {} 
          })),
          ...lines.map(line => ({
            type: 'pipe',
            points: line.points,
            data: {
              diameter: line.data?.diameter || '',  
              length: line.data?.length || '',      
              height: line.data?.height || ''       
            }
          })),
          ...pumps.map(pump => ({
            type: 'pump',
            x: pump.x,
            y: pump.y,
            id: pump.id,
            data: pump.data || {} 
          }))
        ],
      };
  
      await axios.put(`http://localhost:5000/projects/${projectData.customId}`, updatedProjectData);
    } catch (error) {
      console.error('Proje güncellenemedi:', error);
    }
  };
  
  const addElement = (element) => {
    setProjectData(prevData => ({
      ...prevData,
      elements: [...prevData.elements, element]
    }));
  };
  
  return (
    <div>
      <Toolbar 
        selectedTool={selectedTool} 
        setSelectedTool={setSelectedTool} 
        resetDrawing={resetDrawing} 
        undo={undo}
        redo={redo}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        project={projectData}
        saveProject={handleSave}
      />
      <Stage
        width={window.innerWidth}
        height={window.innerHeight * 0.9}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        draggable={false}
        scaleX={scale}
        scaleY={scale}
      >
        <Layer>
          {renderElements()}
          {Array.from({ length: gridCount + 1 }).map((_, i) => (
            <Line
              key={`h-${i}`}
              points={[0, i * gridSize, gridSize * gridCount, i * gridSize]}
              stroke="#ccc"
              strokeWidth={1}
              dash={[4, 4]}
            />
          ))}
          {Array.from({ length: gridCount + 1 }).map((_, i) => (
            <Line
              key={`v-${i}`}
              points={[i * gridSize, 0, i * gridSize, gridSize * gridCount]}
              stroke="#ccc"
              strokeWidth={1}
              dash={[4, 4]}
            />
          ))}
  
          {previewLine && (
            <Line
              points={previewLine.points}
              stroke="#aaa"
              strokeWidth={4}  // Önizleme çizgisi daha kalın
              lineCap="round"
              dash={[10, 10]}
              globalCompositeOperation="source-over"
            />
          )}
  
          {lines.map((line, i) => {
            const isSelected = selectedLine === i;
            const midX = (line.points[0] + line.points[2]) / 2;
            const midY = (line.points[1] + line.points[3]) / 2;
            const { length, height, diameter } = line.data || {};
            const info = `${length || 0 } cm, ${height || 0 } cm`;
  
            return (
              <React.Fragment key={i}>
                <Text
                  x={midX - (line.points[0] === line.points[2] ? 30 : 10)}  // Dikey ise yazıyı sağda hizala, yatay ise ortala
                  y={midY + (line.points[1] === line.points[3] ? -30 : 10)}  // Yatay ise yazıyı aşağıda, dikey ise ortala
                  text={diameter}
                  fontSize={24}
                  fill={'#aaa'}
                  rotation={line.points[0] === line.points[2] ? -90 : 0}  // Dikey ise yazıyı dikey hizala
                />
                <Line
                  points={line.points}
                  stroke={isSelected ? '#f0492b' : '#404040'}  // Seçili ise kırmızı outline, değilse varsayılan renk
                  strokeWidth={isSelected ? 1 : 2}  // Seçili olduğunda daha kalın bir outline
                  lineCap="round"
                  dash={isSelected ? [5, 5] : []}
                  globalCompositeOperation="source-over"
                  onClick={(e) => handleLineClick(e, i)}  // i değerinin doğru şekilde iletildiğinden emin olun
                  onMouseEnter={(e) => e.target.getStage().container().style.cursor = 'pointer'}  // İmleci değiştir
                  onMouseLeave={(e) => e.target.getStage().container().style.cursor = 'default'}  // İmleci varsayılan yap
                  hitStrokeWidth={50}  // Tıklanabilir alanı genişletiyoruz
                />
                <Text
                  x={midX - (line.points[0] === line.points[2] ? -20 : 30)}  // Dikey ise yazıyı sağda hizala, yatay ise ortala
                  y={midY + (line.points[1] === line.points[3] ? 20 : 30)}  // Yatay ise yazıyı aşağıda, dikey ise ortala
                  text={info}
                  fontSize={12}
                  fill={'#aaa'}
                  rotation={line.points[0] === line.points[2] ? -90 : 0}  // Dikey ise yazıyı dikey hizala
                />
              </React.Fragment>
            );
          })}
  
          {sprinklers.map((sprinkler, i) => {
            const isSelected = selectedSprinkler === i;
            return (
              <React.Fragment key={i}>
                <Circle
                  x={sprinkler.x}
                  y={sprinkler.y}
                  radius={10}
                  fill={isSelected ? "#404040" : "#fff" }
                  draggable={false}
                  stroke={'#404040'}
                  strokeWidth={4}
                  onClick={(e) => handleSprinklerClick(e, i)}
                />
                <Text
                  x={sprinkler.x - 25}
                  y={sprinkler.y - 60}
                  text={sprinkler.id ? `SP-${sprinkler.id}` : 'SP'}
                  fontSize={24}
                  fill="#404040"
                />
              </React.Fragment>
            );
          })}

          {pumps.map((pump, i) => (
            <Circle
              key={`pump-${pump.id}`}
              x={pump.x}
              y={pump.y}
              radius={20}
              fill="#404040"
              draggable={true}
              onClick={(e) => handlePumpClick(e, i)}
              onDragEnd={(e) => handlePumpDragEnd(e, i)}
            />
          ))}
        </Layer>
      </Stage>

      {contextMenu.visible && (
        <div 
          className="context-menu visible" 
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px`, position: 'absolute', zIndex: 1000 }}
        >
          <ToolMenu 
            selectedTool={selectedTool} 
            setSelectedTool={setSelectedTool} 
            resetDrawing={resetDrawing} 
          />
        </div>
      )}
      {selectedLine !== null && (
        <PipeInfoPopup
          line={lines[selectedLine]}
          onClose={() => setSelectedLine(null)}
          onSave={handlePopupSave}
          onDelete={() => handleDeleteLine(selectedLine)}
          resetDrawing={resetDrawing}
        />
      )}
      {selectedSprinkler !== null && (
        <SprinklerInfoPopup
          sprinkler={sprinklers[selectedSprinkler]}
          onClose={() => setSelectedSprinkler(null)}
          onDelete={handleDeleteSprinkler}
        />
      )}
      {selectedPump !== null && (
        <PumpInfoPopup
          project={projectData}
          onClose={() => setSelectedPump(null)}
          onDelete={handleDeletePump}
          onSave={handleSave}  // Kaydetme fonksiyonunu ekliyoruz
        />
      )}
    </div>
  );
  };
  
export default DrawingCanvas;  
