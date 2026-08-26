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
    { 
      name: 'Scrubs Completos', 
      slug: 'scrubs-completos', 
      tag: 'Kits Pro',
      img: '/scrubs-completos.jpg' 
    },
    { 
      name: 'Accesorios', 
      slug: 'tops', 
      tag: 'Diseño Ergonómico',
      img: '/accesorios.jpg' 
    },
    
    { 
      name: 'Enterizos', 
      slug: 'batas-y-chaquetas', 
      tag: 'Corte Sastre',
      img: '/enterizos.jpg' 
    }
  ];

  const benefitsTicker = [
    { icon: '🩺', text: 'TEJIDO ANTIMICROBIANO' },
    { icon: '⚡', text: 'ELASTICIDAD 4-WAY STRETCH' },
    { icon: '📦', text: 'ENVÍO GRATUITO A PARTIR DE S/250 SOLES' },
    { icon: '✨', text: 'BOLSILLOS FUNCIONALES Y ESPACIOSOS' },
    { icon: '🛡️', text: 'BARRERA REPELENTE DE LÍQUIDOS' },
    { icon: '🔒', text: 'GARANTÍA DE AJUSTE PERFECTO' }
  ];

  return (
    <div className="bg-neutral-light min-h-screen">
      
      {/* ========================================================= */}
      {/* 1. HERO SECTION WITH DEEP RICH BACKGROUND & OVERLAPPING CARDS */}
      {/* ========================================================= */}
      <section className="relative bg-primary text-white pt-36 pb-32 px-6 overflow-visible">
        {/* Subtle background ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-steel/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10 flex flex-col items-center">
          
          {/* Pill Badge at Top */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full text-[10px] font-semibold text-neutral-dark mb-8 uppercase tracking-wider"
          >
            <span className="w-2 h-2 rounded-full bg-steel-light animate-pulse"></span>
            <span>Envíos gratis <strong>a partir de</strong> s/250 soles</span>
          </motion.div>

          {/* Main Hero Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight max-w-4xl mb-6"
          >
            Ropa médica, <br className="hidden sm:block"/>
            <span className="text-steel-light font-serif italic font-light">redefinida</span> para tu día a día.
          </motion.h1>

          {/* Subtitle text */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-xs sm:text-sm font-light text-neutral-dark/85 max-w-2xl leading-relaxed mb-10"
          >
            Diseñamos scrubs que combinan comodidad, funcionalidad y estilo para acompañarte en clases, prácticas, guardias y cada paso de tu camino.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-20"
          >
            <Link 
              to="/catalog"
              className="bg-steel hover:bg-steel-light text-white text-xs font-bold uppercase tracking-widest px-8 py-4 rounded-full shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
            >
              Descubrir la Colección →
            </Link>
            <Link 
              to="/nosotros"
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold uppercase tracking-widest px-8 py-4 rounded-full transition-all duration-300"
            >
              Nuestra Esencia
            </Link>
          </motion.div>

        </div>

        {/* 2. OVERLAPPING CATEGORY CARDS (Popping out of bottom of dark hero) */}
        <div className="max-w-6xl mx-auto relative z-20 -mb-48 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-0">
            {categories.map((cat, idx) => (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + idx * 0.1 }}
              >
                <Link
                  to={`/catalog?category=${cat.slug}`}
                  className="group block bg-white rounded-[32px] p-4 shadow-xl border border-neutral-light/60 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
                >
                  <div className="relative aspect-[4/3] rounded-[24px] overflow-hidden bg-neutral-light mb-4">
                    <img 
                      src={cat.img} 
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <span className="absolute top-3 left-3 bg-primary/95 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                      {cat.tag}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-2 pb-1">
                    <h3 className="font-serif text-sm font-bold text-primary group-hover:text-steel transition-colors">
                      {cat.name}
                    </h3>
                    <span className="w-7 h-7 rounded-full bg-neutral-light group-hover:bg-primary group-hover:text-white flex items-center justify-center text-xs font-bold transition-colors text-primary">
                      →
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

      </section>

      {/* ========================================================= */}
      {/* 3. HORIZONTAL TICKER BAR (Icon & Benefits Scroll) */}
      {/* ========================================================= */}
      <section className="pt-35 pb-12 border-b border-neutral-dark/20 bg-neutral-light overflow-hidden">
        <div className="flex space-x-12 animate-marquee whitespace-nowrap text-xs font-semibold uppercase tracking-widest text-primary/70">
          {[...benefitsTicker, ...benefitsTicker].map((item, idx) => (
            <div key={idx} className="flex items-center space-x-3 shrink-0">
              <span className="text-base">{item.icon}</span>
              <span>{item.text}</span>
              <span className="text-steel/40 ml-12">•</span>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. EDITORIAL FEATURE SHOWCASE (Collage + Checklist) */}
      {/* ========================================================= */}
      <section className="max-w-7xl mx-auto px-6 py-28 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Left Collage Grid */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="space-y-4">
            <div className="aspect-[3/4] bg-white rounded-3xl overflow-hidden shadow-md border border-neutral-light">
              <img 
                src="/empaque.jpg" 
                alt="caVani Top Feature" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="bg-primary text-white p-6 rounded-3xl space-y-2">
              <span className="text-xl font-bold text-steel-light font-serif">100%</span>
              <p className="text-[11px] font-light leading-relaxed text-neutral-dark">
                Made for those who care.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-8">
            <div className="aspect-[3/4] bg-white rounded-3xl overflow-hidden shadow-md border border-neutral-light">
              <img 
                src="/bolsa-regalo.jpg" 
                alt="caVani Jogger Pant" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </motion.div>

        {/* Right Content Details & Checklist */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="space-y-8"
        >
          <div>
            <span className="text-[10px] tracking-[0.25em] font-semibold uppercase text-steel block mb-3">
              TECNOLOGÍA TEXTIL AVANZADA
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-primary leading-tight">
              El equilibrio perfecto entre <span className="text-steel">confort y rendimiento.</span>
            </h2>
          </div>

          <p className="text-xs text-primary/80 font-light leading-relaxed">
            Diseñamos CAVANI para acompañarte durante jornadas exigentes sin sacrificar comodidad ni estilo. Confeccionado en Perú, nuestro tejido ligero, flexible y antifluido se adapta a tus movimientos, brindándote libertad y comodidad durante todo el día.
          </p>

          {/* Checklist with Round Checks (Mirroring MEDVi style) */}
          <div className="space-y-4 pt-2">
            {[
              'Tejido 4-way stretch de recuperación elástica instantánea',
              'Tecnología antifluido que ayuda a proteger la prenda de salpicaduras y líquidos',
              'Mayor libertad de movimiento y recuperación de la forma',
              'Bolsillos funcionales y espaciosos para lo esencial'

            ].map((item, idx) => (
              <div key={idx} className="flex items-center space-x-3 text-xs text-primary font-medium">
                <span className="w-5 h-5 rounded-full bg-steel/15 text-steel flex items-center justify-center text-[10px] font-bold">
                  ✓
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <Link
              to="/catalog"
              className="inline-block bg-primary hover:bg-steel text-white text-xs font-bold uppercase tracking-widest px-8 py-4 rounded-full shadow-md transition-all duration-300"
            >
              Comprar la Colección →
            </Link>
          </div>
        </motion.div>

      </section>

      {/* ========================================================= */}
      {/* 5. BENTO BOX CARDS (Pastel Background Feature Highlight) */}
      {/* ========================================================= */}
      {/*<section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        */}  
          {/* Bento Card 1 - Left content, right image */}
       {/*   <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white border border-neutral-dark/15 rounded-[32px] p-8 flex flex-col sm:flex-row items-center justify-between shadow-sm hover:shadow-md transition-shadow gap-6"
          >
            <div className="space-y-4 sm:w-1/2">
              <span className="text-[9px] uppercase font-bold tracking-widest text-steel block">Ergonomía Médica</span>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-primary leading-snug">
                Todo lo que necesitas, <span className="text-steel font-serif italic">al alcance de tu mano.</span>
              </h3>
              <p className="text-xs text-primary/70 font-light leading-relaxed">
                Cada filipina y jogger incorpora bolsillos estratégicamente ubicados para transportar estetoscopios, celulares y libretas sin deformar tu silueta.
              </p>
            </div>
            <div className="w-full sm:w-1/2 aspect-[4/3] rounded-2xl bg-neutral-light overflow-hidden shadow-inner flex-shrink-0">
              <img 
                src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=800&q=80" 
                alt="Detail pockets"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
*/}
          {/* Bento Card 2 - Left content, right image */}
         {/* <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white border border-neutral-dark/15 rounded-[32px] p-8 flex flex-col sm:flex-row items-center justify-between shadow-sm hover:shadow-md transition-shadow gap-6"
          >
            <div className="space-y-4 sm:w-1/2">
              <span className="text-[9px] uppercase font-bold tracking-widest text-steel block">Atención Personalizada</span>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-primary leading-snug">
                Garantía de ajuste <span className="text-steel font-serif italic">y cambio sin costo.</span>
              </h3>
              <p className="text-xs text-primary/70 font-light leading-relaxed">
                Probamos nuestras prendas con médicos reales. Si tu scrub no se ajusta exactamente como deseas, cambiamos tu talla con envío sin costo de forma inmediata.
              </p>
            </div>
            <div className="w-full sm:w-1/2 aspect-[4/3] rounded-2xl bg-neutral-light overflow-hidden shadow-inner flex-shrink-0">
              <img 
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80" 
                alt="Doctor in scrub"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

        </div>
      </section>
*/}
      {/* ========================================================= */}
      {/* 6. FEATURED PRODUCTS GRID */}
      {/* ========================================================= */}
      <section className="max-w-7xl mx-auto px-6 py-15">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12">
          <div>
            <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-steel block mb-2">Colección Destacada</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary">Prendas más populares</h2>
          </div>
          <Link 
            to="/catalog"
            className="mt-4 sm:mt-0 text-xs font-bold uppercase tracking-widest text-steel hover:text-primary transition-colors border-b border-steel pb-1"
          >
            Ver Catálogo Completo →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-96 bg-neutral-dark/15 animate-pulse rounded-3xl"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts.map(prod => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 7. EDITORIAL LIFESTYLE BANNER */}
      {/* ========================================================= */}
      <section className="bg-primary text-white py-24 px-6 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <span className="text-[10px] tracking-[0.3em] font-semibold uppercase text-steel-light block">
            EDICIÓN 2026
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl font-bold leading-tight">
            "Sastrería médica diseñada para quienes cuidan la vida."
          </h2>
          <p className="text-xs text-neutral-dark font-light leading-relaxed max-w-lg mx-auto">
            Descubre por qué miles de doctores, enfermeros y especialistas eligen caVani para transformar su vestimenta clínica diaria.
          </p>
          <div className="pt-4">
            <Link
              to="/catalog"
              className="bg-white hover:bg-neutral-light text-primary text-xs font-bold uppercase tracking-widest px-8 py-4 rounded-full shadow-lg transition-colors inline-block"
            >
              Explorar Todos los Productos
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
