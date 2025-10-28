// src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import TicketForm from './components/TicketForm';

function Placeholder({ title }) {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p>Coming soon.</p>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tickets/new" element={<TicketForm />} />
        <Route path="/tickets" element={<Placeholder title="Tickets" />} />
        <Route path="/rate-cards" element={<Placeholder title="Rate Cards" />} />
        <Route path="/reports" element={<Placeholder title="Reports" />} />
        {/* Catch-all to Home */}
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  );
}


export default App;
