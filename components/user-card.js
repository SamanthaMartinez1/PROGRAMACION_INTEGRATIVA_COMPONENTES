
//  Mostrar/editar el perfil del usuario (nombre + fecha de nacimiento)
// y capturar una foto desde la cámara para guardarla como Base64 en LocalStorage,
// todo cumpliendo con Web Components (Custom Elements + Shadow DOM + HTML Templates).


import { Store } from '../lib/store.js';   // API "web" sobre LocalStorage (estado global)
import { Utils } from '../lib/utils.js';   // Utilidades (canvas → Base64, JSON seguro, etc.)

// Registrar el Custom Element <user-card>
class UserCard extends HTMLElement {
  constructor(){
    super(); // Llama al constructor de HTMLElement

    // 1. Activamos Shadow DOM para encapsular HTML y CSS del componente
    //    - mode: 'open' → permite acceder a this.shadowRoot desde fuera si se requiere.
    this.attachShadow({ mode: 'open' });

    // 2. Obtenemos el <template id="tpl-user-card"> que está en index.html
    //    y lo clonamos dentro del Shadow DOM para construir la UI del componente.
    const tpl = document.getElementById('tpl-user-card');
    this.shadowRoot.appendChild(tpl.content.cloneNode(true));

    // 3. Guardamos referencias a los elementos del template (cache de nodos)
    //    para poder leer o escribir sus valores rápidamente.
    this.$img = this.shadowRoot.querySelector('.avatar');        // <img> donde se muestra la foto
    this.$inpNombre = this.shadowRoot.querySelector('.inp-nombre'); // <input> del nombre
    this.$inpFecha = this.shadowRoot.querySelector('.inp-fecha');   // <input type="date"> fecha nacimiento
    this.$status = this.shadowRoot.querySelector('.status');        // <span> mensajes de estado

    // Botones de acción (cámara / captura / guardar)
    this.$btnCamara = this.shadowRoot.querySelector('.btn-camara');
    this.$btnCapturar = this.shadowRoot.querySelector('.btn-capturar');
    this.$btnGuardar = this.shadowRoot.querySelector('.btn-guardar');

    // Elementos multimedia para cámara y preprocesamiento
    this.$video = this.shadowRoot.querySelector('.cam');     // <video> donde se ve la cámara
    this.$canvas = this.shadowRoot.querySelector('.lienzo'); // <canvas> usado para "congelar" el frame

    // 4. Estado interno para manejar el stream de la cámara
    //    (guardamos el MediaStream para poder detenerlo cuando no se use).
    this._stream = null;

    // 5. Aseguramos el "this" correcto en los handlers (bind)
    //    Esto evita perder el contexto cuando se ejecutan como callbacks.
    this._onOpenCamera = this._onOpenCamera.bind(this);
    this._onCapture = this._onCapture.bind(this);
    this._onSave = this._onSave.bind(this);
    this._onStoreChange = this._onStoreChange.bind(this);
  }

  // Ciclo de vida del Custom Element 
  connectedCallback(){
    // Se ejecuta cuando el elemento se inserta en el DOM.

    // Cargar datos iniciales desde el Store (LocalStorage)
    // para pintar la foto, el nombre y la fecha almacenados.
    this._renderFromStore();

    // Registrar listeners de UI (botones)
    this.$btnCamara.addEventListener('click', this._onOpenCamera);
    this.$btnCapturar.addEventListener('click', this._onCapture);
    this.$btnGuardar.addEventListener('click', this._onSave);

    // Escuchar cambios globales del Store (modelo de eventos tipo "bus")
    // Si otro componente cambiara el usuario, actualizamos la vista.
    document.addEventListener('store:changed', this._onStoreChange);
  }

  disconnectedCallback(){
    // Se ejecuta cuando el elemento se remueve del DOM.

    // Limpiamos listeners de UI
    this.$btnCamara.removeEventListener('click', this._onOpenCamera);
    this.$btnCapturar.removeEventListener('click', this._onCapture);
    this.$btnGuardar.removeEventListener('click', this._onSave);

    // Dejamos de escuchar el bus global
    document.removeEventListener('store:changed', this._onStoreChange);

    // Si la cámara estaba encendida, la apagamos para liberar recursos
    this._stopCamera();
  }

  // Render: Carga el estado del usuario desde el Store y lo pinta en la interfaz.
  _renderFromStore(){
    const user = Store.getUser(); // { name, birthDate, photoBase64 }

    // Nombre y fecha (valores por defecto si no existen)
    this.$inpNombre.value = user.name || '';
    this.$inpFecha.value = user.birthDate || '';

    // Foto de usuario: si hay Base64 la usamos, si no, mostramos un SVG "Sin foto"
    if (user.photoBase64) {
      this.$img.src = user.photoBase64;
    } else {
      this.$img.src =
        'data:image/svg+xml;utf8,' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">' +
          '<rect width="100%" height="100%" fill="%23f3f4f6"/>' +
          '<text x="50%" y="52%" font-size="12" text-anchor="middle" fill="%239ca3af">Sin foto</text>' +
        '</svg>';
    }
  }

  // Responde a cambios globales del Store (solo si vienen del área de "user")
  _onStoreChange(e){
    // e.detail.source puede ser: 'user:update', 'task:add', 'task:toggle', etc.
    if (e?.detail?.source?.startsWith('user')) {
      this._renderFromStore();
    }
  }

  
  // Cámara: abrir, capturar un frame al canvas, convertirlo a Base64 y previsualizar.
  async _onOpenCamera(){
    try {
      // Solicitamos permiso y accedemos a la cámara (modo "frontal" si está disponible)
      this._stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });

      // Conectamos el stream de la cámara al <video> del componente
      this.$video.srcObject = this._stream;

      // Mostramos el <video> (estaba oculto por CSS) para previsualizar
      this.$video.style.display = 'block';

      // Mensaje de ayuda para el usuario
      this.$status.textContent =
        'Cámara activa. Posiciona tu rostro y presiona "Capturar foto".';
    } catch (err) {
      // Si el usuario niega permiso o hay error de dispositivo, lo notificamos
      console.error(err);
      this.$status.textContent = 'No se pudo acceder a la cámara.';
    }
  }

  // Apaga la cámara y limpia el <video> (buena práctica para ahorro de recursos)
  _stopCamera(){
    if (this._stream) {
      // Detenemos todas las pistas de video del stream
      this._stream.getTracks().forEach(t => t.stop());
      this._stream = null;
      this.$video.srcObject = null;
      this.$video.style.display = 'none'; // volvemos a ocultar el <video>
    }
  }

  // Captura el frame actual del <video>, lo dibuja en el <canvas>, y lo convierte a Base64
  _onCapture(){
    // Validación: si la cámara no está activa, avisamos
    if (!this._stream) {
      this.$status.textContent = 'Primero abre la cámara.';
      return;
    }

    // Obtenemos el contexto 2D del canvas
    const ctx = this.$canvas.getContext('2d');

    // Medidas del video real
    const w = this.$video.videoWidth;
    const h = this.$video.videoHeight;

    // Hacemos un recorte cuadrado centrado (para una foto tipo avatar)
    const size = Math.min(w, h);
    const sx = (w - size) / 2; // coordenada X desde donde recortar
    const sy = (h - size) / 2; // coordenada Y desde donde recortar

    // Dibujamos el cuadro recortado (size x size) en el canvas de 256x256
    ctx.drawImage(this.$video, sx, sy, size, size, 0, 0, 256, 256);

    // Convertimos el contenido del canvas a un DataURL Base64 (PNG)
    const base64 = Utils.canvasToBase64(this.$canvas, 'image/png');

    // Mostramos la previsualización en la <img> del componente
    this.$img.src = base64;

    // Apagamos la cámara (ya no es necesaria)
    this._stopCamera();

    // Mensaje de ayuda para el usuario
    this.$status.textContent =
      'Foto capturada (previsualizada). Presiona "Guardar perfil".';
  }

  // Guarda en el Store (y por lo tanto LocalStorage) los datos del usuario
  _onSave(){
    // Tomamos valores actuales de los inputs (con fallback razonable)
    const name = this.$inpNombre.value.trim() || 'Estudiante';
    const birthDate = this.$inpFecha.value || '';
    const photoBase64 = this.$img.src || ''; // si no hay foto, quedará vacío o el SVG

    // Persistimos en el Store (este método también emite 'store:changed')
    Store.setUser({ name, birthDate, photoBase64 });

    // Feedback visual
    this.$status.textContent = 'Perfil guardado.';
  }
}

// Registramos el Custom Element para que el navegador reconozca <user-card>
customElements.define('user-card', UserCard);
