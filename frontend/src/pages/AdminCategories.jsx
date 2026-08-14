import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' or 'collections'

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null); // category or collection being edited
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    active: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const catRes = await api.get('/admin/categories');
      const colRes = await api.get('/admin/collections');
      setCategories(catRes.data.categories);
      setCollections(colRes.data.collections);
    } catch (err) {
      console.error('Error loading taxonomy data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleOpenAddModal = () => {
    setEditItem(null);
    setFormData({
      name: '',
      description: '',
      image_url: '',
      active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      image_url: item.image_url || '',
      active: item.active !== false
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (item, type) => {
    try {
      const updatedItem = { ...item, active: !item.active };
      const endpoint = type === 'category' ? `/admin/categories/${item.id}` : `/admin/collections/${item.id}`;
      await api.put(endpoint, updatedItem);
      loadData();
    } catch (err) {
      console.error('Error toggling taxonomy status:', err);
      alert('Error al actualizar el estado.');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('image', file);

    try {
      const uploadRes = await api.post('/products/upload-image', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, image_url: uploadRes.data.image_url }));
    } catch (err) {
      console.error('Image upload error:', err);
      alert('Error al subir la imagen.');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const endpoint = activeTab === 'categories' ? '/admin/categories' : '/admin/collections';
    const method = editItem ? 'put' : 'post';
    const url = editItem ? `${endpoint}/${editItem.id}` : endpoint;

    try {
      if (method === 'put') {
        await api.put(url, formData);
        alert(activeTab === 'categories' ? 'Categoría actualizada.' : 'Colección actualizada.');
      } else {
        await api.post(url, formData);
        alert(activeTab === 'categories' ? 'Categoría creada.' : 'Colección creada.');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error al procesar la taxonomía.');
    }
  };

  const currentList = activeTab === 'categories' ? categories : collections;

  return (
    <div className="p-8 space-y-8 flex-grow overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[9px] tracking-widest uppercase font-semibold text-steel">caVani Medical</span>
          <h1 className="font-serif text-3xl font-light text-primary">Categorías y Colecciones</h1>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded hover:bg-steel transition-colors focus:outline-none"
        >
          {activeTab === 'categories' ? 'Agregar Categoría' : 'Agregar Colección'}
        </button>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-neutral-light">
        <button
          onClick={() => setActiveTab('categories')}
          className={`py-4 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-all ${
            activeTab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-primary/50 hover:text-primary/75'
          }`}
        >
          Categorías ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`py-4 px-6 text-xs uppercase tracking-wider font-bold border-b-2 transition-all ${
            activeTab === 'collections' ? 'border-primary text-primary' : 'border-transparent text-primary/50 hover:text-primary/75'
          }`}
        >
          Colecciones ({collections.length})
        </button>
      </div>

      {loading ? (
        <div className="text-xs">Cargando datos...</div>
      ) : (
        <div className="bg-white border border-neutral-light/50 rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-light border-b border-neutral-light/50 font-bold uppercase tracking-wider text-primary/60">
                <th className="p-4">Imagen</th>
                <th className="p-4">Nombre</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Descripción</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-light font-light">
              {currentList.map((item) => (
                <tr 
                  key={item.id} 
                  className={`hover:bg-neutral-light/20 transition-colors ${!item.active ? 'opacity-65 bg-neutral-light/30 border-l-4 border-l-neutral-dark/30' : ''}`}
                >
                  <td className="p-4">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-md border border-neutral-light" />
                    ) : (
                      <div className="w-12 h-12 bg-neutral-light rounded-md flex items-center justify-center text-primary/30 font-semibold">--</div>
                    )}
                  </td>
                  <td className="p-4 font-semibold text-primary">{item.name}</td>
                  <td className="p-4 font-mono text-[10px] text-steel">{item.slug}</td>
                  <td className="p-4 max-w-xs truncate" title={item.description}>{item.description || '-'}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(item, activeTab === 'categories' ? 'category' : 'collection')}
                      className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider transition-colors ${
                        item.active 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-neutral-dark/15 text-primary/65 hover:bg-neutral-dark/25'
                      }`}
                    >
                      {item.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="text-steel font-bold uppercase text-[9px] hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal Drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-primary/45 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <form onSubmit={handleFormSubmit} className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden flex flex-col text-xs">
            {/* Header */}
            <div className="p-6 border-b border-neutral-light flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-primary">
                {editItem 
                  ? (activeTab === 'categories' ? 'Editar Categoría' : 'Editar Colección') 
                  : (activeTab === 'categories' ? 'Crear Categoría' : 'Crear Colección')
                }
              </h3>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-primary hover:text-steel p-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Fields */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Nombre *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Descripción</label>
                <textarea
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Imagen de Portada (URL)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleInputChange}
                    placeholder="https://..."
                    className="flex-grow text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none"
                  />
                  <label className="bg-neutral-light hover:bg-neutral-dark/10 border border-neutral-dark/20 text-primary text-[8px] font-bold uppercase tracking-wider px-3 flex items-center justify-center rounded cursor-pointer transition-colors">
                    Subir
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                  className="rounded border-neutral-dark/30 text-primary focus:ring-primary w-4 h-4"
                />
                <label htmlFor="active" className="text-xs font-semibold text-primary select-none">
                  Habilitar / Activo
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-neutral-light flex justify-end space-x-3 bg-neutral-light/10">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="border border-neutral-dark/30 text-primary text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded hover:bg-steel transition-colors focus:outline-none"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
