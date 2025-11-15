// src/Admin.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

/*
  Features:
  - Add product (multiple images)
  - Edit product (update fields + add images)
  - Delete single / bulk delete
  - Search & filter
  - CSV export
*/

function bytesToSize(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

export default function Admin({ user, onLogout }){
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editing, setEditing] = useState(null);

  // form state
  const emptyForm = { title:'', category:'', price:'', description:'', images: [], available: true, sku:'', stock:0, tags: '' };
  const [form, setForm] = useState(emptyForm);
  const [uploadFiles, setUploadFiles] = useState([]); // File objects staged for upload

  useEffect(()=>{ fetchProducts(); }, []);

  async function fetchProducts() {
    setLoading(true);
    let q = supabase.from('products').select('*').order('created_at', {ascending:false});
    const { data, error } = await q;
    if (error) { console.error('fetchProducts', error); setLoading(false); return; }
    setProducts(data || []);
    setLoading(false);
  }

  // Upload a single file to Supabase storage and return path
  async function uploadFileToStorage(file) {
    const name = `product-images/${Date.now()}_${file.name.replace(/\s+/g,'_')}`;
    const { data, error } = await supabase.storage.from('product-images').upload(name, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    return data.path;
  }

  async function handleAddOrUpdate(e) {
    e.preventDefault();
    if (!form.title || !form.price) { alert('Title and price required'); return; }
    setLoading(true);
    try {
      // upload staged files
      const newPaths = [];
      for (const f of uploadFiles) {
        const p = await uploadFileToStorage(f);
        newPaths.push(p);
      }
      // images: combine existing form.images (paths) and newPaths
      const imagesPaths = (form.images || []).concat(newPaths);

      const payload = {
        title: form.title,
        category: form.category,
        price: parseFloat(form.price) || 0,
        description: form.description,
        images: imagesPaths,
        available: !!form.available,
        sku: form.sku || null,
        stock: parseInt(form.stock || 0, 10) || 0,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };

      if (editing) {
        // update existing
        const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
        if (error) throw error;
        setEditing(null);
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
      }

      setForm(emptyForm);
      setUploadFiles([]);
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Error: ' + (err.message || 'Unknown'));
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    setUploadFiles((cur) => cur.concat(files));
  }

  function removeStagedFile(i) {
    setUploadFiles(cur => cur.filter((_, idx) => idx !== i));
  }

  function startEdit(p) {
    setEditing(p);
    setForm({
      title: p.title || '',
      category: p.category || '',
      price: p.price || '',
      description: p.description || '',
      images: p.images || [],
      available: p.available,
      sku: p.sku || '',
      stock: p.stock || 0,
      tags: (p.tags && Array.isArray(p.tags)) ? p.tags.join(', ') : (p.tags || '')
    });
    setUploadFiles([]);
    window.scrollTo({top:0, behavior:'smooth'});
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return alert('Delete failed: ' + error.message);
    fetchProducts();
  }

  async function bulkDelete() {
    if (selected.size === 0) return alert('Select products to delete');
    if (!confirm(`Delete ${selected.size} products?`)) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from('products').delete().in('id', ids);
    if (error) return alert('Bulk delete failed: ' + error.message);
    setSelected(new Set());
    fetchProducts();
  }

  function toggleSelect(id) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  }

  function exportCSV() {
    if (!products || products.length === 0) return alert('No products');
    const headers = ['id','title','category','price','sku','stock','available','tags','images','description','created_at'];
    const rows = products.map(p => [
      p.id || '', p.title || '', p.category || '', p.price||'', p.sku||'', p.stock||0, p.available ? '1':'0',
      (p.tags && Array.isArray(p.tags)) ? p.tags.join('|') : (p.tags || ''),
      (p.images && Array.isArray(p.images)) ? p.images.join('|') : '',
      (p.description || '').replace(/"/g,'""'),
      p.created_at || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products_export.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // filtered list
  const filtered = products.filter(p => {
    const q = query.trim().toLowerCase();
    if (q) {
      const inTitle = (p.title||'').toLowerCase().includes(q);
      const inCat = (p.category||'').toLowerCase().includes(q);
      const inTags = (p.tags && Array.isArray(p.tags)) ? p.tags.join(' ').toLowerCase().includes(q) : false;
      if (!(inTitle || inCat || inTags)) return false;
    }
    if (categoryFilter) {
      if ((p.category||'') !== categoryFilter) return false;
    }
    return true;
  });

  // helper to get image URL for preview (public bucket)
  function publicUrlFor(path) {
    if (!path) return null;
    // storage public object URL format:
    // {SUPABASE_URL}/storage/v1/object/public/{path}
    return `${process.env.REACT_APP_SUPABASE_URL.replace(/\\/$/,'')}/storage/v1/object/public/${path}`;
  }

  // category options from products
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <h2>Admin Panel</h2>
        <div style={{display:'flex', gap:8}}>
          <button onClick={exportCSV}>Export CSV</button>
          <button className="secondary" onClick={() => { supabase.auth.signOut(); onLogout && onLogout(); }}>Logout</button>
        </div>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <form onSubmit={handleAddOrUpdate} style={{display:'grid', gap:8}}>
          <div style={{display:'flex', gap:8}}>
            <input placeholder="Title" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} style={{flex:2}} />
            <input placeholder="Category" value={form.category} onChange={e=>setForm({...form, category:e.target.value})} style={{flex:1}} />
            <input placeholder="SKU" value={form.sku} onChange={e=>setForm({...form, sku:e.target.value})} style={{width:120}} />
            <input placeholder="Stock" value={form.stock} onChange={e=>setForm({...form, stock:e.target.value})} style={{width:100}} />
          </div>
          <div style={{display:'flex', gap:8}}>
            <input placeholder="Price" value={form.price} onChange={e=>setForm({...form, price:e.target.value})} style={{width:120}} />
            <label style={{display:'flex', alignItems:'center', gap:6}}>
              <input type="checkbox" checked={form.available} onChange={e=>setForm({...form, available:e.target.checked})} /> Available
            </label>
            <input placeholder="Tags (comma separated)" value={form.tags} onChange={e=>setForm({...form, tags:e.target.value})} />
          </div>
          <textarea placeholder="Short description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
          <div>
            <label style={{display:'block', marginBottom:6}}>Add images (multiple)</label>
            <input type="file" accept="image/*" multiple onChange={handleFileSelect} />
            {uploadFiles.length > 0 && (
              <div style={{display:'flex', gap:8, marginTop:8}}>
                {uploadFiles.map((f,i)=>(
                  <div key={i} style={{width:90, textAlign:'center'}}>
                    <div style={{height:60, overflow:'hidden', borderRadius:6}}>
                      <img src={URL.createObjectURL(f)} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    </div>
                    <div style={{fontSize:12, marginTop:4}}>{f.name.slice(0,15)} ({bytesToSize(f.size)})</div>
                    <button type="button" className="secondary" onClick={()=>removeStagedFile(i)} style={{marginTop:6}}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* existing images preview (if editing or form.images present) */}
          {form.images && form.images.length > 0 && (
            <div style={{display:'flex', gap:8, marginTop:8, flexWrap:'wrap'}}>
              {form.images.map((p, idx)=>(
                <div key={idx} style={{width:90}}>
                  <img src={publicUrlFor(p)} alt="" style={{width:90, height:70, objectFit:'cover', borderRadius:6}} />
                  <div style={{fontSize:12, marginTop:4}}>{p.split('/').pop()}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{display:'flex', gap:8}}>
            <button type="submit" disabled={loading}>{editing ? 'Update product' : 'Add product'}</button>
            <button type="button" className="secondary" onClick={()=>{ setForm(emptyForm); setEditing(null); setUploadFiles([]); }}>Clear</button>
          </div>
        </form>
      </div>

      <div style={{display:'flex', gap:12, marginBottom:12, alignItems:'center'}}>
        <input placeholder="Search by title, category, tags" value={query} onChange={e=>setQuery(e.target.value)} style={{flex:1}} />
        <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories.map(c=> <option value={c} key={c}>{c}</option>)}
        </select>
        <button className="secondary" onClick={()=>{ setSelected(new Set()); setQuery(''); setCategoryFilter(''); }}>Reset</button>
        <button onClick={bulkDelete} style={{background:'#ef4444'}}>Delete selected</button>
      </div>

      <div>
        {loading ? <div>Loading…</div> : (
          filtered.map(p => (
            <div key={p.id} className="card" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div style={{display:'flex', gap:12, alignItems:'center'}}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={()=>toggleSelect(p.id)} />
                {p.images && p.images[0] ? (
                  <img src={publicUrlFor(p.images[0])} alt="" style={{width:80, height:80, objectFit:'cover', borderRadius:6}} />
                ) : <div style={{width:80, height:80, background:'#eee', borderRadius:6}} />}
                <div>
                  <div style={{fontWeight:700}}>{p.title}</div>
                  <div className="small">₹{p.price} • {p.category}</div>
                  <div className="small">SKU: {p.sku || '-' } • Stock: {p.stock || 0}</div>
                  <div className="small">{p.available ? 'Published' : 'Draft'}</div>
                </div>
              </div>
              <div style={{display:'flex', gap:8}}>
                <button onClick={()=>startEdit(p)}>Edit</button>
                <button onClick={()=>deleteProduct(p.id)} className="secondary" style={{background:'#ef4444'}}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
