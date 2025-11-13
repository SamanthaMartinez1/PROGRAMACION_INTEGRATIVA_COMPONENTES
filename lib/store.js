import { Utils } from './utils.js';

const LS = {
  USERS: 'wc_users',
  ACTIVE: 'wc_active_user',
  TASKS: 'wc_tasks',
  PROJECTS: 'wc_projects',
  ACTIVE_PROJECT: 'wc_active_project',
  LEGACY_USER: 'wc_user'
};

const uid = () => Math.random().toString(36).slice(2, 9);

export const Store = {
  state: {
    users: [],
    activeUserId: null,
    projects: [],
    activeProjectId: null,
    tasks: []
  },

  init() {
    // --- Usuarios ---
    const legacy = Utils.safeParse(localStorage.getItem(LS.LEGACY_USER), null);
    let users = Utils.safeParse(localStorage.getItem(LS.USERS), []);
    let activeUser = localStorage.getItem(LS.ACTIVE) || null;

    if (!Array.isArray(users) || users.length === 0) {
      const id = uid();
      const defaultUser = legacy
        ? { id, ...legacy }
        : { id, name: 'Estudiante', birthDate: '', photoBase64: '' };
      users = [defaultUser];
      activeUser = id;
      localStorage.setItem(LS.USERS, Utils.safeStringify(users));
    }

    this.state.users = users;
    this.state.activeUserId = activeUser;

    // --- Proyectos ---
    let projects = Utils.safeParse(localStorage.getItem(LS.PROJECTS), []);
    let activeProject = localStorage.getItem(LS.ACTIVE_PROJECT) || null;

    if (!Array.isArray(projects) || projects.length === 0) {
      const defaultProject = { id: uid(), name: 'Proyecto principal' };
      projects = [defaultProject];
      activeProject = defaultProject.id;
      localStorage.setItem(LS.PROJECTS, Utils.safeStringify(projects));
      localStorage.setItem(LS.ACTIVE_PROJECT, activeProject);
    }

    this.state.projects = projects;
    this.state.activeProjectId = activeProject;

    // --- Tareas ---
    const allTasks = Utils.safeParse(localStorage.getItem(LS.TASKS), []);
    this.state.tasks = Array.isArray(allTasks) ? allTasks : [];

    // Si no hay tareas iniciales, creamos algunas por defecto
    if (this.state.tasks.length === 0) {
      this.state.tasks = [
        { id: uid(), title: 'Revisar enunciado del proyecto', done: false, projectId: activeProject },
        { id: uid(), title: 'Implementar <user-card>', done: true, projectId: activeProject },
        { id: uid(), title: 'Conectar <task-item> con Store', done: false, projectId: activeProject }
      ];
      this._persistTasks();
    }
  },

  // --------- USERS ----------
  listUsers() { return [...this.state.users]; },
  getUser() { return { ...(this.state.users.find(u => u.id === this.state.activeUserId) || {}) }; },
  setUser(partial) {
    const i = this.state.users.findIndex(u => u.id === this.state.activeUserId);
    if (i >= 0) {
      this.state.users[i] = { ...this.state.users[i], ...partial };
      this._persistUsers();
      document.dispatchEvent(new CustomEvent('store:changed', { detail: { source: 'user:update' } }));
    }
  },
  addUser({ name = 'Nuevo perfil', birthDate = '', photoBase64 = '' } = {}) {
    const u = { id: uid(), name, birthDate, photoBase64 };
    this.state.users.push(u);
    this.state.activeUserId = u.id;
    this._persistUsers();
    document.dispatchEvent(new CustomEvent('store:changed', { detail: { source: 'user:add' } }));
  },
  setActiveUser(id) {
    if (this.state.users.some(u => u.id === id)) {
      this.state.activeUserId = id;
      localStorage.setItem(LS.ACTIVE, id);
      document.dispatchEvent(new CustomEvent('store:changed', { detail: { source: 'user:switch', id } }));
    }
  },
  _persistUsers() {
    localStorage.setItem(LS.USERS, Utils.safeStringify(this.state.users));
    localStorage.setItem(LS.ACTIVE, this.state.activeUserId || '');
  },

  // --------- PROJECTS ----------
  listProjects() { return [...this.state.projects]; },
  getActiveProject() { return this.state.projects.find(p => p.id === this.state.activeProjectId) || {}; },
  addProject({ name = 'Nuevo Proyecto' } = {}) {
    const p = { id: uid(), name };
    this.state.projects.push(p);
    this.state.activeProjectId = p.id;
    this._persistProjects();
    document.dispatchEvent(new CustomEvent('store:changed', { detail: { source: 'project:add' } }));
  },
  setActiveProject(id) {
    if (this.state.projects.some(p => p.id === id)) {
      this.state.activeProjectId = id;
      localStorage.setItem(LS.ACTIVE_PROJECT, id);
      document.dispatchEvent(new CustomEvent('store:changed', { detail: { source: 'project:switch', id } }));
    }
  },
  _persistProjects() {
    localStorage.setItem(LS.PROJECTS, Utils.safeStringify(this.state.projects));
    localStorage.setItem(LS.ACTIVE_PROJECT, this.state.activeProjectId || '');
  },

  // --------- PROJECTS EXTRA ----------

// 🗑️ Eliminar un proyecto
removeProject(id) {
  const i = this.state.projects.findIndex(p => p.id === id);
  if (i >= 0) {
    // Si el proyecto eliminado es el activo, cambiamos a otro (si existe)
    const wasActive = this.state.projects[i].id === this.state.activeProjectId;
    this.state.projects.splice(i, 1);

    if (wasActive && this.state.projects.length > 0) {
      this.state.activeProjectId = this.state.projects[0].id;
    } else if (this.state.projects.length === 0) {
      // Si no quedan proyectos, creamos uno por defecto
      const defaultProject = { id: uid(), name: 'Proyecto principal' };
      this.state.projects = [defaultProject];
      this.state.activeProjectId = defaultProject.id;
    }

    this._persistProjects();

    // 🔥 Eliminar también sus tareas
    this.state.tasks = this.state.tasks.filter(t => t.projectId !== id);
    this._persistTasks();

    document.dispatchEvent(new CustomEvent('store:changed', {
      detail: { source: 'project:remove', id }
    }));
  }
},

updateProjectName(id, newName) {
  const project = this.state.projects.find(p => p.id === id);
  if (!project) return console.warn('No se encontró el proyecto a renombrar');
  
  project.name = newName;
  this._persistProjects();
  
  // Dispara un evento global para actualizar la UI
  document.dispatchEvent(new CustomEvent('store:changed', {
    detail: { source: 'project:update', id }
  }));
},



  // --------- TASKS ----------
  getTasks() {
    // Solo devolver tareas del proyecto activo
    return this.state.tasks.filter(t => t.projectId === this.state.activeProjectId);
  },

  // 🔹 Nuevo método más flexible
  getTasksByProject(projectId = this.state.activeProjectId) {
    return this.state.tasks.filter(t => t.projectId === projectId);
  },

  addTask(title) {
    this.state.tasks.push({
      id: uid(),
      title,
      done: false,
      projectId: this.state.activeProjectId
    });
    this._persistTasks();
    document.dispatchEvent(new CustomEvent('store:changed', { detail: { source: 'task:add' } }));
  },
  toggleTask(id, done) {
    const t = this.state.tasks.find(x => x.id === id);
    if (t) {
      t.done = !!done;
      this._persistTasks();
      document.dispatchEvent(new CustomEvent('store:changed', { detail: { source: 'task:toggle', id } }));
    }
  },
  removeTask(id) {
    const i = this.state.tasks.findIndex(x => x.id === id);
    if (i >= 0) {
      this.state.tasks.splice(i, 1);
      this._persistTasks();
      document.dispatchEvent(new CustomEvent('store:changed', { detail: { source: 'task:remove', id } }));
    }
  },
  getProgress() {
    const tasks = this.getTasks();
    const total = tasks.length, done = tasks.filter(t => t.done).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, pct };
  },
  _persistTasks() {
    localStorage.setItem(LS.TASKS, Utils.safeStringify(this.state.tasks));
  }
};
