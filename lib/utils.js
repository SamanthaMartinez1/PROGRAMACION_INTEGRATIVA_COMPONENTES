
// Proporcionar funciones utilitarias (métodos estáticos) que pueden ser
// utilizadas desde cualquier parte del proyecto sin necesidad de crear instancias.
//
// En este caso, la clase "Utils" maneja:
//  Conversión segura entre cadenas JSON ↔ objetos JavaScript.
// Conversión de imágenes de un <canvas> a formato Base64 (PNG).
//
// Estas funciones apoyan al componente <user-card> y al Store, ayudando a
// serializar y deserializar datos guardados en LocalStorage.


export class Utils {

  //  Método: safeParse(str, fallback = null)
  // Convierte una cadena JSON a un objeto JavaScript.
  // - Parámetro "str": cadena JSON (por ejemplo, '{"name":"Ana"}').
  // - Parámetro "fallback": valor que se devuelve si la conversión falla.
  
 
  // Cuando se obtienen datos del LocalStorage, siempre se guardan como string.
  // Este método asegura que, si el JSON está dañado o vacío, no genere error.
 
  // Ejemplo:
  // const user = Utils.safeParse(localStorage.getItem('wc_user'), {});

  static safeParse(str, fallback = null) {
    try {
      return JSON.parse(str);     // Intentamos parsear el texto como JSON
    } catch {
      return fallback;            // Si ocurre un error (JSON inválido), devolvemos el valor alternativo
    }
  }

 
  //  Método: safeStringify(value)
  // Convierte cualquier objeto o valor de JavaScript a una cadena JSON.
  // - Parámetro "value": el objeto a serializar (por ejemplo, {name:"Ana"}).
 
  // Antes de guardar datos en LocalStorage, deben ser transformados a texto.
  // Este método evita que errores de serialización (como referencias circulares)
  // rompan el flujo del programa.
  
  // Ejemplo:
  // localStorage.setItem('wc_user', Utils.safeStringify(user));
 
  static safeStringify(value) {
    try {
      return JSON.stringify(value);  // Convierte a cadena JSON
    } catch {
      return "{}";                   // En caso de error, devuelve un JSON vacío
    }
  }

  //  Método: canvasToBase64(canvas, mime = 'image/png')
  // Convierte el contenido de un elemento <canvas> a una cadena Base64.
  
  // Parámetros:
  // - "canvas": referencia al elemento <canvas>.
  // - "mime": tipo de formato de imagen (por defecto "image/png").

  // Se usa en el componente <user-card> para capturar una foto desde la cámara
  // y convertirla en texto Base64. Esto permite guardarla fácilmente en
  // LocalStorage o enviarla a un servidor sin necesidad de archivos externos.
  
  // Ejemplo:
  // const foto = Utils.canvasToBase64(this.$canvas);
  // localStorage.setItem('foto', foto);
  static canvasToBase64(canvas, mime = 'image/png') {
    // El método toDataURL() convierte la imagen del canvas a una cadena Base64.
    return canvas.toDataURL(mime);
  }
}
