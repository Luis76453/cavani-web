import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Profile() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('orders'); // 'profile', 'orders'

  // Scroll to top when tab or selected order details change
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [activeTab, selectedOrder]);

  // Redirect if guest
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Load orders history
  useEffect(() => {
    const loadOrders = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await api.get('/orders');
        setOrders(res.data.orders || []);
      } catch (err) {
        console.error('Error fetching customer orders:', err);
      } finally {
        setLoadingOrders(false);
      }
    };
    loadOrders();
  }, [isAuthenticated]);

  // View specific order detail
  const handleViewOrderDetail = async (orderId) => {
    try {
      const res = await api.get(`/orders/${orderId}`);
      setSelectedOrder(res.data.order);
    } catch (err) {
      console.error('Error loading order details:', err);
      alert('No se pudo cargar el detalle del pedido.');
    }
  };

  if (authLoading) {
    return <div className="py-40 text-center text-xs">Cargando perfil de usuario...</div>;
  }

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-32">
      <h1 className="font-serif text-3xl font-light text-primary mb-12 border-b border-neutral-light pb-6">Mi Cuenta</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Navigation Sidebar */}
        <aside className="space-y-3">
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full text-left px-4 py-3 rounded text-xs font-semibold uppercase tracking-widest transition-colors ${activeTab === 'orders' ? 'bg-primary text-white' : 'text-primary/75 hover:bg-neutral-light'}`}
          >
            Mis Pedidos
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-4 py-3 rounded text-xs font-semibold uppercase tracking-widest transition-colors ${activeTab === 'profile' ? 'bg-primary text-white' : 'text-primary/75 hover:bg-neutral-light'}`}
          >
            Datos Personales
          </button>
        </aside>

        {/* Content Section */}
        <main className="lg:col-span-3">
          
          {/* Tab: Orders History */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h2 className="font-serif text-xl font-medium text-primary mb-6">Historial de Pedidos</h2>
              
              {loadingOrders ? (
                <div className="space-y-4">
                  {[1, 2].map(n => <div key={n} className="h-20 bg-neutral-dark/10 animate-pulse rounded-lg"></div>)}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-neutral-dark/20 rounded-lg max-w-md mx-auto">
                  <svg className="w-12 h-12 mx-auto text-steel/40 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                  </svg>
                  <p className="text-xs text-primary/60 mb-6">Aún no has realizado ningún pedido en caVani.</p>
                  <Link to="/catalog" className="bg-primary text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded hover:bg-steel">
                    Ir al Catálogo
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto border border-neutral-light rounded-lg bg-white shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-light border-b border-neutral-light/50 font-bold uppercase tracking-wider text-primary/75">
                        <th className="p-4">Pedido</th>
                        <th className="p-4">Fecha</th>
                        <th className="p-4">Total</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4 text-right">Detalles</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-light font-light">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-neutral-light/35 transition-colors">
                          <td className="p-4 font-semibold text-primary">{order.order_number}</td>
                          <td className="p-4">{new Date(order.created_at).toLocaleDateString()}</td>
                          <td className="p-4 font-semibold">S/{parseFloat(order.total).toFixed(2)}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                              order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleViewOrderDetail(order.id)}
                              className="text-steel font-bold uppercase text-[9px] hover:underline"
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Profile Details */}
          {activeTab === 'profile' && (
            <div className="bg-white border border-neutral-light/50 rounded-lg p-8 shadow-sm space-y-6 max-w-xl">
              <h2 className="font-serif text-xl font-medium text-primary border-b border-neutral-light pb-4">Datos Personales</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs leading-relaxed">
                <div>
                  <span className="block font-semibold uppercase tracking-wider text-[10px] text-primary/60 mb-1">Nombre Completo</span>
                  <span className="text-sm font-medium text-primary">{user.first_name} {user.last_name}</span>
                </div>
                <div>
                  <span className="block font-semibold uppercase tracking-wider text-[10px] text-primary/60 mb-1">Rol de Cuenta</span>
                  <span className="text-sm font-medium text-steel uppercase">{user.role}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="block font-semibold uppercase tracking-wider text-[10px] text-primary/60 mb-1">Correo Electrónico</span>
                  <span className="text-sm font-medium text-primary">{user.email}</span>
                </div>
                <div>
                  <span className="block font-semibold uppercase tracking-wider text-[10px] text-primary/60 mb-1">Teléfono</span>
                  <span className="text-sm font-medium text-primary">{user.phone || 'No registrado'}</span>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-neutral-light flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-primary">Pedido {selectedOrder.order_number}</h3>
                <span className="text-[10px] text-primary/60">Realizado el {new Date(selectedOrder.created_at).toLocaleString()}</span>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="text-primary hover:text-steel p-2 focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-grow text-xs font-light">
              {/* Items Table */}
              <div className="space-y-4">
                <h4 className="font-semibold text-primary uppercase tracking-wider text-[10px]">Artículos</h4>
                <div className="divide-y divide-neutral-light">
                  {selectedOrder.items && selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-primary block">{item.product_name}</span>
                        <span className="text-[10px] text-primary/60">Color: {item.color_name} &middot; Talla: {item.size_name} (x{item.quantity})</span>
                      </div>
                      <span className="font-bold text-primary">S/{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Method and Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-neutral-light pt-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-primary uppercase tracking-wider text-[10px]">Método de Envío</h4>
                  <div className="leading-relaxed text-primary/80">
                    <p className="font-medium text-xs">
                      {selectedOrder.shipping_method === 'pickup' ? '📍 Recojo en dirección' :
                       selectedOrder.shipping_method === 'delivery_lima' ? '🛵 Delivery Lima & Callao' :
                       selectedOrder.shipping_method === 'provincia' ? '📦 Envío a provincia' :
                       selectedOrder.shipping_method || '🛵 Delivery Lima & Callao'}
                    </p>
                    {selectedOrder.shipping_method === 'pickup' && (
                      <p className="text-[10px] text-steel font-medium italic mt-1">Av. Primavera 120, Of. 402, Surco.</p>
                    )}
                    {selectedOrder.shipping_method === 'provincia' && (
                      <p className="text-[10px] text-steel font-medium italic mt-1">El costo se coordinará vía WhatsApp.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-primary uppercase tracking-wider text-[10px]">
                    {selectedOrder.shipping_method === 'pickup' ? 'Información de Contacto' : 'Dirección de Envío'}
                  </h4>
                  <div className="leading-relaxed text-primary/80">
                    {selectedOrder.shipping_method !== 'pickup' && (
                      <>
                        <p>{selectedOrder.address_line1}</p>
                        {selectedOrder.address_line2 && <p>{selectedOrder.address_line2}</p>}
                        <p>{selectedOrder.city}, {selectedOrder.state} {selectedOrder.postal_code}</p>
                        <p>{selectedOrder.country}</p>
                      </>
                    )}
                    <p className="mt-1 font-semibold">Teléfono: {selectedOrder.shipping_phone}</p>
                  </div>
                </div>
              </div>

              {/* Financial Breakdowns */}
              <div className="border-t border-neutral-light pt-4 space-y-2 text-right">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-primary">S/{parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Costo de Envío</span>
                  <span className="font-medium text-primary">S/{parseFloat(selectedOrder.shipping_cost).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-neutral-light pt-2 text-sm font-bold text-primary">
                  <span>Total</span>
                  <span>S/{parseFloat(selectedOrder.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-neutral-light text-right">
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded"
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
