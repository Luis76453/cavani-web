import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await api.get('/products');
        setFeaturedProducts(res.data.products.slice(0, 4));
      } catch (err) {
        console.error('Error loading featured products:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const categories = [
    { name: 'Scrubs Completos', slug: 'scrubs-completos', img: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=600&q=80' },
    { name: 'Filipinas (Tops)', slug: 'tops', img: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80' },
    { name: 'Pantalones', slug: 'pantalones', img: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80' },
    { name: 'Batas y Chaquetas', slug: 'batas-y-chaquetas', img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80' }
  ];

  return (
    <div className="pt-0">
      
      {/* 1. Hero Section */}
      <section className="relative h-screen w-full flex items-center justify-center bg-primary overflow-hidden">
        {/* Background Editorial Image */}
        <div className="absolute inset-0 opacity-40">
          <img 
            src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1600&q=80" 
            alt="caVani Editorial Campaign"
            className="w-full h-full object-cover object-center scale-105 select-none pointer-events-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/20 to-transparent"></div>

        {/* Content */}
        <div className="relative max-w-5xl mx-auto px-6 text-center text-white z-10 flex flex-col items-center">
          <motion.span 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[11px] tracking-[0.3em] font-semibold uppercase text-steel-light mb-4 block"
          >
            Presentando la Colección Premium 2026
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-serif text-4xl sm:text-6xl font-light leading-tight tracking-tight max-w-4xl mb-6"
          >
            Designed for those who <br />
            <span className="italic font-normal font-serif">move medicine forward</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xs sm:text-sm font-light text-neutral-dark/80 max-w-xl mb-10 leading-relaxed"
          >
            Scrubs y uniformes médicos de alta costura diseñados ergonómicamente con tejidos antimicrobianos avanzados para ofrecer la máxima sofisticación y rendimiento.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4"
          >
            <Link 
              to="/catalog" 
              className="bg-white text-primary text-xs font-bold uppercase tracking-widest px-8 py-4 rounded hover:bg-neutral-light transition-colors duration-300"
            >
              Comprar Colección
            </Link>
            <Link 
              to="/nosotros" 
              className="border border-white text-white text-xs font-bold uppercase tracking-widest px-8 py-4 rounded hover:bg-white/10 transition-all duration-300"
            >
              Nuestra Historia
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 2. Featured Categories */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-steel block mb-2">Categorías Destacadas</span>
          <h2 className="font-serif text-3xl font-light text-primary">Prendas con propósito de diseño</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {categories.map((cat, idx) => (
            <Link 
              key={cat.slug}
              to={`/catalog?category=${cat.slug}`}
              className="group relative h-96 overflow-hidden rounded-lg shadow-sm"
            >
              <div className="absolute inset-0 bg-primary/20 group-hover:bg-primary/40 transition-colors duration-300 z-10"></div>
              <img 
                src={cat.img} 
                alt={cat.name}
                className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute bottom-6 left-6 right-6 z-20 flex flex-col justify-end text-white">
                <span className="text-[9px] tracking-widest uppercase font-semibold text-steel-light mb-1">Explorar</span>
                <h3 className="font-serif text-lg font-semibold">{cat.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Featured Products */}
      <section className="bg-neutral-light/50 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-16">
            <div>
              <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-steel block mb-2">Novedades</span>
              <h2 className="font-serif text-3xl font-light text-primary">Los favoritos de caVani</h2>
            </div>
            <Link 
              to="/catalog" 
              className="mt-4 sm:mt-0 text-xs font-bold uppercase tracking-widest text-primary hover:text-steel transition-colors border-b border-primary pb-1"
            >
              Ver Todo el Catálogo
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-96 bg-neutral-dark/15 animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map(prod => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Brand Editorial / Storytelling */}
      <section className="py-24 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-6">
          <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-steel block">Alta Tecnología Textil</span>
          <h2 className="font-serif text-4xl font-light text-primary leading-tight">
            Comodidad que resiste turnos de 24 horas y más
          </h2>
          <p className="text-xs text-primary/80 leading-relaxed font-light">
            En caVani, entendemos que tu uniforme no es solo ropa; es tu armadura diaria. Confeccionados con microfibras de alta calidad repelentes a líquidos y aditivos antimicrobianos, nuestros scrubs protegen tu higiene mientras mantienen un tacto sedoso y flexible.
          </p>
          <div className="grid grid-cols-2 gap-8 pt-6">
            <div className="border-l-2 border-steel pl-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wide text-primary">Tejido 4-Way Stretch</h4>
              <p className="text-[10px] text-primary/70 leading-relaxed font-light">Movimiento libre sin restricciones en cada estiramiento.</p>
            </div>
            <div className="border-l-2 border-steel pl-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wide text-primary">Barrera Antimicrobiana</h4>
              <p className="text-[10px] text-primary/70 leading-relaxed font-light">Escudo avanzado de iones de plata contra patógenos y malos olores.</p>
            </div>
          </div>
        </div>
        <div className="relative aspect-[4/3] bg-neutral-light overflow-hidden rounded-lg shadow-sm">
          <img 
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1000&q=80" 
            alt="caVani Textile Tech" 
            className="w-full h-full object-cover object-center"
          />
        </div>
      </section>

      {/* 5. Campaign Lookbook Section */}
      <section className="bg-primary text-white py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <span className="text-[10px] tracking-[0.3em] uppercase text-steel-light font-semibold block">Editorial 2026</span>
          <h2 className="font-serif text-3xl sm:text-5xl font-light leading-tight">"Where science meets high fashion tailoring."</h2>
          <p className="text-xs text-neutral-dark font-light leading-relaxed max-w-xl mx-auto">
            Capturando la esencia de la precisión, la dedicación y el refinamiento estético. Descubre cómo vestimos a la nueva generación de cirujanos, enfermeros y médicos especialistas de todo el mundo.
          </p>
          <div className="relative aspect-[16/9] w-full bg-primary/40 rounded-lg overflow-hidden mt-10">
            <img 
              src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1200&q=80" 
              alt="caVani Campaign Lookbook" 
              className="w-full h-full object-cover object-center opacity-85"
            />
          </div>
        </div>
      </section>

    </div>
  );
}
