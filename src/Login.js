import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Login({ onLogin }){
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn(e){
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Check your email for a magic link to sign in.');
    }
    setLoading(false);
  }

  return (
    <div className="card">
      <h2>Admin login</h2>
      <p className="small">Sign in with your email (magic link). Create an admin account in Supabase Auth beforehand.</p>
      <form onSubmit={signIn} style={{display:'grid', gap:10}}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com" />
        <div style={{display:'flex', gap:8}}>
          <button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send magic link'}</button>
        </div>
      </form>
    </div>
  );
}
