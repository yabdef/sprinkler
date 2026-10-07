import React, { useState, useEffect } from 'react';

const ProjectPopup = ({ project, onSave, onClose }) => {
  const [name, setName] = useState(project?.name || '');
  const [tehlikeSinifi, settehlikeSinifi] = useState(project?.information?.tehlikeSinifi || 'Orta Tehlike-1');
  const [korumaAlani, setkorumaAlani] = useState(project?.information?.korumaAlani || 'Islak veya Ön Etkili');
  const [boruMalzemesi, setboruMalzemesi] = useState(project?.information?.boruMalzemesi || 'Siyah çelik boru (ıslak veya baskın)');
  const [sprinklerKorumaAlani, setsprinklerKorumaAlani] = useState(project?.information?.sprinklerKorumaAlani || 12);
  const [sprinklerFaktoru, setsprinklerFaktoru] = useState(project?.information?.sprinklerFaktoru || 80);
  const [pompaVerimi, setPompaVerimi] = useState(project?.information?.pompaVerimi || 0.55);

  const [uygulamaAlani, setUygulamaAlani] = useState('');
  const [tasarimYogunlugu, setTasarimYogunlugu] = useState('');
  const [hazenWilliamsKatsayisi, setHazenWilliamsKatsayisi] = useState('');
  const [kritikAlanSprinklerSayisi, setKritikAlanSprinklerSayisi] = useState('');
  const [ilaveYanginDolabiDebisi, setIlaveYanginDolabiDebisi] = useState('');
  const [ilaveHidrantDebisi, setIlaveHidrantDebisi] = useState('');
  const [sistemCalismaSuresi, setSistemCalismaSuresi] = useState('');

  const calculateUygulamaAlani = (tehlikeSinifi, korumaAlani) => {
    if (korumaAlani === "Islak veya Ön Etkili") {
      switch (tehlikeSinifi) {
        case "Düşük Tehlike":
          return 84;
        case "Orta Tehlike-1":
          return 72;
        case "Orta Tehlike-2":
          return 144;
        case "Orta Tehlike-3":
          return 216;
        case "Orta Tehlike-4":
          return 360;
        case "Yüksek Tehlike-1":
        case "Yüksek Tehlike-2":
        case "Yüksek Tehlike-3":
        case "Yüksek Tehlike-4":
          return 260;
        default:
          return "Hata";
      }
    } else if (korumaAlani === "Kuru veya Değişken") {
      switch (tehlikeSinifi) {
        case "Düşük Tehlike":
          return 72;
        case "Orta Tehlike-1":
          return 90;
        case "Orta Tehlike-2":
          return 180;
        case "Orta Tehlike-3":
          return 270;
        case "Orta Tehlike-4":
          return 260;
        case "Yüksek Tehlike-1":
        case "Yüksek Tehlike-2":
        case "Yüksek Tehlike-3":
        case "Yüksek Tehlike-4":
          return 325;
        default:
          return "Hata";
      }
    } else {
      return "Hata";
    }
  };
  
  const calculateTasarimYogunlugu = (tehlikeSinifi) => {
    switch (tehlikeSinifi) {
      case "Düşük Tehlike":
        return 2.25;
      case "Orta Tehlike-1":
      case "Orta Tehlike-2":
      case "Orta Tehlike-3":
      case "Orta Tehlike-4":
        return 5;
      case "Yüksek Tehlike-1":
        return 7.7;
      case "Yüksek Tehlike-2":
        return 10;
      case "Yüksek Tehlike-3":
        return 12.5;
      case "Yüksek Tehlike-4":
        return "Yoğun Su";
      default:
        return "Hata";
    }
  };
  
  const calculateHazenWilliamsKatsayisi = (boruMalzemesi) => {
    switch (boruMalzemesi) {
      case "Dikişsiz döküm demir veya düktil demir":
        return 100;
      case "İçi çimento kaplı düktil demir":
        return 140;
      case "Siyah çelik boru (kuru veya ön etkili)":
        return 100;
      case "Siyah çelik boru (ıslak veya baskın)":
        return 120;
      case "Galvaniz boru":
        return 120;
      case "Plastik":
      case "Bakır veya paslanmaz çelik":
        return 150;
      default:
        return "Hata";
    }
  };
  
  const calculateKritikAlanSprinklerSayisi = (uygulamaAlani, sprinklerKorumaAlani) => {
    return Math.ceil(uygulamaAlani / sprinklerKorumaAlani);
  };
  
  const calculateIlaveYanginDolabiDebisi = (tehlikeSinifi) => {
    if (["Düşük Tehlike", "Orta Tehlike-1", "Orta Tehlike-2", "Orta Tehlike-3", "Orta Tehlike-4"].includes(tehlikeSinifi)) {
      return 100;
    } else if (["Yüksek Tehlike-1", "Yüksek Tehlike-2", "Yüksek Tehlike-3", "Yüksek Tehlike-4"].includes(tehlikeSinifi)) {
      return 200;
    } else {
      return "Hata";
    }
  };
  
  const calculateIlaveHidrantDebisi = (tehlikeSinifi) => {
    if (["Düşük Tehlike", "Orta Tehlike-1", "Orta Tehlike-2"].includes(tehlikeSinifi)) {
      return 400;
    } else if (["Orta Tehlike-3", "Orta Tehlike-4"].includes(tehlikeSinifi)) {
      return 1000;
    } else if (["Yüksek Tehlike-1", "Yüksek Tehlike-2", "Yüksek Tehlike-3", "Yüksek Tehlike-4"].includes(tehlikeSinifi)) {
      return 1500;
    } else {
      return "Hata";
    }
  };
  
  const calculateSistemCalismaSuresi = (tehlikeSinifi) => {
    if (["Orta Tehlike-1", "Orta Tehlike-2", "Orta Tehlike-3", "Orta Tehlike-4"].includes(tehlikeSinifi)) {
      return 60;
    } else if (["Yüksek Tehlike-1", "Yüksek Tehlike-2", "Yüksek Tehlike-3", "Yüksek Tehlike-4"].includes(tehlikeSinifi)) {
      return 90;
    } else {
      return 30;
    }
  };

  useEffect(() => {
    const calculatedUygulamaAlani = calculateUygulamaAlani(tehlikeSinifi, korumaAlani);
    setUygulamaAlani(isNaN(calculatedUygulamaAlani) ? "Hata" : calculatedUygulamaAlani);

    const calculatedTasarimYogunlugu = calculateTasarimYogunlugu(tehlikeSinifi);
    setTasarimYogunlugu(isNaN(calculatedTasarimYogunlugu) ? "Hata" : calculatedTasarimYogunlugu);

    const calculatedHazenWilliamsKatsayisi = calculateHazenWilliamsKatsayisi(boruMalzemesi);
    setHazenWilliamsKatsayisi(isNaN(calculatedHazenWilliamsKatsayisi) ? "Hata" : calculatedHazenWilliamsKatsayisi);

    const calculatedKritikAlanSprinklerSayisi = calculateKritikAlanSprinklerSayisi(calculatedUygulamaAlani, sprinklerKorumaAlani);
    setKritikAlanSprinklerSayisi(isNaN(calculatedKritikAlanSprinklerSayisi) ? "Hata" : calculatedKritikAlanSprinklerSayisi);

    const calculatedIlaveYanginDolabiDebisi = calculateIlaveYanginDolabiDebisi(tehlikeSinifi);
    setIlaveYanginDolabiDebisi(isNaN(calculatedIlaveYanginDolabiDebisi) ? "Hata" : calculatedIlaveYanginDolabiDebisi);

    const calculatedIlaveHidrantDebisi = calculateIlaveHidrantDebisi(tehlikeSinifi);
    setIlaveHidrantDebisi(isNaN(calculatedIlaveHidrantDebisi) ? "Hata" : calculatedIlaveHidrantDebisi);

    const calculatedSistemCalismaSuresi = calculateSistemCalismaSuresi(tehlikeSinifi);
    setSistemCalismaSuresi(isNaN(calculatedSistemCalismaSuresi) ? "Hata" : calculatedSistemCalismaSuresi);
  }, [tehlikeSinifi, korumaAlani, boruMalzemesi, sprinklerKorumaAlani]);

  const handleSave = () => {
    onSave({
      name,
      tehlikeSinifi,
      korumaAlani,
      boruMalzemesi,
      sprinklerKorumaAlani,
      sprinklerFaktoru,
      uygulamaAlani,
      tasarimYogunlugu,
      hazenWilliamsKatsayisi,
      kritikAlanSprinklerSayisi,
      ilaveYanginDolabiDebisi,
      ilaveHidrantDebisi,
      sistemCalismaSuresi,
      pompaVerimi
    });
  };

  const $tehlikeSinifi = [
    {name: 'Düşük Tehlike'},
    {name: 'Orta Tehlike-1', default: true},
    {name: 'Orta Tehlike-2'},
    {name: 'Orta Tehlike-3'},
    {name: 'Orta Tehlike-4'},
    {name: 'Yüksek Tehlike-1'},
    {name: 'Yüksek Tehlike-2'},
    {name: 'Yüksek Tehlike-3'},
    {name: 'Yüksek Tehlike-4'},
  ];

  const $korumaAlani = [
    {name: 'Islak veya Ön Etkili', default: true},
    {name: 'Kuru veya Değişken'},
  ];

  const $boruMalzemesi = [
    {name: 'Dikişsiz döküm demir veya düktil demir'},
    {name: 'İçi çimento kaplı düktil demir'},
    {name: 'Siyah çelik boru (kuru veya ön etkili)'},
    {name: 'Siyah çelik boru (ıslak veya baskın)', default: true},
    {name: 'Galvaniz boru'},
    {name: 'Plastik'},
    {name: 'Bakır veya Paslanmaz Çelik'}
  ];

  return (
    <>
      <div className="popup-overlay" onClick={onClose}></div> {/* Arka plan overlay */}
      <div className="popup">
        <h3>Proje Bilgileri</h3>
        <div className='popup-form-container'>
          <div className='form-container'>
            <div className="form-group">
              <label>Proje Adı:</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Tehlike Sınıfı:</label>
              <select 
                value={tehlikeSinifi} 
                onChange={(e) => settehlikeSinifi(e.target.value)} 
                className="form-control"
              >
                <option value="">Seçiniz...</option>
                {$tehlikeSinifi.map((x) => (
                  <option key={x.name} value={x.name}>{x.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Koruma Alanı:</label>
              <select 
                value={korumaAlani} 
                onChange={(e) => setkorumaAlani(e.target.value)} 
                className="form-control"
              >
                <option value="">Seçiniz...</option>
                {$korumaAlani.map((x) => (
                  <option key={x.name} value={x.name}>{x.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Boru Malzemesi:</label>
              <select 
                value={boruMalzemesi} 
                onChange={(e) => setboruMalzemesi(e.target.value)} 
                className="form-control"
              >
                <option value="">Seçiniz...</option>
                {$boruMalzemesi.map((x) => (
                  <option key={x.name} value={x.name}>{x.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Sprinkler Koruma Alanı, m²:</label>
              <input 
                type="number" 
                value={sprinklerKorumaAlani} 
                onChange={(e) => setsprinklerKorumaAlani(e.target.value)} 
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Sprinkler Faktörü, K:</label>
              <input 
                type="number" 
                value={sprinklerFaktoru} 
                onChange={(e) => setsprinklerFaktoru(e.target.value)} 
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Pompa Verimi:</label>
              <input 
                type="text" 
                value={pompaVerimi} 
                onChange={(e) => setPompaVerimi(Number(e.target.value))} 
                className="form-control"
              />
            </div>
            <div className="form-group">
              <button onClick={handleSave} className="save">Kaydet</button>
              <button onClick={onClose} className="btn btn-secondary cancel"><i className="bi bi-x-lg"></i></button>
            </div>
          </div>
          <div className='calculations'>
            <div className="form-group">
              <label>Hesaplanan Uygulama Alanı:</label>
              <input 
                type="text" 
                disabled
                value={uygulamaAlani} 
                readOnly 
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Hesaplanan Tasarım Yoğunluğu:</label>
              <input 
                type="text"
                disabled 
                value={tasarimYogunlugu} 
                readOnly 
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Hesaplanan Hazen Williams Katsayısı:</label>
              <input 
                type="text"
                disabled
                value={hazenWilliamsKatsayisi} 
                readOnly 
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Kritik Alan Sprinkler Sayısı:</label>
              <input 
                type="text"
                disabled
                value={kritikAlanSprinklerSayisi} 
                readOnly 
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>İlave Yangın Dolabı Debisi:</label>
              <input 
                type="text"
                disabled
                value={ilaveYanginDolabiDebisi} 
                readOnly 
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>İlave Hidrant Debisi:</label>
              <input 
                type="text"
                disabled
                value={ilaveHidrantDebisi} 
                readOnly 
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Sistem Çalışma Süresi:</label>
              <input 
                type="text"
                disabled
                value={sistemCalismaSuresi} 
                readOnly 
                className="form-control"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProjectPopup;