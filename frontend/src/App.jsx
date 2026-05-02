import { useEffect, useState } from 'react';
import axios from 'axios';

export default function App() {
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    axios.get('/api/health')
      .then(res => setStatus(res.data.message))
      .catch(() => setStatus('Could not reach the backend'));
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Hardware Store System</h1>
      <p>API status: <strong>{status}</strong></p>
      <p style={{ color: '#888', fontSize: '0.9rem' }}>
        This confirms React → Nginx → Express → Postgres is all connected.
        We will replace this page with the real UI in Phase 2.
      </p>
    </div>
  );
}
