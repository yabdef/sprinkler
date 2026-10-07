import React from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import CadWorkspace from './components/CadWorkspace';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../src/styles/main.scss';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/project/:id" element={<CadWorkspace />} />
      </Routes>
    </Router>
  );
};

export default App;
