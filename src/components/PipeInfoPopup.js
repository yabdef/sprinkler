import React, { useState, useEffect } from 'react';

const equivalentLengths = {
  '90° Standart Dişli Dirsek': { '1"': 0.77, '11/4"': 1.00, '11/2"': 1.20, '2"': 1.50, '21/2"': 1.90, '3"': 2.40, '4"': 3.00, '5"': 3.60, '6"': 4.30 },
  '90° Kaynaklı dirsek': { '1"': 0.36, '11/4"': 0.49, '11/2"': 0.56, '2"': 0.69, '21/2"': 0.88, '3"': 1.10, '4"': 1.40, '5"': 1.70, '6"': 2.00 },
  '45° Dirsek': { '1"': 0.40, '11/4"': 0.55, '11/2"': 0.66, '2"': 0.76, '21/2"': 1.00, '3"': 1.30, '4"': 1.60, '5"': 1.95, '6"': 2.30 },
  'Te (Akışta 90° dönüş)': { '1"': 1.50, '11/4"': 2.10, '11/2"': 2.40, '2"': 2.90, '21/2"': 3.80, '3"': 4.80, '4"': 6.10, '5"': 7.30, '6"': 8.60 },
  'Sürgülü vana': { '1"': 0.38, '11/4"': 0.51, '11/2"': 0.63, '2"': 0.81, '21/2"': 0.92, '3"': 1.10, '4"': 1.40, '5"': 1.60, '6"': 1.95 },
  'Alarm veya çek vana (swing tip)': { '1"': 2.40, '11/4"': 3.20, '11/2"': 3.90, '2"': 5.10, '21/2"': 6.15, '3"': 7.20, '4"': 9.10, '5"': 10.15, '6"': 12.20 },
  'Alarm veya çek vana (mantar tip)': { '1"': 12.00, '11/4"': 19.00, '11/2"': 19.70, '2"': 25.00, '21/2"': 30.00, '3"': 35.00, '4"': 40.00, '5"': 45.00, '6"': 50.00 },
  'Kelebek vana': { '1"': 2.20, '11/4"': 2.90, '11/2"': 3.60, '2"': 4.60, '21/2"': 5.50, '3"': 6.40, '4"': 7.30, '5"': 8.20, '6"': 9.10 },
  'Glob vana': { '1"': 16.00, '11/4"': 21.00, '11/2"': 26.00, '2"': 34.00, '21/2"': 40.00, '3"': 48.00, '4"': 56.00, '5"': 64.00, '6"': 72.00 },
};

const PipeInfoPopup = ({ line, onClose, onSave, onDelete, resetDrawing }) => {
  const [length, setLength] = useState('0');
  const [height, setHeight] = useState('0');
  const [diameter, setDiameter] = useState('1"');
  const [id, setId] = useState(1);
  const [fittings, setFittings] = useState({});
  const [showFittings, setShowFittings] = useState(false);

  const pipeSizes = [
    { value: '1"', label: '1"' },
    { value: '11/4"', label: '11/4"' },
    { value: '11/2"', label: '11/2"' },
    { value: '2"', label: '2"' },
    { value: '21/2"', label: '21/2"' },
    { value: '3"', label: '3"' },
    { value: '4"', label: '4"' },
    { value: '5"', label: '5"' },
    { value: '6"', label: '6"' }
  ];

  useEffect(() => {
    if (line.data) {
      setLength(String(line.data.length ?? 0));
      setHeight(String(line.data.height ?? 0));
      setDiameter(line.data.diameter || '1"');
      setId(line.data.id || 1);
      setFittings(line.data.fittings || {});
    }
  }, [line]);

  useEffect(() => {
    if (resetDrawing) {
      resetDrawing();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    // Eşdeğer uzunluğu hesapla
    let equivalentLength = Object.entries(fittings).reduce((total, [fittingType, count]) => {
      return total + (equivalentLengths[fittingType]?.[diameter] || 0) * (parseInt(count, 10) || 0);
    }, 0);

    const numericFittings = Object.fromEntries(Object.entries(fittings).map(([type, count]) => [type, Number(count) || 0]));

    onSave({
      id,
      length: Number(length) || 0,
      height: Number(height) || 0,
      diameter,
      fittings: numericFittings,
      equivalentLength
    });
  };

  const handleFittingChange = (fittingType, value) => {
    setFittings({
      ...fittings,
      [fittingType]: value,
    });
  };

  return (
    <>
    <div className="popup-overlay" onClick={onClose}></div>
    <div className="popup-container">
      <div className="popup-content">
        <h3 className="popup-header">Boru Bilgisi</h3>
        <div className="popup-labels">
          <label className="popup-label">
            Uzunluk (cm):
            <input 
              autoFocus={true}
              type="number"
              min="0"
              value={length} 
              onChange={(e) => setLength(e.target.value)}
              className="popup-input" 
            />
          </label>
          <label className="popup-label">
            Yükseklik (cm):
            <input 
              type="number"
              value={height} 
              onChange={(e) => setHeight(e.target.value)}
              className="popup-input" 
            />
          </label>
          <label className="popup-label">
            Çap (inç):
            <select 
              value={diameter} 
              onChange={(e) => setDiameter(e.target.value)} 
              className="popup-select"
            >
              {pipeSizes.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <h4
              onClick={() => setShowFittings(!showFittings)} // Toggle durumunu değiştir
              style={{ cursor: 'pointer', userSelect: 'none' }} // Başlığa tıklanabilirlik ekle
            >
            Fittings ve Vanalar {showFittings ? '▲' : '▼'} {/* Aşağı/Yukarı ok simgesi */}
        </h4>
        <div className="popup-fittings">
        {showFittings && (
          Object.keys(equivalentLengths).map(fittingType => (
            <div key={fittingType} className="fitting-container">
              <label className="fitting-label">
                <span className="fitting-label-text">{fittingType}:</span>
                <span className="fitting-label-spacer"></span>
                <input
                  type="number"
                  value={fittings[fittingType] ?? ''}
                  placeholder="0"
                  onChange={(e) => handleFittingChange(fittingType, e.target.value)}
                  className="popup-input"
                  min="0"
                />
              </label>
            </div>
          ))
        )}
        </div>

        <div className="popup-button-container">
          <button onClick={handleSave} className="popup-button-save">Kaydet</button>
          <button onClick={() => onDelete(line.id)} className="popup-button-delete">Sil</button>
          <button onClick={onClose} className="popup-button-cancel"><i className="bi bi-x-lg"></i></button>
        </div>
      </div>
    </div>
    </>
  );
};

export default PipeInfoPopup;
