import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function AdminCoupons() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null); // promotion being edited or null
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage', // percentage or fixed
    discount_value: '',
    active: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/promotions');
      setPromotions(res.data.promotions || []);
    } catch (err) {
      console.error('Error loading coupon data:', err);
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
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditItem(item);
    setFormData({
      code: item.code,
      description: item.description || '',
      discount_type: item.discount_type,
      discount_value: item.discount_value,
      active: item.active !== false
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (item) => {
    try {
      const updatedItem = { ...item, active: !item.active };
      const res = await api.put(`/admin/promotions/${item.id}`, updatedItem);
      const saved = res.data.promotion;
      
      // Update state locally to prevent full list reload and visual flickering
      setPromotions(prev => prev.map(p => p.id === item.id ? saved : p));
    } catch (err) {
      console.error('Error toggling coupon status:', err);
      alert('Error al actualizar el estado del cupón.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este cupón?')) return;
    try {
      await api.delete(`/admin/promotions/${id}`);
      setPromotions(prev => prev.filter(p => p.id !== id));
      alert('Cupón eliminado correctamente.');
    } catch (err) {
      console.error('Error deleting coupon:', err);
      alert('Error al eliminar el cupón.');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const method = editItem ? 'put' : 'post';
    const url = editItem ? `/admin/promotions/${editItem.id}` : '/admin/promotions';

    try {
      const res = await api[method](url, formData);
      const saved = res.data.promotion;

      if (method === 'put') {
        setPromotions(prev => prev.map(p => p.id === editItem.id ? saved : p));
        alert('Cupón actualizado correctamente.');
      } else {
        setPromotions(prev => [saved, ...prev]);
        alert('Cupón creado correctamente.');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error al procesar el cupón.');
    }
  };

  return (
    <div className="p-8 space-y-8 flex-grow overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[9px] tracking-widest uppercase font-semibold text-steel">caVani Medical</span>
          <h1 className="font-serif text-3xl font-light text-primary">Cupones de Descuento</h1>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded hover:bg-steel transition-colors focus:outline-none"
        >
          Agregar Cupón
        </button>
      </div>

      {loading ? (
        <div className="text-xs">Cargando cupones...</div>
      ) : (
        <div className="bg-white border border-neutral-light/50 rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-light border-b border-neutral-light/50 font-bold uppercase tracking-wider text-primary/60">
                <th className="p-4">Código</th>
                <th className="p-4">Descripción</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Valor</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-light font-light">
              {promotions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-primary/40 font-light">No hay cupones creados.</td>
                </tr>
              ) : (
                promotions.map((promo) => (
                  <tr 
                    key={promo.id} 
                    className={`hover:bg-neutral-light/20 transition-colors ${!promo.active ? 'opacity-65 bg-neutral-light/30 border-l-4 border-l-neutral-dark/30' : ''}`}
                  >
                    <td className="p-4 font-mono font-bold text-primary tracking-wider">{promo.code}</td>
                    <td className="p-4 text-steel max-w-xs truncate" title={promo.description}>{promo.description || '-'}</td>
                    <td className="p-4 capitalize">
                      {promo.discount_type === 'percentage' ? 'Porcentaje' : 'Monto Fijo'}
                    </td>
                    <td className="p-4 font-semibold text-primary">
                      {promo.discount_type === 'percentage' ? `${parseFloat(promo.discount_value)}%` : `S/${parseFloat(promo.discount_value).toFixed(2)}`}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(promo)}
                        className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider transition-colors ${
                          promo.active 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-neutral-dark/15 text-primary/65 hover:bg-neutral-dark/30 hover:text-primary/90'
                        }`}
                      >
                        {promo.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="p-4 text-right space-x-3">
                      <button
                        onClick={() => handleOpenEditModal(promo)}
                        className="text-steel font-bold uppercase text-[9px] hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id)}
                        className="text-red-500 font-bold uppercase text-[9px] hover:underline"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal Drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-primary/45 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <form onSubmit={handleFormSubmit} className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden flex flex-col text-xs">
            {/* Header */}
            <div className="p-6 border-b border-neutral-light flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-primary">
                {editItem ? 'Editar Cupón' : 'Crear Cupón'}
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

            {/* Content */}
            <div className="p-6 space-y-4 flex-grow">
              <div className="space-y-1">
                <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/65">Código de Cupón</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                  placeholder="E.g., CA-VERANO-15"
                  className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none focus:border-steel uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/65">Descripción</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Descripción del descuento"
                  className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none focus:border-steel resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/65">Tipo de Descuento</label>
                  <select
                    name="discount_type"
                    value={formData.discount_type}
                    onChange={handleInputChange}
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-white focus:outline-none focus:border-steel"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo (S/.)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/65">Valor del Descuento</label>
                  <input
                    type="number"
                    name="discount_value"
                    value={formData.discount_value}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder={formData.discount_type === 'percentage' ? 'Ej. 15' : 'Ej. 25.00'}
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 bg-neutral-light/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                  className="rounded border-neutral-dark/30 text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="active" className="text-xs text-primary/80 select-none">Cupón Activo (Disponible para su uso)</label>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-neutral-light flex items-center justify-end space-x-3 bg-neutral-light/10">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-neutral-dark/30 rounded text-[9px] uppercase tracking-wider hover:bg-neutral-light transition-colors font-semibold text-steel focus:outline-none"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-primary text-white rounded text-[9px] uppercase tracking-wider hover:bg-steel transition-colors font-semibold focus:outline-none"
              >
                {editItem ? 'Guardar Cambios' : 'Crear Cupón'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
