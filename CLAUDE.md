# FlagsQuiz - Guía para Claude Code

## Contexto del Proyecto

Una aplicación de quiz de banderas con diseño editorial refinado (Editorial Luxe) y arquitectura MVC moderna. Build de producción optimizado: < 22 KB gzipped total.

## Stack Técnico

- **Frontend**: HTML5, CSS3 (variables, grid, flexbox)
- **JavaScript**: ES6+ modules, MVC architecture
- **Build**: Vite 5
- **Fonts**: Google Fonts (Fraunces, Newsreader)
- **Data**: JSON estático (250+ países)

## Arquitectura MVC

```
src/
├── models/         # Country.js, GameState.js
├── services/       # CountryService.js, GameService.js
├── views/          # GameView.js (DOM manipulation)
├── controllers/    # GameController.js
└── utils/          # Utilidades compartidas
```

**Patrones clave**:
- Service Layer para lógica de negocio
- Dependency Injection entre clases
- Separación clara de responsabilidades

## Sistema de Diseño Editorial Luxe

### Paleta de Colores
- **Sage**: `#7a9b7f` (primario)
- **Terracotta**: `#c77d5f` (acento)
- **Ocean**: `#6b8fa3` (secundario)
- **Fondo**: Blanco cálido

### Tipografía
- **Display**: Fraunces (con optical sizing)
- **Body**: Newsreader
- **Estilo**: Editorial de revista contemporánea

### Espaciado Compacto
- Sistema de espaciado ~40% reducido vs diseño anterior
- Todo el contenido visible sin scroll
- Sombras delicadas (2-8px blur)

### Componentes Clave
- Game wrapper: 540px max-width
- Flag display: 180px altura (140px mobile)
- Team counters: 68px altura
- Animaciones sutiles con `prefers-reduced-motion`

**Referencia completa**: Ver `DESIGN.md` para el sistema de diseño detallado.

## Convenciones de Código

### JavaScript
- **ES6 Modules**: Usar `import/export`
- **Clases**: PascalCase para nombres
- **Métodos**: camelCase descriptivos
- **Constantes**: UPPER_SNAKE_CASE para valores fijos
- **No usar**: `var`, funciones anónimas innecesarias

### CSS
- **Variables CSS**: Usar para colores, espaciado, tipografía
- **Nomenclatura**: BEM-like cuando sea apropiado
- **Mobile-first**: Media queries progresivas
- **Accesibilidad**: Contraste AAA, soporte `prefers-reduced-motion`

### Performance
- Mantener bundle gzipped < 22 KB
- Lazy loading para imágenes/banderas cuando sea posible
- Tree-shaking habilitado en Vite

## Modos de Juego

1. **Modo Banderas**: Adivinar país por bandera (2-3 equipos)
2. **Modo Capitales**: Identificar capital del país
3. **Letras en Caída**: Revelar letras progresivamente (con/sin pista)

Todos incluyen filtros: continentes, soberanía, cantidad, aleatorio, práctica.

## Comandos

```bash
npm run dev      # Servidor desarrollo (localhost:5173)
npm run build    # Build producción → /dist
npm run preview  # Preview del build
```

## Estructura de Respaldo

`bk/code/script-legacy.js` contiene el código original antes del refactor MVC. **No modificar** - solo referencia histórica.

## Principios de Desarrollo

1. **Elegancia a través de simplicidad**: Cada elemento tiene propósito
2. **No sobre-diseñar**: Resolver el problema actual, no casos hipotéticos
3. **Código autodocumentado**: Nombres descriptivos > comentarios
4. **Performance primero**: Optimizar bundle size en cada cambio
5. **Accesibilidad no negociable**: Contraste, motion, semántica HTML

## Cuando Trabajes en Este Proyecto

- **Diseño**: Consultar `DESIGN.md` antes de cambios visuales
- **Refactor**: Mantener separación MVC, no mezclar responsabilidades
- **CSS**: Usar variables existentes, respetar sistema de espaciado
- **Performance**: Verificar bundle size después de cambios (`npm run build`)
- **Testing**: Probar en navegador antes de reportar como completo
- **Git**: Commits descriptivos, no usar `--no-verify`

## Archivos Clave

- `index.html`: Punto de entrada
- `src/main.js`: Inicialización de la app
- `assets/data/flags.json`: Base de datos de países
- `assets/styles/styles.css`: Todos los estilos (sistema compacto)
- `DESIGN.md`: Sistema de diseño completo
- `CHANGELOG.md`: Historial de cambios

## Contexto de Usuario

Desarrollador que valora diseño distintivo y código limpio. Prefiere soluciones pragmáticas sobre abstracciones prematuras. Este proyecto fue transformado de un dark theme genérico a una estética editorial única inspirada en revistas contemporáneas.
