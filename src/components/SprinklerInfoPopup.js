import React from 'react';

const SprinklerInfoPopup = ({ sprinkler, onClose, onDelete }) => {
  return (
    <>
      <div className="popup-overlay" onClick={onClose}></div>
      <div className="popup-container">
        <div className="popup-content">
          <h3 className="popup-header">SP-{sprinkler.id}</h3>
          <div className="popup-button-container">
            <button onClick={() => onDelete(sprinkler.id)} className="popup-button-save">Sil</button>
            <button onClick={onClose} className="popup-button-cancel"><i className="bi bi-x-lg"></i></button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SprinklerInfoPopup;