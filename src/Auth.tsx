import { useState } from 'react';

export default function Auth({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`/api/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      let data;
      const text = await res.text();
      
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Response parse error:', e);
        throw new Error(`Invalid response: ${text}`);
      }

      if (!res.ok) {
        throw new Error(data.error || `${res.status} ${res.statusText}`);
      }

      if (mode === 'login') {
        if (!data.token) {
          throw new Error('No token received');
        }
        localStorage.setItem('token', data.token);
        onAuth();
      } else {
        setMode('login');
        setUsername('');
        setPassword('');
        setError('Registration successful! Please login.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <input
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          disabled={loading}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          disabled={loading}
        />
        <button type="submit" disabled={loading} className="custom-bg">
          {loading ? (mode === 'login' ? 'Logging in...' : 'Registering...') : (mode === 'login' ? 'Login' : 'Register')}
        </button>
      </form>
      {error && <div style={{ color: error.includes('successful') ? 'green' : 'red', marginBottom: 8 }}>{error}</div>}
      <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ background: 'none', color: '#646cff', border: 'none', cursor: 'pointer' }}>
        {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
      </button>
    </div>
  );
}
