import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    compare_at_price: '',
    sku: '',
    category_id: '',
    collection_id: '',
    material: '',
    features: '',
    status: 'active'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const prodRes = await api.get('/products');
      const catRes = await api.get('/products/categories');
      const colRes = await api.get('/products/collections');
      setProducts(prodRes.data.products);
      setCategories(catRes.data.categories);
      setCollections(colRes.data.collections);
    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenAddModal = () => {
    setEditProduct(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      price: '',
      compare_at_price: '',
      sku: '',
      category_id: categories[0]?.id || '',
      collection_id: collections[0]?.id || '',
      material: '',
      features: '',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod) => {
    setEditProduct(prod);
    setFormData({
      name: prod.name,
      slug: prod.slug,
      description: prod.description || '',
      price: prod.price,
      compare_at_price: prod.compare_at_price || '',
      sku: prod.sku,
      category_id: prod.category_id || '',
      collection_id: prod.collection_id || '',
      material: prod.material || '',
      features: typeof prod.features === 'string' ? prod.features : JSON.stringify(prod.features || []),
      status: prod.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este producto?')) return;
    try {
      await api.delete(`/products/${id}`);
      alert('Producto eliminado correctamente.');
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar el producto.');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Parse features to array/string
    let parsedFeatures = [];
    if (formData.features) {
      try {
        parsedFeatures = JSON.parse(formData.features);
      } catch (err) {
        // split by commas if not json
        parsedFeatures = formData.features.split(',').map(f => f.trim());
      }
    }

    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      collection_id: formData.collection_id ? parseInt(formData.collection_id) : null,
      features: parsedFeatures
    };

    try {
      if (editProduct) {
        await api.put(`/products/${editProduct.id}`, payload);
        alert('Producto actualizado correctamente.');
      } else {
        await api.post('/products', payload);
        alert('Producto creado correctamente.');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error al procesar el producto.');
    }
  };

  return (
    <div className="p-8 space-y-8 flex-grow overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[9px] tracking-widest uppercase font-semibold text-steel">caVani Medical</span>
          <h1 className="font-serif text-3xl font-light text-primary">Gestión de Inventario</h1>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded hover:bg-steel transition-colors focus:outline-none"
        >
          Agregar Producto
        </button>
      </div>

      {loading ? (
        <div className="text-xs">Cargando productos...</div>
      ) : (
        <div className="bg-white border border-neutral-light/50 rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-light border-b border-neutral-light/50 font-bold uppercase tracking-wider text-primary/60">
                <th className="p-4">SKU</th>
                <th className="p-4">Nombre</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Colección</th>
                <th className="p-4">Precio</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-light font-light">
              {products.map((prod) => (
                <tr key={prod.id} className="hover:bg-neutral-light/20 transition-colors">
                  <td className="p-4 font-semibold">{prod.sku}</td>
                  <td className="p-4 font-semibold text-primary">{prod.name}</td>
                  <td className="p-4">{prod.category_name}</td>
                  <td className="p-4">{prod.collection_name || '-'}</td>
                  <td className="p-4 font-semibold">${parseFloat(prod.price).toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${prod.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {prod.status}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-3">
                    <button
                      onClick={() => handleOpenEditModal(prod)}
                      className="text-steel font-bold uppercase text-[9px] hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="text-red-500 font-bold uppercase text-[9px] hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal Drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <form onSubmit={handleFormSubmit} className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col text-xs">
            {/* Header */}
            <div className="p-6 border-b border-neutral-light flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-primary">
                {editProduct ? 'Editar Producto' : 'Crear Producto'}
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
            <div className="p-6 space-y-6 flex-grow">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Nombre *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Slug (URL) *</label>
                  <input
                    type="text"
                    name="slug"
                    required
                    value={formData.slug}
                    onChange={handleInputChange}
                    placeholder="nombre-del-producto"
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">SKU *</label>
                  <input
                    type="text"
                    name="sku"
                    required
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="CV-TOP-xxx"
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Estado *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Precio de Venta ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    required
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Precio de Comparación (Antes) ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="compare_at_price"
                    value={formData.compare_at_price}
                    onChange={handleInputChange}
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Categoría *</label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Colección</label>
                  <select
                    name="collection_id"
                    value={formData.collection_id}
                    onChange={handleInputChange}
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50"
                  >
                    <option value="">Ninguna</option>
                    {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Descripción *</label>
                  <textarea
                    name="description"
                    required
                    rows="3"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Composición de Materiales</label>
                  <input
                    type="text"
                    name="material"
                    value={formData.material}
                    onChange={handleInputChange}
                    placeholder="Ej. 72% Poliéster, 21% Rayón"
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Características Clave (Formato JSON o separado por comas)</label>
                  <input
                    type="text"
                    name="features"
                    value={formData.features}
                    onChange={handleInputChange}
                    placeholder='Ej. ["Transpirable", "Stretch"]'
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-neutral-light flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="border border-neutral-dark/30 text-primary text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded"
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
