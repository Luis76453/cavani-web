import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selected variant attributes
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState('');
  
  // UI notifications
  const [message, setMessage] = useState({ text: '', isError: false });
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      setMessage({ text: '', isError: false });
      try {
        const res = await api.get(`/products/${slug}`);
        const prod = res.data.product;
        setProduct(prod);

        // Set default color/size from variants
        if (prod.variants && prod.variants.length > 0) {
          // Unique colors
          const uniqueColors = Array.from(new Map(prod.variants.map(v => [v.color_id, v])).values());
          setSelectedColor(uniqueColors[0].color_id);
          
          // Unique sizes for that color
          const colorSizes = prod.variants.filter(v => v.color_id === uniqueColors[0].color_id);
          setSelectedSize(colorSizes[0].size_id);
        }

        // Set main image
        const featured = prod.images.find(img => img.is_featured) || prod.images[0];
        setActiveImage(featured ? featured.image_url : '');

        // Load related category products
        const relatedRes = await api.get('/products', {
          params: { category: prod.category_name?.toLowerCase().replace(/ /g, '-') }
        });
        setRelatedProducts(relatedRes.data.products.filter(p => p.id !== prod.id).slice(0, 4));

      } catch (err) {
        console.error('Error fetching product details:', err);
        setMessage({ text: 'No se pudo cargar el detalle del producto.', isError: true });
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [slug]);

  // Handle color change and select a fallback size for this color if the old size doesn't exist
  const handleColorChange = (colorId) => {
    setSelectedColor(colorId);
    const colorVariants = product.variants.filter(v => v.color_id === colorId);
    const hasSize = colorVariants.find(v => v.size_id === selectedSize);
    if (!hasSize && colorVariants.length > 0) {
      setSelectedSize(colorVariants[0].size_id);
    }
    setQuantity(1);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-40 grid grid-cols-1 lg:grid-cols-2 gap-16 animate-pulse">
        <div className="aspect-[3/4] bg-neutral-dark/15 rounded-lg"></div>
        <div className="space-y-6">
          <div className="h-6 w-1/4 bg-neutral-dark/15 rounded"></div>
          <div className="h-10 w-3/4 bg-neutral-dark/15 rounded"></div>
          <div className="h-6 w-1/3 bg-neutral-dark/15 rounded"></div>
          <div className="h-24 w-full bg-neutral-dark/15 rounded"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto text-center py-48 px-6">
        <h2 className="font-serif text-2xl font-bold text-primary mb-4">Producto no encontrado</h2>
        <p className="text-xs text-primary/60 mb-6">El producto que buscas no existe o fue descontinuado.</p>
        <Link to="/catalog" className="bg-primary text-white text-xs font-bold uppercase tracking-widest px-6 py-3.5 rounded hover:bg-steel transition-colors">
          Volver al Catálogo
        </Link>
      </div>
    );
  }

  // Get active variant
  const activeVariant = product.variants.find(v => v.color_id === selectedColor && v.size_id === selectedSize);
  const stockAvailable = activeVariant ? activeVariant.stock : 0;

  // Extract unique colors and sizes for display selectors
  const displayColors = Array.from(new Map(product.variants.map(v => [v.color_id, { id: v.color_id, name: v.color_name, hex: v.color_hex }])).values());
  const displaySizes = Array.from(new Map(product.variants.filter(v => v.color_id === selectedColor).map(v => [v.size_id, { id: v.size_id, name: v.size_name }])).values());

  const handleAddToCart = async (buyNow = false) => {
    if (!activeVariant) {
      setMessage({ text: 'Seleccione una combinación válida.', isError: true });
      return;
    }
    if (stockAvailable <= 0) {
      setMessage({ text: 'Esta talla y color se encuentra agotada.', isError: true });
      return;
    }

    setAddingToCart(true);
    setMessage({ text: '', isError: false });

    const res = await addToCart(activeVariant.id, quantity);
    setAddingToCart(false);

    if (res.success) {
      if (buyNow) {
        navigate('/cart');
      } else {
        setMessage({ text: '¡Producto agregado al carrito con éxito!', isError: false });
      }
    } else {
      setMessage({ text: res.message, isError: true });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-32">
      
      {/* Detail Block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start border-b border-neutral-light pb-24">
        
        {/* Left Column: Image Gallery */}
        <div className="space-y-6">
          <div className="relative aspect-[3/4] bg-neutral-light rounded-lg overflow-hidden border border-neutral-light/50">
            <img 
              src={activeImage || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80'} 
              alt={product.name}
              className="w-full h-full object-cover object-center"
            />
          </div>
          {/* Thumbnails picker */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-4">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(img.image_url)}
                  className={`relative aspect-[3/4] w-20 bg-neutral-light rounded overflow-hidden border-2 transition-all ${activeImage === img.image_url ? 'border-primary' : 'border-transparent'}`}
                >
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Information details */}
        <div className="space-y-8">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-steel font-bold block mb-1">
              {product.category_name} &middot; {product.collection_name}
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-light text-primary mt-2">
              {product.name}
            </h1>
            <div className="mt-4 flex items-center space-x-4">
              <span className="text-xl font-bold text-primary">${parseFloat(product.price).toFixed(2)}</span>
              {product.compare_at_price && (
                <span className="text-sm line-through text-steel/60">${parseFloat(product.compare_at_price).toFixed(2)}</span>
              )}
            </div>
          </div>

          <p className="text-xs text-primary/80 font-light leading-relaxed">
            {product.description}
          </p>

          {/* Color Selector */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-primary">Color:</h3>
            <div className="flex space-x-3">
              {displayColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => handleColorChange(color.id)}
                  title={color.name}
                  className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${selectedColor === color.id ? 'border-primary scale-110' : 'border-transparent hover:scale-105'}`}
                >
                  <span className="w-6 h-6 rounded-full border border-neutral-dark/20" style={{ backgroundColor: color.hex }}></span>
                </button>
              ))}
            </div>
          </div>

          {/* Size Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-primary">Talla:</h3>
              <button className="text-[10px] uppercase tracking-wider text-steel hover:underline font-bold" onClick={() => alert('Guía de tallas:\nXS: Pecho 80-85cm / Cadera 85-90cm\nS: Pecho 85-90cm / Cadera 90-95cm\nM: Pecho 90-95cm / Cadera 95-100cm\nL: Pecho 95-100cm / Cadera 100-105cm\nXL: Pecho 100-105cm / Cadera 105-110cm')}>Guía de Tallas</button>
            </div>
            <div className="flex gap-3 flex-wrap">
              {displaySizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setSelectedSize(size.id)}
                  className={`text-xs px-4 py-2.5 rounded border transition-all ${selectedSize === size.id ? 'border-primary bg-primary text-white font-bold' : 'border-neutral-dark/30 hover:border-primary text-primary'}`}
                >
                  {size.name}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Selector & Stock Info */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center border border-neutral-dark/30 rounded">
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="px-3 py-2 text-primary hover:bg-neutral-light transition-colors"
                disabled={quantity <= 1}
              >
                -
              </button>
              <span className="px-4 text-xs font-semibold">{quantity}</span>
              <button 
                onClick={() => setQuantity(q => Math.min(stockAvailable, q + 1))}
                className="px-3 py-2 text-primary hover:bg-neutral-light transition-colors"
                disabled={quantity >= stockAvailable}
              >
                +
              </button>
            </div>
            
            <span className={`text-xs font-medium ${stockAvailable > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {stockAvailable > 0 ? `Stock disponible: ${stockAvailable} unidades` : 'Agotado'}
            </span>
          </div>

          {/* Action alerts */}
          {message.text && (
            <div className={`p-4 rounded-md text-xs font-medium ${message.isError ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
              {message.text}
            </div>
          )}

          {/* Add to Cart Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={() => handleAddToCart(false)}
              disabled={stockAvailable <= 0 || addingToCart}
              className="flex-1 bg-white border border-primary text-primary hover:bg-primary hover:text-white transition-all text-xs font-bold uppercase tracking-widest py-4 rounded focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingToCart ? 'Agregando...' : 'Agregar al Carrito'}
            </button>
            <button
              onClick={() => handleAddToCart(true)}
              disabled={stockAvailable <= 0 || addingToCart}
              className="flex-1 bg-primary border border-transparent text-white hover:bg-steel transition-colors text-xs font-bold uppercase tracking-widest py-4 rounded focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Comprar Ahora
            </button>
          </div>

          {/* Textile & Care Details */}
          <div className="border-t border-neutral-light pt-8 space-y-4 text-xs font-light text-primary/70">
            {product.material && (
              <div>
                <span className="font-semibold text-primary">Composición:</span> {product.material}
              </div>
            )}
            {product.features && product.features.length > 0 && (
              <div>
                <span className="font-semibold text-primary block mb-2">Características Clave:</span>
                <ul className="list-disc pl-5 space-y-1">
                  {product.features.map((feat, i) => (
                    <li key={i}>{feat}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Related Products Grid */}
      {relatedProducts.length > 0 && (
        <section className="py-24">
          <h2 className="font-serif text-2xl font-light text-primary mb-12 text-center lg:text-left">Productos Relacionados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {relatedProducts.map(prod => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
