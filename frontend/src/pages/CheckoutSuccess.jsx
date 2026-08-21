import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import api from '../utils/api';

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

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const { fetchCart } = useCart();
  const paymentId = searchParams.get('payment_id');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    // Clear checkout cart upon successful payment to prevent duplicate orders
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    if (!paymentId) {
      setLoading(false);
      return;
    }

    let retries = 0;
    const maxRetries = 15; // 15 attempts * 2 seconds = 30 seconds
    let timer;

    const checkOrder = async () => {
      try {
        const res = await api.get(`/orders/payment/${paymentId}`);
        setOrder(res.data.order);
        setLoading(false);
      } catch (err) {
        if (err.response?.status === 404 && retries < maxRetries) {
          retries++;
          timer = setTimeout(checkOrder, 2000);
        } else {
          setLoading(false);
          if (retries >= maxRetries) {
            setTimeoutReached(true);
          }
        }
      }
    };

    checkOrder();
    return () => clearTimeout(timer);
  }, [paymentId]);

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

      {loading ? (
        <div className="py-4 flex flex-col items-center justify-center space-y-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] text-primary/60 font-semibold uppercase tracking-wider">Confirmando tu pedido...</span>
        </div>
      ) : order ? (
        <div className="bg-neutral-light p-6 rounded-lg text-left text-xs space-y-2 border border-neutral-light/50 shadow-sm">
          <div><span className="font-semibold text-primary">Número de Pedido:</span> {order.order_number}</div>
          <div><span className="font-semibold text-primary">Total Facturado:</span> S/{parseFloat(order.total).toFixed(2)}</div>
          <div>
            <span className="font-semibold text-primary">Envío:</span>{' '}
            {order.shipping_method === 'pickup' ? '📍 Recojo en dirección' :
             order.shipping_method === 'delivery_lima' ? '🛵 Delivery Lima & Callao' :
             order.shipping_method === 'provincia' ? '📦 Envío a provincia' :
             order.shipping_method}
          </div>
          <div><span className="font-semibold text-primary">ID de Transacción MP:</span> {paymentId}</div>
        </div>
      ) : timeoutReached ? (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg text-left text-xs space-y-2 text-yellow-800">
          <p className="font-semibold text-primary">Tu pago se está confirmando:</p>
          <p className="font-light">Estamos validando la transacción con la pasarela. Tu pedido será procesado de forma automática una vez confirmado. Te notificaremos pronto.</p>
          <div><span className="font-semibold text-primary">ID de Transacción MP:</span> {paymentId}</div>
        </div>
      ) : (
        <div className="bg-neutral-light p-6 rounded-lg text-left text-xs space-y-2 border border-neutral-light/50">
          <div><span className="font-semibold text-primary">ID de Transacción MP:</span> {paymentId}</div>
          <div><span className="font-semibold text-primary">Estado del Pago:</span> Aprobado</div>
          <div><span className="font-semibold text-primary">Método:</span> Mercado Pago</div>
        </div>
      )}

      {/* WhatsApp Action Button */}
      {!loading && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md text-xs text-green-800 space-y-3 mt-4 text-left">
          <p className="font-semibold text-primary">
            {order?.shipping_method === 'delivery_lima' ? 'Detalles de tu Envío:' : '⚠️ Coordinación Requerida:'}
          </p>
          <p>
            {order ? (
              order.shipping_method === 'pickup' ? 'Por favor coordina el día y hora para recoger tu producto en nuestra oficina.' :
              order.shipping_method === 'provincia' ? 'Por favor coordina el costo y detalles de envío por pagar a provincia.' :
              'Tu pedido se enviará a tu dirección registrada en Lima & Callao.'
            ) : (
              '¿Deseas contactarnos para coordinar tu entrega o resolver alguna duda?'
            )}
          </p>
          <a 
            href={order ? getWhatsAppLink(order) : `https://wa.me/51941460237?text=${encodeURIComponent(`Hola caVani, he realizado el pago con ID ${paymentId} y deseo coordinar mi pedido.`)}`}
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
