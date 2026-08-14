import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

export default function Footer() {
  return (
    <footer className="bg-primary text-white pt-16 pb-12 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-white/10 pb-16">
        
        {/* Brand Information */}
        <div className="space-y-4">
          <Link to="/">
            <BrandLogo />
          </Link>
          <p className="text-xs text-neutral-dark leading-relaxed font-light">
            Redefinimos la moda médica combinando diseño, funcionalidad y comodidad para acompañarte en cada jornada. Prendas pensadas para quienes estudian, trabajan, cuidan y siguen adelante incluso en los días más exigentes. Porque la medicina está cambiando.
Y la forma de vestirla también.
          </p>
        </div>

        {/* E-Commerce Navigation */}
        <div className="space-y-4">
          <h4 className="font-semibold tracking-wider text-xs uppercase text-steel-light">Explorar</h4>
          <ul className="space-y-2 text-xs font-light text-neutral-dark">
            <li><Link to="/catalog" className="hover:text-white transition-colors">Todos los Productos</Link></li>
            <li><Link to="/catalog?category=scrubs" className="hover:text-white transition-colors">Scrubs Premium</Link></li>
            <li><Link to="/catalog?category=accesorios" className="hover:text-white transition-colors">Accesorios</Link></li>
            <li><Link to="/catalog?category=enterizos" className="hover:text-white transition-colors">Enterizos</Link></li>
          </ul>
        </div>

        {/* Customer Support & Policies */}
        <div className="space-y-4">
          <h4 className="font-semibold tracking-wider text-xs uppercase text-steel-light">Soporte y Políticas</h4>
          <ul className="space-y-2 text-xs font-light text-neutral-dark">
            <li><Link to="/faq" className="hover:text-white transition-colors">Preguntas Frecuentes</Link></li>
            <li><Link to="/envios" className="hover:text-white transition-colors">Políticas de Envío</Link></li>
            <li><Link to="/cambios" className="hover:text-white transition-colors">Cambios y Devoluciones</Link></li>
            <li><Link to="/terminos" className="hover:text-white transition-colors">Términos y Condiciones</Link></li>
            <li><Link to="/privacidad" className="hover:text-white transition-colors">Política de Privacidad</Link></li>
          </ul>
        </div>

        {/* Newsletter Signup */}
        <div className="space-y-4">
          <h4 className="font-semibold tracking-wider text-xs uppercase text-steel-light">Newsletter</h4>
          <p className="text-xs font-light text-neutral-dark">Suscríbete para recibir lanzamientos de colecciones y ofertas exclusivas.</p>
          <form className="flex border-b border-white/30 pb-1" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Tu correo electrónico"
              className="bg-transparent text-xs w-full focus:outline-none placeholder:text-neutral-dark/60 pr-2"
            />
            <button type="submit" className="text-xs font-semibold uppercase tracking-wider text-steel-light hover:text-white transition-colors">
              Unirse
            </button>
          </form>
        </div>

      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between pt-8 text-[10px] text-neutral-dark font-light">
        <p>&copy; {new Date().getFullYear()} caVani Medical. Todos los derechos reservados.</p>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <a href="#" className="hover:text-white transition-colors">Instagram</a>
          <a href="#" className="hover:text-white transition-colors">Facebook</a>
          <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
        </div>
      </div>
    </footer>
  );
}
