import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../utils/api';


// Initialize Mercado Pago with locale set for Peru (Peru supports Visa, Mastercard, and Yape natively)





const getWhatsAppLink = (order) => {
  const phoneNumber = '+51941460237';
  let text = '';
  
  if (order.shipping_method === 'pickup') {
    text = `Hola caVani, he realizado el pedido ${order.order_number} por un total de S/${parseFloat(order.total).toFixed(2)} con el método de envío 'Recojo en dirección'. Deseo coordinar el día y hora para retirar mi producto.`;
  } else if (order.shipping_method === 'provincia') {
    text = `Hola caVani, he realizado el pedido ${order.order_number} por un total de S/${parseFloat(order.total).toFixed(2)} con el método de envío 'Envío a provincia'. Deseo coordinar el costo y los detalles de envío por pagar.`;
  } else {
    text = `Hola caVani, he realizado el pedido ${order.order_number} por un total de S/${parseFloat(order.total).toFixed(2)} con el método de envío 'Delivery Lima & Callao'.`;
  }
  
  return `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(text)}`;
};

export default function Checkout() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { cartItems, getSubtotal, fetchCart, loading: cartLoading } = useCart();
  const navigate = useNavigate();

  // Mode: 'guest' or 'user'
  const [checkoutMode, setCheckoutMode] = useState('guest');

  // Guest Information state (temporarily stored in localStorage, cleared upon success)
  const [guestInfo, setGuestInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('cavani_guest_info');
      return saved ? JSON.parse(saved) : {
        guest_first_name: '',
        guest_last_name: '',
        doc_type: 'DNI',
        doc_number: '',
        guest_email: '',
        guest_phone: ''
      };
    } catch {
      return {
        guest_first_name: '',
        guest_last_name: '',
        doc_type: 'DNI',
        doc_number: '',
        guest_email: '',
        guest_phone: ''
      };
    }
  });

  // Save guestInfo to localStorage for persistence while typing/reloading
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('cavani_guest_info', JSON.stringify(guestInfo));
    }
  }, [guestInfo, isAuthenticated]);

  const handleGuestInputChange = (e) => {
    const { name, value } = e.target;
    setGuestInfo(prev => ({ ...prev, [name]: value }));
  };

  // Pricing
  const subtotal = getSubtotal();
  const [shippingMethod, setShippingMethod] = useState('delivery_lima');
  const shipping = useMemo(() => {
    if (shippingMethod === 'pickup') {
      return 0;
    }
    if (shippingMethod === 'delivery_lima') {
      return subtotal > 250 ? 0 : 10.00;
    }
    if (shippingMethod === 'provincia') {
      return 0;
    }
    return 0;
  }, [shippingMethod, subtotal]);

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
    country: 'Perú',
    phone: '',
    reference: ''
  });

  // Keep reference to state
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

  // Scroll to top when order is placed successfully and clear strictly temporal guest info
  useEffect(() => {
    if (orderConfirmed) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      // Clear temporal guest info and session upon success
      localStorage.removeItem('cavani_guest_info');
      localStorage.removeItem('cavani_session_id');
    }
  }, [orderConfirmed]);

  // Validate guest information
  const validateGuestInfo = () => {
    if (isAuthenticated) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!guestInfo.guest_first_name.trim() || !guestInfo.guest_last_name.trim()) {
      setErrorMessage('Por favor ingrese sus nombres y apellidos completos.');
      return false;
    }
    if (!guestInfo.doc_number.trim()) {
      setErrorMessage('Por favor ingrese su número de documento (DNI o RUC).');
      return false;
    }
    if (guestInfo.doc_type === 'DNI' && guestInfo.doc_number.trim().length !== 8) {
      setErrorMessage('El DNI debe contener exactamente 8 dígitos.');
      return false;
    }
    if (guestInfo.doc_type === 'RUC' && guestInfo.doc_number.trim().length !== 11) {
      setErrorMessage('El RUC debe contener exactamente 11 dígitos.');
      return false;
    }
    if (!guestInfo.guest_email.trim() || !emailRegex.test(guestInfo.guest_email.trim())) {
      setErrorMessage('Por favor ingrese un correo electrónico válido.');
      return false;
    }
    if (!guestInfo.guest_phone.trim() || guestInfo.guest_phone.trim().length < 7) {
      setErrorMessage('Por favor ingrese un número de teléfono de contacto válido (mínimo 7 dígitos).');
      return false;
    }
    return true;
  };

  const applyPromo = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!promoCode.trim()) return;

    try {
      const res = await api.get('/cart/validate-coupon', {
        params: { code: promoCode }
      });

      if (res.data.valid && res.data.coupon) {
        const { code, discount_type, discount_value } = res.data.coupon;
        let val = 0;
        if (discount_type === 'percentage') {
          val = subtotal * (discount_value / 100);
        } else if (discount_type === 'fixed') {
          val = discount_value;
        }

        setDiscount(val);
        setAppliedPromo(code);
      } else {
        setErrorMessage('Cupón inválido o expirado.');
        setDiscount(0);
        setAppliedPromo(null);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Cupón inválido o expirado.');
      setDiscount(0);
      setAppliedPromo(null);
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

    if (paymentMethod === 'credit_card') {
      return;
    }

    if (!validateGuestInfo()) {
      return;
    }

    const contactPhone = isAuthenticated ? address.phone : (guestInfo.guest_phone || address.phone);
    const contactEmail = isAuthenticated ? user?.email : guestInfo.guest_email.trim();
    const { address_line1, city, state, postal_code, reference } = address;
    let finalAddress = { ...address, phone: contactPhone, email: contactEmail };

    if (shippingMethod === 'pickup') {
      if (!contactPhone) {
        setErrorMessage('Por favor complete su teléfono de contacto.');
        return;
      }
      finalAddress = {
        address_line1: 'Recojo en Tienda',
        address_line2: '',
        city: 'Lima',
        state: 'Lima',
        postal_code: '15038',
        country: 'Perú',
        phone: contactPhone,
        email: contactEmail,
        reference: reference || ''
      };
    } else if (shippingMethod === 'provincia') {
      if (!city || !state || !contactPhone) {
        setErrorMessage('Por favor complete la provincia, departamento y teléfono de contacto.');
        return;
      }
      finalAddress = {
        address_line1: 'Por coordinar por WhatsApp',
        address_line2: '',
        city,
        state,
        postal_code: '00000',
        country: 'Perú',
        phone: contactPhone,
        email: contactEmail,
        reference: reference || ''
      };
    } else {
      if (!address_line1 || !city || !state || !postal_code || !contactPhone) {
        setErrorMessage('Por favor complete todos los campos de dirección requeridos.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const sessionId = localStorage.getItem('cavani_session_id');
      const guestPayloadData = !isAuthenticated ? {
        email: guestInfo.guest_email.trim(),
        firstName: guestInfo.guest_first_name.trim(),
        lastName: guestInfo.guest_last_name.trim(),
        phone: guestInfo.guest_phone.trim(),
        docType: guestInfo.doc_type,
        docNumber: guestInfo.doc_number.trim()
      } : undefined;

      const payload = {
        address: finalAddress,
        payment_method: paymentMethod,
        promo_code: appliedPromo,
        shipping_method: shippingMethod,
        session_id: !isAuthenticated ? sessionId : undefined,
        guestInfo: guestPayloadData,
        guest_info: guestPayloadData
      };

      const res = await api.post('/orders', payload);
      setOrderConfirmed(res.data.order);
      await fetchCart();
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Error al procesar su pedido. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMercadoPagoPayment = async () => {
    setErrorMessage('');

    if (!validateGuestInfo()) {
      return;
    }
    
    const contactPhone = isAuthenticated ? address.phone : (guestInfo.guest_phone || address.phone);
    const contactEmail = isAuthenticated ? user?.email : guestInfo.guest_email.trim();
    const { address_line1, city, state, postal_code, reference } = address;
    
    let finalAddress = { ...address, phone: contactPhone, email: contactEmail };

    if (shippingMethod === 'pickup') {
      if (!contactPhone) {
        setErrorMessage('Por favor complete su teléfono de contacto antes de efectuar el pago.');
        return;
      }
      finalAddress = {
        address_line1: 'Recojo en Tienda',
        address_line2: '',
        city: 'Lima',
        state: 'Lima',
        postal_code: '15038',
        country: 'Perú',
        phone: contactPhone,
        email: contactEmail,
        reference: reference || ''
      };
    } else if (shippingMethod === 'provincia') {
      if (!city || !state || !contactPhone) {
        setErrorMessage('Por favor complete la provincia, departamento y teléfono antes de efectuar el pago.');
        return;
      }
      finalAddress = {
        address_line1: 'Por coordinar por WhatsApp',
        address_line2: '',
        city,
        state,
        postal_code: '00000',
        country: 'Perú',
        phone: contactPhone,
        email: contactEmail,
        reference: reference || ''
      };
    } else {
      if (!address_line1 || !city || !state || !postal_code || !contactPhone) {
        setErrorMessage('Por favor complete todos los campos de dirección requeridos antes de efectuar el pago.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const sessionId = localStorage.getItem('cavani_session_id');
      const guestPayloadData = !isAuthenticated ? {
        email: guestInfo.guest_email.trim(),
        firstName: guestInfo.guest_first_name.trim(),
        lastName: guestInfo.guest_last_name.trim(),
        phone: guestInfo.guest_phone.trim(),
        docType: guestInfo.doc_type,
        docNumber: guestInfo.doc_number.trim()
      } : undefined;

      const payload = {
        address: finalAddress,
        promo_code: appliedPromo,
        shipping_method: shippingMethod,
        session_id: !isAuthenticated ? sessionId : undefined,
        guestInfo: guestPayloadData,
        guest_info: guestPayloadData
      };

      const res = await api.post('/payments/create-preference', payload);
      
      if (res.data && res.data.init_point) {
        window.location.href = res.data.init_point;
      } else {
        throw new Error('La respuesta del servidor no contiene el punto de inicio de pago.');
      }
    } catch (err) {
      console.error('Error starting Mercado Pago Checkout Pro:', err);
      setErrorMessage(
        err.response?.data?.message || 
        'Ocurrió un error al iniciar la pasarela de pagos de Mercado Pago. Por favor, reintente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = Math.max(0, subtotal - discount + shipping);

  
  
  if (authLoading) {
    return <div className="py-40 text-center text-xs">Cargando pasarela de pago...</div>;
  }

  if (orderConfirmed) {
    const isGuestOrder = !isAuthenticated || orderConfirmed.is_guest;
    const confirmEmail = orderConfirmed.guest_email || user?.email || guestInfo.guest_email;
    const confirmPhone = orderConfirmed.guest_phone || orderConfirmed.shipping_address_phone || guestInfo.guest_phone;

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
          <div><span className="font-semibold text-primary">Total Facturado:</span> S/{parseFloat(orderConfirmed.total).toFixed(2)}</div>
          {confirmEmail && <div><span className="font-semibold text-primary">Comprobante enviado a:</span> {confirmEmail}</div>}
          <div><span className="font-semibold text-primary">Estado:</span> {orderConfirmed.status}</div>
        </div>
        <div className="pt-4 flex flex-col gap-3">
          {!isGuestOrder && (
            <Link to="/profile" className="bg-primary text-white text-xs font-bold uppercase tracking-widest py-4 rounded hover:bg-steel transition-colors block">
              Ver Mis Pedidos
            </Link>
          )}
          <Link to="/catalog" className={`text-xs font-bold uppercase tracking-widest py-4 rounded transition-colors block ${isGuestOrder ? 'bg-primary text-white hover:bg-steel' : 'text-steel hover:underline'}`}>
            Volver a la Tienda
          </Link>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-md text-xs text-green-800 space-y-3 mt-4 text-left">
          <p className="font-semibold text-primary">
            {orderConfirmed.shipping_method === 'delivery_lima' 
              ? 'Detalles de tu Envío:' 
              : '⚠️ Coordinación Requerida:'}
          </p>
          <p>
            {orderConfirmed.shipping_method === 'pickup' ? 'Por favor coordina el día y hora para recoger tu producto en nuestra oficina.' :
             orderConfirmed.shipping_method === 'provincia' ? 'Por favor coordina el costo y detalles de envío por pagar a provincia.' :
             `Tu pedido se enviará a tu dirección registrada. Nos comunicaremos al ${confirmPhone || ''} vía WhatsApp para coordinar el motorizado.`}
          </p>
          <a 
            href={getWhatsAppLink(orderConfirmed)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded transition-colors w-full justify-center"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.724-1.466L0 24zm5.835-4.19c1.673.993 3.327 1.548 5.378 1.549 5.568 0 10.099-4.529 10.1-10.098.002-2.698-1.047-5.234-2.952-7.14C16.49 2.215 13.976.998 12.007.998c-5.572 0-10.104 4.532-10.107 10.101-.001 1.88.488 3.713 1.419 5.337L2.241 21.6l5.244-1.374c.159.088.291.16.407.24zM16.52 13.88c-.244-.122-1.45-.714-1.67-.796-.223-.081-.385-.122-.547.122-.162.244-.63.796-.772.957-.142.162-.284.181-.528.06-2.485-1.242-3.447-2.186-4.57-4.116-.142-.244-.142-.423-.02-.545.11-.11.244-.284.366-.427.121-.142.162-.244.244-.407.081-.162.041-.305-.02-.427-.06-.122-.547-1.32-.75-1.81-.197-.477-.398-.412-.547-.42-.14-.007-.302-.008-.463-.008-.162 0-.427.06-.65.305-.224.244-.854.834-.854 2.035 0 1.2 1.88 2.378 1.139 2.5 5.08 4.37 6.64 5.33 6.945 5.51.305.18.508.12.69.06.182-.06.772-.315.88-.62.108-.305.108-.567.076-.62-.03-.053-.122-.09-.366-.212z"/>
            </svg>
            <span>Coordinar por WhatsApp</span>
          </a>
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
          
          {/* Guest vs User Mode Selector */}
          {!isAuthenticated && (
            <div className="bg-neutral-light/40 border border-neutral-light p-6 rounded-lg space-y-4">
              <h2 className="font-serif text-lg font-medium text-primary">¿Cómo deseas comprar?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setCheckoutMode('guest')}
                  className={`p-4 border rounded-md text-xs font-semibold uppercase tracking-wider text-center transition-all ${checkoutMode === 'guest' ? 'border-primary bg-primary text-white' : 'border-neutral-dark/20 bg-white text-primary'}`}
                >
                  ⚡ Continuar como Invitado
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/auth?redirect=checkout')}
                  className="p-4 border border-neutral-dark/20 bg-white text-primary rounded-md text-xs font-semibold uppercase tracking-wider text-center hover:bg-neutral-light transition-all flex items-center justify-center gap-2"
                >
                  <span>👤 Iniciar Sesión / Registrarse</span>
                </button>
              </div>
            </div>
          )}

          {/* Guest Contact Information Form */}
          {!isAuthenticated && checkoutMode === 'guest' && (
            <div className="space-y-6 bg-white border border-neutral-light/50 p-8 rounded-lg shadow-sm">
              <h2 className="font-serif text-xl font-medium text-primary border-b border-neutral-light pb-3">Datos del Cliente (Invitado)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-2">Nombres *</label>
                  <input
                    type="text"
                    name="guest_first_name"
                    required
                    value={guestInfo.guest_first_name}
                    onChange={handleGuestInputChange}
                    placeholder="Ej. María"
                    className="w-full text-xs border border-neutral-dark/30 rounded px-4 py-3 focus:outline-none focus:border-primary bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-2">Apellidos *</label>
                  <input
                    type="text"
                    name="guest_last_name"
                    required
                    value={guestInfo.guest_last_name}
                    onChange={handleGuestInputChange}
                    placeholder="Ej. López"
                    className="w-full text-xs border border-neutral-dark/30 rounded px-4 py-3 focus:outline-none focus:border-primary bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-2">Tipo de Documento *</label>
                  <select
                    name="doc_type"
                    value={guestInfo.doc_type}
                    onChange={handleGuestInputChange}
                    className="w-full text-xs border border-neutral-dark/30 rounded px-4 py-3 focus:outline-none focus:border-primary bg-white"
                  >
                    <option value="DNI">DNI (Boleta)</option>
                    <option value="RUC">RUC (Factura)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-2">
                    Número de Documento ({guestInfo.doc_type === 'DNI' ? '8 dígitos' : '11 dígitos'}) *
                  </label>
                  <input
                    type="text"
                    name="doc_number"
                    required
                    maxLength={guestInfo.doc_type === 'DNI' ? 8 : 11}
                    value={guestInfo.doc_number}
                    onChange={handleGuestInputChange}
                    placeholder={guestInfo.doc_type === 'DNI' ? '12345678' : '20123456789'}
                    className="w-full text-xs border border-neutral-dark/30 rounded px-4 py-3 focus:outline-none focus:border-primary bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-2">Correo Electrónico (Para recibir comprobante) *</label>
                  <input
                    type="email"
                    name="guest_email"
                    required
                    value={guestInfo.guest_email}
                    onChange={handleGuestInputChange}
                    placeholder="ejemplo@correo.com"
                    className="w-full text-xs border border-neutral-dark/30 rounded px-4 py-3 focus:outline-none focus:border-primary bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-2">Teléfono / WhatsApp *</label>
                  <input
                    type="tel"
                    name="guest_phone"
                    required
                    value={guestInfo.guest_phone}
                    onChange={handleGuestInputChange}
                    placeholder="Ej. 987654321"
                    className="w-full text-xs border border-neutral-dark/30 rounded px-4 py-3 focus:outline-none focus:border-primary bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Shipping Method Selector */}
          <div className="space-y-6 bg-white border border-neutral-light/50 p-8 rounded-lg shadow-sm">
            <h2 className="font-serif text-xl font-medium text-primary border-b border-neutral-light pb-3">Método de Envío</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setShippingMethod('delivery_lima')}
                className={`p-4 border rounded-md text-xs font-semibold uppercase tracking-wider text-center transition-all flex flex-col items-center justify-center gap-2 ${shippingMethod === 'delivery_lima' ? 'border-primary bg-primary text-white font-semibold' : 'border-neutral-dark/20 text-primary'}`}
              >
                <span>🛵 Delivery Lima & Callao</span>
                <span className="text-[10px] opacity-80">
                  {subtotal > 250 ? '¡Envío Gratis!' : '+S/10.00'}
                </span>
              </button>
              
              <button
                type="button"
                onClick={() => setShippingMethod('pickup')}
                className={`p-4 border rounded-md text-xs font-semibold uppercase tracking-wider text-center transition-all flex flex-col items-center justify-center gap-2 ${shippingMethod === 'pickup' ? 'border-primary bg-primary text-white font-semibold' : 'border-neutral-dark/20 text-primary'}`}
              >
                <span>📍 Recojo en dirección</span>
                <span className="text-[10px] opacity-80">Gratis (S/0.00)</span>
              </button>

              <button
                type="button"
                onClick={() => setShippingMethod('provincia')}
                className={`p-4 border rounded-md text-xs font-semibold uppercase tracking-wider text-center transition-all flex flex-col items-center justify-center gap-2 ${shippingMethod === 'provincia' ? 'border-primary bg-primary text-white font-semibold' : 'border-neutral-dark/20 text-primary'}`}
              >
                <span>📦 Envío a provincia</span>
                <span className="text-[10px] opacity-80">Por Coordinar</span>
              </button>
            </div>
            
            {shippingMethod === 'pickup' && (
              <div className="bg-neutral-light border border-neutral-light/50 p-4 rounded text-[11px] leading-relaxed text-primary/80">
                <p className="font-semibold text-primary mb-1">📍 Dirección de recojo:</p>
                <p>Recojo disponible en Santiago de Surco, la ubicación exacta será enviada por WhatsApp una vez confirmado el pedido.</p>
                <p className="mt-2 font-medium">Horario: Previa coordinación.</p>
              </div>
            )}

            {shippingMethod === 'provincia' && (
              <div className="bg-neutral-light border border-neutral-light/50 p-4 rounded text-[11px] leading-relaxed text-primary/80">
                <p className="font-semibold text-primary mb-1">📦 Información de Envío a Provincia:</p>
                <p>El costo de envío **NO está incluido** en este pago. Se realizará mediante Olva Courier o Shalom con cobro en destino.</p>
                <p className="mt-2 font-semibold text-steel">El costo de envío se coordinará contigo vía WhatsApp una vez procesado el pedido.</p>
              </div>
            )}
          </div>

          {/* Shipping Address */}
          {shippingMethod !== 'pickup' ? (
            <div className="space-y-6">
              <h2 className="font-serif text-xl font-medium text-primary border-b border-neutral-light pb-3">Dirección de Envío</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {shippingMethod === 'delivery_lima' && (
                  <>
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
                  </>
                )}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-2">
                    {shippingMethod === 'provincia' ? 'Provincia / Ciudad *' : 'Ciudad *'}
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={address.city}
                    onChange={handleInputChange}
                    placeholder={shippingMethod === 'provincia' ? 'Ej. Arequipa' : 'Ciudad'}
                    className="w-full text-xs border border-neutral-dark/30 rounded px-4 py-3 focus:outline-none focus:border-primary bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-2">
                    {shippingMethod === 'provincia' ? 'Departamento / Región *' : 'Estado / Región *'}
                  </label>
                  <input
                    type="text"
                    name="state"
                    required
                    value={address.state}
                    onChange={handleInputChange}
                    placeholder={shippingMethod === 'provincia' ? 'Ej. Arequipa' : 'Estado'}
                    className="w-full text-xs border border-neutral-dark/30 rounded px-4 py-3 focus:outline-none focus:border-primary bg-white"
                  />
                </div>
                {shippingMethod === 'delivery_lima' && (
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
                )}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-2">Teléfono de Contacto *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={address.phone}
                    onChange={handleInputChange}
                    placeholder="Teléfono móvil"
                    className="w-full text-xs border border-neutral-dark/30 rounded px-4 py-3 focus:outline-none focus:border-primary bg-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 bg-white border border-neutral-light/50 p-8 rounded-lg shadow-sm">
              <h2 className="font-serif text-xl font-medium text-primary border-b border-neutral-light pb-3">Información de Contacto</h2>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-2">Teléfono de Contacto *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={address.phone}
                  onChange={handleInputChange}
                  placeholder="Teléfono móvil"
                  className="w-full text-xs border border-neutral-dark/30 rounded px-4 py-3 focus:outline-none focus:border-primary bg-white max-w-sm"
                />
              </div>
            </div>
          )}

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
            
            {paymentMethod === 'credit_card' && (
              <div className="bg-neutral-light border border-neutral-light/50 p-6 rounded-lg text-xs leading-relaxed text-primary/80 font-light space-y-2 mt-4">
                <p className="font-semibold text-primary">Pago Seguro con Mercado Pago:</p>
                <p>Al hacer clic en el botón de pago en la barra lateral, serás redirigido de manera segura a la plataforma de Mercado Pago para efectuar tu pago.</p>
                <p>Puedes pagar con tarjeta de crédito, débito o a través de otros medios habilitados por la plataforma.</p>
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
                    <span className="text-[10px] text-primary/60">
                      {item.size_name ? `Talla ${item.size_name}` : ''}
                      {item.size_name && item.color_name ? ' · ' : ''}
                      {item.color_name ? `Color ${item.color_name}` : ''}
                      {item.size_name || item.color_name ? ' ' : ''}
                      (x{item.quantity})
                    </span>
                  </div>
                  <span className="font-bold text-primary">S/{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            {/* Promo Code Input */}
            <div className="flex border border-neutral-dark/20 rounded overflow-hidden">
              <input
                type="text"
                placeholder="Código promocional (WELCOME10)"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    applyPromo(e);
                  }
                }}
                className="w-full text-xs px-3 py-2 focus:outline-none"
              />
              <button
                type="button"
                onClick={applyPromo}
                className="bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-4"
              >
                Aplicar
              </button>
            </div>

            {/* Calculations */}
            <div className="space-y-3 text-xs font-light text-primary/80 border-t border-neutral-light pt-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>S/{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Descuento</span>
                  <span>-S/{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Envío</span>
                <span>{shipping === 0 ? 'Gratis' : `S/${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between border-t border-neutral-light pt-4 text-sm font-bold text-primary">
                <span>Total a Pagar</span>
                <span>S/{total.toFixed(2)}</span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-md">
                {errorMessage}
              </div>
            )}

            {/* Action buttons depending on payment method */}
            {paymentMethod === 'bank_transfer' && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white text-xs font-bold uppercase tracking-widest py-4 rounded hover:bg-steel transition-colors focus:outline-none disabled:opacity-50"
              >
                {isSubmitting ? 'Procesando Pedido...' : `Confirmar y Pagar S/${total.toFixed(2)}`}
              </button>
            )}

            {paymentMethod === 'credit_card' && (
              <button
                type="button"
                onClick={handleMercadoPagoPayment}
                disabled={isSubmitting || cartLoading}
                className="w-full bg-primary text-white text-xs font-bold uppercase tracking-widest py-4 rounded hover:bg-steel transition-colors focus:outline-none disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Redirigiendo a Mercado Pago...</span>
                ) : (
                  <>
                    <span>Pagar con Mercado Pago</span>
                    <span>S/{total.toFixed(2)}</span>
                  </>
                )}
              </button>
            )}

            {/* Help / WhatsApp coordination */}
            <div className="border-t border-neutral-light pt-6 text-center">
              <p className="text-[10px] text-primary/60 mb-2">¿Tienes dudas con tu pedido o los métodos de envío?</p>
              <a
                href={`https://wa.me/51941460237?text=${encodeURIComponent("Hola caVani, estoy en la página de checkout y tengo algunas dudas sobre mi pedido.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-primary hover:text-steel transition-colors font-bold text-[10px] uppercase tracking-wider"
              >
                <svg className="w-4 h-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.724-1.466L0 24zm5.835-4.19c1.673.993 3.327 1.548 5.378 1.549 5.568 0 10.099-4.529 10.1-10.098.002-2.698-1.047-5.234-2.952-7.14C16.49 2.215 13.976.998 12.007.998c-5.572 0-10.104 4.532-10.107 10.101-.001 1.88.488 3.713 1.419 5.337L2.241 21.6l5.244-1.374c.159.088.291.16.407.24zM16.52 13.88c-.244-.122-1.45-.714-1.67-.796-.223-.081-.385-.122-.547.122-.162.244-.63.796-.772.957-.142.162-.284.181-.528.06-2.485-1.242-3.447-2.186-4.57-4.116-.142-.244-.142-.423-.02-.545.11-.11.244-.284.366-.427.121-.142.162-.244.244-.407.081-.162.041-.305-.02-.427-.06-.122-.547-1.32-.75-1.81-.197-.477-.398-.412-.547-.42-.14-.007-.302-.008-.463-.008-.162 0-.427.06-.65.305-.224.244-.854.834-.854 2.035 0 1.2 1.88 2.378 1.139 2.5 5.08 4.37 6.64 5.33 6.945 5.51.305.18.508.12.69.06.182-.06.772-.315.88-.62.108-.305.108-.567.076-.62-.03-.053-.122-.09-.366-.212z"/>
                </svg>
                <span>Consultas por WhatsApp</span>
              </a>
            </div>

          </div>

        </div>

      </form>
    </div>
  );
}
