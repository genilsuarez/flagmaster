# Requirements Document

## Introduction

Rediseño del flujo de experiencia de usuario para que los modos de juego se muestren directamente en la pantalla principal (Home), eliminando la pantalla intermedia de selección de modos. El objetivo es reducir la fricción entre la intención del usuario y la acción de jugar, siguiendo patrones profesionales de diseño UX (Hub-and-Spoke, Progressive Disclosure, Card-Based Navigation) y manteniendo la estética Editorial Luxe del sistema de diseño existente.

### Flujo Actual (a eliminar)
1. Landing Hero → botón "Comenzar Juego"
2. Pantalla Mode Selector (grid de tarjetas)
3. Pantalla Parametrización
4. Pantalla Juego

### Flujo Propuesto
1. Home = Tarjetas de modos visibles inmediatamente (patrón Hub)
2. Tap en modo → Bottom Sheet de configuración rápida (Progressive Disclosure)
3. Pantalla Juego

## Glossary

- **Pantalla_Home**: Pantalla principal de la aplicación que actúa como hub central, mostrando los modos de juego como contenido primario
- **Tarjeta_Modo**: Componente visual interactivo que representa un modo de juego, mostrando icono, nombre, descripción y categoría
- **Bottom_Sheet**: Panel deslizable desde la parte inferior de la pantalla que muestra opciones de configuración para el modo seleccionado
- **AppRouter**: Módulo JavaScript que gestiona las transiciones entre pantallas de la aplicación
- **Sección_Engagement**: Área de la Pantalla_Home que muestra estadísticas del usuario, rachas y actividad reciente
- **Categoría_Equipo**: Agrupación de modos de juego diseñados para 2 equipos (Bandera Flash, Capital Quest)
- **Categoría_Individual**: Agrupación de modos de juego diseñados para un solo jugador (Flag Rush, Capital Clash, Streak Blitz, Geo Puzzle, Supervivencia, Letras en Caída)
- **Editorial_Luxe**: Sistema de diseño de la aplicación basado en estética de revista contemporánea con tipografía serif, paleta cálida y espacio negativo generoso
- **Progressive_Disclosure**: Patrón UX que muestra solo la información esencial inicialmente y revela complejidad bajo demanda

## Requirements

### Requisito 1: Pantalla Home como Hub de Modos

**Historia de Usuario:** Como jugador, quiero ver todos los modos de juego disponibles directamente al abrir la aplicación, para poder elegir y empezar a jugar con menos pasos.

#### Criterios de Aceptación

1. WHEN la aplicación se carga, THE Pantalla_Home SHALL mostrar las 8 Tarjeta_Modo disponibles como contenido principal sin requerir navegación adicional, renderizando la pantalla completa en un máximo de 2 segundos desde el inicio de carga
2. THE Pantalla_Home SHALL organizar las Tarjeta_Modo en dos secciones con encabezado de texto visible: la sección Categoría_Equipo (2 modos: Bandera Flash, Capital Quest) aparece primero, seguida de la sección Categoría_Individual (6 modos: Letras en Caída, Flag Rush, Capital Clash, Streak Blitz, Geo Puzzle, Supervivencia)
3. THE cada Tarjeta_Modo SHALL mostrar el nombre del modo, su icono identificativo y su descripción corta tal como están definidos en el registro de modos del sistema
4. WHEN el usuario visualiza la Pantalla_Home, THE Pantalla_Home SHALL mostrar un encabezado fijo con el logo de la aplicación, un badge de racha que muestre el número de días consecutivos jugados (o "0" si no existe racha activa) y un botón de acceso al menú hamburguesa
5. WHEN el usuario toca una Tarjeta_Modo, THE Pantalla_Home SHALL abrir el Bottom_Sheet con la configuración del modo seleccionado
6. THE Pantalla_Home SHALL reemplazar completamente el flujo anterior de Landing Hero con botón "Comenzar Juego" seguido de pantalla Mode Selector separada, de modo que no exista ninguna pantalla intermedia entre la carga de la aplicación y la selección de modo

### Requisito 2: Diseño de Tarjetas de Modo

**Historia de Usuario:** Como jugador, quiero que cada modo de juego se presente de forma clara y atractiva, para poder entender qué ofrece cada modo en menos de 3 segundos.

#### Criterios de Aceptación

1. THE Tarjeta_Modo SHALL mostrar el icono emoji, nombre del modo (máximo 20 caracteres) y descripción del modo de juego (máximo 50 caracteres) dispuestos en una jerarquía visual de arriba hacia abajo
2. THE Tarjeta_Modo SHALL indicar visualmente la categoría a la que pertenece mediante un badge con texto ("Equipos" o "Individual") y color de fondo diferenciado por categoría (sage #7a9b7f para equipo, ocean #6b8fa3 para individual)
3. WHEN el usuario interactúa con una Tarjeta_Modo mediante hover o focus, THE Tarjeta_Modo SHALL mostrar una elevación visual mediante translateY(-3px) con transición de 300ms usando curva ease (cubic-bezier(0.4, 0, 0.2, 1))
4. THE Tarjeta_Modo SHALL tener dimensiones mínimas de 44x44 píxeles para el área táctil interactiva, cumpliendo con el criterio de éxito 2.5.8 de WCAG 2.2 (Target Size Minimum)
5. THE Tarjeta_Modo SHALL exponer su contenido a tecnologías asistivas mediante role="button", un nombre accesible que combine el nombre del modo y su categoría, y aria-hidden="true" en el icono emoji decorativo
6. IF el viewport es menor a 768px, THEN THE Tarjeta_Modo SHALL ocultar la descripción textual y mostrar únicamente el icono emoji, el nombre del modo y el badge de categoría

### Requisito 3: Configuración Rápida via Bottom Sheet

**Historia de Usuario:** Como jugador, quiero configurar rápidamente las opciones de una partida sin navegar a una pantalla separada, para reducir los pasos entre elegir un modo y empezar a jugar.

#### Criterios de Aceptación

1. WHEN el usuario selecciona una Tarjeta_Modo, THE Bottom_Sheet SHALL deslizarse desde la parte inferior de la pantalla con una animación de duración máxima 300ms, mostrando las opciones de configuración específicas del modo seleccionado
2. THE Bottom_Sheet SHALL mostrar las opciones de configuración aplicables según la categoría del modo: filtro de continente y filtro de soberanía para todos los modos; cantidad de países (mínimo 5, máximo según países disponibles con los filtros activos) para todos los modos; modo práctica, orden aleatorio y número de equipos para modos de categoría "team"; tiempo por pregunta para modos con contrarreloj (Flag Rush, Streak Blitz); variante de pista (bandera+nombre, solo bandera, solo nombre) para Capital Quest y Capital Clash
3. WHEN el Bottom_Sheet se muestra por primera vez para un modo sin configuración guardada, THE Bottom_Sheet SHALL presentar valores por defecto: continente "Todos", soberanía "Todos", cantidad de países igual al máximo disponible, y las opciones específicas del modo en su valor inicial estándar
4. THE Bottom_Sheet SHALL mostrar un botón principal "Jugar" que inicie la partida con la configuración seleccionada
5. IF la combinación de filtros seleccionada resulta en menos de 5 países disponibles, THEN THE Bottom_Sheet SHALL deshabilitar el botón "Jugar" y mostrar un mensaje indicando que no hay suficientes países con los filtros actuales
6. WHEN el usuario toca fuera del Bottom_Sheet o desliza hacia abajo, THE Bottom_Sheet SHALL cerrarse con una animación de deslizamiento descendente de duración máxima 300ms
7. THE Bottom_Sheet SHALL recordar la última configuración utilizada por el usuario para cada modo de juego mediante almacenamiento local, y restaurarla al abrir el Bottom_Sheet del mismo modo en sesiones posteriores

### Requisito 4: Eliminación del Flujo Landing Hero + Mode Selector

**Historia de Usuario:** Como jugador, quiero acceder a los modos de juego sin pasos intermedios innecesarios, para que la experiencia se sienta inmediata y profesional.

#### Criterios de Aceptación

1. THE AppRouter SHALL definir su lista de pantallas válidas como ['home', 'game'], establecer 'home' como pantalla inicial en el constructor, y aplicar la clase CSS 'screen-home' al body en la carga inicial
2. THE AppRouter SHALL excluir 'landing', 'modeSelector' y 'parametrization' de su lista de pantallas válidas, de modo que no sean destinos de navegación alcanzables
3. THE AppRouter SHALL mantener la pantalla 'game' y delegar la configuración de partida (selección de modo y parámetros) al componente Bottom_Sheet dentro de la Pantalla_Home, sin pantallas intermedias de navegación
4. WHEN el usuario finaliza una partida (por completar todas las rondas o por abandonar voluntariamente), THE AppRouter SHALL invocar reset('home') para navegar a la Pantalla_Home, limpiar el history stack, y aplicar la clase CSS 'screen-home' al body
5. IF el método back() es invocado con el history stack vacío, THEN THE AppRouter SHALL permanecer en la Pantalla_Home sin cambio de estado
6. IF navigate() recibe un identificador de pantalla no incluido en la lista válida ['home', 'game'], THEN THE AppRouter SHALL ignorar la solicitud, emitir un warning en consola, y mantener la pantalla actual sin cambios

### Requisito 5: Navegación y Transiciones

**Historia de Usuario:** Como jugador, quiero que las transiciones entre estados sean fluidas y rápidas, para que la aplicación se sienta pulida y profesional.

#### Criterios de Aceptación

1. WHEN el usuario navega de una pantalla a otra, THE AppRouter SHALL ejecutar una transición animada con duración máxima de 300ms usando la función de easing cubic-bezier(0.4, 0, 0.2, 1), donde la pantalla saliente se oculta con fade-out y la pantalla entrante se muestra con fade-in, completando ambas fases dentro del límite de 300ms
2. WHEN el usuario tiene la preferencia prefers-reduced-motion activada en su sistema operativo, THE AppRouter SHALL desactivar todas las animaciones de transición y mostrar los cambios de pantalla de forma instantánea (duración de transición de 0ms)
3. THE Pantalla_Home SHALL ser accesible mediante el botón "Inicio" (data-action="home") del menú drawer y mediante el logo de la aplicación visible en cualquier pantalla
4. WHEN el usuario presiona el botón de retroceso del navegador desde la pantalla de juego, THE AppRouter SHALL interceptar el evento popstate y navegar a la Pantalla_Home sin recargar la página
5. WHEN el AppRouter ejecuta una navegación mediante el método navigate(), THE AppRouter SHALL registrar la pantalla destino en el History API del navegador mediante pushState, de modo que el botón de retroceso del navegador refleje el historial de navegación interno
6. IF el usuario intenta navegar a una pantalla no registrada en AppRouter.SCREENS, THEN THE AppRouter SHALL ignorar la navegación, permanecer en la pantalla actual y registrar una advertencia en consola

### Requisito 6: Sección de Engagement del Usuario

**Historia de Usuario:** Como jugador, quiero ver mi progreso y estadísticas en la pantalla principal, para sentirme motivado a seguir jugando.

#### Criterios de Aceptación

1. THE Sección_Engagement SHALL mostrar la racha actual del usuario (días consecutivos jugando) con el icono 🔥 y el número de días, visible sin necesidad de scroll en la Pantalla_Home
2. IF el usuario tiene al menos una partida previa registrada, THEN THE Sección_Engagement SHALL mostrar el identificador del último modo jugado junto con un botón que al activarse inicie el flujo de juego para ese mismo modo
3. THE Sección_Engagement SHALL mostrar el número de banderas únicas acertadas sobre el número total de banderas disponibles en el dataset, en formato "{acertadas} de {total}"
4. THE Sección_Engagement SHALL posicionarse en la parte superior de la Pantalla_Home, antes de las secciones de Tarjeta_Modo
5. IF el usuario no tiene partidas previas registradas, THEN THE Sección_Engagement SHALL ocultar el indicador de racha y el acceso al último modo jugado, mostrando únicamente el indicador de progreso global con valor "0 de {total}"
6. IF los datos de estadísticas en localStorage no están disponibles o son inválidos, THEN THE Sección_Engagement SHALL mostrar los valores por defecto (racha: 0, progreso: 0 de {total}) sin mostrar mensaje de error al usuario

### Requisito 7: Diseño Responsive Mobile-First

**Historia de Usuario:** Como jugador en dispositivo móvil, quiero que la pantalla principal se adapte correctamente a mi pantalla, para tener una experiencia óptima sin importar el dispositivo.

#### Criterios de Aceptación

1. WHILE el viewport tiene un ancho menor a 768px, THE Pantalla_Home SHALL mostrar las Tarjeta_Modo en un grid compacto con scroll vertical, ocultando la descripción del modo y mostrando solo icono, nombre y badge
2. WHILE el viewport tiene un ancho entre 768px y 1023px, THE Pantalla_Home SHALL mostrar las Tarjeta_Modo en un grid de 2 columnas con un ancho máximo de contenedor de 640px centrado horizontalmente
3. WHILE el viewport tiene un ancho mayor o igual a 1024px, THE Pantalla_Home SHALL mostrar las Tarjeta_Modo en un grid de 2 columnas dentro de un contenedor con ancho máximo de 640px centrado horizontalmente
4. THE Pantalla_Home SHALL ser completamente funcional sin scroll horizontal en viewports desde 320px de ancho, con un tamaño mínimo de fuente de 12px y elementos interactivos con área táctil mínima de 44x44px
5. WHILE el viewport tiene un ancho menor a 768px, THE Pantalla_Home SHALL reducir los valores de espaciado (custom properties --space-xs a --space-2xl) en aproximadamente 30% respecto a los valores base definidos en el sistema de diseño
6. WHILE el viewport tiene un ancho menor a 768px, THE Bottom_Sheet SHALL ocupar el ancho completo del viewport con un padding horizontal máximo de 16px y su contenido SHALL adaptarse a una disposición vertical de columna única

### Requisito 8: Accesibilidad

**Historia de Usuario:** Como jugador que utiliza tecnologías asistivas, quiero poder navegar y seleccionar modos de juego usando teclado y lector de pantalla, para tener acceso completo a la funcionalidad.

#### Criterios de Aceptación

1. THE Tarjeta_Modo SHALL ser navegable mediante teclado usando la tecla Tab y activable mediante Enter o Espacio, con un atributo role="button" y tabindex="0"
2. THE Tarjeta_Modo SHALL incluir atributos aria-label descriptivos que comuniquen el nombre del modo, su categoría y su descripción en el formato "{nombre} — {categoría}: {descripción}"
3. WHEN el Bottom_Sheet se abre, THE Bottom_Sheet SHALL establecer los atributos role="dialog" y aria-modal="true", mover el foco al primer elemento interactivo dentro del panel y atrapar el foco dentro del Bottom_Sheet hasta que se cierre
4. WHEN el Bottom_Sheet se cierra, THE Bottom_Sheet SHALL devolver el foco al elemento Tarjeta_Modo que lo activó
5. IF el usuario presiona la tecla Escape mientras el Bottom_Sheet está abierto, THEN THE Bottom_Sheet SHALL cerrarse y devolver el foco al elemento Tarjeta_Modo que lo activó
6. THE Pantalla_Home SHALL utilizar landmarks ARIA para facilitar la navegación por secciones con lector de pantalla: role="main" para el contenido principal, role="navigation" para el menú, y role="region" con aria-label para cada sección de categoría de modos
7. THE Pantalla_Home SHALL mantener un ratio de contraste mínimo de 4.5:1 para texto normal y 3:1 para texto grande, conforme a WCAG 2.1 nivel AA

### Requisito 9: Consistencia con Editorial Luxe

**Historia de Usuario:** Como usuario de la aplicación, quiero que el rediseño mantenga la identidad visual elegante y refinada existente, para que la experiencia sea coherente con el resto de la aplicación.

#### Criterios de Aceptación

1. THE Pantalla_Home SHALL utilizar la paleta de colores definida en Editorial_Luxe: fondo cream (#faf8f5), texto charcoal (#2d2a26), acentos sage (#7a9b7f) y terracotta (#c77d5f)
2. THE Tarjeta_Modo SHALL utilizar tipografía serif (DM Serif Display) para títulos con tamaño entre 1.3rem y 1.6rem y peso 400, y sans-serif (Inter) para descripciones con tamaño entre 0.85rem y 1rem y peso 400, estableciendo un contraste de al menos 1.3x entre el tamaño de título y el tamaño de descripción
3. THE Pantalla_Home SHALL aplicar sombras delicadas (shadow-soft: 0 2px 12px rgba(29,26,22,0.06)) y bordes suaves (radius entre 8px y 12px) en las Tarjeta_Modo
4. THE Bottom_Sheet SHALL aplicar fondo blanco cálido (warm-white del sistema de diseño), bordes redondeados superiores de 16px (radius-xl), y sombra shadow-lifted (0 8px 32px rgba(29,26,22,0.1))
5. THE Pantalla_Home SHALL aplicar transiciones con duración máxima de 300ms y función de easing cubic-bezier(0.4, 0, 0.2, 1) en todas las interacciones de las Tarjeta_Modo (hover, press, focus)

### Requisito 10: Organización por Categorías

**Historia de Usuario:** Como jugador, quiero ver los modos organizados por tipo (equipo vs individual), para encontrar rápidamente el tipo de experiencia que busco.

#### Criterios de Aceptación

1. THE Pantalla_Home SHALL mostrar los modos cuyo campo category sea "team" (Bandera Flash, Capital Quest) en una sección separada con encabezado "Modos en Equipo", posicionada antes de la sección de modos individuales en el orden de lectura del documento
2. THE Pantalla_Home SHALL mostrar los modos cuyo campo category sea "individual" (Letras en Caída, Flag Rush, Capital Clash, Streak Blitz, Geo Puzzle, Supervivencia) en una sección separada con encabezado "Modos Individuales", posicionada después de la sección de modos en equipo
3. THE Pantalla_Home SHALL renderizar cada encabezado de sección como un elemento heading con tipografía serif (DM Serif Display) y separar las secciones mediante un espaciado vertical de al menos 16px o un borde de 1px entre ellas
4. THE Pantalla_Home SHALL preservar dentro de cada sección el orden de definición de los modos tal como aparecen en el registro GAME_MODES
