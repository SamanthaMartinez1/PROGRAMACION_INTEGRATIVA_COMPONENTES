
// - Importa la API de datos (Store) y registra los Web Components.
// - Inicializa el estado desde LocalStorage.
// - Renderiza la lista de tareas en el contenedor del dashboard.
// - Conecta los eventos de UI (agregar tareas) y escucha cambios globales
//   para mantener la interfaz sincronizada.

// Este archivo se importa en index.html con:
//   <script type="module" src="./main.js"></script>

//  Librería / API de datos (LocalStorage) 
import { Store } from './lib/store.js';

//  (Opcional) Canal de eventos 
// Si tu /lib/bus.js solo documenta el patrón, no exporta nada;
// lo importamos igual por claridad arquitectónica.
import './lib/bus.js';

//  Web Components (Custom Elements) 
import './components/user-card.js';
import './components/task-item.js';
import './components/progress-bar.js';


// 1. Inicialización del estado
//    Carga usuario y tareas desde LocalStorage (o usa valores por defecto).
Store.init();
// selector de perfiles 
const $selUser = document.getElementById('sel-user');
const $btnNewUser = document.getElementById('btn-new-user');

function renderUsers(){
  $selUser.innerHTML = '';
  for (const u of Store.listUsers()){
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.name || '(Sin nombre)';
    if (u.id === Store.state.activeUserId) opt.selected = true;
    $selUser.appendChild(opt);
  }
}
renderUsers();

$selUser.addEventListener('change', () => {
  Store.setActiveUser($selUser.value); // cambia de persona → <user-card> se re-renderiza solo
});

$btnNewUser.addEventListener('click', () => {
  Store.addUser({ name: 'Nuevo perfil' }); // crea y selecciona
});

// cuando cambie algo del usuario (crear/renombrar/cambiar), refresca el combo
document.addEventListener('store:changed', (e)=>{
  const src = e?.detail?.source || '';
  if (src.startsWith('user:')) renderUsers();
});


// 2. Cache de nodos del DOM (contenedor de tareas y controles de entrada)
//    Usamos IDs definidos en index.html

const $taskList = document.getElementById('task-list'); // donde se pintan <task-item>
const $newTask  = document.getElementById('new-task');  // input para nueva tarea
const $btnAdd   = document.getElementById('btn-add');   // botón "Agregar"


// 3. Render de la lista de tareas
//    Crea elementos <task-item> en función del estado actual del Store.
//    Este render se invoca al arrancar y cada vez que cambia el Store.

function renderTasks() {
  // Limpiamos el contenedor previo
  $taskList.innerHTML = '';

  // Obtenemos una copia de las tareas desde la API
  const tasks = Store.getTasks(); // [{id,title,done}, ...]

  // Por cada tarea creamos un <task-item> y seteamos sus atributos
  for (const t of tasks) {
    const el = document.createElement('task-item');
    el.setAttribute('task-id', t.id);         // id único (string)
    el.setAttribute('title', t.title);        // texto visible
    el.setAttribute('done', String(!!t.done));// "true" o "false" (string)
    $taskList.appendChild(el);
  }
}

// Pintamos una primera vez
renderTasks();

// 4. Alta de nuevas tareas (input + botón)
//     Click en "Agregar"
//     Enter dentro del input

function addTaskFromInput() {
  const title = ($newTask.value || '').trim();
  if (!title) return;

  // Creamos la tarea en el Store → persiste en LocalStorage
  Store.addTask(title);

  // Limpiamos el input para que el usuario pueda escribir la siguiente
  $newTask.value = '';
}

// Click botón
$btnAdd.addEventListener('click', addTaskFromInput);

// Enter en el input
$newTask.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTaskFromInput();
});

// 5. Reacción a cambios globales del Store
//    Cualquier modificación (user o tasks) dispara 'store:changed'.
//    Aquí re-renderizamos la lista de tareas cuando corresponde.
//    <progress-bar> y <user-card> se actualizan solos al escuchar
//    el mismo evento dentro de sus componentes.

document.addEventListener('store:changed', (e) => {
  const src = e?.detail?.source || '';

  // Solo re-render de la lista si cambia algo de tareas.
  if (src.startsWith('task:')) {
    renderTasks();
  }

  // Si cambió el user, no hace falta tocar la lista de tareas.
  // <user-card> y <progress-bar> se auto-actualizan por su cuenta.
});


// 6. (Opcional) Exponer Store para debugging desde la consola del navegador.
//    Útil en la demo para inspeccionar rápidamente datos y métodos.
//    Ej.: window.Store.getTasks()
window.Store = Store;
