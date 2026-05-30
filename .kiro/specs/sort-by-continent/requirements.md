# Requirements Document

## Introduction

Nuevo modo de juego individual "Ordena por Continente" para FlagQuiz. El jugador clasifica banderas o capitales en sus continentes correspondientes mediante interacción drag-and-drop o tap-to-assign. La pantalla presenta un panel con ítems (banderas o nombres de capitales) y zonas de destino representando continentes. El número de ítems y continentes es parametrizable. Se integra con la arquitectura MVC existente y el sistema de diseño Editorial Luxe.

## Glossary

- **Sistema_Clasificación**: El módulo de juego que gestiona la lógica de clasificación de ítems por continente
- **Panel_Ítems**: Zona de la interfaz que muestra la cuadrícula de banderas o capitales pendientes de clasificar
- **Zona_Continente**: Área de destino etiquetada con el nombre de un continente donde el jugador deposita los ítems
- **Ítem**: Una bandera (imagen SVG) o un nombre de capital que el jugador debe clasificar
- **Sesión**: Una partida completa del modo, desde la presentación de ítems hasta la evaluación final
- **Evaluación**: El proceso de verificar las clasificaciones del jugador y calcular la puntuación
- **ModeOptions**: Configuración parametrizable del modo expuesta en el BottomSheet antes de iniciar
- **Pool_Países**: Subconjunto de países seleccionados aleatoriamente del dataset flags.json para una sesión
- **Interacción_Asignación**: Acción del jugador para mover un ítem al continente correspondiente (drag-and-drop o tap-to-assign)

## Requirements

### Requirement 1: Registro del modo en el sistema

**User Story:** Como jugador, quiero ver "Ordena por Continente" en la pantalla principal, para poder seleccionar este modo de juego.

#### Acceptance Criteria

1. THE Sistema_Clasificación SHALL registrarse en GAME_MODES con id "ordenaContinente", nombre "Ordena por Continente", icono "🌍", categoría "individual" y descripción "Clasifica banderas o capitales en su continente"
2. THE Sistema_Clasificación SHALL registrar sus opciones configurables en MODE_OPTIONS bajo la clave "ordenaContinente" como un array de definiciones con esquema { id, label, type, default, min?, max?, options? }, incluyendo al menos una opción de tipo select para elegir el contenido a clasificar (banderas o capitales)
3. WHEN el jugador selecciona el modo "Ordena por Continente" en la pantalla principal, THE Sistema_Clasificación SHALL mostrar el BottomSheet con el título "Ordena por Continente", el icono "🌍", la sección de filtros de contenido (continente, soberanía, cantidad de países) y las opciones específicas del modo registradas en MODE_OPTIONS
4. WHEN el BottomSheet del modo "ordenaContinente" se muestra, THE Sistema_Clasificación SHALL inicializar cada opción configurable con su valor default definido en MODE_OPTIONS y permitir al jugador modificarlas antes de iniciar la partida

### Requirement 2: Configuración parametrizable del modo

**User Story:** Como jugador, quiero configurar la cantidad de ítems y los continentes incluidos, para adaptar la dificultad a mi nivel.

#### Acceptance Criteria

1. THE ModeOptions SHALL exponer una opción "Cantidad de ítems" de tipo numérico con valor por defecto 12, mínimo 6, máximo 24 e incremento de 1
2. THE ModeOptions SHALL exponer una opción "Continentes" de tipo selección múltiple con los valores: África, América, Asia, Europa y Oceanía, todos seleccionados por defecto
3. THE ModeOptions SHALL exponer una opción "Tipo de ítem" de tipo select con valores "🏳️ Banderas" (por defecto) y "🏛️ Capitales"
4. THE ModeOptions SHALL exponer una opción "Temporizador" de tipo select con valores "⏱️ Con tiempo" y "♾️ Sin tiempo" (por defecto)
5. WHEN la opción "Temporizador" tiene valor "Con tiempo", THE ModeOptions SHALL mostrar una opción "Tiempo límite (s)" de tipo numérico con valor por defecto 120, mínimo 30, máximo 300 e incremento de 10
6. IF el jugador deselecciona continentes hasta quedar menos de 2 seleccionados, THEN THE ModeOptions SHALL deshabilitar la acción de inicio de sesión y mostrar un mensaje indicando que se requieren al menos 2 continentes
7. IF la cantidad de ítems configurada excede el número de países soberanos disponibles en los continentes seleccionados, THEN THE ModeOptions SHALL ajustar el valor máximo del campo "Cantidad de ítems" al total de países disponibles para la selección actual de continentes

### Requirement 3: Generación de la sesión de juego

**User Story:** Como jugador, quiero que los ítems se seleccionen aleatoriamente de los continentes elegidos, para que cada partida sea diferente.

#### Acceptance Criteria

1. WHEN el jugador inicia una sesión, THE Sistema_Clasificación SHALL seleccionar aleatoriamente la cantidad configurada de países del Pool_Países sin repetición, asignando a cada continente seleccionado un mínimo de floor(cantidad / número_de_continentes) países y distribuyendo los ítems restantes (módulo) aleatoriamente entre los continentes seleccionados
2. IF un continente seleccionado contiene menos países soberanos que la cuota asignada, THEN THE Sistema_Clasificación SHALL seleccionar todos los países soberanos disponibles de ese continente y redistribuir los ítems faltantes entre los demás continentes seleccionados que tengan disponibilidad
3. THE Sistema_Clasificación SHALL filtrar el Pool_Países para incluir únicamente países con Sovereign_State igual a "Yes"
4. IF el tipo de ítem es "Banderas", THEN THE Sistema_Clasificación SHALL presentar la imagen SVG de la bandera (campo Flag_URL) como ítem clasificable
5. IF el tipo de ítem es "Capitales", THEN THE Sistema_Clasificación SHALL presentar el nombre de la capital en español (campo Capital_Spanish) como ítem clasificable

### Requirement 4: Interfaz de clasificación

**User Story:** Como jugador, quiero ver claramente los ítems a clasificar y las zonas de continente, para poder asignar cada ítem a su continente correcto.

#### Acceptance Criteria

1. THE Panel_Ítems SHALL mostrar todos los ítems pendientes de clasificar en una cuadrícula de 4 columnas en desktop (>1024px), 3 columnas en tablet (768px-1023px) y 2 columnas en mobile (<767px), con cada ítem renderizado a un tamaño mínimo de 48x48px
2. THE Sistema_Clasificación SHALL mostrar una Zona_Continente etiquetada por cada continente seleccionado en la configuración
3. WHEN un ítem es asignado a una Zona_Continente, THE Panel_Ítems SHALL remover visualmente el ítem de la cuadrícula de pendientes
4. WHEN un ítem es asignado a una Zona_Continente, THE Zona_Continente SHALL mostrar el ítem dentro de su área con un borde o fondo diferenciado que agrupe visualmente los ítems asignados a esa zona
5. THE Sistema_Clasificación SHALL mostrar un contador con formato "{ítems pendientes} / {total de ítems}" que se actualiza inmediatamente al asignar o desasignar un ítem
6. THE Sistema_Clasificación SHALL mostrar un botón "Verificar respuestas"
7. WHILE existan ítems sin clasificar, THE Sistema_Clasificación SHALL mantener el botón "Verificar respuestas" en estado deshabilitado (no interactuable)
8. WHEN todos los ítems han sido asignados a una Zona_Continente, THE Sistema_Clasificación SHALL habilitar el botón "Verificar respuestas"

### Requirement 5: Interacción drag-and-drop

**User Story:** Como jugador en escritorio, quiero arrastrar los ítems hacia los continentes, para clasificarlos de forma intuitiva.

#### Acceptance Criteria

1. WHEN el jugador inicia un arrastre sobre un ítem en el Panel_Ítems, THE Sistema_Clasificación SHALL mostrar el ítem con opacidad reducida en su posición original y una copia del ítem siguiendo el cursor como indicador de arrastre
2. WHEN el jugador arrastra un ítem sobre una Zona_Continente, THE Zona_Continente SHALL mostrar un cambio visual de borde o fondo distinguible de su estado por defecto indicando que acepta el drop
3. WHEN el jugador arrastra un ítem fuera de una Zona_Continente sin soltar, THE Zona_Continente SHALL revertir a su estado visual por defecto en un máximo de 150ms
4. WHEN el jugador suelta un ítem sobre una Zona_Continente válida, THE Sistema_Clasificación SHALL asignar el ítem a esa Zona_Continente y removerlo del Panel_Ítems conforme a los criterios del Requirement 4
5. WHEN el jugador suelta un ítem fuera de cualquier Zona_Continente, THE Sistema_Clasificación SHALL devolver el ítem a su posición original en el Panel_Ítems con una transición animada de máximo 300ms
6. THE Sistema_Clasificación SHALL habilitar la interacción drag-and-drop únicamente en dispositivos con soporte de pointer fino (escritorio)

### Requirement 6: Interacción tap-to-assign (móvil)

**User Story:** Como jugador en dispositivo móvil, quiero tocar un ítem y luego tocar un continente, para clasificar sin necesidad de arrastrar.

#### Acceptance Criteria

1. WHEN el jugador toca un ítem en el Panel_Ítems, THE Sistema_Clasificación SHALL marcar el ítem como seleccionado aplicando un borde visible y un cambio de escala que diferencie el ítem seleccionado de los no seleccionados
2. WHILE un ítem está seleccionado, WHEN el jugador toca una Zona_Continente, THE Sistema_Clasificación SHALL asignar el ítem seleccionado a esa Zona_Continente y eliminar el estado de selección
3. WHILE un ítem está seleccionado, WHEN el jugador toca otro ítem en el Panel_Ítems, THE Sistema_Clasificación SHALL cambiar la selección al nuevo ítem
4. WHILE un ítem está seleccionado, WHEN el jugador toca el mismo ítem, THE Sistema_Clasificación SHALL deseleccionar el ítem removiendo el indicador visual de selección
5. WHILE un ítem está seleccionado, WHEN el jugador toca un área fuera del Panel_Ítems y fuera de cualquier Zona_Continente, THE Sistema_Clasificación SHALL deseleccionar el ítem activo

### Requirement 7: Reasignación de ítems

**User Story:** Como jugador, quiero poder corregir mis clasificaciones antes de verificar, para mejorar mi puntuación.

#### Acceptance Criteria

1. WHEN el jugador toca o hace clic sobre un ítem ya asignado dentro de una Zona_Continente, THE Sistema_Clasificación SHALL devolver el ítem al Panel_Ítems y actualizar el contador de ítems pendientes
2. WHEN un ítem es devuelto al Panel_Ítems, THE Zona_Continente SHALL remover el ítem de su área visual y el botón "Verificar respuestas" SHALL deshabilitarse si existen ítems sin clasificar
3. WHEN el jugador arrastra un ítem desde una Zona_Continente hacia otra Zona_Continente distinta, THE Sistema_Clasificación SHALL reasignar el ítem directamente a la nueva Zona_Continente sin devolverlo al Panel_Ítems
4. WHILE la evaluación no ha sido ejecutada, THE Sistema_Clasificación SHALL permitir reasignar cualquier ítem sin límite de veces

### Requirement 8: Evaluación y puntuación

**User Story:** Como jugador, quiero saber cuántos ítems clasifiqué correctamente, para medir mi conocimiento geográfico.

#### Acceptance Criteria

1. WHEN el jugador presiona "Verificar respuestas", THE Sistema_Clasificación SHALL comparar cada asignación con el campo "Continent" del país en flags.json y determinar si la Zona_Continente asignada coincide con el continente real
2. WHEN la evaluación se completa, THE Sistema_Clasificación SHALL marcar visualmente cada ítem como correcto (verde) o incorrecto (rojo) dentro de su Zona_Continente
3. WHEN la evaluación se completa, THE Sistema_Clasificación SHALL calcular la puntuación como el porcentaje de ítems correctos sobre el total, redondeado al entero más cercano (0% a 100%)
4. WHEN la evaluación se completa, THE Sistema_Clasificación SHALL mostrar un resumen con: cantidad de ítems correctos, cantidad de ítems incorrectos, puntuación porcentual entera y tiempo empleado en formato mm:ss
5. WHEN un ítem fue clasificado incorrectamente, THE Sistema_Clasificación SHALL indicar el nombre del continente correcto del ítem junto a la marca de incorrecto en la retroalimentación visual
6. WHEN la evaluación se completa, THE Sistema_Clasificación SHALL deshabilitar la interacción de reasignación de ítems, impidiendo que el jugador modifique las clasificaciones después de verificar

### Requirement 9: Temporizador opcional

**User Story:** Como jugador, quiero poder jugar con un límite de tiempo, para añadir presión y emoción al desafío.

#### Acceptance Criteria

1. WHILE la opción "Temporizador" está configurada como "Con tiempo", THE Sistema_Clasificación SHALL mostrar un temporizador regresivo en forma de barra de progreso lineal durante la sesión, inicializado con el valor configurado en "Tiempo límite (s)" (entre 30 y 300 segundos)
2. WHEN el temporizador llega a cero, THE Sistema_Clasificación SHALL ejecutar la evaluación automáticamente con los ítems clasificados hasta ese momento, descartando cualquier interacción de arrastre o selección en curso
3. WHEN el temporizador llega a cero y existen ítems sin clasificar, THE Sistema_Clasificación SHALL marcar los ítems no clasificados como incorrectos en la evaluación
4. IF la opción "Temporizador" está configurada como "Sin tiempo", THEN THE Sistema_Clasificación SHALL no mostrar temporizador y SHALL mantener la sesión activa hasta que el jugador presione "Verificar respuestas" manualmente

### Requirement 10: Integración con arquitectura MVC

**User Story:** Como desarrollador, quiero que el modo siga los patrones existentes, para mantener la consistencia del código.

#### Acceptance Criteria

1. THE Sistema_Clasificación SHALL implementarse como un Controller independiente (OrdenaContinenteController) que exponga los métodos start(pool, modeOptions), stop(), y destroy(), y mantenga una propiedad pública roundHistory con el historial de rondas, siguiendo la misma interfaz que FlagRushController
2. THE Sistema_Clasificación SHALL crear una View dedicada (OrdenaContinenteView) instanciada por el Controller, responsable de renderizar los elementos de la interfaz de clasificación dentro del contenedor DOM recibido en el constructor
3. THE Sistema_Clasificación SHALL integrarse con GameSessionManager registrándose en el switch de createController con un modeId definido, recibiendo en su constructor {container, onRoundEnd, onGameEnd}, e invocando onRoundEnd al finalizar cada ronda y onGameEnd al completar la partida con los datos de sesión (totalScore, roundHistory, totalRounds)
4. THE Sistema_Clasificación SHALL utilizar el campo "Continent" del dataset existente flags.json como fuente de datos para las categorías de clasificación, sin modificar la estructura ni el contenido del archivo
5. WHEN GameSessionManager invoca startSession con el modeId del modo clasificación, THE Sistema_Clasificación SHALL inicializar el controller y comenzar la partida con el pool de países y modeOptions proporcionados, de forma que endSession() pueda finalizar la sesión en cualquier momento invocando stop() en el controller

### Requirement 11: Diseño Editorial Luxe

**User Story:** Como jugador, quiero que el modo tenga la misma estética elegante que el resto de la app, para una experiencia visual coherente.

#### Acceptance Criteria

1. THE Sistema_Clasificación SHALL utilizar la tipografía definida en --font-display para títulos de Zona_Continente y --font-body para etiquetas de ítems en el Panel_Ítems, manteniendo la jerarquía tipográfica del sistema de diseño
2. THE Sistema_Clasificación SHALL utilizar la paleta de colores del sistema de diseño: cream-bg para fondos de contenedores, sage para estados correctos y acciones positivas, terracotta para acentos y estados de arrastre activo, ocean para información contextual, y rust para estados incorrectos
3. THE Sistema_Clasificación SHALL aplicar shadow-soft y radius-md a los ítems individuales en el Panel_Ítems, y shadow-medium y radius-lg a las Zona_Continente
4. THE Sistema_Clasificación SHALL implementar animaciones con timing --ease-gentle (cubic-bezier(0.4, 0, 0.2, 1)) y duraciones entre --duration-quick (150ms) y --duration-moderate (300ms) para las transiciones de asignación de ítems a zonas, remoción del Panel_Ítems y revelación de resultados de evaluación
5. WHILE la preferencia prefers-reduced-motion está activa, THE Sistema_Clasificación SHALL reemplazar todas las animaciones y transiciones por cambios de estado instantáneos (duration: 0ms) sin eliminar la retroalimentación visual de cambio de estado

### Requirement 12: Accesibilidad

**User Story:** Como jugador con necesidades de accesibilidad, quiero poder usar el modo con tecnologías asistivas, para participar sin barreras.

#### Acceptance Criteria

1. THE Sistema_Clasificación SHALL asignar roles ARIA: role="list" para el Panel_Ítems, role="listitem" para cada ítem, role="region" con aria-label que contenga el nombre del continente y la cantidad de ítems asignados para cada Zona_Continente
2. THE Sistema_Clasificación SHALL permitir la navegación mediante teclado: Tab/Shift+Tab para mover el foco entre ítems del Panel_Ítems y las Zona_Continente, Enter o Space para seleccionar un ítem, y flechas direccionales para mover el foco entre las distintas Zona_Continente disponibles
3. WHEN el jugador selecciona un ítem con teclado y presiona Enter o Space sobre una Zona_Continente, THE Sistema_Clasificación SHALL asignar el ítem a esa zona y mover el foco al siguiente ítem pendiente en el Panel_Ítems
4. WHEN un ítem es asignado o devuelto al Panel_Ítems, THE Sistema_Clasificación SHALL anunciar la acción mediante una región aria-live con politeness "polite" indicando el nombre del ítem y la zona de destino
5. WHEN la evaluación se completa, THE Sistema_Clasificación SHALL anunciar el resultado mediante una región aria-live con politeness "assertive" indicando la cantidad de ítems correctos e incorrectos
6. THE Sistema_Clasificación SHALL mantener un ratio de contraste mínimo de 4.5:1 para texto de tamaño normal y 3:1 para texto de tamaño grande según WCAG 2.1 nivel AA sobre todos los fondos utilizados
7. WHEN no quedan ítems pendientes en el Panel_Ítems tras una asignación, THE Sistema_Clasificación SHALL mover el foco al botón "Verificar respuestas"
