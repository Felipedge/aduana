# Sistema de Aduanas

Prototipo funcional en React (Vite) de un sistema de gestión de trámites de frontera.
Modela las clases del diagrama: Viajero, Vehículo, TramiteFrontera, DocumentoAduanero
(DeclaracionSAG, FormularioVehiculoAcuerdo, AutorizacionNotarial) e InformeEstadistico.

Incluye tres roles: Viajero, Funcionario y Administrador.

## Requisitos

- Node.js versión 18 o superior. Descárgalo de https://nodejs.org (instalador LTS).
  Verifica con: `node -v` y `npm -v`

## Cómo ejecutarlo

Abre una terminal dentro de esta carpeta y corre:

```bash
npm install
```

Esto descarga las dependencias (React, Vite, lucide-react) y crea la carpeta
node_modules automáticamente. Solo se hace una vez.

Luego, para arrancar el servidor de desarrollo:

```bash
npm run dev
```

Abre en tu navegador la dirección que aparece (normalmente http://localhost:5173).

Para detener el servidor: Ctrl + C en la terminal.

## Generar versión de producción (opcional)

```bash
npm run build
```

Crea una carpeta `dist` con los archivos optimizados, listos para publicar.

## Notas

- Los datos son de ejemplo y viven solo en memoria: al recargar la página
  vuelven a su estado inicial (el prototipo no tiene base de datos).
- Para ver el flujo de menor de edad, entra como Viajero y selecciona
  "Mateo Rojas Pérez" en el selector de sesión.

## Credenciales de demostración (login con RUT + contraseña)

- Viajero:       RUT 18.345.678-9   contraseña 1234
- Viajero menor: RUT 14.987.654-K   contraseña 1234
- Funcionario:   RUT 11.222.333-4   contraseña func
- Administrador: RUT 10.000.000-0   contraseña admin

Cada cuenta entra directamente a la vista que le corresponde según su rol.
Las contraseñas están en texto plano dentro del código SOLO por ser un
prototipo de demostración; un sistema real nunca debe hacer esto.
