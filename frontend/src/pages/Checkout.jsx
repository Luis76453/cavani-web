import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../utils/api';

export default function Checkout() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { cartItems, getSubtotal, fetchCart } = useCart();
  const navigate = useNavigate();

  // Redirect if guest
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth?redirect=checkout');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Pricing
  const subtotal = getSubtotal();
  const shipping = subtotal > 150 ? 0 : 9.99;
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [discount, setDiscount] = useState(0);

  // Address State
  const [address, setAddress] = useState({
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'México',
    phone: ''
  });

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    name: '',
    expiry: '',
    cvc: ''
  });

  // Order state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [orderConfirmed, setOrderConfirmed] = useState(null);

  const applyPromo = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!promoCode.trim()) return;

    try {
      // Seed code check locally to speed up or call API (mock promo calculation is checked in backend but we mirror it here)
      if (promoCode.toUpperCase().trim() === 'WELCOME10') {
        const val = subtotal * 0.10;
        setDiscount(val);
        setAppliedPromo('WELCOME10');
      } else {
        setErrorMessage('Cupón inválido o expirado.');
        setDiscount(0);
        setAppliedPromo(null);
      }
    } catch (err) {
      setErrorMessage('Error al aplicar el cupón.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleCardChange = (e) => {
    const { name, value } = e.target;
    setCardDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Validate inputs
    const { address_line1, city, state, postal_code, phone } = address;
    if (!address_line1 || !city || !state || !postal_code || !phone) {
      setErrorMessage('Por favor complete todos los campos de dirección requeridos.');
      return;
    }

    if (paymentMethod === 'credit_card') {
      const { number, name, expiry, cvc } = cardDetails;
      if (!number || !name || !expiry || !cvc) {
        setErrorMessage('Por favor complete los datos de su tarjeta de crédito.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/orders', {
        address,
        payment_method: paymentMethod,
        promo_code: appliedPromo
      });
      setOrderConfirmed(res.data.order);
      await fetchCart(); // Clear local/API cart items
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Error al procesar su pedido. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = Math.max(0, subtotal - discount + shipping);

  if (authLoading) {
    return <div className="py-40 text-center text-xs">Cargando pasarela de pago...</div>;
  }

  if (orderConfirmed) {
    return (
      <div className="max-w-md mx-auto py-40 px-6 text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-serif text-3xl font-light text-primary">¡Pedido Confirmado!</h1>
        <p className="text-xs text-primary/70 leading-relaxed">
          Gracias por comprar en caVani. Hemos recibido tu pedido con éxito y ya estamos preparando su envío.
        </p>
        <div className="bg-neutral-light p-6 rounded-lg text-left text-xs space-y-2 border border-neutral-light/50">
          <div><span className="font-semibold text-primary">Número de Pedido:</span> {orderConfirmed.order_number}</div>
          <div><span className="font-semibold text-primary">Total Facturado:</span> ${parseFloat(orderConfirmed.total).toFixed(2)}</div>
          <div><span className="font-semibold text-primary">Estado:</span> {orderConfirmed.status}</div>
        </div>
        <div className="pt-4 flex flex-col gap-3">
          <Link to="/profile" className="bg-primary text-white text-xs font-bold uppercase tracking-widest py-4 rounded hover:bg-steel transition-colors block">
            Ver Mis Pedidos
          </Link>
          <Link to="/catalog" className="text-[10px] uppercase font-bold tracking-widest text-steel hover:underline block">
            Volver a la Tienda
          </Link>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-md mx-auto py-48 px-6 text-center">
        <h2 className="font-serif text-xl font-semibold text-primary mb-3">No hay productos en su carrito</h2>
        <p className="text-xs text-primary/60 mb-6">Debe agregar productos antes de realizar el checkout.</p>
        <Link to="/catalog" className="bg-primary text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded">
          Ver Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-32">
      <h1 className="font-serif text-3xl font-light text-primary mb-12 border-b border-neutral-light pb-6">Checkout</h1>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-start">
        
        {/* Left Columns: Forms */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Shipping Address */}
          <div className="space-y-6">
            <h2 className="font-serif text-xl font-medium text-primary border-b border-neutral-light pb-3">Dirección de Envío</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-2">Dirección Linea 1 *</label>
                <input
                  type="text"
                  name="address_line1"
                  required
                  value={address.address_line1}
                  onChange={handleInputChange}
                  placeholder="Calle y número de casa"
                  className="w-full text-xs border border-neutral-dark/30 rounded px-4 py-3 focus:outline-none focus:border-primary bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-2">Dirección Linea 2 (Opcional)</label>
                <input
                  type="text"
                  name="address_line2"
                  value={address.address_line2}
                  onChange={handleInputChange}
                  placeholder="Departamento, suite, piso, etc."
                  className="w-full text-xs border border-neutral-dark/30 rounded px-4 py-3 focus:outline-none focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-2">Ciudad *</label>
                <input
                  type="text"
                  name="city"
                  required
                  value={address.city}
                  onChange={handleInputChange}
                  placeholder="Ciudad"
                  className="w-full text-xs border border-neutral-dark/30 rounded px-4 py-3 focus:outline-none focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-2">Estado / Región *</label>
                <input
                  type="text"
                  name="state"
                  required
                  value={address.state}
                  onChange={handleInputChange}
                  placeholder="Estado"
                  className="w-full text-xs border border-neutral-dark/30 rounded px-4 py-3 focus:outline-none focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-2">Código Postal *</label>
                <input
                  type="text"
                  name="postal_code"
                  required
                  value={address.postal_code}
                  onChange={handleInputChange}
                  placeholder="C.P."
                  className="w-full text-xs border border-neutral-dark/30 rounded px-4 py-3 focus:outline-none focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-2">Teléfono de Envío *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={address.phone}
                  onChange={handleInputChange}
                  placeholder="Teléfono"
                  className="w-full text-xs border border-neutral-dark/30 rounded px-4 py-3 focus:outline-none focus:border-primary bg-white"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-6">
            <h2 className="font-serif text-xl font-medium text-primary border-b border-neutral-light pb-3">Método de Pago</h2>
            <div className="flex space-x-6">
              <button
                type="button"
                onClick={() => setPaymentMethod('credit_card')}
                className={`flex-1 p-4 border rounded-md text-xs font-semibold uppercase tracking-wider text-center transition-all ${paymentMethod === 'credit_card' ? 'border-primary bg-primary text-white' : 'border-neutral-dark/20 text-primary'}`}
              >
                Tarjeta de Crédito
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`flex-1 p-4 border rounded-md text-xs font-semibold uppercase tracking-wider text-center transition-all ${paymentMethod === 'bank_transfer' ? 'border-primary bg-primary text-white' : 'border-neutral-dark/20 text-primary'}`}
              >
                Transferencia Bancaria
              </button>
            </div>

            {paymentMethod === 'credit_card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-white border border-neutral-light/50 p-6 rounded-lg">
                <div className="sm:col-span-3">
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-2">Número de Tarjeta</label>
                  <input
                    type="text"
                    name="number"
                    value={cardDetails.number}
                    onChange={handleCardChange}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="w-full text-xs border border-neutral-dark/20 rounded px-4 py-3 focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-2">Nombre en Tarjeta</label>
                  <input
                    type="text"
                    name="name"
                    value={cardDetails.name}
                    onChange={handleCardChange}
                    placeholder="TITULAR DE LA TARJETA"
                    className="w-full text-xs border border-neutral-dark/20 rounded px-4 py-3 focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-grow">
                    <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-2">Vencimiento</label>
                    <input
                      type="text"
                      name="expiry"
                      value={cardDetails.expiry}
                      onChange={handleCardChange}
                      placeholder="MM/AA"
                      className="w-full text-xs border border-neutral-dark/20 rounded px-4 py-3 focus:outline-none focus:border-primary text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-2">CVC</label>
                    <input
                      type="password"
                      name="cvc"
                      value={cardDetails.cvc}
                      onChange={handleCardChange}
                      placeholder="xxx"
                      className="w-full text-xs border border-neutral-dark/20 rounded px-4 py-3 focus:outline-none focus:border-primary text-center"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-light border border-neutral-light/50 p-6 rounded-lg text-xs leading-relaxed text-primary/80 font-light">
                <p className="font-semibold text-primary mb-2">Instrucciones de Transferencia:</p>
                <p>Por favor transfiera el monto total del pedido a la siguiente cuenta bancaria:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><span className="font-semibold">Banco:</span> Luxury Bank México</li>
                  <li><span className="font-semibold">CLABE:</span> 1271 8000 1234 5678 90</li>
                  <li><span className="font-semibold">Beneficiario:</span> caVani Medical S.A. de C.V.</li>
                  <li><span className="font-semibold">Concepto:</span> Tu correo registrado</li>
                </ul>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Order Summary & Coupon */}
        <div className="space-y-8">
          
          {/* Cart Items Details */}
          <div className="bg-white border border-neutral-light/50 rounded-lg p-8 shadow-sm space-y-6">
            <h3 className="font-serif text-lg font-semibold text-primary border-b border-neutral-light pb-4">Detalle de Compra</h3>
            <div className="divide-y divide-neutral-light max-h-60 overflow-y-auto pr-2">
              {cartItems.map((item) => (
                <div key={item.id} className="py-4 flex justify-between items-center text-xs">
                  <div className="pr-4">
                    <span className="font-semibold text-primary block">{item.name}</span>
                    <span className="text-[10px] text-primary/60">Talla {item.size_name} &middot; Color {item.color_name} (x{item.quantity})</span>
                  </div>
                  <span className="font-bold text-primary">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            {/* Promo Code Input */}
            <form onSubmit={applyPromo} className="flex border border-neutral-dark/20 rounded overflow-hidden">
              <input
                type="text"
                placeholder="Código promocional (WELCOME10)"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="w-full text-xs px-3 py-2 focus:outline-none"
              />
              <button type="submit" className="bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-4">
                Aplicar
              </button>
            </form>

            {appliedPromo && (
              <div className="text-[10px] font-semibold text-green-600 bg-green-50 px-3 py-2 rounded-md border border-green-200 flex justify-between">
                <span>Cupón "{appliedPromo}" Aplicado</span>
                <span>-10%</span>
              </div>
            )}

            {/* Calculations */}
            <div className="space-y-3 text-xs font-light text-primary/80 border-t border-neutral-light pt-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Descuento</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Envío</span>
                <span>{shipping === 0 ? 'Gratis' : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between border-t border-neutral-light pt-4 text-sm font-bold text-primary">
                <span>Total a Pagar</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-md">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-white text-xs font-bold uppercase tracking-widest py-4 rounded hover:bg-steel transition-colors focus:outline-none disabled:opacity-50"
            >
              {isSubmitting ? 'Procesando Pedido...' : `Confirmar y Pagar $${total.toFixed(2)}`}
            </button>

          </div>

        </div>

      </form>
    </div>
  );
}
