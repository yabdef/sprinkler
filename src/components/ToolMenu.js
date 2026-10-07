import React from 'react';
import 'bootstrap-icons/font/bootstrap-icons.css';

const ToolMenu = ({ selectedTool, setSelectedTool, resetDrawing }) => {
  const handleToolClick = (tool) => {
    resetDrawing();  // Çizim durumunu sıfırla
    setSelectedTool(tool);
  };

  return (
    <div className="toolbar-menu">
      <button 
        style={{background: '#ef65a5'}}
        onClick={() => handleToolClick('sprinkler')} 
        className={`btn btn-light mx-1 ${selectedTool === 'sprinkler' ? 'active' : ''}`}
      >
        <i className="bi bi-slash-circle-fill"></i> Sprinkler
      </button>
      <button 
        style={{background: '#ef65a5'}}
        onClick={() => handleToolClick('pipe')} 
        className={`btn btn-light mx-1 ${selectedTool === 'pipe' ? 'active' : ''}`}
      >
        <i className="bi bi-circle"></i> Boru
      </button>
      <button 
        style={{background: '#ef65a5'}}
        onClick={() => handleToolClick('pump')} 
        className={`btn btn-light mx-1 ${selectedTool === 'pump' ? 'active' : ''}`}
      >
        <i className="bi bi-gear-wide-connected"></i> Pompa
      </button>
    </div>
  );
};

export default ToolMenu;