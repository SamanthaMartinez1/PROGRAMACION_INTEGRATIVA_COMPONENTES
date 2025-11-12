
// Muestra el progreso general de las tareas del dashboard en forma de barra.
// Escucha eventos globales ('store:changed') para actualizarse automáticamente
// cada vez que se modifica el estado del Store (por ejemplo, al marcar o eliminar tareas).
//
// Cumple con:
// - Custom Elements (definido con customElements.define)
// - Shadow DOM (encapsula estilos y estructura)
// - HTML Templates (estructura clonada desde index.html)
// - Comunicación global mediante eventos y el Store (LocalStorage)

import { Store } from '../lib/store.js'; // Importamos la API de datos global (LocalStorage)


// Clase principal del componente <progress-bar>
class ProgressBar extends HTMLElement {
  constructor(){
    super(); // Llama al constructor base de HTMLElement

    // 1. Activamos el Shadow DOM para encapsular el HTML y CSS del componente.
    this.attachShadow({ mode:'open' });

    // 2. Clonamos el contenido del template <template id="tpl-progress-bar">
    // que está definido dentro del archivo index.html.
    const tpl = document.getElementById('tpl-progress-bar');
    this.shadowRoot.appendChild(tpl.content.cloneNode(true));

    // 3. Guardamos referencias a los elementos visuales de la barra.
    this.$fill = this.shadowRoot.querySelector('.fill');   // Parte verde (porcentaje completado)
    this.$label = this.shadowRoot.querySelector('.label'); // Texto descriptivo (porcentaje y conteo)

    // 4. Vinculamos el método _onStoreChange para mantener el contexto "this"
    // cuando se use como callback del evento.
    this._onStoreChange = this._onStoreChange.bind(this);
  }


  // Ciclo de vida: cuando el componente se agrega al DOM
  connectedCallback(){
    // Al inicializar, renderizamos el progreso actual almacenado en el Store.
    this._render();

    // Escuchamos los eventos globales de cambio en el Store.
    // Cada vez que otro componente (por ejemplo, <task-item> o <user-card>)
    // emita 'store:changed', se volverá a renderizar el progreso.
    document.addEventListener('store:changed', this._onStoreChange);
  }

  // Cuando el componente se elimina del DOM → limpiamos el listener.
  disconnectedCallback(){
    document.removeEventListener('store:changed', this._onStoreChange);
  }

  // Handler: cuando el Store cambia, se vuelve a renderizar la barra.
  _onStoreChange(){
    this._render();
  }

  // Renderizado visual: calcula el progreso y actualiza la vista.
  _render(){
    // Store.getProgress() devuelve un objeto con:
    //  - pct: porcentaje completado (0–100)
    //  - done: tareas completadas
    //  - total: tareas totales
    const { pct, done, total } = Store.getProgress();

    // Ajustamos la anchura de la barra verde según el porcentaje
    this.$fill.style.width = pct + '%';

    // Actualizamos el texto visible (por ejemplo: "60% completado (3/5)")
    this.$label.textContent = `${pct}% completado (${done}/${total})`;
  }
}

// Registro del Custom Element <progress-bar>
// Esto permite usar la etiqueta <progress-bar> directamente en el HTML.
customElements.define('progress-bar', ProgressBar);
