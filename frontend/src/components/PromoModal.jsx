import React, { useState, useEffect, useCallback } from 'react';
import BrandLogo from './BrandLogo';

// Fecha límite de la campaña: 30 de noviembre de 2026 a las 23:59:59 (hora de Perú UTC-5)
const PROMO_EXPIRY_DATE = new Date('2026-11-30T23:59:59.999-05:00');

function isPromoActive() {
  return Date.now() <= PROMO_EXPIRY_DATE.getTime();
}

// Module-level flag so navigating between client routes keeps the user's choice
// (if they closed it, it stays closed in the floating pill state, but if they reload it starts open)
let modalInitiallyOpened = true;

export default function PromoModal() {
  const [isActive, setIsActive] = useState(() => isPromoActive());
  const [isOpen, setIsOpen] = useState(() => modalInitiallyOpened && isPromoActive());

  // Programar la desaparición automática cuando expire la promoción
  useEffect(() => {
    if (!isActive) return;

    const timeRemaining = PROMO_EXPIRY_DATE.getTime() - Date.now();
    if (timeRemaining <= 0) {
      setIsActive(false);
      setIsOpen(false);
      return;
    }

    if (timeRemaining < 0x7FFFFFFF) {
      const timer = setTimeout(() => {
        setIsActive(false);
        setIsOpen(false);
      }, timeRemaining);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // Si la promoción ya finalizó, se oculta por completo
  if (!isActive) {
    return null;
  }

  // Manage body scroll locking when modal is open/closed
  useEffect(() => {
    modalInitiallyOpened = isOpen;
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  // Close with Escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const whatsappMessage = encodeURIComponent(
    'Hola caVani, deseo comprar la promoción del ROYAL COMBO (1 scrub + 1 termo + 1 set de 12 lazos) por S/ 169 (Promoción de Noviembre).'
  );
  const whatsappUrl = `https://wa.me/51941778744?text=${whatsappMessage}`;

  return (
    <>
      {/* ========================================================= */}
      {/* 1. MODAL OVERLAY & POPUP (CENTERED, OVERFLOW-HIDDEN BODY)  */}
      {/* ========================================================= */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-primary/75 backdrop-blur-md animate-fade-in"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-modal-title"
        >
          {/* Main Card Container */}
          <div 
            className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-white/20 w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] flex flex-col transform transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Continuous Top Header Bar */}
            <div className="bg-primary text-white px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between border-b border-steel/30 shadow-sm shrink-0">
              {/* Cavani Logo at one end */}
              <div className="flex items-center">
                <BrandLogo medWear={false} className="scale-75 sm:scale-90 origin-left" />
              </div>

              {/* Main Campaign Title in the center */}
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 border border-white/15">
                <span className="w-1.5 h-1.5 rounded-full bg-steel-light animate-ping" />
                <span className="font-serif tracking-[0.2em] sm:tracking-[0.25em] uppercase font-bold text-[10px] sm:text-xs text-white">
                  PROMO NOVIEMBRE
                </span>
              </div>

              {/* Close Button [X] at the other end */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors focus:outline-none"
                aria-label="Cerrar modal"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body: 2 Columns on Desktop, 1 Column on Mobile */}
            <div className="overflow-y-auto overflow-x-hidden flex-grow">
              <div className="grid grid-cols-1 md:grid-cols-12 min-h-0">
                
                {/* ---------------------------------------------------- */}
                {/* LADO IZQUIERDO: Fotografía de la Promoción (Royal Combo) */}
                {/* ---------------------------------------------------- */}
                <div className="md:col-span-6 relative bg-gradient-to-b from-[#FAFBFD] via-[#F4F6F9] to-[#E9EFF5] min-h-[260px] sm:min-h-[320px] md:min-h-full flex items-center justify-center p-3 sm:p-5 overflow-hidden border-b md:border-b-0 md:border-r border-neutral-dark/15">
                  {/* Imagen Principal del Royal Combo */}
                  <img 
                    src="/royal-combo.jpg" 
                    alt="Royal Combo caVani - 1 scrub + 1 termo + 1 set de 12 lazos" 
                    className="w-full h-auto max-h-[300px] sm:max-h-[360px] md:max-h-[460px] object-contain rounded-xl shadow-xs"
                  />

                  {/* Top Badge: Edición Especial */}
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
                    <span className="bg-primary/90 backdrop-blur-md text-white font-bold text-[9px] sm:text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full border border-white/20 shadow-md">
                      COMBO EXCLUSIVO
                    </span>
                  </div>
                </div>

                {/* ---------------------------------------------------- */}
                {/* LADO DERECHO: Información y Jerarquía de la Promoción */}
                {/* ---------------------------------------------------- */}
                <div className="md:col-span-6 p-5 sm:p-6 md:p-7 flex flex-col justify-between bg-white text-primary space-y-4 sm:space-y-4.5">
                  
                  {/* 1. Título principal bien grande */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-steel block">
                      OFERTA ESPECIAL DE NOVIEMBRE
                    </span>
                    <h2 
                      id="promo-modal-title"
                      className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-primary leading-tight tracking-tight"
                    >
                      ROYAL COMBO
                    </h2>
                    <p className="font-serif text-xs sm:text-sm text-steel font-medium italic">
                      1 scrub + 1 termo + 1 set de 12 lazos
                    </p>
                  </div>

                  {/* 2. Bloque de precio destacado */}
                  <div className="bg-neutral-light border border-neutral-dark/40 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-primary/60 block mb-0.5">
                        Precio Especial del Combo
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-serif text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
                          S/ 169
                        </span>
                      </div>
                    </div>
                    
                    {/* Badge de Descuento con estilo consistente a ProductCard */}
                    <span className="bg-red-500 text-white text-[11px] sm:text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded shadow-sm inline-flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.266 0 .52.105.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <span>¡TODO INCLUIDO!</span>
                    </span>
                  </div>

                  {/* 3. Desglose detallado de lo que incluye */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-primary/70 block">
                      ¿Qué incluye esta promoción?
                    </span>
                    <div className="space-y-2 text-xs">
                      
                      {/* Item 1: Scrub */}
                      <div className="flex items-start gap-2.5 bg-neutral-light/70 border border-neutral-dark/20 rounded-xl p-2.5">
                        <span className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                          1
                        </span>
                        <div>
                          <p className="font-bold text-primary text-[11px] sm:text-xs">
                            Scrub Médico Completo
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-primary/70">
                            A elegir en: <span className="font-semibold text-primary">Blanco</span>, <span className="font-semibold text-primary">Azul vibrante</span> o <span className="font-semibold text-primary">Negro</span>.
                          </p>
                        </div>
                      </div>

                      {/* Item 2: Termo */}
                      <div className="flex items-start gap-2.5 bg-neutral-light/70 border border-neutral-dark/20 rounded-xl p-2.5">
                        <span className="w-6 h-6 rounded-lg bg-steel text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                          2
                        </span>
                        <div>
                          <p className="font-bold text-primary text-[11px] sm:text-xs">
                            Termo Térmico caVani
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-primary/70">
                            A elegir en: <span className="font-semibold text-primary">Navy</span> u <span className="font-semibold text-primary">Ónix</span>.
                          </p>
                        </div>
                      </div>

                      {/* Item 3: Set de Lazos */}
                      <div className="flex items-start gap-2.5 bg-neutral-light/70 border border-neutral-dark/20 rounded-xl p-2.5">
                        <span className="w-6 h-6 rounded-lg bg-primary/80 text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                          3
                        </span>
                        <div>
                          <p className="font-bold text-primary text-[11px] sm:text-xs">
                            1 Set de 12 Lazos para el Cabello
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-primary/70">
                            Empaque oficial con surtido de colores pastel.
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* 4. Botón de acción principal (CTA) */}
                  <div className="space-y-2 pt-1">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs sm:text-sm uppercase tracking-wider py-3.5 sm:py-4 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 text-center group transform hover:-translate-y-0.5 focus:outline-none"
                    >
                      <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.724-1.466L0 24zm5.835-4.19c1.673.993 3.327 1.548 5.378 1.549 5.568 0 10.099-4.529 10.1-10.098.002-2.698-1.047-5.234-2.952-7.14C16.49 2.215 13.976.998 12.007.998c-5.572 0-10.104 4.532-10.107 10.101-.001 1.88.488 3.713 1.419 5.337L2.241 21.6l5.244-1.374c.159.088.291.16.407.24zM16.52 13.88c-.244-.122-1.45-.714-1.67-.796-.223-.081-.385-.122-.547.122-.162.244-.63.796-.772.957-.142.162-.284.181-.528.06-2.485-1.242-3.447-2.186-4.57-4.116-.142-.244-.142-.423-.02-.545.11-.11.244-.284.366-.427.121-.142.162-.244.244-.407.081-.162.041-.305-.02-.427-.06-.122-.547-1.32-.75-1.81-.197-.477-.398-.412-.547-.42-.14-.007-.302-.008-.463-.008-.162 0-.427.06-.65.305-.224.244-.854.834-.854 2.035 0 1.2 1.88 2.378 1.139 2.5 5.08 4.37 6.64 5.33 6.945 5.51.305.18.508.12.69.06.182-.06.772-.315.88-.62.108-.305.108-.567.076-.62-.03-.053-.122-.09-.366-.212z"/>
                      </svg>
                      <span>COMPRAR ROYAL COMBO POR WHATSAPP</span>
                    </a>

                    {/* 5. Texto legal pequeño al pie */}
                    <p className="text-[10px] text-primary/50 text-center font-light italic">
                      Promoción válida hasta el 30 de noviembre de 2026 o hasta agotar stock
                    </p>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. BOTÓN / PÍLDORA FLOTANTE FIJO ABAJO A LA IZQUIERDA      */}
      {/* ========================================================= */}
      {!isOpen && (
        <div className="fixed bottom-5 left-5 z-40 animate-fade-in">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="bg-steel hover:bg-steel-light text-white pl-3.5 pr-4 py-2.5 rounded-full shadow-2xl border border-white/30 flex items-center gap-2.5 transition-all duration-300 hover:scale-105 active:scale-95 group focus:outline-none"
            aria-label="Abrir promoción Royal Combo"
          >
            {/* Pulsing Emerald Dot */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>

            {/* Promo text */}
            <span className="text-[11px] font-bold tracking-wider uppercase text-white transition-colors">
              Royal Combo
            </span>

            {/* Pill Price Highlight */}
            <span className="bg-red-500 text-white font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded shadow-xs">
              S/ 169
            </span>
          </button>
        </div>
      )}
    </>
  );
}
