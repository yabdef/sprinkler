import React, { Suspense } from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../src/styles/main.scss';

const CadWorkspace = React.lazy(() => import('./components/CadWorkspace'));

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/project/:id" element={<Suspense fallback={<main className="missing-project"><p>Çizim alanı yükleniyor…</p></main>}><CadWorkspace /></Suspense>} />
      </Routes>
    </Router>
  );
};

export default App;
