# Requirements Document

## Introduction

El "Modo Práctica" de FlagQuiz es un modificador exclusivo de los modos de equipo (Bandera Flash y Búsqueda de Capitales) que automatiza el ciclo de revelación y avance para estudio individual. Una auditoría UX del flujo completo reveló problemas significativos de descubrimiento, coherencia visual, y utilidad educativa.

Actualmente el modo práctica: (1) está oculto dentro de modos categorizados como "equipo", haciéndolo invisible para usuarios que buscan estudiar; (2) muestra UI de equipos (3 contadores clickeables) que no tienen sentido en contexto individual; (3) no ofrece feedback de aprendizaje ni auto-evaluación; (4) tiene tiempos demasiado cortos para estudio real; y (5) no indica visualmente que el modo está activo durante el gameplay.

Este spec define mejoras aplicables sin base de datos ni autenticación, usando exclusivamente localStorage y la arquitectura existente (JavaScript vanilla, MVC, CSS custom properties).

---

## Glossary

- **Practice_Mode**: Modificador que convierte un modo de equipo en una experiencia de estudio individual automatizada.
- **Practice_Badge**: Indicador visual persistente durante el gameplay que confirma que el modo práctica está activo.
- **Study_Timer**: Tiempo configurable que el usuario tiene para observar la bandera antes de que se revele la respuesta.
- **Self_Assessment**: Mecanismo de auto-evaluación donde el usuario indica si conocía la respuesta antes de la revelación.
- **Practice_Summary**: Pantalla de resultados adaptada al contexto de estudio con métricas relevantes de aprendizaje.
- **Bottom_Sheet**: Panel modal de configuración de modo de juego.
- **Team_Counter**: Tarjeta de puntuación de equipo (visible en modos de equipo normales, oculta en práctica).
- **Game_Header**: Barra superior del juego con título y controles.
- **Landing_Mode_Card**: Tarjeta de modo de juego en la pantalla principal.

---

## Requirements

### Requirement 1: Visibilidad del Modo Práctica desde la Pantalla Principal

**User Story:** Como usuario que quiere estudiar banderas o capitales, quiero poder encontrar el modo práctica fácilmente desde la pantalla principal, sin tener que saber que está oculto dentro de los modos de equipo.

#### Acceptance Criteria

1. THE Landing_Mode_Card para "Bandera Flash" y "Búsqueda de Capitales" SHALL mostrar un indicador textual sutil (badge o subtítulo) que comunique que el modo incluye una opción de práctica individual, usando el texto "Incluye modo práctica" con `font-size: 0.6rem` y `color: var(--stone)`.
2. THE Bottom_Sheet SHALL mostrar una descripción breve debajo del toggle "Modo práctica" que explique su comportamiento: "Estudio individual: la respuesta se revela automáticamente tras el tiempo de estudio. Sin equipos ni competencia." con `font-size: var(--fs-body-sm)` y `color: var(--stone)`.
3. WHEN el usuario activa el toggle "Modo práctica" en el Bottom_Sheet, THE Bottom_Sheet SHALL ocultar visualmente la sección de equipos (si existe) y mostrar únicamente las opciones relevantes para práctica (tiempo de estudio, orden aleatorio).

---

### Requirement 2: Ocultar UI de Equipos en Modo Práctica

**User Story:** Como usuario en modo práctica, quiero que la interfaz no muestre elementos de equipos que no tienen sentido cuando estoy estudiando solo, para no confundirme con contadores y botones irrelevantes.

#### Acceptance Criteria

1. WHEN Practice_Mode está activo y el juego inicia, THE Team_Counter (los 3 contadores de equipo: rojo, azul, verde) SHALL tener `display: none` y no ser visibles ni interactuables.
2. WHEN Practice_Mode está activo, THE Game_Header SHALL mostrar en lugar de los contadores de equipo un indicador de progreso simple con el formato "X / Y" donde X es el número de banderas vistas y Y es el total, usando `font-size: var(--fs-body)` y `color: var(--warm-white)`.
3. WHEN Practice_Mode está activo, THE keyboard shortcuts para scoring de equipos (teclas R, D, G) SHALL estar deshabilitados y no producir ningún efecto.
4. WHEN Practice_Mode está activo, THE botón "Saltar" SHALL mantener su funcionalidad pero con semántica adaptada: avanza a la siguiente bandera sin revelar la respuesta (skip sin penalización).

---

### Requirement 3: Indicador Visual de Modo Práctica Activo

**User Story:** Como usuario, quiero ver claramente que estoy en modo práctica durante toda la partida, para confirmar que el juego se comportará como espero (sin competencia, auto-revelación).

#### Acceptance Criteria

1. WHEN Practice_Mode está activo y el juego está en curso, THE Practice_Badge SHALL ser visible en el Game_Header como un elemento con el texto "📝 Práctica" y las clases CSS `practice-badge` con `background: var(--soft-sand)`, `color: var(--deep-sage)`, `border-radius: var(--radius-pill)`, `padding: 2px 8px`, `font-size: var(--btn-fs-sm)`, `font-weight: 600`.
2. THE Practice_Badge SHALL permanecer visible durante toda la sesión de práctica sin desaparecer ni cambiar de posición.
3. THE Practice_Badge SHALL tener el atributo `aria-label="Modo práctica activo"` para accesibilidad.

---

### Requirement 4: Tiempo de Estudio Configurable y Adecuado

**User Story:** Como usuario que quiere memorizar banderas, quiero poder configurar cuánto tiempo tengo para observar la bandera antes de que se revele la respuesta, con un rango suficiente para estudio real.

#### Acceptance Criteria

1. THE Bottom_Sheet SHALL reemplazar el selector "Delay auto-avance (s)" por un campo llamado "Tiempo de estudio (s)" con `type: 'number'`, `min: 2`, `max: 15`, `default: 5`.
2. THE Study_Timer SHALL controlar el countdown antes de revelar la respuesta: cuando el countdown llega a 0, se revela el nombre del país/capital automáticamente.
3. AFTER la respuesta es revelada, THE sistema SHALL esperar 2 segundos fijos antes de avanzar a la siguiente bandera, dando tiempo al usuario para asociar visualmente la bandera con el nombre.
4. THE Bottom_Sheet SHALL mostrar el label "Tiempo de estudio (s)" con una descripción auxiliar: "Segundos para pensar antes de ver la respuesta" con `font-size: var(--fs-body-sm)` y `color: var(--stone)`.
5. IF el usuario hace clic en la bandera o presiona Espacio antes de que el countdown termine, THEN THE respuesta SHALL revelarse inmediatamente (revelación anticipada manual).

---

### Requirement 5: Auto-evaluación Simple (Sabía / No Sabía)

**User Story:** Como usuario estudiando, quiero poder indicar si conocía la respuesta antes de que se revelara, para tener un registro básico de mi progreso sin necesidad de una base de datos.

#### Acceptance Criteria

1. WHEN Practice_Mode está activo y la respuesta ha sido revelada (ya sea por countdown o por revelación manual), THE sistema SHALL mostrar dos botones de auto-evaluación debajo de la respuesta: "✓ La sabía" (clase `btn btn--primary practice-btn--knew`) y "✗ No la sabía" (clase `btn btn--secondary practice-btn--didnt-know`).
2. WHEN el usuario presiona "✓ La sabía" o "✗ No la sabía", THE sistema SHALL registrar la respuesta en el `roundHistory` de la sesión con un campo `selfAssessment: 'knew' | 'didntKnow'` y avanzar a la siguiente bandera.
3. IF el usuario no presiona ningún botón de auto-evaluación dentro de los 2 segundos de post-revelación (el delay fijo del Req. 4.3), THEN THE sistema SHALL registrar `selfAssessment: 'timeout'` y avanzar automáticamente.
4. THE botones de auto-evaluación SHALL tener `min-height: 44px` para cumplir el mínimo táctil WCAG 2.5.5.
5. THE keyboard shortcut `1` SHALL activar "La sabía" y `2` SHALL activar "No la sabía" cuando los botones son visibles.

---

### Requirement 6: Resumen de Práctica Enriquecido

**User Story:** Como usuario que terminó una sesión de práctica, quiero ver un resumen útil que me diga cuántas banderas dominé vs cuáles necesito repasar, para orientar mi próximo estudio.

#### Acceptance Criteria

1. WHEN Practice_Mode está activo y la sesión termina, THE Practice_Summary (Game_End_Modal) SHALL mostrar las siguientes métricas en lugar del resumen estándar de equipos:
   - "Banderas vistas: X" (total)
   - "✓ Las sabía: Y" (count de `selfAssessment === 'knew'`)
   - "✗ No las sabía: Z" (count de `selfAssessment === 'didntKnow'`)
   - "⏱️ Sin responder: W" (count de `selfAssessment === 'timeout'`)
   - "Tiempo total: MM:SS"
2. THE Practice_Summary SHALL mostrar un porcentaje de dominio calculado como `(knew / total) * 100` con el formato "Dominio: XX%" y un indicador visual de color: verde (`var(--deep-sage)`) si ≥ 70%, amarillo (`var(--terracotta)`) si ≥ 40%, rojo (`var(--rust)`) si < 40%.
3. THE Practice_Summary SHALL incluir un botón "Repetir las que no sabía" (clase `btn btn--secondary`) que al presionarse inicie una nueva sesión de práctica usando únicamente las banderas marcadas como `didntKnow` o `timeout` de la sesión anterior.
4. IF todas las banderas fueron marcadas como "La sabía", THEN THE botón "Repetir las que no sabía" SHALL estar deshabilitado con `disabled` y el texto "¡Perfecto! Las sabías todas 🎉".
5. THE Practice_Summary SHALL mantener los botones existentes "Jugar de nuevo" (repite con misma config completa) e "Inicio" (vuelve a home).

---

### Requirement 7: Persistencia Local de Progreso de Práctica

**User Story:** Como usuario que practica regularmente, quiero que mi progreso se guarde localmente entre sesiones, para ver cuántas banderas domino a lo largo del tiempo sin necesitar una cuenta.

#### Acceptance Criteria

1. THE sistema SHALL guardar en `localStorage` bajo la clave `flagquiz_practice_progress` un objeto JSON con la estructura: `{ [countryCode]: { knew: number, didntKnow: number, lastSeen: timestamp } }` donde `countryCode` es el código ISO del país.
2. AFTER cada sesión de práctica, THE sistema SHALL actualizar el registro de cada bandera vista incrementando el contador `knew` o `didntKnow` según la auto-evaluación del usuario, y actualizando `lastSeen` con `Date.now()`.
3. THE Practice_Summary SHALL mostrar debajo de las métricas de sesión una línea de progreso global: "Progreso total: X/Y banderas dominadas" donde Y es el total de banderas en el pool actual y X es el número de banderas con `knew > didntKnow` en el registro de progreso.
4. IF `localStorage` no está disponible o lanza una excepción, THEN THE sistema SHALL funcionar normalmente sin persistencia, omitiendo silenciosamente la escritura y mostrando "Progreso no disponible" en lugar de la línea de progreso global.
5. THE Bottom_Sheet para modos de equipo con práctica activa SHALL mostrar un indicador de progreso junto al botón "Jugar": "X banderas dominadas de Y" basado en los datos de `localStorage`, usando `font-size: var(--fs-body-sm)` y `color: var(--stone)`.

