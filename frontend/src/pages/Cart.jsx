import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { cartItems, loading, updateQuantity, removeFromCart, getSubtotal, cartWarnings, setCartWarnings } = useCart();
  const navigate = useNavigate();

  const subtotal = getSubtotal();
  const shipping = subtotal === 0 ? 0 : (subtotal > 150 ? 0 : 9.99);
  const total = subtotal + shipping;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-40 animate-pulse space-y-6">
        <div className="h-10 w-1/4 bg-neutral-dark/15 rounded"></div>
        <div className="h-64 bg-neutral-dark/15 rounded"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-32">
      <h1 className="font-serif text-3xl font-light text-primary mb-12 border-b border-neutral-light pb-6">
        Bolsa de Compra
      </h1>

      {cartWarnings && cartWarnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl text-xs space-y-1 mb-8 relative pr-8">
          <button 
            onClick={() => setCartWarnings([])}
            className="absolute top-3 right-4 text-yellow-800 hover:text-black font-semibold text-sm focus:outline-none"
            aria-label="Cerrar aviso"
          >
            &times;
          </button>
          <p className="font-semibold">Nota sobre tu carrito:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            {cartWarnings.map((w, idx) => <li key={idx}>{w}</li>)}
          </ul>
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="text-center py-24 max-w-md mx-auto">
          <svg className="w-16 h-16 mx-auto text-steel/40 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <h2 className="font-serif text-xl font-semibold text-primary mb-3">Tu bolsa está vacía</h2>
          <p className="text-xs text-primary/60 mb-8 leading-relaxed">
            Explora nuestras colecciones médicas premium y agrega los mejores scrubs y batas diseñados para tu jornada diaria.
          </p>
          <Link 
            to="/catalog" 
            className="bg-primary text-white text-xs font-bold uppercase tracking-widest px-8 py-4 rounded hover:bg-steel transition-colors block"
          >
            Explorar Productos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-start">
          
          {/* Cart items list */}
          <div className="lg:col-span-2 space-y-8">
            {cartItems.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center gap-6 border-b border-neutral-light pb-8"
              >
                {/* Image */}
                <div className="w-24 aspect-[3/4] bg-neutral-light rounded overflow-hidden flex-shrink-0">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                </div>
                
                {/* Details */}
                <div className="flex-grow space-y-2">
                  <span className="text-[9px] uppercase tracking-widest text-steel font-bold">
                    SKU: {item.sku}
                  </span>
                  <Link to={`/product/${item.slug}`} className="font-serif text-sm font-semibold text-primary hover:text-steel block transition-colors">
                    {item.name}
                  </Link>
                  {(item.color_name || item.size_name) ? (
                    <p className="text-[10px] text-primary/70">
                      {item.color_name && <>Color: <span className="font-semibold">{item.color_name}</span></>}
                      {item.color_name && item.size_name && <> &middot; </>}
                      {item.size_name && <>Talla: <span className="font-semibold">{item.size_name}</span></>}
                    </p>
                  ) : null}
                  
                  {/* Quantity editor */}
                  <div className="flex items-center space-x-4 pt-2">
                    <div className="flex items-center border border-neutral-dark/20 rounded">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-1 text-primary hover:bg-neutral-light"
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>
                      <span className="px-3 text-xs font-semibold">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 text-primary hover:bg-neutral-light"
                        disabled={item.quantity >= item.stock}
                      >
                        +
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-[10px] uppercase font-bold tracking-wider text-red-500 hover:text-red-600 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-bold text-primary block">
                    S/{(parseFloat(item.price) * item.quantity).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-primary/60">
                    S/{parseFloat(item.price).toFixed(2)} c/u
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Cart summary order details card */}
          <div className="bg-white border border-neutral-light/50 rounded-lg p-8 space-y-6 shadow-sm">
            <h3 className="font-serif text-lg font-semibold text-primary border-b border-neutral-light pb-4">
              Resumen del Pedido
            </h3>
            
            <div className="space-y-4 text-xs font-light text-primary/80">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-primary">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Costo de Envío</span>
                <span className="font-semibold text-primary">
                  {shipping === 0 ? 'Gratis' : `S/${shipping.toFixed(2)}`}
                </span>
              </div>
              {subtotal < 150 && (
                <p className="text-[10px] text-steel italic">
                  * Agrega S/{(150 - subtotal).toFixed(2)} más para obtener envío gratuito.
                </p>
              )}
              <div className="flex justify-between border-t border-neutral-light pt-4 text-sm font-bold text-primary">
                <span>Total</span>
                <span>S/{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-primary text-white text-xs font-bold uppercase tracking-widest py-4 rounded hover:bg-steel transition-colors block text-center focus:outline-none"
            >
              Proceder al Pago
            </button>
            
            <div className="text-center">
              <Link to="/catalog" className="text-[10px] uppercase font-bold tracking-widest text-steel hover:underline">
                Seguir Comprando
              </Link>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
