import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      alert('Estado de pedido actualizado.');
      loadOrders();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el estado del pedido.');
    }
  };

  const statuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  return (
    <div className="p-8 space-y-8 flex-grow overflow-y-auto">
      <div>
        <span className="text-[9px] tracking-widest uppercase font-semibold text-steel">caVani Medical</span>
        <h1 className="font-serif text-3xl font-light text-primary">Gestión de Pedidos</h1>
      </div>

      {loading ? (
        <div className="text-xs">Cargando pedidos...</div>
      ) : (
        <div className="bg-white border border-neutral-light/50 rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-light border-b border-neutral-light/50 font-bold uppercase tracking-wider text-primary/60">
                <th className="p-4">Pedido</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Total</th>
                <th className="p-4">Método de Pago</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Actualizar Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-light font-light">
              {orders.map((ord) => (
                <tr key={ord.id} className="hover:bg-neutral-light/20 transition-colors">
                  <td className="p-4 font-semibold text-primary">{ord.order_number}</td>
                  <td className="p-4">
                    <span className="font-medium block">{ord.first_name} {ord.last_name}</span>
                    <span className="text-[10px] text-primary/60">{ord.user_email}</span>
                  </td>
                  <td className="p-4 font-semibold">S/{parseFloat(ord.total).toFixed(2)}</td>
                  <td className="p-4 uppercase text-[10px]">{ord.payment_method?.replace(/_/g, ' ')}</td>
                  <td className="p-4 text-primary/70">{new Date(ord.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      ord.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                      ord.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      ord.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {ord.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <select
                      value={ord.status}
                      onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                      className="border border-neutral-dark/30 rounded px-2.5 py-1 text-xs text-primary focus:outline-none focus:border-primary bg-white"
                    >
                      {statuses.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-primary/60 italic">No hay pedidos registrados en el sistema.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
