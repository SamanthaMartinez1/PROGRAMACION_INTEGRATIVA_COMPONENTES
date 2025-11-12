
//  Propósito:
// Define el "Bus de Eventos" o Event Bus del proyecto.
// Un Event Bus permite que varios componentes (por ejemplo,
// <user-card>, <task-item>, <progress-bar>) se comuniquen entre sí
// sin conocerse directamente.


// En los Web Components, cada componente está encapsulado dentro de
// su propio Shadow DOM, por lo tanto, no pueden acceder directamente
// a otros componentes.

// Para resolver esto, se utiliza un "bus" o canal de mensajes que
// envía y recibe eventos de manera global.



// Estamos utilizando el objeto "document" como EventTarget global.
// Es decir, todos los componentes pueden emitir y escuchar eventos
// a través del documento principal.

