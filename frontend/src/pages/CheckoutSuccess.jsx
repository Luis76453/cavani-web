import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const { fetchCart } = useCart();
  const paymentId = searchParams.get('payment_id');

  useEffect(() => {
    // Clear checkout cart upon successful payment to prevent duplicate orders
    fetchCart();
  }, [fetchCart]);

  return (
    <div className="max-w-md mx-auto py-40 px-6 text-center space-y-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="font-serif text-3xl font-light text-primary">¡Pago Aprobado!</h1>
      <p className="text-xs text-primary/70 leading-relaxed">
        Gracias por comprar en caVani. Tu pago a través de Mercado Pago ha sido procesado de manera exitosa.
      </p>
      {paymentId && (
        <div className="bg-neutral-light p-6 rounded-lg text-left text-xs space-y-2 border border-neutral-light/50">
          <div><span className="font-semibold text-primary">ID de Transacción MP:</span> {paymentId}</div>
          <div><span className="font-semibold text-primary">Estado del Pago:</span> Aprobado</div>
          <div><span className="font-semibold text-primary">Método:</span> Mercado Pago</div>
        </div>
      )}
      <div className="pt-4 flex flex-col gap-3">
        <Link to="/profile" className="bg-primary text-white text-xs font-bold uppercase tracking-widest py-4 rounded hover:bg-steel transition-colors block">
          Ver Mis Pedidos
        </Link>
        <Link to="/" className="text-[10px] uppercase font-bold tracking-widest text-steel hover:underline block">
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
