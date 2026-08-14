import React from 'react';
import { Link } from 'react-router-dom';

export default function CheckoutFailure() {
  return (
    <div className="max-w-md mx-auto py-40 px-6 text-center space-y-6">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="font-serif text-3xl font-light text-primary">Pago Rechazado</h1>
      <p className="text-xs text-primary/70 leading-relaxed">
        Lamentablemente, el proceso de pago ha sido cancelado o rechazado por la pasarela de pagos. Por favor, intenta de nuevo o selecciona otro medio de pago.
      </p>
      <div className="pt-4 flex flex-col gap-3">
        <Link to="/checkout" className="bg-primary text-white text-xs font-bold uppercase tracking-widest py-4 rounded hover:bg-steel transition-colors block">
          Volver al Checkout
        </Link>
        <Link to="/" className="text-[10px] uppercase font-bold tracking-widest text-steel hover:underline block">
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
