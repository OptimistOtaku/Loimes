import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import './index.css';
import Home from './Home';
import ViewMessages from './ViewMessages';
import Auth from './Auth';

function AppRouter() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('token'));
  const navigate = useNavigate();

  const handleAuth = () => {
    setAuthed(true);
    navigate('/');
  };

  if (!authed) return <Auth onAuth={handleAuth} />;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/view" element={<ViewMessages />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  </StrictMode>,
);
