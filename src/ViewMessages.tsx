import { useEffect, useState } from 'react';
import Hrad from './assets/icons/hrad.svg';
import Hrui from './assets/icons/hrui.svg';
import Bird from './assets/icons/bird.svg';

export default function ViewMessages() {
  const [envelopes, setEnvelopes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:4000/api/envelopes', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setEnvelopes(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container" style={{ position: 'relative', overflow: 'visible' }}>
      {/* Decorative SVG Bird left */}
      <img src={Bird} alt="Bird" style={{ position: 'absolute', left: -60, top: '50%', width: 60, opacity: 0.8, zIndex: 0, transform: 'translateY(-50%)' }} />
      {/* Decorative SVG Bird right (mirrored) */}
      <img src={Bird} alt="Bird" style={{ position: 'absolute', right: -60, top: '50%', width: 60, opacity: 0.8, zIndex: 0, transform: 'scaleX(-1) translateY(-50%)' }} />
      <h1>All Envelope Messages</h1>
      <a href="/" style={{ color: '#ff3366', fontWeight: 500 }}>&larr; Back to Home</a>
      <div className="envelope-list love-grid" style={{ marginTop: 24 }}>
        {loading ? (
          <div>Loading...</div>
        ) : envelopes.length === 0 ? (
          <div>No messages yet.</div>
        ) : (
          envelopes.map(env => (
            <div className="envelope-thumbnail love-thumb" key={env.id}>
              <div className="envelope-flap" />
              <div className="envelope-body">
                {/* Show hrad.svg for adi padi, hrui.svg for rui pui */}
                {env.sender === 'adi padi' && (
                  <img src={Hrad} alt="Adi Padi Icon" style={{ width: 32, height: 32, marginBottom: 6 }} />
                )}
                {env.sender === 'rui pui' && (
                  <img src={Hrui} alt="Rui Pui Icon" style={{ width: 32, height: 32, marginBottom: 6 }} />
                )}
                <div className="envelope-content">{env.content}</div>
                <div className="envelope-sender">From: {env.sender}</div>
                <div className="envelope-date">{new Date(env.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
