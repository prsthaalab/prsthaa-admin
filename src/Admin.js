import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function Admin({ user, onLogout }){
  const [products, setProducts] = useState([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ fetchProducts() }, []);

  async function fetchProducts(){
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return console.error(error);
    setProducts(data || []);
  }

  async function uploadFile(file){
    const name = `product-images/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(name, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    return data.path;
  }

  async function addProduct(e){
    e.preventDefault();
    if (!title || !price) return alert('Add title and price');
    setLoading(true);
    try {
      let images = [];
      if (file) {
        const p = await uploadFile(file);
        images.push(p);
      }
      const { data, error } = await supabase
        .from('products')
        .insert([{ title, category, price: parseFloat(price), description, images }])
        .select();
      if (error) throw error;
      setTitle(''); setCategory(''); setPrice(''); setDescription(''); setFile(null);
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Error: '+err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(id){
    if (!confirm('Delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return alert('Delete failed: '+error.message);
    fetchProducts();
  }

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <h2>Admin Panel</h2>
        <div>
          <button className="secondary" onClick={async ()=>{ await supabase.auth.signOut(); onLogout(); }}>Logout</button>
        </div>
      </div>

      <div className="card">
        <h3>Add product</h3>
        <form onSubmit={addProduct} style={{display:'grid', gap:8}}>
          <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <input placeholder="Category" value={category} onChange={e=>setCategory(e.target.value)} />
          <input placeholder="Price" value={price} onChange={e=>setPrice(e.target.value)} />
          <textarea placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)} />
          <input type="file" onChange={e=>setFile(e.target.files[0])} />
          <div style={{display:'flex', gap:8}}>
            <button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add product'}</button>
            <button type="button" className="secondary" onClick={()=>{ setTitle(''); setCategory(''); setPrice(''); setDescription(''); setFile(null); }}>Clear</button>
          </div>
        </form>
      </div>

      <div style={{marginTop:12}}>
        <h3>Products</h3>
        {products.map(p => (
          <div key={p.id} className="card" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{display:'flex', gap:12, alignItems:'center'}}>
              {p.images && p.images[0] ? <img className="thumb" src={`${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/${p.images[0]}`} alt="" /> : <div style={{width:80,height:80,background:'#eee',borderRadius:6}} />}
              <div>
                <div style={{fontWeight:700}}>{p.title}</div>
                <div className="small">₹{p.price}</div>
                <div className="small">{p.category}</div>
              </div>
            </div>
            <div>
              <button onClick={()=>deleteProduct(p.id)} style={{background:'#ef4444'}}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
