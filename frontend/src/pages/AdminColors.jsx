import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function AdminColors() {
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null); // color being edited or null
  const [formData, setFormData] = useState({
    name: '',
    hex_code: '#0A142F',
    active: true
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/colors');
      setColors(res.data.colors || []);
    } catch (err) {
      console.error('Error loading colors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditItem(null);
    setFormData({
      name: '',
      hex_code: '#0A142F',
      active: true
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (color) => {
    setEditItem(color);
    setFormData({
      name: color.name,
      hex_code: color.hex_code.startsWith('#') ? color.hex_code : `#${color.hex_code}`,
      active: color.active
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleHexChange = (value) => {
    let clean = value.toUpperCase();
    if (clean && !clean.startsWith('#')) {
      clean = '#' + clean;
    }
    setFormData(prev => ({ ...prev, hex_code: clean }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        hex_code: formData.hex_code.trim(),
        active: formData.active
      };

      if (editItem) {
        await api.put(`/admin/colors/${editItem.id}`, payload);
      } else {
        await api.post('/admin/colors', payload);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving color:', err);
      setFormError(err.response?.data?.message || 'Error al guardar el color.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (color) => {
    try {
      const newStatus = !color.active;
      await api.put(`/admin/colors/${color.id}/status`, { active: newStatus });
      setColors(prev => prev.map(c => c.id === color.id ? { ...c, active: newStatus } : c));
    } catch (err) {
      console.error('Error toggling color status:', err);
      alert('Error al actualizar el estado del color.');
    }
  };

  const handleDelete = async (color) => {
    if (color.variants_count > 0 || color.images_count > 0) {
      alert(`Este color está asignado a ${color.variants_count} variante(s) de productos. No se puede eliminar para preservar el catálogo; te recomendamos desactivarlo.`);
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el color "${color.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/admin/colors/${color.id}`);
      setColors(prev => prev.filter(c => c.id !== color.id));
    } catch (err) {
      console.error('Error deleting color:', err);
      alert(err.response?.data?.message || 'Error al eliminar el color.');
    }
  };

  // Safe HEX for styling background
  const isValidHex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(formData.hex_code);
  const safeHexForPicker = isValidHex && formData.hex_code.length === 7 ? formData.hex_code : '#0A142F';

  const filteredColors = colors.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.hex_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-light/40">
      
      {/* Top Header Bar */}
      <div className="p-6 md:p-8 bg-white border-b border-neutral-dark/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-steel font-bold block mb-1">
            Configuración de Catálogo
          </span>
          <h1 className="font-serif text-2xl font-bold text-primary">Paleta de Colores</h1>
          <p className="text-xs text-primary/60 mt-1">
            Administra los colores disponibles para asociar a variantes y fotografías de productos.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-primary hover:bg-steel text-white text-xs font-semibold uppercase tracking-wider px-5 py-3 rounded-lg shadow-sm transition-all flex items-center space-x-2 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Nuevo Color</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
        
        {/* Search Bar & Quick Stats */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-neutral-dark/15 shadow-2xs">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Buscar por nombre o #HEX..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border border-neutral-dark/20 rounded-lg focus:outline-none focus:border-primary"
            />
            <svg className="w-4 h-4 text-primary/40 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="text-xs text-primary/60 flex items-center gap-4">
            <span>Total: <strong className="text-primary">{colors.length}</strong></span>
            <span>Activos: <strong className="text-emerald-600">{colors.filter(c => c.active).length}</strong></span>
            <span>Inactivos: <strong className="text-neutral-500">{colors.filter(c => !c.active).length}</strong></span>
          </div>
        </div>

        {/* Colors Table */}
        <div className="bg-white rounded-xl border border-neutral-dark/15 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-primary/50 animate-pulse">
              Cargando paleta de colores...
            </div>
          ) : filteredColors.length === 0 ? (
            <div className="p-12 text-center text-xs text-primary/50">
              No se encontraron colores con ese criterio de búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-light/50 border-b border-neutral-dark/15 text-[10px] uppercase font-bold text-primary/70 tracking-wider">
                    <th className="py-3 px-4">Muestra</th>
                    <th className="py-3 px-4">Nombre del Color</th>
                    <th className="py-3 px-4">Código HEX</th>
                    <th className="py-3 px-4 text-center">Variantes Asignadas</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-dark/10 text-xs">
                  {filteredColors.map((color) => {
                    const variantsCount = parseInt(color.variants_count || 0);
                    return (
                      <tr key={color.id} className="hover:bg-neutral-light/30 transition-colors">
                        
                        {/* Swatch */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <span
                              className="w-7 h-7 rounded-lg border border-black/15 shadow-2xs flex-shrink-0"
                              style={{ backgroundColor: color.hex_code }}
                              title={color.hex_code}
                            />
                          </div>
                        </td>

                        {/* Name */}
                        <td className="py-3.5 px-4 font-semibold text-primary">
                          {color.name}
                        </td>

                        {/* Hex Code */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-primary/80">
                          <span className="bg-neutral-light px-2 py-0.5 rounded border border-neutral-dark/20">
                            {color.hex_code}
                          </span>
                        </td>

                        {/* Usage Count */}
                        <td className="py-3.5 px-4 text-center">
                          {variantsCount > 0 ? (
                            <span className="inline-flex items-center text-[10px] font-bold text-steel bg-steel/10 px-2.5 py-0.5 rounded-full">
                              {variantsCount} variante(s)
                            </span>
                          ) : (
                            <span className="text-[10px] text-primary/40">Sin asignar</span>
                          )}
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(color)}
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                              color.active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${color.active ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                            {color.active ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditModal(color)}
                            className="text-primary hover:text-steel text-[11px] font-semibold underline px-2 py-1"
                          >
                            Editar
                          </button>
                          
                          <button
                            onClick={() => handleDelete(color)}
                            disabled={variantsCount > 0}
                            className={`text-[11px] font-semibold px-2 py-1 ${
                              variantsCount > 0
                                ? 'text-primary/20 cursor-not-allowed'
                                : 'text-red-500 hover:text-red-700 underline'
                            }`}
                            title={variantsCount > 0 ? 'No se puede eliminar porque está en uso por productos' : 'Eliminar color'}
                          >
                            Eliminar
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ======================================================== */}
      {/* MODAL CREAR / EDITAR COLOR                              */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl border border-neutral-dark/20 w-full max-w-md overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-primary text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-bold">
                  {editItem ? 'Editar Color' : 'Nuevo Color'}
                </h3>
                <p className="text-[10px] text-white/70">
                  Define el nombre y el código hexadecimal del color.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {formError && (
                <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200">
                  {formError}
                </div>
              )}

              {/* Nombre del Color */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-primary/70 tracking-wider mb-1.5">
                  Nombre del Color *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Verde Militar, Celeste Cielo, Negro Ónix"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full text-xs border border-neutral-dark/30 rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary"
                />
              </div>

              {/* Código Hexadecimal con Cuadradito Selector Interactivo */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-primary/70 tracking-wider mb-1.5">
                  Código Hexadecimal (#HEX) *
                </label>
                
                <div className="flex items-center gap-3">
                  {/* Selector visual nativo de color (Cuadradito) */}
                  <div className="relative shrink-0">
                    <input
                      type="color"
                      value={safeHexForPicker}
                      onChange={(e) => handleHexChange(e.target.value)}
                      className="w-11 h-11 rounded-lg border border-neutral-dark/30 cursor-pointer p-0.5 bg-white shadow-2xs"
                      title="Haz clic para abrir el selector de color"
                    />
                  </div>

                  {/* Input de texto para escribir o pegar el HEX */}
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      placeholder="#0A142F"
                      value={formData.hex_code}
                      onChange={(e) => handleHexChange(e.target.value)}
                      maxLength={9}
                      className="w-full text-xs font-mono uppercase border border-neutral-dark/30 rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary tracking-wider"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-primary/50 mt-1">
                  Puedes escribir el código hexadecimal (ej: <code className="bg-neutral-light px-1 py-0.5 rounded">#84A9F8</code>) o hacer clic en el recuadro para seleccionarlo visualmente.
                </p>
              </div>

              {/* Previsualización en Tiempo Real */}
              <div className="bg-neutral-light/60 border border-neutral-dark/20 rounded-xl p-3.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/60">
                  Vista Previa
                </span>
                
                <div className="flex items-center space-x-2.5">
                  <span
                    className="w-6 h-6 rounded-full border border-black/20 shadow-xs"
                    style={{ backgroundColor: isValidHex ? formData.hex_code : '#CCCCCC' }}
                  />
                  <div className="text-right">
                    <span className="text-xs font-bold text-primary block leading-tight">
                      {formData.name || 'Nombre del color'}
                    </span>
                    <span className="text-[10px] font-mono text-primary/60 block">
                      {formData.hex_code || '#------'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Checkbox Activo */}
              <div className="pt-1">
                <label className="flex items-center space-x-2.5 text-xs text-primary font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    className="w-4 h-4 rounded border-neutral-dark/40 text-primary focus:ring-0"
                  />
                  <span>Color activo (disponible para seleccionar en productos)</span>
                </label>
              </div>

              {/* Botones de Acción */}
              <div className="pt-3 border-t border-neutral-dark/15 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2.5 text-xs font-semibold text-primary/70 hover:text-primary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary hover:bg-steel text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editItem ? 'Actualizar Color' : 'Guardar Color'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
