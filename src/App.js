// src/App.js
import React, { useEffect, useState } from 'react';
import Admin from './Admin';
import Login from './Login';
import { supabase } from './supabaseClient';

export default function App(){
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth changes (sign in / sign out)
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription?.unsubscribe?.();
  }, []);

  // On load, check existing session or try to read session from URL (magic link redirect)
  useEffect(() => {
    let mounted = true;
    async function init() {
      // If Supabase injected session into URL after magic link, extract & store it
      try {
        // getSessionFromUrl will parse the URL and store session in local storage (if present)
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (error && error.message && !error.message.includes('No URL to parse')) {
          console.warn('getSessionFromUrl error:', error.message);
        }
      } catch (e) {
        // ignore non-fatal parsing issues
      }

      // After attempting to parse, fetch current session
      const { data: current } = await supabase.auth.getSession();
      if (mounted) setUser(current?.session?.user ?? null);
      if (mounted) setLoading(false);
    }
    init();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div style={{padding:20}}>Checking login…</div>;

  return (
    <div style={{maxWidth:980, margin:'24px auto', padding:16}}>
      {!user ? <Login /> : <Admin user={user} onLogout={async ()=>{ await supabase.auth.signOut(); setUser(null); }} />}
    </div>
  );
} 
