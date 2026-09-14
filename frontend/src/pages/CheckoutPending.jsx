import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function CheckoutPending() {
  const [searchParams] = useSearchParams();
  const { fetchCart } = useCart();
  const { user } = useAuth();
  const paymentId = searchParams.get('payment_id');

  useEffect(() => {
    // Clear cart upon pending checkout to avoid double-charging
    fetchCart();
  }, [fetchCart]);

  const isGuest = !user;

  return (
    <div className="max-w-md mx-auto py-40 px-6 text-center space-y-6">
      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto text-yellow-600">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="font-serif text-3xl font-light text-primary">Pago Pendiente</h1>
      <p className="text-xs text-primary/70 leading-relaxed">
        Tu pago está siendo verificado o se encuentra en estado pendiente por la pasarela de pagos. Una vez aprobado, tu pedido será confirmado.
      </p>
      {paymentId && (
        <div className="bg-neutral-light p-6 rounded-lg text-left text-xs space-y-2 border border-neutral-light/50">
          <div><span className="font-semibold text-primary">ID de Transacción MP:</span> {paymentId}</div>
          <div><span className="font-semibold text-primary">Estado del Pago:</span> Pendiente de Confirmación</div>
          <div><span className="font-semibold text-primary">Método:</span> Mercado Pago</div>
        </div>
      )}
      <div className="pt-4 flex flex-col gap-3">
        {!isGuest && (
          <Link to="/profile" className="bg-primary text-white text-xs font-bold uppercase tracking-widest py-4 rounded hover:bg-steel transition-colors block">
            Ver Mis Pedidos
          </Link>
        )}
        <Link to="/catalog" className={`text-xs font-bold uppercase tracking-widest py-4 rounded transition-colors block ${isGuest ? 'bg-primary text-white hover:bg-steel' : 'text-steel hover:underline'}`}>
          Volver a la Tienda
        </Link>
      </div>
    </div>
  );
}
