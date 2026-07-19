import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const res = await api.get('/admin/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  if (loading) {
    return <div className="p-8 text-xs">Cargando panel de control...</div>;
  }

  const { metrics, lowStock, bestSellers, recentOrders } = data;

  return (
    <div className="p-8 space-y-8 flex-grow overflow-y-auto">
      <div>
        <span className="text-[9px] tracking-widest uppercase font-semibold text-steel">caVani Medical</span>
        <h1 className="font-serif text-3xl font-light text-primary">Dashboard de Métricas</h1>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-neutral-light/50 p-6 rounded-lg shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-primary/65 block mb-1">Ventas Totales</span>
          <span className="text-2xl font-bold text-primary">${metrics.totalSales.toFixed(2)}</span>
        </div>
        <div className="bg-white border border-neutral-light/50 p-6 rounded-lg shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-primary/65 block mb-1">Pedidos Totales</span>
          <span className="text-2xl font-bold text-primary">{metrics.totalOrders}</span>
        </div>
        <div className="bg-white border border-neutral-light/50 p-6 rounded-lg shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-primary/65 block mb-1">Clientes</span>
          <span className="text-2xl font-bold text-primary">{metrics.totalCustomers}</span>
        </div>
        <div className="bg-white border border-neutral-light/50 p-6 rounded-lg shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-primary/65 block mb-1">Productos</span>
          <span className="text-2xl font-bold text-primary">{metrics.totalProducts}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Orders List */}
        <div className="lg:col-span-2 bg-white border border-neutral-light/50 rounded-lg p-6 shadow-sm space-y-4">
          <h3 className="font-serif text-base font-semibold text-primary">Pedidos Recientes</h3>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-light/50 font-bold uppercase tracking-wider text-primary/60 pb-2">
                  <th className="py-2">Pedido</th>
                  <th className="py-2">Cliente</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-light font-light">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-neutral-light/20 transition-colors">
                    <td className="py-3 font-semibold">{ord.order_number}</td>
                    <td className="py-3">{ord.first_name} {ord.last_name}</td>
                    <td className="py-3 font-semibold">${parseFloat(ord.total).toFixed(2)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        ord.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                        ord.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 text-primary/70">{new Date(ord.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bestselling items */}
        <div className="bg-white border border-neutral-light/50 rounded-lg p-6 shadow-sm space-y-4">
          <h3 className="font-serif text-base font-semibold text-primary">Más Vendidos</h3>
          <div className="space-y-4 text-xs font-light">
            {bestSellers.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-4 border-b border-neutral-light pb-3 last:border-b-0">
                <div className="w-10 h-12 bg-neutral-light rounded overflow-hidden flex-shrink-0">
                  <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow">
                  <span className="font-semibold text-primary block leading-tight">{item.name}</span>
                  <span className="text-[10px] text-primary/60">{item.units_sold} unidades vendidas</span>
                </div>
                <span className="font-bold text-primary">${parseFloat(item.price).toFixed(2)}</span>
              </div>
            ))}
            {bestSellers.length === 0 && (
              <p className="text-center text-primary/60 py-8 italic">No hay datos de ventas registrados.</p>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="lg:col-span-3 bg-white border border-neutral-light/50 rounded-lg p-6 shadow-sm space-y-4">
          <h3 className="font-serif text-base font-semibold text-primary text-red-500">Alertas de Bajo Inventario</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {lowStock.map((item) => (
              <div key={item.id} className="border border-red-100 bg-red-50/30 p-4 rounded-md space-y-1">
                <span className="font-semibold text-primary block leading-tight">{item.product_name}</span>
                <span className="text-[10px] text-primary/60">Color: {item.color_name} &middot; Talla: {item.size_name}</span>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-steel">SKU: {item.sku}</span>
                  <span className="font-bold text-red-600">Stock: {item.stock}</span>
                </div>
              </div>
            ))}
            {lowStock.length === 0 && (
              <p className="text-primary/60 italic p-4 sm:col-span-4 text-center">Todo el inventario se encuentra en niveles normales.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
