
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

const $selProject = document.getElementById('sel-project');
const $btnNewProject = document.getElementById('btn-new-project');

function renderProjects() {
  $selProject.innerHTML = '';
  for (const p of Store.listProjects()) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name || '(Proyecto sin nombre)';
    if (p.id === Store.state.activeProjectId) opt.selected = true;
    $selProject.appendChild(opt);
  }
}
renderProjects();

// Cambiar proyecto activo
$selProject.addEventListener('change', () => {
  Store.setActiveProject($selProject.value);
});

// Crear nuevo proyecto
// --- Modal de Nuevo Proyecto ---
const projectModal = document.getElementById('projectModal');
const txtProjectName = document.getElementById('txtProjectName');
const btnCancelProject = document.getElementById('btnCancelProject');
const btnSaveProject = document.getElementById('btnSaveProject');
// Elementos del DOM

const $btnEditProject = document.getElementById('btn-edit-project');
const $btnDeleteProject = document.getElementById('btn-delete-project');


$btnEditProject.addEventListener('click', () => {
  const project = Store.getActiveProject();
  if (!project) return alert('No hay proyecto activo.');

  const nuevoNombre = prompt('Nuevo nombre del proyecto:', project.name);
  if (nuevoNombre && nuevoNombre.trim() !== '') {
    Store.renameProject(project.id, nuevoNombre.trim());
    renderProjectList();
  }
});

$btnDeleteProject.addEventListener('click', () => {
  const project = Store.getActiveProject();
  if (!project) return alert('No hay proyecto activo');

  const ok = confirm(`¿Eliminar el proyecto "${project.name}"?`);
  if (ok) {
    Store.removeProject(project.id);
    renderProjectList();
    renderTasks();
  }
});

// Abrir modal
$btnNewProject.addEventListener('click', () => {
  projectModal.classList.add('show');
  txtProjectName.value = '';
  txtProjectName.focus();
});

// Cerrar modal
btnCancelProject.addEventListener('click', () => {
  projectModal.classList.remove('show');
  txtProjectName.value = '';
});

// Guardar nuevo proyecto
btnSaveProject.addEventListener('click', () => {
  const name = txtProjectName.value.trim();
  if (!name) {
    alert('Por favor ingresa un nombre para el proyecto.');
    return;
  }

  Store.addProject({ name });
  projectModal.classList.remove('show');
  txtProjectName.value = '';
});

// Cerrar modal al presionar "Escape" o hacer clic fuera del cuadro
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') projectModal.classList.remove('show');
});
projectModal.addEventListener('click', e => {
  if (e.target === projectModal) projectModal.classList.remove('show');
});


// Escuchar cambios en los proyectos
document.addEventListener('store:changed', (e) => {
  const src = e?.detail?.source || '';
  if (src.startsWith('project:')) renderProjects();
});

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
  $taskList.innerHTML = '';

  // ✅ Obtenemos el proyecto activo
  const projectId = Store.state.activeProjectId;

  // ✅ Obtenemos solo las tareas de ese proyecto
  const tasks = Store.getTasks(projectId);

  for (const t of tasks) {
    const el = document.createElement('task-item');
    el.setAttribute('task-id', t.id);
    el.setAttribute('title', t.title);
    el.setAttribute('done', String(!!t.done));

    // ✅ Muy importante: asociar el projectId al componente
    el.setAttribute('project-id', projectId);

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

  // Cambios en tareas o proyectos → refrescar lista
  if (src.startsWith('task:') || src.startsWith('project:')) {
    renderTasks();
  }

  // Cambios en usuarios → refrescar combo
  if (src.startsWith('user:')) {
    renderUsers();
  }
});



// 6. (Opcional) Exponer Store para debugging desde la consola del navegador.
//    Útil en la demo para inspeccionar rápidamente datos y métodos.
//    Ej.: window.Store.getTasks()
window.Store = Store;
