import { Utils } from './utils.js';

const LS = { USERS:'wc_users', ACTIVE:'wc_active_user', TASKS:'wc_tasks', LEGACY_USER:'wc_user' };
const uid = () => Math.random().toString(36).slice(2,9);

export const Store = {
  state: { users: [], activeUserId: null, tasks: [] },

  init(){
    // --- migración desde tu versión anterior (wc_user) ---
    const legacy = Utils.safeParse(localStorage.getItem(LS.LEGACY_USER), null);
    let users = Utils.safeParse(localStorage.getItem(LS.USERS), []);
    let active = localStorage.getItem(LS.ACTIVE) || null;

    if (!Array.isArray(users) || users.length === 0) {
      if (legacy) { // migra perfil existente
        const id = uid();
        users = [{ id, ...legacy }];
        active = id;
      } else {
        const id = uid();
        users = [{ id, name:'Estudiante', birthDate:'', photoBase64:'' }];
        active = id;
      }
      localStorage.setItem(LS.USERS, Utils.safeStringify(users));
      localStorage.removeItem(LS.LEGACY_USER);
    }

    this.state.users = users;
    this.state.activeUserId = active;
    // --- tareas (sin cambios) ---
    const tasks = Utils.safeParse(localStorage.getItem(LS.TASKS), []);
    this.state.tasks = Array.isArray(tasks) ? tasks : [];
    if (this.state.tasks.length === 0) {
      this.state.tasks = [
        { id: uid(), title: 'Revisar enunciado del proyecto', done:false },
        { id: uid(), title: 'Implementar <user-card>',        done:true  },
        { id: uid(), title: 'Conectar <task-item> con Store',  done:false },
      ];
      this._persistTasks();
    }
  },

  // --------- USERS ----------
  listUsers(){ return [...this.state.users]; },
  getUser(){ return { ...(this.state.users.find(u=>u.id===this.state.activeUserId) || {}) }; },
  setUser(partial){
    const i = this.state.users.findIndex(u=>u.id===this.state.activeUserId);
    if (i>=0){
      this.state.users[i] = { ...this.state.users[i], ...partial };
      this._persistUsers();
      document.dispatchEvent(new CustomEvent('store:changed', { detail:{ source:'user:update' } }));
    }
  },
  addUser({ name='Nuevo perfil', birthDate='', photoBase64='' }={}){
    const u = { id: uid(), name, birthDate, photoBase64 };
    this.state.users.push(u);
    this.state.activeUserId = u.id;
    this._persistUsers();
    document.dispatchEvent(new CustomEvent('store:changed', { detail:{ source:'user:add' } }));
  },
  setActiveUser(id){
    if (this.state.users.some(u=>u.id===id)){
      this.state.activeUserId = id;
      localStorage.setItem(LS.ACTIVE, id);
      document.dispatchEvent(new CustomEvent('store:changed', { detail:{ source:'user:switch', id } }));
    }
  },
  _persistUsers(){
    localStorage.setItem(LS.USERS, Utils.safeStringify(this.state.users));
    localStorage.setItem(LS.ACTIVE, this.state.activeUserId || '');
  },

  // --------- TASKS (igual que tenías) ----------
  getTasks(){ return [...this.state.tasks]; },
  addTask(title){ this.state.tasks.push({ id: uid(), title, done:false }); this._persistTasks();
    document.dispatchEvent(new CustomEvent('store:changed',{ detail:{ source:'task:add' } })); },
  toggleTask(id, done){ const t=this.state.tasks.find(x=>x.id===id); if(t){ t.done=!!done; this._persistTasks();
    document.dispatchEvent(new CustomEvent('store:changed',{ detail:{ source:'task:toggle', id } })); } },
  removeTask(id){ const i=this.state.tasks.findIndex(x=>x.id===id); if(i>=0){ this.state.tasks.splice(i,1); this._persistTasks();
    document.dispatchEvent(new CustomEvent('store:changed',{ detail:{ source:'task:remove', id } })); } },
  getProgress(){ const total=this.state.tasks.length, done=this.state.tasks.filter(t=>t.done).length;
    const pct = total? Math.round((done/total)*100):0; return { total, done, pct }; },
  _persistTasks(){ localStorage.setItem(LS.TASKS, Utils.safeStringify(this.state.tasks)); }
};
