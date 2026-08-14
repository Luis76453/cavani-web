import React from 'react';

// 1. Page: Nosotros (About us)
export function Nosotros() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-32 space-y-12">
      <div className="text-center space-y-4">
        <span className="text-[10px] tracking-[0.25em] uppercase font-semibold text-steel">Nuestra Esencia</span>
        <h1 className="font-serif text-4xl font-light text-primary">Sobre caVani</h1>
      </div>
      
      <div className="relative aspect-[16/9] w-full bg-neutral-light rounded-lg overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&q=80" 
          alt="caVani Team"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="text-xs text-primary/80 font-light leading-relaxed space-y-6">
        <p>
          CAVANI nació de una necesidad real: pasamos gran parte de nuestra formación y de nuestra vida profesional usando uniformes que muchas veces priorizan la funcionalidad por encima de todo lo demás.
        </p>
        <p>
          Y nos preguntamos: ¿por qué no podemos tener ambas cosas?
        
        
          <br />¿Por qué un uniforme médico no puede ser cómodo, funcional y, al mismo tiempo, hacernos sentir bien al usarlo?
        </p>
        <p>
          Así nació CAVANI.
        </p>
        <p>
          Una marca creada desde el amor por nuestra profesión y por quienes, todos los días, eligen cuidar a los demás. <br /> Creemos que la ropa que usamos durante una jornada clínica también puede representar quiénes somos: nuestra dedicación, nuestra disciplina, nuestros sueños y todo el esfuerzo que hay detrás de llegar hasta aquí. <br /> 
          Cada prenda CAVANI está pensada para acompañarte en esos días largos, en las primeras prácticas, en las guardias, en los nervios antes de un examen y en cada pequeño logro que algún día se convertirá en una gran historia.

          <br />Porque detrás de cada uniforme hay una persona con un propósito.

          
        </p>
        <p>
          Nuestros diseñadores se formaron en la sastrería de alta costura y colaboran activamente con médicos especialistas de diversas disciplinas. El resultado son prendas ergonómicas, estilizadas y equipadas con tecnologías textiles antimicrobianas que actúan como un escudo en entornos hospitalarios exigentes.
        </p>
        <p className="border-l-4 border-steel pl-6 py-2 italic font-serif text-xl text-primary">
          “No queremos hacer simplemente ropa médica, queremos crear prendas que te acompañen mientras construyes la profesional que sueñas ser”
        </p>
      </div>
    </div>
  );
}

// 2. Page: FAQ (Frequently Asked Questions)
export function FAQ() {
  const faqs = [
    { q: '¿De qué materiales están confeccionados los scrubs caVani?', a: 'Nuestros scrubs utilizan una mezcla premium de 72% Poliéster, 21% Rayón y 7% Spandex. Están tratados con tecnología de iones de plata Silvadur™ que otorga propiedades antibacteriales duraderas y previene malos olores.' },
    { q: '¿Cómo elijo mi talla correcta?', a: 'Puedes consultar nuestra guía interactiva de tallas en las páginas de producto. Si tienes dudas entre dos tallas, te recomendamos seleccionar la mayor para un ajuste más cómodo o la menor si prefieres un entalle atlético y ceñido.' },
    { q: '¿Cuáles son los métodos de pago aceptados?', a: 'Aceptamos todas las tarjetas de crédito y débito Visa, Mastercard y American Express, así como transferencias bancarias directas (SPEI) para facilitar tu compra.' },
    { q: '¿Realizan envíos a todo el país?', a: 'Sí. Realizamos entregas express a todo el territorio nacional con un tiempo estimado de 3 a 5 días hábiles a través de paqueterías líderes.' }
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-32 space-y-12">
      <div className="text-center space-y-4">
        <span className="text-[10px] tracking-[0.25em] uppercase font-semibold text-steel">Preguntas Frecuentes</span>
        <h1 className="font-serif text-4xl font-light text-primary">Soporte al Cliente</h1>
      </div>

      <div className="space-y-6">
        {faqs.map((faq, idx) => (
          <div key={idx} className="bg-white border border-neutral-light p-6 rounded-lg shadow-sm space-y-2">
            <h3 className="font-serif text-sm font-semibold text-primary">{faq.q}</h3>
            <p className="text-xs text-primary/75 font-light leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. Page: Envíos
export function Envios() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-32 space-y-8">
      <h1 className="font-serif text-3xl font-light text-primary border-b border-neutral-light pb-4">Políticas de Envío</h1>
      <div className="text-xs text-primary/80 font-light leading-relaxed space-y-4">
        <p>En caVani nos esforzamos por procesar y enviar tus pedidos con la mayor brevedad posible. A continuación, detallamos las condiciones de nuestros envíos:</p>
        
        <h3 className="font-semibold text-primary uppercase tracking-wider text-[10px] pt-4">Tiempos de Procesamiento</h3>
        <p>Los pedidos se procesan de lunes a viernes en un plazo de 24 a 48 horas hábiles posteriores a la confirmación del pago. Los pedidos realizados en fines de semana o días festivos se procesarán al siguiente día hábil.</p>
        
        <h3 className="font-semibold text-primary uppercase tracking-wider text-[10px] pt-4">Tarifas y Tiempos de Entrega</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><span className="font-semibold">Envío Estándar:</span> Costo de S/9.99 USD para compras menores a S/250.00 soles. Tiempo estimado de entrega: 3 a 5 días hábiles.</li>
          <li><span className="font-semibold">Envío Gratuito:</span> Aplicable automáticamente a todos los pedidos cuyo subtotal sea igual o superior a S/250.00 soles.</li>
        </ul>
      </div>
    </div>
  );
}

// 4. Page: Cambios y Devoluciones
export function Cambios() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-32 space-y-8">
      <h1 className="font-serif text-3xl font-light text-primary border-b border-neutral-light pb-4">Cambios y Devoluciones</h1>
      <div className="text-xs text-primary/80 font-light leading-relaxed space-y-4">
        <p>Queremos que ames tu scrub caVani. Si la talla no fue la correcta o el ajuste no te convence, dispones de 30 días naturales a partir de la entrega para solicitar un cambio o devolución.</p>
        
        <h3 className="font-semibold text-primary uppercase tracking-wider text-[10px] pt-4">Condiciones del Producto</h3>
        <p>Para ser elegible, las prendas deben estar sin usar, sin lavar, con todas las etiquetas originales y en el empaque original en perfecto estado. No aceptamos devoluciones de prendas personalizadas con bordados de nombres o especialidades.</p>
        
        <h3 className="font-semibold text-primary uppercase tracking-wider text-[10px] pt-4">Proceso de Cambio</h3>
        <p>Para iniciar una solicitud, por favor escribe a soporte@cavani.com indicando tu número de pedido. Te proporcionaremos una guía prepagada para realizar la devolución física.</p>
      </div>
    </div>
  );
}

// 5. Page: Términos y Condiciones
export function Terminos() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-32 space-y-8">
      <h1 className="font-serif text-3xl font-light text-primary border-b border-neutral-light pb-4">Términos y Condiciones</h1>
      <div className="text-xs text-primary/80 font-light leading-relaxed space-y-4">
        <p>Este documento regula el acceso y uso de este sitio web. Al navegar en el sitio y realizar transacciones comerciales, usted acepta someterse a estas políticas.</p>
        <p>La marca caVani, sus logotipos, fotografías editoriales y diseños textiles son propiedad exclusiva de caVani Medical. Está prohibida cualquier reproducción no autorizada.</p>
      </div>
    </div>
  );
}

// 6. Page: Política de Privacidad
export function Privacidad() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-32 space-y-8">
      <h1 className="font-serif text-3xl font-light text-primary border-b border-neutral-light pb-4">Política de Privacidad</h1>
      <div className="text-xs text-primary/80 font-light leading-relaxed space-y-4">
        <p>En caVani nos comprometemos a proteger la privacidad de los datos personales de nuestros clientes. Los datos recolectados (nombre, dirección, correo y número telefónico) se utilizan únicamente para procesar sus pedidos y enviarle ofertas publicitarias si así lo aprueba.</p>
        <p>No almacenamos datos sensibles de sus tarjetas de crédito o débito, los cuales son administrados directamente por pasarelas de pago externas seguras cifradas con SSL.</p>
      </div>
    </div>
  );
}
