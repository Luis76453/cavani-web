import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ProductCard({ product }) {
  const discount = product.compare_at_price 
    ? Math.round(((parseFloat(product.compare_at_price) - parseFloat(product.price)) / parseFloat(product.compare_at_price)) * 100) 
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="group relative flex flex-col bg-white overflow-hidden rounded-lg shadow-sm border border-neutral-light/50 transition-all duration-300 hover:shadow-md"
    >
      {/* Product Image */}
      <div className="relative aspect-[3/4] bg-neutral-light overflow-hidden">
        <img 
          src={product.image_url || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80'} 
          alt={product.name}
          className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Floating Category/Collection */}
        <div className="absolute top-4 left-4 flex flex-col space-y-2">
          {product.collection_name && (
            <span className="bg-primary/95 text-white text-[9px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded">
              {product.collection_name}
            </span>
          )}
          {discount > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded">
              -{discount}%
            </span>
          )}
        </div>
      </div>

      {/* Product Details */}
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-steel font-medium block mb-1">
            {product.category_name || 'Accesorios'}
          </span>
          <h3 className="font-serif text-sm font-semibold text-primary group-hover:text-steel transition-colors line-clamp-1 mb-2">
            {product.name}
          </h3>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-neutral-light pt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-primary">${parseFloat(product.price).toFixed(2)}</span>
            {product.compare_at_price && (
              <span className="text-xs line-through text-steel/60">${parseFloat(product.compare_at_price).toFixed(2)}</span>
            )}
          </div>
          
          <Link 
            to={`/product/${product.slug}`} 
            className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-steel transition-colors flex items-center space-x-1"
          >
            <span>Ver Detalle</span>
            <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
