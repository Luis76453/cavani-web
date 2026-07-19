import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';

export default function Catalog() {
  const location = useLocation();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Parse query parameters
  const queryParams = new URLSearchParams(location.search);
  const selectedCategory = queryParams.get('category') || '';
  const selectedCollection = queryParams.get('collection') || '';
  const searchQuery = queryParams.get('search') || '';

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const catRes = await api.get('/products/categories');
        const colRes = await api.get('/products/collections');
        setCategories(catRes.data.categories);
        setCollections(colRes.data.collections);
      } catch (err) {
        console.error('Error loading filters:', err);
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const res = await api.get('/products', {
          params: {
            category: selectedCategory,
            collection: selectedCollection,
            search: searchQuery
          }
        });
        setProducts(res.data.products);
      } catch (err) {
        console.error('Error loading catalog products:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [selectedCategory, selectedCollection, searchQuery]);

  const updateFilters = (key, value) => {
    const params = new URLSearchParams(location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Always clear search on filtering taxonomies
    if (key !== 'search') {
      params.delete('search');
    }
    navigate(`/catalog?${params.toString()}`);
  };

  const clearFilters = () => {
    navigate('/catalog');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-32">
      {/* Editorial Header */}
      <div className="border-b border-neutral-light pb-8 mb-12">
        <span className="text-[10px] tracking-[0.25em] uppercase font-semibold text-steel block mb-2">Colección Completa</span>
        <h1 className="font-serif text-4xl font-light text-primary">
          {selectedCategory ? categories.find(c => c.slug === selectedCategory)?.name : 
           selectedCollection ? collections.find(c => c.slug === selectedCollection)?.name : 
           searchQuery ? `Resultados para: "${searchQuery}"` : "Explorar caVani"}
        </h1>
        <p className="text-xs font-light text-primary/70 max-w-2xl mt-4 leading-relaxed">
          Nuestra línea completa de uniformes y scrubs diseñados ergonómicamente con materiales duraderos y costuras reforzadas para los entornos clínicos más exigentes.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-64 space-y-8 flex-shrink-0">
          
          {/* Categories Filter */}
          <div className="space-y-4">
            <h3 className="font-semibold text-xs uppercase tracking-widest text-primary">Categorías</h3>
            <div className="flex flex-wrap lg:flex-col gap-2">
              <button
                onClick={() => updateFilters('category', '')}
                className={`text-left text-xs px-3 py-2 rounded-md transition-colors ${!selectedCategory ? 'bg-primary text-white font-semibold' : 'text-primary/75 hover:bg-neutral-light'}`}
              >
                Todas las prendas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => updateFilters('category', cat.slug)}
                  className={`text-left text-xs px-3 py-2 rounded-md transition-colors ${selectedCategory === cat.slug ? 'bg-primary text-white font-semibold' : 'text-primary/75 hover:bg-neutral-light'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Collections Filter */}
          <div className="space-y-4">
            <h3 className="font-semibold text-xs uppercase tracking-widest text-primary">Colecciones</h3>
            <div className="flex flex-wrap lg:flex-col gap-2">
              <button
                onClick={() => updateFilters('collection', '')}
                className={`text-left text-xs px-3 py-2 rounded-md transition-colors ${!selectedCollection ? 'bg-primary text-white font-semibold' : 'text-primary/75 hover:bg-neutral-light'}`}
              >
                Todas las colecciones
              </button>
              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => updateFilters('collection', col.slug)}
                  className={`text-left text-xs px-3 py-2 rounded-md transition-colors ${selectedCollection === col.slug ? 'bg-primary text-white font-semibold' : 'text-primary/75 hover:bg-neutral-light'}`}
                >
                  {col.name}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters CTA */}
          {(selectedCategory || selectedCollection || searchQuery) && (
            <button
              onClick={clearFilters}
              className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors border border-red-200 rounded-md py-3 block"
            >
              Limpiar Filtros
            </button>
          )}

        </aside>

        {/* Products Grid */}
        <main className="flex-grow">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="h-96 bg-neutral-dark/15 animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-neutral-dark/20 rounded-lg max-w-md mx-auto">
              <svg className="w-12 h-12 mx-auto text-steel/40 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-serif text-lg font-semibold text-primary mb-2">No se encontraron productos</h3>
              <p className="text-xs text-primary/60 mb-6">Prueba a modificar los filtros o el término de búsqueda.</p>
              <button 
                onClick={clearFilters}
                className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded hover:bg-steel transition-colors"
              >
                Restaurar Catálogo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map(prod => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
