import { useEffect, useState } from 'react';

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
    <div className="container">
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
