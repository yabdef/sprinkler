import React, { useState } from 'react';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CalculationResultPopup from './CalculationResultPopup';
import { calculateProjectData } from './Calculate';

const Toolbar = ({ selectedTool, setSelectedTool, resetDrawing, undo, redo, canUndo, canRedo, project }) => {
  const navigate = useNavigate();
  const [showCalculationPopup, setShowCalculationPopup] = useState(false);
  const [calculationResult, setCalculationResult] = useState(null);

  const handleCalculate = async () => {
    const calculationResults = calculateProjectData(project);
    setCalculationResult(calculationResults);
    setShowCalculationPopup(true);
    await saveProject(calculationResults);
  };

  const handleToolClick = (tool) => {
    resetDrawing(); 
    setSelectedTool(tool);
  };

  const handleBackClick = () => {
    navigate(`/`);
  };

  const saveProject = async (calculationResults = {}) => {
    try {
      let results = Object.keys(calculationResults).length > 0 ? {...calculationResults} : project.calculations;
      const sanitizedProject = {
        customId: project.customId,
        name: project.name,
        elements: project.elements.map(element => ({
          ...element,
          data: {
            ...element.data
          }
        })),
        information: {
          tehlikeSinifi: project.information.tehlikeSinifi,
          korumaAlani: project.information.korumaAlani,
          boruMalzemesi: project.information.boruMalzemesi,
          sprinklerKorumaAlani: project.information.sprinklerKorumaAlani,
          sprinklerFaktoru: project.information.sprinklerFaktoru,
          uygulamaAlani:project.information.uygulamaAlani,
          tasarimYogunlugu:project.information.tasarimYogunlugu,
          hazenWilliamsKatsayisi:project.information.hazenWilliamsKatsayisi,
          kritikAlanSprinklerSayisi:project.information.kritikAlanSprinklerSayisi,
          ilaveYanginDolabiDebisi:project.information.ilaveYanginDolabiDebisi,
          ilaveHidrantDebisi:project.information.ilaveHidrantDebisi,
          sistemCalismaSuresi:project.information.sistemCalismaSuresi,
          pompaVerimi:project.information.pompaVerimi,
        },
        calculations: results,
        updatedAt: Date.now(),
      };
      await axios.put(`http://localhost:5000/projects/${project.customId}`, sanitizedProject);
    } catch (error) {
      console.error('Proje güncellenemedi:', error);
    }
  };
  
  return (
    <div>
      <div className="toolbar">
        <button 
          onClick={() => handleToolClick('sprinkler')} 
          className={`btn btn-light mx-1 ${selectedTool === 'sprinkler' ? 'active' : ''}`}
        >
          <i className="bi bi-slash-circle-fill"></i> Sprinkler
        </button>
        <button 
          onClick={() => handleToolClick('pipe')} 
          className={`btn btn-light mx-1 ${selectedTool === 'pipe' ? 'active' : ''}`}
        >
          <i className="bi bi-circle"></i> Boru
        </button>
        <button 
          onClick={() => handleToolClick('pump')} 
          className={`btn btn-light mx-1 ${selectedTool === 'pump' ? 'active' : ''}`}
        >
          <i className="bi bi-gear-wide-connected"></i> Pompa
        </button>
      </div>
      <div className='controlbar'>
        <button 
          onClick={handleBackClick} 
          className="btn btn-light mx-1"
        >
          <i className="bi bi-arrow-left"></i> Ana Ekran
        </button>
        <button 
          onClick={undo} 
          disabled={!canUndo} 
          className="btn btn-light mx-1"
        >
          <i className="bi bi-arrow-counterclockwise"></i> Geri Al
        </button>
        <button 
          onClick={redo} 
          disabled={!canRedo} 
          className="btn btn-light mx-1"
        >
          <i className="bi bi-arrow-clockwise"></i> Yinele
        </button>
        <button 
          onClick={() => saveProject()} 
          className="btn btn-light mx-1"
        >
          <i className="bi bi-floppy-fill"></i> Kaydet
        </button>
        <button 
          onClick={handleCalculate} 
          className="btn btn-light mx-1"
        >
          <i className="bi bi-calculator-fill"></i> Hesapla
        </button>
      </div>
      {showCalculationPopup && (
        <CalculationResultPopup
          result={calculationResult}
          onClose={() => setShowCalculationPopup(false)}
        />
      )}
    </div>
  );
};

export default Toolbar;