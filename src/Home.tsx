import { useState } from 'react';
import EnvelopeIcon from './assets/icons/envelope.svg';
import Bird from './assets/icons/bird.svg';

export default function Home() {
  const [sender, setSender] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/envelopes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sender, content })
      });
      if (!res.ok) throw new Error('Failed to send message');
      setSuccess(true);
      setContent('');
    } catch (err) {
      setError('Could not send message.');
    }
    setLoading(false);
  };

  return (
    <div className="container" style={{ position: 'relative', overflow: 'visible' }}>
      {/* Decorative SVG Bird left */}
      <img src={Bird} alt="Bird" style={{ position: 'absolute', left: -60, top: '50%', width: 60, opacity: 0.8, zIndex: 0, transform: 'translateY(-50%)' }} />
      {/* Decorative SVG Bird right (mirrored) */}
      <img src={Bird} alt="Bird" style={{ position: 'absolute', right: -60, top: '50%', width: 60, opacity: 0.8, zIndex: 0, transform: 'scaleX(-1) translateY(-50%)' }} />
      <h1>Welcome to Envelope Message Board</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: 24, display: 'flex', flexDirection: 'row', gap: 40, alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 700 }}>
        <input
          placeholder="Your name"
          value={sender}
          onChange={e => setSender(e.target.value)}
          required
          style={{ flex: 1, minWidth: 120, maxWidth: 180, height: 48, fontSize: '1.1em' }}
        />
        <input
          placeholder="Message"
          value={content}
          onChange={e => setContent(e.target.value)}
          required
          style={{ flex: 2, minWidth: 120, maxWidth: 320, height: 48, fontSize: '1.1em' }}
        />
        <button type="submit" disabled={loading} className="custom-bg" style={{ position: 'relative', minWidth: 140, height: 48, marginLeft: 0, display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: 8 }}> {loading ? 'Sending...' : 'Send Envelope'} </span>
          <img src={EnvelopeIcon} className="button-icon" alt="Envelope" style={{ width: 40, height: 34 }} />
        </button>
      </form>
      {success && <div style={{ color: 'green', marginBottom: 8 }}>Message sent!</div>}
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <a href="/view" style={{ color: '#646cff', fontWeight: 500 }}>View Messages →</a>
    </div>
  );
}
