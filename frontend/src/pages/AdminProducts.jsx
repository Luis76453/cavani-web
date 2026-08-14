import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [dbColors, setDbColors] = useState([]);
  const [dbSizes, setDbSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [isSimpleForm, setIsSimpleForm] = useState(false);
  const [simpleStock, setSimpleStock] = useState(0);
  
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

  // Selected colors, sizes and current mapped combinations
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [productVariants, setProductVariants] = useState([]);
  const [productImages, setProductImages] = useState([]);
  const [productSizeGuide, setProductSizeGuide] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      // fetch including inactive items for administrator view
      const prodRes = await api.get('/products?include_inactive=true');
      const catRes = await api.get('/products/categories');
      const colRes = await api.get('/products/collections');
      const colorRes = await api.get('/products/colors');
      const sizeRes = await api.get('/products/sizes');
      
      setProducts(prodRes.data.products);
      setCategories(catRes.data.categories);
      setCollections(colRes.data.collections);
      setDbColors(colorRes.data.colors || []);
      // Filter visible sizes in the interface to only S, M and L
      setDbSizes((sizeRes.data.sizes || []).filter(s => ['S', 'M', 'L'].includes(s.name)));
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
    setIsSimpleForm(false);
    setSimpleStock(0);
    setSelectedColors([]);
    setSelectedSizes([]);
    setProductVariants([]);
    setProductImages([]);
    setProductSizeGuide([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (prod) => {
    try {
      // Fetch full details including individual variants and all images
      const res = await api.get(`/products/${prod.id}`);
      const fullProduct = res.data.product;
      
      setEditProduct(fullProduct);
      setFormData({
        name: fullProduct.name,
        slug: fullProduct.slug,
        description: fullProduct.description || '',
        price: fullProduct.price,
        compare_at_price: fullProduct.compare_at_price || '',
        sku: fullProduct.sku,
        category_id: fullProduct.category_id || '',
        collection_id: fullProduct.collection_id || '',
        material: fullProduct.material || '',
        features: typeof fullProduct.features === 'string' ? fullProduct.features : JSON.stringify(fullProduct.features || []),
        status: fullProduct.status || 'active'
      });

      // Load relations to view inside modal form
      const isSimple = (fullProduct.variants || []).some(v => v.color_id === null && v.size_id === null);
      setIsSimpleForm(isSimple);
      if (isSimple && fullProduct.variants.length > 0) {
        setSimpleStock(fullProduct.variants[0].stock);
      } else {
        setSimpleStock(0);
      }

      setProductVariants(fullProduct.variants || []);
      setProductImages(fullProduct.images || []);
      setProductSizeGuide(fullProduct.size_guide || []);

      const activeColorIds = [...new Set((fullProduct.variants || []).filter(v => v.color_id !== null).map(v => v.color_id))];
      const activeSizeIds = [...new Set((fullProduct.variants || []).filter(v => v.size_id !== null).map(v => v.size_id))];
      setSelectedColors(activeColorIds);
      setSelectedSizes(activeSizeIds);

      setIsModalOpen(true);
    } catch (err) {
      console.error('Error fetching product detail info:', err);
      alert('Error al obtener la información del producto.');
    }
  };

  const handleSizeGuideChange = (sizeId, field, value) => {
    setProductSizeGuide(prev => {
      const existing = prev.find(sg => sg.size_id === sizeId);
      if (existing) {
        return prev.map(sg => {
          if (sg.size_id === sizeId) {
            return { ...sg, [field]: value };
          }
          return sg;
        });
      } else {
        return [...prev, { size_id: sizeId, [field]: value }];
      }
    });
  };

  const getGuideValue = (sizeId, field) => {
    const entry = productSizeGuide.find(sg => sg.size_id === sizeId);
    return entry ? entry[field] || '' : '';
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

  const handleColorToggle = (colorId) => {
    setSelectedColors(prev => {
      const updatedColors = prev.includes(colorId) 
        ? prev.filter(id => id !== colorId) 
        : [...prev, colorId];
      
      // Regene combinations
      syncVariants(updatedColors, selectedSizes);
      // Clean up orphaned images for deselected color
      setProductImages(imgs => imgs.filter(img => updatedColors.includes(img.color_id) || img.color_id === null));
      
      return updatedColors;
    });
  };

  const handleSizeToggle = (sizeId) => {
    setSelectedSizes(prev => {
      const updatedSizes = prev.includes(sizeId) 
        ? prev.filter(id => id !== sizeId) 
        : [...prev, sizeId];
      
      syncVariants(selectedColors, updatedSizes);
      return updatedSizes;
    });
  };

  const syncVariants = (activeColors, activeSizes) => {
    setProductVariants(prev => {
      const updatedList = [];
      for (const cId of activeColors) {
        for (const sId of activeSizes) {
          const existing = prev.find(v => v.color_id === cId && v.size_id === sId);
          if (existing) {
            updatedList.push(existing);
          } else {
            const colorObj = dbColors.find(c => c.id === cId);
            const sizeObj = dbSizes.find(s => s.id === sId);
            updatedList.push({
              color_id: cId,
              size_id: sId,
              sku: `${formData.sku || 'CV'}-${colorObj ? colorObj.name.substring(0, 3).toUpperCase() : 'C'}-${sizeObj ? sizeObj.name : 'S'}`,
              stock: 0
            });
          }
        }
      }
      return updatedList;
    });
  };

  const handleVariantFieldChange = (colorId, sizeId, field, value) => {
    setProductVariants(prev => 
      prev.map(v => {
        if (v.color_id === colorId && v.size_id === sizeId) {
          return { ...v, [field]: value };
        }
        return v;
      })
    );
  };

  const handleImageUpload = async (e, colorId) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('image', file);

    try {
      const uploadRes = await api.post('/products/upload-image', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newImage = {
        color_id: colorId,
        image_url: uploadRes.data.image_url,
        is_featured: productImages.length === 0, // Auto-feature if it's the first image
        display_order: productImages.length
      };

      setProductImages(prev => [...prev, newImage]);
    } catch (err) {
      console.error('File S3 upload error:', err);
      alert(err.response?.data?.message || 'Error al subir la imagen al almacenamiento.');
    }
  };

  const handleToggleFeaturedImage = (imageUrl) => {
    setProductImages(prev => 
      prev.map(img => ({
        ...img,
        is_featured: img.image_url === imageUrl
      }))
    );
  };

  const handleRemoveImage = (imageUrl) => {
    setProductImages(prev => prev.filter(img => img.image_url !== imageUrl));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Parse features to array/string
    let parsedFeatures = [];
    if (formData.features) {
      try {
        parsedFeatures = JSON.parse(formData.features);
      } catch (err) {
        parsedFeatures = formData.features.split(',').map(f => f.trim());
      }
    }

    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      collection_id: formData.collection_id ? parseInt(formData.collection_id) : null,
      features: parsedFeatures,
      variants: isSimpleForm
        ? [{ color_id: null, size_id: null, sku: formData.sku, stock: parseInt(simpleStock || 0) }]
        : productVariants,
      images: productImages.map(img => isSimpleForm ? { ...img, color_id: null } : img),
      size_guide: isSimpleForm ? [] : productSizeGuide
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
                <tr 
                  key={prod.id} 
                  className={`hover:bg-neutral-light/20 transition-colors ${prod.status === 'inactive' ? 'opacity-60 bg-neutral-light/40 border-l-4 border-l-neutral-dark/30' : ''}`}
                >
                  <td className="p-4 font-semibold">{prod.sku}</td>
                  <td className="p-4 font-semibold text-primary">{prod.name}</td>
                  <td className="p-4">{prod.category_name}</td>
                  <td className="p-4">{prod.collection_name || '-'}</td>
                  <td className="p-4 font-semibold">S/{parseFloat(prod.price).toFixed(2)}</td>
                  <td className="p-4">
                    {prod.status === 'active' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-green-100 text-green-800">
                        Activo
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-neutral-dark/15 text-primary/65">
                        Inactivo
                      </span>
                    )}
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
        <div className="fixed inset-0 bg-primary/45 backdrop-blur-sm z-50 flex items-center justify-center p-6">
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
              {/* Form Type Switcher */}
              {!editProduct ? (
                <div className="flex gap-4 border-b border-neutral-light pb-4 mb-4">
                  <button
                    type="button"
                    onClick={() => setIsSimpleForm(false)}
                    className={`pb-2 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${!isSimpleForm ? 'border-primary text-primary' : 'border-transparent text-primary/50'}`}
                  >
                    Prenda (Con Variantes)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSimpleForm(true)}
                    className={`pb-2 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${isSimpleForm ? 'border-primary text-primary' : 'border-transparent text-primary/50'}`}
                  >
                    Producto Simple (Sin Variantes)
                  </button>
                </div>
              ) : (
                <div className="mb-4 px-4 py-2.5 bg-neutral-light text-[9px] uppercase font-bold text-primary/75 tracking-wider rounded">
                  Tipo de producto: {isSimpleForm ? 'Simple / Sin Variantes' : 'Prenda / Con Variantes'}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Slug (URL) *</label>
                  <input
                    type="text"
                    name="slug"
                    required
                    value={formData.slug}
                    onChange={handleInputChange}
                    placeholder="nombre-del-producto"
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">SKU Base *</label>
                  <input
                    type="text"
                    name="sku"
                    required
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="CV-TOP-xxx"
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Estado *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
                {isSimpleForm && (
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Stock Disponible *</label>
                    <input
                      type="number"
                      required
                      value={simpleStock}
                      onChange={(e) => setSimpleStock(e.target.value)}
                      className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none"
                      min="0"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Precio de Venta (S/) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    required
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Precio de Comparación (Antes) (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="compare_at_price"
                    value={formData.compare_at_price}
                    onChange={handleInputChange}
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Categoría *</label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none"
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
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none"
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
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none"
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
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Características Clave</label>
                  <input
                    type="text"
                    name="features"
                    value={formData.features}
                    onChange={handleInputChange}
                    placeholder='Ej. ["Transpirable", "Stretch"]'
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* ========================================== */}
              {/* 1. VARIANTS GRID SELECTION SECTION */}
              {/* ========================================== */}
              {!isSimpleForm && (
                <div className="space-y-4 border-t border-neutral-light pt-6">
                <h4 className="font-serif text-sm font-semibold text-primary">Gestión de Variantes (Colores y Tallas)</h4>
                
                {/* Color selects */}
                <div className="space-y-2">
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/65">Colores Mapeados</label>
                  <div className="flex flex-wrap gap-3">
                    {dbColors.map(c => {
                      const isChecked = selectedColors.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-center space-x-2 border border-neutral-dark/15 rounded-full px-3 py-1 bg-white cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleColorToggle(c.id)}
                            className="rounded border-neutral-dark/30 text-primary"
                          />
                          <span className="w-3 h-3 rounded-full border border-neutral-dark/25" style={{ backgroundColor: c.hex_code }}></span>
                          <span className="text-[10px] font-medium text-primary/80">{c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Size selects */}
                <div className="space-y-2">
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/65">Tallas Mapeadas</label>
                  <div className="flex flex-wrap gap-3">
                    {dbSizes.map(s => {
                      const isChecked = selectedSizes.includes(s.id);
                      return (
                        <label key={s.id} className="flex items-center space-x-2 border border-neutral-dark/15 rounded px-3 py-1 bg-white cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleSizeToggle(s.id)}
                            className="rounded border-neutral-dark/30 text-primary"
                          />
                          <span className="text-[10px] font-medium text-primary/80">{s.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Stock table */}
                {selectedColors.length > 0 && selectedSizes.length > 0 && (
                  <div className="space-y-3 bg-neutral-light/50 p-4 rounded-xl border border-neutral-light">
                    <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60">Stock y SKU de Variantes</label>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="border-b border-neutral-dark/10 pb-1 text-[8px] uppercase text-primary/65 font-bold">
                            <th className="py-1">Combinación</th>
                            <th className="py-1">SKU Variante</th>
                            <th className="py-1 text-center">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-dark/5">
                          {selectedColors.flatMap(cId => 
                            selectedSizes.map(sId => {
                              const colorObj = dbColors.find(c => c.id === cId);
                              const sizeObj = dbSizes.find(s => s.id === sId);
                              if (!colorObj || !sizeObj) return null;
                              
                              const variant = productVariants.find(v => v.color_id === cId && v.size_id === sId) || {
                                color_id: cId,
                                size_id: sId,
                                sku: `${formData.sku || 'CV'}-${colorObj.name.substring(0, 3).toUpperCase()}-${sizeObj.name}`,
                                stock: 0
                              };

                              return (
                                <tr key={`${cId}-${sId}`} className="py-1.5">
                                  <td className="py-1 flex items-center space-x-2">
                                    <span className="w-3.5 h-3.5 rounded-full border border-neutral-dark/25" style={{ backgroundColor: colorObj.hex_code }}></span>
                                    <span className="font-semibold text-primary">{colorObj.name} &middot; Talla {sizeObj.name}</span>
                                  </td>
                                  <td className="py-1">
                                    <input
                                      type="text"
                                      value={variant.sku}
                                      onChange={(e) => handleVariantFieldChange(cId, sId, 'sku', e.target.value)}
                                      className="border border-neutral-dark/20 rounded px-2 py-1 text-xs w-48 bg-white focus:outline-none"
                                      placeholder="SKU-COLOR-SIZE"
                                    />
                                  </td>
                                  <td className="py-1">
                                    <input
                                      type="number"
                                      value={variant.stock}
                                      onChange={(e) => handleVariantFieldChange(cId, sId, 'stock', parseInt(e.target.value) || 0)}
                                      className="border border-neutral-dark/20 rounded px-2 py-1 text-xs w-20 bg-white text-center focus:outline-none mx-auto block"
                                      min="0"
                                    />
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* ========================================== */}
              {/* 3. PRODUCT SIZE GUIDE SECTION */}
              {/* ========================================== */}
              {!isSimpleForm && (
                <div className="space-y-4 border-t border-neutral-light pt-6">
                <h4 className="font-serif text-sm font-semibold text-primary">Guía de Tallas (Medidas en cm)</h4>
                <p className="text-[10px] text-primary/50 italic">Ingresa las medidas corporales recomendadas para cada talla (campos opcionales).</p>
                
                <div className="overflow-x-auto border border-neutral-light rounded-xl bg-neutral-light/25 p-4">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b border-neutral-dark/10 pb-1 text-[8px] uppercase text-primary/65 font-bold">
                        <th className="py-2">Medida (cm)</th>
                        {dbSizes.map(s => (
                          <th key={s.id} className="py-2 text-center">Talla {s.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-dark/5">
                      {[
                        { label: 'Pecho / Busto (cm)', field: 'chest_cm' },
                        { label: 'Cintura (cm)', field: 'waist_cm' },
                        { label: 'Cadera (cm)', field: 'hip_cm' }
                      ].map(row => (
                        <tr key={row.field} className="py-1">
                          <td className="py-2 font-semibold text-primary/80">{row.label}</td>
                          {dbSizes.map(s => (
                            <td key={s.id} className="py-2 text-center">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={getGuideValue(s.id, row.field)}
                                onChange={(e) => handleSizeGuideChange(s.id, row.field, e.target.value)}
                                className="border border-neutral-dark/20 rounded px-2 py-1 text-xs w-24 bg-white text-center focus:outline-none"
                                placeholder="--"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {/* ========================================== */}
              {/* 2. S3 IMAGE UPLOAD BY COLOR SECTION */}
              {/* ========================================== */}
              <div className="space-y-4 border-t border-neutral-light pt-6">
                <h4 className="font-serif text-sm font-semibold text-primary">Imágenes del Producto</h4>
                
                {isSimpleForm ? (
                  <div className="border border-neutral-light p-4 rounded-xl space-y-3 bg-neutral-light/25">
                    <div className="flex items-center justify-between border-b border-neutral-light pb-2">
                      <span className="font-serif text-xs font-semibold text-primary">Lista de Imágenes</span>
                      <label className="bg-white border border-neutral-dark/25 text-primary text-[8px] font-bold uppercase tracking-wider px-3 py-1 rounded cursor-pointer hover:bg-neutral-light transition-colors">
                        Subir Archivo S3
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, null)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {productImages.length === 0 ? (
                      <p className="text-[9px] text-primary/50 italic">No hay imágenes cargadas para este producto.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {productImages.map((img, idx) => (
                          <div key={img.id || idx} className="relative group aspect-[3/4] border border-neutral-light rounded-lg overflow-hidden bg-neutral-light shadow-sm">
                            <img src={img.image_url} alt="Simple product variant" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-primary/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-[8px] text-white">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFeaturedImage(img.image_url)}
                                  className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${img.is_featured ? 'bg-green-600 text-white' : 'bg-white/20 hover:bg-white/40'}`}
                                >
                                  {img.is_featured ? 'Destacada' : 'Destacar'}
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(img.image_url)}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 rounded w-full uppercase text-center"
                              >
                                Eliminar
                              </button>
                            </div>
                            {img.is_featured && (
                              <span className="absolute top-1.5 left-1.5 bg-green-600 text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shadow">
                                Destacada
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : selectedColors.length === 0 ? (
                  <p className="text-[10px] text-primary/50 italic">Seleccione los colores arriba para gestionar las imágenes de este producto.</p>
                ) : (
                  <div className="space-y-6">
                    {selectedColors.map(cId => {
                      const colorObj = dbColors.find(c => c.id === cId);
                      if (!colorObj) return null;
                      
                      const colorImages = productImages.filter(img => img.color_id === cId);

                      return (
                        <div key={cId} className="border border-neutral-light p-4 rounded-xl space-y-3 bg-neutral-light/25">
                          <div className="flex items-center justify-between border-b border-neutral-light pb-2">
                            <div className="flex items-center space-x-2">
                              <span className="w-3.5 h-3.5 rounded-full border border-neutral-dark/25" style={{ backgroundColor: colorObj.hex_code }}></span>
                              <span className="font-serif text-xs font-semibold text-primary">{colorObj.name}</span>
                            </div>
                            
                            {/* Multer Upload Input Trigger */}
                            <label className="bg-white border border-neutral-dark/25 text-primary text-[8px] font-bold uppercase tracking-wider px-3 py-1 rounded cursor-pointer hover:bg-neutral-light transition-colors">
                              Subir Archivo S3
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, cId)}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {/* Thumbnails grid */}
                          {colorImages.length === 0 ? (
                            <p className="text-[9px] text-primary/50 italic">No hay imágenes cargadas para este color.</p>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              {colorImages.map((img, idx) => (
                                <div key={img.id || idx} className="relative group aspect-[3/4] border border-neutral-light rounded-lg overflow-hidden bg-neutral-light shadow-sm">
                                  <img src={img.image_url} alt="Variant" className="w-full h-full object-cover" />
                                  
                                  {/* Delete / Feature options */}
                                  <div className="absolute inset-0 bg-primary/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-[8px] text-white">
                                    <div className="flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleFeaturedImage(img.image_url)}
                                        className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${img.is_featured ? 'bg-green-600 text-white' : 'bg-white/20 hover:bg-white/40'}`}
                                      >
                                        {img.is_featured ? 'Destacada' : 'Destacar'}
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveImage(img.image_url)}
                                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 rounded w-full uppercase text-center"
                                    >
                                      Eliminar
                                    </button>
                                  </div>

                                  {img.is_featured && (
                                    <span className="absolute top-1.5 left-1.5 bg-green-600 text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shadow">
                                      Destacada
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
                Guardar Producto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
