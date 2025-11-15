import React, { useState } from 'react';
import Admin from './Admin';
import Login from './Login';

export default function App(){
  const [user, setUser] = useState(null);

  return (
    <div className="container">
      {!user ? <Login onLogin={(u)=>setUser(u)} /> : <Admin user={user} onLogout={()=>setUser(null)} />}
    </div>
  );
}
