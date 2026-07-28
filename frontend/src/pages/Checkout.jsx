import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../utils/api';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

// Initialize Mercado Pago with locale set for Peru (Peru supports Visa, Mastercard, and Yape natively)
const mpPublicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
if (mpPublicKey) {
  initMercadoPago(mpPublicKey, { locale: 'es-PE' });
}

// Module-level static customization configuration to avoid reference changes during render
const MP_CUSTOMIZATION = {
  paymentMethods: {
    ticket: undefined, // Disable cash coupons
    bankTransfer: undefined, // Handled separately
    creditCard: 'all',
    debitCard: 'all',
    mercadoPago: 'all', // Includes digital wallets like Yape
  },
};

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

  // Keep reference to address and promo state to avoid recreating the submit callback on every keystroke
  const addressRef = useRef(address);
  const appliedPromoRef = useRef(appliedPromo);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  useEffect(() => {
    appliedPromoRef.current = appliedPromo;
  }, [appliedPromo]);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('credit_card');

  // Order state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [orderConfirmed, setOrderConfirmed] = useState(null);

  // Scroll to top when order is placed successfully
  useEffect(() => {
    if (orderConfirmed) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [orderConfirmed]);

  const applyPromo = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!promoCode.trim()) return;

    try {
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

  // Submit Order for Bank Transfer (standard POST /orders)
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // If credit card, the submit action is managed by the Mercado Pago onSubmit Brick handler,
    // so we return immediately and avoid duplicate submission.
    if (paymentMethod === 'credit_card') {
      return;
    }

    // Validate inputs
    const { address_line1, city, state, postal_code, phone } = address;
    if (!address_line1 || !city || !state || !postal_code || !phone) {
      setErrorMessage('Por favor complete todos los campos de dirección requeridos.');
      return;
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

  // Submit handler for Mercado Pago payment processing route
  // useCallback dependencies do not require 'address' or 'appliedPromo' as we access them via refs
  const handleMercadoPagoSubmit = useCallback(({ formData }) => {
    return new Promise(async (resolve, reject) => {
      setErrorMessage('');

      // Validate address inputs first before triggering payment
      const currentAddress = addressRef.current;
      const currentPromo = appliedPromoRef.current;
      const { address_line1, city, state, postal_code, phone } = currentAddress;
      
      if (!address_line1 || !city || !state || !postal_code || !phone) {
        setErrorMessage('Por favor complete todos los campos de dirección requeridos antes de efectuar el pago.');
        reject();
        return;
      }

      // Generate a unique idempotency key to prevent double charging on retry
      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      try {
        const res = await api.post('/payments/process', {
          formData,
          address: currentAddress,
          promo_code: currentPromo,
          idempotency_key: idempotencyKey
        });

        const { status, order } = res.data;

        if (status === 'approved') {
          setOrderConfirmed(order);
          await fetchCart(); // Clear user cart items
          resolve();
        } else {
          setErrorMessage(res.data.message || 'El pago no fue aprobado.');
          reject();
        }
      } catch (err) {
        console.error('Mercado Pago submit failed:', err);
        const userMsg = err.response?.data?.message || 'Ocurrió un error al procesar el pago. Por favor, intente con otra tarjeta.';
        setErrorMessage(userMsg);
        reject();
      }
    });
  }, [fetchCart]);

  const handlePaymentReady = useCallback(() => {
    console.log('Mercado Pago Checkout Brick is ready');
  }, []);

  const handlePaymentError = useCallback((err) => {
    console.error('Mercado Pago Brick error:', err);
    setErrorMessage('Ocurrió un error al cargar la pasarela de pagos. Por favor reintente.');
  }, []);

  const total = Math.max(0, subtotal - discount + shipping);

  // Memoize initialization prop to only trigger update if the actual payment total shifts
  const mpInitialization = useMemo(() => ({
    amount: total,
  }), [total]);

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
                className={`flex-1 p-4 border rounded-md text-xs font-semibold uppercase tracking-wider text-center transition-all ${paymentMethod === 'credit_card' ? 'border-primary bg-primary text-white font-semibold' : 'border-neutral-dark/20 text-primary'}`}
              >
                Tarjeta / Pago Digital
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`flex-1 p-4 border rounded-md text-xs font-semibold uppercase tracking-wider text-center transition-all ${paymentMethod === 'bank_transfer' ? 'border-primary bg-primary text-white font-semibold' : 'border-neutral-dark/20 text-primary'}`}
              >
                Transferencia Bancaria
              </button>
            </div>

            {paymentMethod === 'credit_card' ? (
              <div className="bg-white border border-neutral-light/50 p-6 rounded-lg shadow-sm">
                {import.meta.env.VITE_MP_PUBLIC_KEY ? (
                  <Payment
                    initialization={mpInitialization}
                    customization={MP_CUSTOMIZATION}
                    onSubmit={handleMercadoPagoSubmit}
                    onReady={handlePaymentReady}
                    onError={handlePaymentError}
                  />
                ) : (
                  <div className="p-4 text-xs text-red-500 font-semibold bg-red-50 rounded-md border border-red-200">
                    Mercado Pago Public Key (VITE_MP_PUBLIC_KEY) no configurada en el cliente.
                  </div>
                )}
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

            {/* Submit button shown only for bank transfer (Mercado Pago Bricks has its own button) */}
            {paymentMethod === 'bank_transfer' && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white text-xs font-bold uppercase tracking-widest py-4 rounded hover:bg-steel transition-colors focus:outline-none disabled:opacity-50"
              >
                {isSubmitting ? 'Procesando Pedido...' : `Confirmar y Pagar $${total.toFixed(2)}`}
              </button>
            )}

          </div>

        </div>

      </form>
    </div>
  );
}
