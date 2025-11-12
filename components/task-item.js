
//  Representa una tarea individual dentro del Dashboard.
// Cada tarea tiene un título, un estado ("hecha" o no), y un ID.
// Permite marcar como completada o eliminarla.
// 
// Cumple con:
// - Custom Elements (definición con customElements.define)
// - Shadow DOM (encapsulamiento de HTML y CSS)
// - HTML Templates (estructura clonada desde index.html)
// - Comunicación dinámica con el Store (LocalStorage)


import { Store } from '../lib/store.js'; // API de almacenamiento (LocalStorage)


// Clase principal del componente <task-item>
class TaskItem extends HTMLElement {

  //  Atributos observados 
  // Estos son los atributos HTML que, si cambian, disparan attributeChangedCallback.
  static get observedAttributes(){ 
    return ['title','done','task-id']; 
  }

  constructor(){
    super(); // Llama al constructor del HTMLElement base.

    // 1. Activamos el Shadow DOM para aislar el componente (CSS + estructura)
    this.attachShadow({ mode:'open' });

    // 2. Clonamos el contenido del template desde index.html
    // <template id="tpl-task-item"> se define en el archivo principal.
    const tpl = document.getElementById('tpl-task-item');
    this.shadowRoot.appendChild(tpl.content.cloneNode(true));

    // 3. Obtenemos referencias a los elementos internos del template
    this.$chk = this.shadowRoot.querySelector('.chk');         // Checkbox de completado
    this.$title = this.shadowRoot.querySelector('.title');     // Texto del título
    this.$btnDel = this.shadowRoot.querySelector('.btn-borrar'); // Botón para borrar

    // 4. Asignamos los métodos (handlers) para mantener el contexto "this"
    // Esto evita errores cuando se usan como callbacks de eventos.
    this._onToggle = this._onToggle.bind(this);
    this._onDelete = this._onDelete.bind(this);
  }

  
  // Ciclo de vida del componente (cuando se agrega al DOM)
  connectedCallback(){
    // Renderiza los valores iniciales
    this._render();

    // Escucha eventos del usuario
    this.$chk.addEventListener('change', this._onToggle);  // marcar/desmarcar tarea
    this.$btnDel.addEventListener('click', this._onDelete); // eliminar tarea
  }

  // Cuando el componente se elimina del DOM → limpiamos los listeners
  disconnectedCallback(){
    this.$chk.removeEventListener('change', this._onToggle);
    this.$btnDel.removeEventListener('click', this._onDelete);
  }

  // Si cambia alguno de los atributos observados, se vuelve a renderizar
  attributeChangedCallback(){ 
    this._render(); 
  }

  // Getters convenientes para leer atributos como propiedades JS
  get taskId(){ return this.getAttribute('task-id') ?? ''; }      // ID único
  get done(){ return this.getAttribute('done') === 'true'; }      // Estado (boolean)
  get title(){ return this.getAttribute('title') ?? ''; }         // Texto

  // Método de renderizado
  // Actualiza el contenido visual del componente según sus atributos.
  _render(){
    this.$title.textContent = this.title;       // Muestra el título
    this.$chk.checked = this.done;              // Marca o desmarca el checkbox
    this.$chk.setAttribute('aria-checked', String(this.done)); // Accesibilidad
  }

  // Handler: cuando el usuario marca o desmarca una tarea
  _onToggle(e){
    const checked = !!e.currentTarget.checked; // true o false según el estado del checkbox

    // Actualiza el estado de la tarea en el Store (LocalStorage)
    Store.toggleTask(this.taskId, checked);

    // Lanza un evento global 'store:changed' para que otros componentes (como
    // <progress-bar>) sepan que deben actualizarse.
    document.dispatchEvent(new CustomEvent('store:changed', { 
      detail: { source:'task:toggle', id:this.taskId } 
    }));
  }

  // Handler: cuando el usuario presiona el botón "Borrar"
  _onDelete(){
    // 1. Eliminamos la tarea del Store (LocalStorage)
    Store.removeTask(this.taskId);

    // 2. Notificamos al sistema que el Store cambió
    // Esto hará que main.js vuelva a renderizar la lista de tareas actualizada.
    document.dispatchEvent(new CustomEvent('store:changed', { 
      detail: { source:'task:remove', id:this.taskId } 
    }));

    // 3.El elemento será removido visualmente cuando main.js re-renderice
  }
}

// Registro del Custom Element <task-item>
customElements.define('task-item', TaskItem);
