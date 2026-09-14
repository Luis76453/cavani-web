import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Detail State (On-Demand / Lazy Loading)
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/orders');
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error('Error fetching admin orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Fetch Order Detail on Demand (Lazy loading)
  const handleOpenDetail = useCallback(async (orderId) => {
    setSelectedOrderId(orderId);
    setOrderDetail(null);
    setDetailError(null);
    setLoadingDetail(true);

    try {
      const res = await api.get(`/admin/orders/${orderId}`);
      setOrderDetail(res.data.order);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setDetailError(err.response?.data?.message || 'No se pudo cargar la información detallada del pedido.');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedOrderId(null);
    setOrderDetail(null);
    setDetailError(null);
  }, []);

  // Keyboard shortcut: Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedOrderId !== null) {
        handleCloseDetail();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOrderId, handleCloseDetail]);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await api.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      const updatedOrder = res.data.order;
      
      // Update in table list
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: updatedOrder.status } : o));
      
      // Update in open modal if active
      if (orderDetail && orderDetail.id === orderId) {
        setOrderDetail(prev => ({ ...prev, status: updatedOrder.status }));
      }
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el estado del pedido.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const statuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  // Status Badge Colors Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'PREPARING':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'CONFIRMED':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'PENDING':
      default:
        return 'bg-amber-100 text-amber-800 border border-amber-200';
    }
  };

  const getPaymentBadge = (status) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold';
      case 'FAILED':
        return 'bg-red-50 text-red-700 border border-red-300 font-semibold';
      case 'PENDING':
      default:
        return 'bg-yellow-50 text-yellow-700 border border-yellow-300 font-semibold';
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(ord => {
    const matchesStatus = statusFilter === 'ALL' || ord.status === statusFilter;
    const clientName = `${ord.user_first_name || ord.guest_first_name || ''} ${ord.user_last_name || ord.guest_last_name || ''}`.toLowerCase();
    const clientEmail = (ord.user_email || ord.guest_email || '').toLowerCase();
    const orderNum = (ord.order_number || '').toLowerCase();
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch = !q || orderNum.includes(q) || clientName.includes(q) || clientEmail.includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-8 space-y-8 flex-grow overflow-y-auto bg-neutral-light/20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[9px] tracking-widest uppercase font-semibold text-steel">caVani Medical</span>
          <h1 className="font-serif text-3xl font-light text-primary">Gestión de Pedidos</h1>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 border border-neutral-dark/20 rounded-md text-xs font-semibold uppercase tracking-wider text-primary hover:bg-white transition-colors shadow-sm"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar Lista
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border border-neutral-light/60 shadow-sm">
        <div className="w-full md:w-80 relative">
          <input
            type="text"
            placeholder="Buscar por #pedido, cliente o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 border border-neutral-dark/20 rounded-md focus:outline-none focus:border-primary bg-neutral-light/30"
          />
          <svg className="w-4 h-4 text-primary/40 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-[10px] uppercase font-bold text-primary/60 whitespace-nowrap">Filtrar Estado:</span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${statusFilter === 'ALL' ? 'bg-primary text-white' : 'bg-neutral-light text-primary hover:bg-neutral-dark/10'}`}
            >
              Todos ({orders.length})
            </button>
            {statuses.map(st => {
              const count = orders.filter(o => o.status === st).length;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${statusFilter === st ? 'bg-primary text-white' : 'bg-neutral-light/60 text-primary/70 hover:bg-neutral-light'}`}
                >
                  {st} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lightweight Summary Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-primary/60 font-semibold uppercase tracking-wider">Cargando pedidos...</span>
        </div>
      ) : (
        <div className="bg-white border border-neutral-light/60 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-light/80 border-b border-neutral-light font-bold uppercase tracking-wider text-primary/70 text-[10px]">
                  <th className="p-4">Pedido</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Entrega</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Pago</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-light font-light">
                {filteredOrders.map((ord) => {
                  const customerName = (ord.user_first_name || ord.guest_first_name)
                    ? `${ord.user_first_name || ord.guest_first_name} ${ord.user_last_name || ord.guest_last_name || ''}`.trim()
                    : 'Invitado';
                  const customerEmail = ord.user_email || ord.guest_email || 'Sin correo';
                  const isGuest = !ord.user_id;

                  return (
                    <tr key={ord.id} className="hover:bg-neutral-light/30 transition-colors">
                      {/* Order Number */}
                      <td className="p-4">
                        <span className="font-semibold text-primary block">{ord.order_number}</span>
                        {ord.total_items > 0 && (
                          <span className="text-[9px] text-steel font-medium block mt-0.5">
                            {ord.total_items} {ord.total_items === 1 ? 'artículo' : 'artículos'}
                          </span>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-primary block">{customerName}</span>
                          {isGuest ? (
                            <span className="text-[8px] uppercase tracking-wider bg-neutral-dark/10 text-neutral-dark px-1.5 py-0.5 rounded font-bold">Invitado</span>
                          ) : (
                            <span className="text-[8px] uppercase tracking-wider bg-steel/15 text-steel px-1.5 py-0.5 rounded font-bold">Cuenta</span>
                          )}
                        </div>
                        <span className="text-[10px] text-primary/60 block truncate max-w-[160px]">{customerEmail}</span>
                      </td>

                      {/* Delivery */}
                      <td className="p-4">
                        <span className="font-semibold block uppercase text-[9px] tracking-wider text-steel mb-0.5">
                          {ord.shipping_method === 'pickup' ? '📍 Recojo' :
                           ord.shipping_method === 'provincia' ? '📦 Provincia' :
                           '🛵 Delivery'}
                        </span>
                        <span className="text-[10px] text-primary/80 block max-w-[180px] truncate">
                          {ord.shipping_method === 'pickup'
                            ? 'Oficina Surco'
                            : ord.shipping_method === 'provincia'
                            ? `${ord.shipping_city || ord.addr_city || 'Provincia'}, ${ord.shipping_state || ord.addr_state || ''}`
                            : `${ord.shipping_address_line1 || ord.addr_line1 || 'Dirección de entrega'}`}
                        </span>
                      </td>

                      {/* Financial Total */}
                      <td className="p-4">
                        <span className="font-bold text-primary block">S/{parseFloat(ord.total).toFixed(2)}</span>
                        {ord.shipping_cost > 0 ? (
                          <span className="text-[9px] text-primary/50 block">Envío S/{parseFloat(ord.shipping_cost).toFixed(2)}</span>
                        ) : (
                          <span className="text-[9px] text-green-600 font-medium block">Envío Gratis</span>
                        )}
                      </td>

                      {/* Payment Method & Status */}
                      <td className="p-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] uppercase tracking-wider mb-1 ${getPaymentBadge(ord.payment_status)}`}>
                          {ord.payment_status || 'PENDING'}
                        </span>
                        <span className="text-[9px] text-primary/60 block uppercase font-medium">
                          {ord.payment_method === 'mercado_pago' ? '💳 Mercado Pago' :
                           ord.payment_method === 'bank_transfer' ? '🏦 Transf. Bancaria' :
                           ord.payment_method?.replace(/_/g, ' ') || 'Pasarela'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="p-4 text-primary/70 text-[11px]">
                        {new Date(ord.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <span className="text-[9px] text-primary/40 block">
                          {new Date(ord.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Status Dropdown */}
                      <td className="p-4">
                        <select
                          value={ord.status}
                          onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                          className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-primary bg-white cursor-pointer ${getStatusBadge(ord.status)}`}
                        >
                          {statuses.map(st => (
                            <option key={st} value={st} className="bg-white text-primary font-medium">{st}</option>
                          ))}
                        </select>
                      </td>

                      {/* Actions: View Detail */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenDetail(ord.id)}
                          className="inline-flex items-center gap-1.5 bg-primary text-white hover:bg-steel text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-md transition-colors shadow-sm focus:outline-none"
                          title="Ver detalle completo del pedido"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>Ver Detalle</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan="8" className="p-12 text-center text-primary/60 italic">
                      {searchTerm || statusFilter !== 'ALL'
                        ? 'No se encontraron pedidos que coincidan con los filtros aplicados.'
                        : 'No hay pedidos registrados en el sistema.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LAZY LOADED DETAIL MODAL                                                  */}
      {/* ========================================================================= */}
      {selectedOrderId !== null && (
        <div 
          className="fixed inset-0 bg-primary/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn"
          onClick={handleCloseDetail}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8 max-h-[90vh] flex flex-col border border-neutral-light overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 bg-neutral-light/50 border-b border-neutral-light flex items-center justify-between flex-shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-serif text-xl font-bold text-primary">
                    Pedido {orderDetail?.order_number || `#${selectedOrderId}`}
                  </h3>
                  {orderDetail && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusBadge(orderDetail.status)}`}>
                      {orderDetail.status}
                    </span>
                  )}
                  {orderDetail?.payment_status && (
                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider ${getPaymentBadge(orderDetail.payment_status)}`}>
                      Pago: {orderDetail.payment_status}
                    </span>
                  )}
                </div>
                {orderDetail?.created_at && (
                  <p className="text-[10px] text-primary/60 font-medium">
                    Realizado el {new Date(orderDetail.created_at).toLocaleString('es-PE', { dateStyle: 'full', timeStyle: 'short' })}
                  </p>
                )}
              </div>

              <button
                onClick={handleCloseDetail}
                className="text-primary/60 hover:text-primary p-2 rounded-full hover:bg-white transition-colors focus:outline-none"
                title="Cerrar ventana (Esc)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-grow text-xs">
              
              {/* Spinner while loading */}
              {loadingDetail && (
                <div className="py-24 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-primary/60 font-semibold uppercase tracking-wider">Cargando información del pedido...</span>
                </div>
              )}

              {/* Error state */}
              {detailError && !loadingDetail && (
                <div className="p-6 text-center space-y-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 font-semibold">{detailError}</p>
                  <button
                    onClick={() => handleOpenDetail(selectedOrderId)}
                    className="bg-primary text-white text-[10px] font-bold uppercase px-4 py-2 rounded hover:bg-steel"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {/* Order Data Loaded */}
              {orderDetail && !loadingDetail && (
                <>
                  {/* Two Cards: Buyer & Shipping Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Buyer Information */}
                    <div className="bg-neutral-light/30 border border-neutral-light p-4 rounded-lg space-y-3">
                      <div className="flex items-center justify-between border-b border-neutral-light/80 pb-2">
                        <h4 className="font-semibold text-primary uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-steel" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Datos del Comprador
                        </h4>
                        <span className="text-[9px] uppercase font-bold text-steel">
                          {orderDetail.user_id ? 'Usuario Registrado' : 'Cliente Invitado'}
                        </span>
                      </div>

                      <div className="space-y-1.5 leading-relaxed">
                        <div>
                          <span className="text-primary/60 font-medium">Nombre: </span>
                          <span className="font-semibold text-primary">
                            {orderDetail.user_first_name || orderDetail.guest_first_name || ''} {orderDetail.user_last_name || orderDetail.guest_last_name || ''}
                          </span>
                        </div>

                        <div>
                          <span className="text-primary/60 font-medium">Email: </span>
                          <a 
                            href={`mailto:${orderDetail.user_email || orderDetail.guest_email}`} 
                            className="text-steel font-medium hover:underline"
                          >
                            {orderDetail.user_email || orderDetail.guest_email || 'No registrado'}
                          </a>
                        </div>

                        {(orderDetail.user_phone || orderDetail.guest_phone || orderDetail.shipping_phone || orderDetail.db_phone) && (
                          <div className="flex items-center justify-between pt-1">
                            <div>
                              <span className="text-primary/60 font-medium">Teléfono: </span>
                              <span className="font-semibold text-primary">
                                {orderDetail.guest_phone || orderDetail.user_phone || orderDetail.shipping_phone || orderDetail.db_phone}
                              </span>
                            </div>
                            {/* WhatsApp Button */}
                            <a
                              href={`https://wa.me/51${(orderDetail.guest_phone || orderDetail.user_phone || orderDetail.shipping_phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${orderDetail.guest_first_name || orderDetail.user_first_name || ''}, te contactamos de caVani respecto a tu pedido ${orderDetail.order_number}.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#20ba5a] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors"
                            >
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        )}

                        {orderDetail.mp_payment_id && (
                          <div className="pt-1 border-t border-neutral-light/50 text-[10px]">
                            <span className="text-primary/60 font-medium">ID Mercado Pago: </span>
                            <span className="font-mono text-primary font-bold">{orderDetail.mp_payment_id}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Shipping & Delivery Information */}
                    <div className="bg-neutral-light/30 border border-neutral-light p-4 rounded-lg space-y-3">
                      <div className="flex items-center justify-between border-b border-neutral-light/80 pb-2">
                        <h4 className="font-semibold text-primary uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-steel" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Entrega & Dirección
                        </h4>
                        <span className="text-[9px] uppercase font-bold text-steel">
                          {orderDetail.shipping_method === 'pickup' ? '📍 Recojo' :
                           orderDetail.shipping_method === 'provincia' ? '📦 Provincia' :
                           '🛵 Delivery Lima'}
                        </span>
                      </div>

                      <div className="space-y-1.5 leading-relaxed">
                        {orderDetail.shipping_method === 'pickup' ? (
                          <div className="space-y-1 text-primary/80">
                            <p className="font-semibold text-primary">Recojo en Oficina / Tienda:</p>
                            <p className="text-[11px]">Santiago de Surco, Lima (previa coordinación).</p>
                          </div>
                        ) : orderDetail.shipping_method === 'provincia' ? (
                          <div className="space-y-1 text-primary/80">
                            <p className="font-semibold text-primary">Envío a Provincia (Pago en destino):</p>
                            <p className="text-[11px]">
                              {orderDetail.shipping_city || orderDetail.db_city || 'Ciudad'}, {orderDetail.shipping_state || orderDetail.db_state || 'Departamento'}
                            </p>
                            {orderDetail.shipping_reference && (
                              <p className="text-[10px] text-primary/60 italic">Ref: {orderDetail.shipping_reference}</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1 text-primary/80">
                            <p className="font-medium">
                              {orderDetail.shipping_address_line1 || orderDetail.db_address_line1}
                              {orderDetail.shipping_address_line2 ? `, ${orderDetail.shipping_address_line2}` : ''}
                            </p>
                            <p className="text-[11px]">
                              {orderDetail.shipping_city || orderDetail.db_city}, {orderDetail.shipping_state || orderDetail.db_state} {orderDetail.shipping_postal_code || orderDetail.db_postal_code}
                            </p>
                            {(orderDetail.shipping_reference || orderDetail.shipping_address_line2) && (
                              <p className="text-[10px] text-primary/60 italic">Ref: {orderDetail.shipping_reference || orderDetail.shipping_address_line2}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Items Breakdown Table (Images loaded ONLY when modal is active) */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-primary uppercase tracking-wider text-[10px]">
                      Artículos del Pedido ({orderDetail.items?.length || 0})
                    </h4>

                    <div className="border border-neutral-light rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-neutral-light/60 font-bold uppercase tracking-wider text-primary/70 text-[9px] border-b border-neutral-light">
                            <th className="p-3">Producto</th>
                            <th className="p-3">Variante / SKU</th>
                            <th className="p-3 text-center">Cant.</th>
                            <th className="p-3 text-right">Precio Unit.</th>
                            <th className="p-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-light">
                          {orderDetail.items && orderDetail.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-neutral-light/20">
                              {/* Product with image thumbnail & fallback */}
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-16 bg-neutral-light rounded overflow-hidden flex-shrink-0 border border-neutral-light/60 flex items-center justify-center">
                                    {item.image_url ? (
                                      <img
                                        src={item.image_url}
                                        alt={item.product_name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.onerror = null;
                                          e.currentTarget.src = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=150&q=80';
                                        }}
                                      />
                                    ) : (
                                      <svg className="w-6 h-6 text-primary/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-primary block">{item.product_name}</span>
                                    {item.product_slug && (
                                      <a
                                        href={`/product/${item.product_slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[9px] text-steel hover:underline"
                                      >
                                        Ver en tienda &rarr;
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Variant SKU, Color, Size */}
                              <td className="p-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    {item.color_name && (
                                      <span className="inline-flex items-center gap-1 bg-neutral-light px-2 py-0.5 rounded text-[9px] font-semibold text-primary">
                                        {item.color_hex && (
                                          <span className="w-2 h-2 rounded-full border border-neutral-dark/20" style={{ backgroundColor: item.color_hex }}></span>
                                        )}
                                        {item.color_name}
                                      </span>
                                    )}
                                    {item.size_name && (
                                      <span className="bg-neutral-light px-2 py-0.5 rounded text-[9px] font-bold text-primary">
                                        Talla {item.size_name}
                                      </span>
                                    )}
                                  </div>
                                  {item.sku && (
                                    <span className="text-[9px] text-primary/50 font-mono block">SKU: {item.sku}</span>
                                  )}
                                </div>
                              </td>

                              {/* Quantity */}
                              <td className="p-3 text-center font-bold text-primary">
                                {item.quantity}
                              </td>

                              {/* Unit Price */}
                              <td className="p-3 text-right text-primary">
                                S/{parseFloat(item.price).toFixed(2)}
                              </td>

                              {/* Subtotal */}
                              <td className="p-3 text-right font-bold text-primary">
                                S/{parseFloat(item.item_subtotal || (item.price * item.quantity)).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financial Summary & Promo Details */}
                  <div className="bg-neutral-light/40 border border-neutral-light rounded-lg p-5 space-y-2.5">
                    <div className="flex justify-between text-primary/75">
                      <span>Subtotal de Productos:</span>
                      <span className="font-semibold text-primary">S/{parseFloat(orderDetail.subtotal || 0).toFixed(2)}</span>
                    </div>

                    {orderDetail.promo_code && (
                      <div className="flex justify-between text-green-700 font-medium">
                        <span className="flex items-center gap-1.5">
                          <span>Cupón de Descuento:</span>
                          <span className="bg-green-100 border border-green-300 text-green-800 px-1.5 py-0.2 rounded font-mono text-[9px] font-bold uppercase">
                            {orderDetail.promo_code}
                          </span>
                        </span>
                        <span>
                          {orderDetail.promo_discount_type === 'percentage' 
                            ? `-${parseFloat(orderDetail.promo_discount_value)}%` 
                            : `-S/${parseFloat(orderDetail.promo_discount_value || 0).toFixed(2)}`}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-primary/75">
                      <span>Costo de Envío:</span>
                      <span className="font-semibold text-primary">
                        {parseFloat(orderDetail.shipping_cost || 0) === 0 ? 'Gratis (S/0.00)' : `S/${parseFloat(orderDetail.shipping_cost).toFixed(2)}`}
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-neutral-light pt-3 text-sm font-bold text-primary">
                      <span>Total Facturado:</span>
                      <span className="text-base text-primary">S/{parseFloat(orderDetail.total).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Quick Change Status from Modal */}
                  <div className="p-4 bg-white border border-neutral-light rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="font-semibold text-primary text-xs">Actualizar estado de este pedido:</span>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={orderDetail.status}
                        disabled={updatingStatus}
                        onChange={(e) => handleStatusChange(orderDetail.id, e.target.value)}
                        className={`rounded px-3 py-2 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary bg-white border border-neutral-dark/30 cursor-pointer ${getStatusBadge(orderDetail.status)}`}
                      >
                        {statuses.map(st => (
                          <option key={st} value={st} className="bg-white text-primary font-medium">{st}</option>
                        ))}
                      </select>
                      {updatingStatus && <span className="text-[10px] text-primary/60 animate-pulse">Guardando...</span>}
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-neutral-light/40 border-t border-neutral-light flex items-center justify-end gap-3 flex-shrink-0">
              <button
                onClick={handleCloseDetail}
                className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-6 py-2.5 rounded hover:bg-steel transition-colors focus:outline-none shadow-sm"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

