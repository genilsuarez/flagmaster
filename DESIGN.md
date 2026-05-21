# Flag Quiz — Editorial Luxe Design System

## Visión de Diseño

**Estética**: Editorial Luxe — Elegante & Aérea  
**Inspiración**: Revistas contemporáneas (Kinfolk, Monocle, National Geographic)  
**Filosofía**: Sofisticación a través de la simplicidad, espacio negativo generoso, tipografía refinada

---

## Tipografía

### Fuentes
- **Display**: [Fraunces](https://fonts.google.com/specimen/Fraunces)
  - Serif humanista contemporánea con carácter y calidez
  - Variable font con configuración óptica (`opsz`)
  - Uso: Títulos, encabezados, números destacados
  
- **Body**: [Newsreader](https://fonts.google.com/specimen/Newsreader)
  - Serif refinada y legible
  - Perfecta para texto largo
  - Uso: Párrafos, etiquetas, texto secundario

### Jerarquía
```css
/* Títulos principales */
Landing Hero: 2.5rem - 4.5rem (clamp)
Game Header: 1.5rem
Modal Header: 1.6rem

/* Contenido */
Country Name: 1.3rem (Fraunces)
Capital Name: 1rem (Newsreader, italic)
Body Text: 0.9rem - 1rem
Team Scores: 1.6rem (Fraunces, display)
```

---

## Paleta de Color

### Base (Tonos Cálidos Naturales)
```css
--cream-bg: #faf8f5        /* Background principal */
--warm-white: #ffffff      /* Tarjetas y elementos */
--soft-sand: #f5f0ea       /* Fondos secundarios */
--warm-gray: #e8e3dd       /* Bordes suaves */
--stone: #c9c3bb           /* Bordes y texto terciario */
--charcoal: #2d2a26        /* Texto principal */
--ink: #1a1816             /* Texto de énfasis */
```

### Acentos (Inspiración Geográfica)
```css
--sage: #7a9b7f            /* Verde salvia - Acciones principales */
--deep-sage: #5d7a61       /* Salvia oscura - Estados hover */
--terracotta: #c77d5f      /* Terracota - Acentos cálidos */
--ocean: #6b8fa3           /* Azul océano - Información */
--warm-gold: #d4a574       /* Oro cálido - Detalles */
--rust: #a85a45            /* Óxido - Alertas */
```

### Equipos (Refinados)
```css
--team-coral: #e88573     /* Rojo → Coral elegante */
--team-slate: #8a95a3     /* Azul → Pizarra refinada */
--team-olive: #8fa068     /* Verde → Oliva sofisticado */
```

---

## Espaciado

Sistema de espaciado compacto pero respirable:

```css
--space-xs: 4px      /* Micro separaciones */
--space-sm: 8px      /* Pequeñas separaciones */
--space-md: 12px     /* Separaciones estándar */
--space-lg: 16px     /* Secciones cercanas */
--space-xl: 24px     /* Entre secciones */
--space-2xl: 32px    /* Separaciones mayores */
```

---

## Radios de Borde

Suaves y refinados, nunca excesivamente redondeados:

```css
--radius-sm: 4px     /* Elementos pequeños */
--radius-md: 8px     /* Botones, inputs estándar */
--radius-lg: 12px    /* Tarjetas, banderas */
--radius-xl: 16px    /* Contenedores principales */
```

---

## Sombras

Delicadas y realistas, crean profundidad sin dramatismo:

```css
--shadow-soft: 0 2px 12px rgba(29, 26, 22, 0.06)
--shadow-medium: 0 4px 24px rgba(29, 26, 22, 0.08)
--shadow-lifted: 0 8px 32px rgba(29, 26, 22, 0.1)
```

---

## Animaciones

### Timing Functions
```css
--ease-gentle: cubic-bezier(0.4, 0, 0.2, 1)     /* Transiciones suaves */
--ease-spring: cubic-bezier(0.34, 1.2, 0.64, 1) /* Bounce sutil */
```

### Duraciones
```css
--duration-quick: 150ms      /* Micro-interacciones */
--duration-moderate: 300ms   /* Transiciones estándar */
```

### Principios
- **Delicadeza**: Movimientos sutiles, nunca agresivos
- **Realismo**: Easing natural que imita física real
- **Propósito**: Cada animación guía la atención del usuario

---

## Componentes Clave

### Game Wrapper
- Max-width: **540px** (compacto)
- Background: Blanco cálido con gradiente sutil
- Border: 1px solid con transparencia
- Shadow: Elevada pero delicada

### Flag Display
- Height: **180px** (desktop), **140px** (mobile)
- Background: Gradiente suave cream → sand
- Border: Sutil, 1px
- Hover: Lift ligero (4px translateY)

### Team Counters
- Min-height: **68px** (desktop), **60px** (mobile)
- Background: Gradientes sutiles por equipo
- Border: 1.5px, color del equipo
- Typography: Label uppercase (0.65rem), Score display (1.6rem)

### Landing Page
- Hero Title: 2.5rem - 4.5rem, weight 300, optical sizing
- Subtitle: Max-width 520px, line-height 1.5
- CTA Button: Sage green, hover lift, refined shadow
- Steps Grid: 4 columnas, gap reducido en mobile (oculto)

### Modals
- Max-width: **400px**
- Padding: Compacto pero respirable
- Title: 1.6rem Fraunces
- Close Button: Icon-only, hover state definido

---

## Responsive Strategy

### Breakpoints
- **Mobile**: < 767px
- **Tablet**: 768px - 1023px  
- **Desktop**: > 1024px

### Mobile Optimizations
- Espaciado reducido en ~30%
- Flag height: 140px
- Font sizes reducidos proporcionalmente
- Landing steps: Ocultos
- Aurora background: Más sutil (opacity 0.06)

---

## Accesibilidad

### Contraste
- Texto principal sobre cream: **AAA** (charcoal #2d2a26)
- Botones: Ratio suficiente para **AA** grande
- Estados focus: Outline claro con color sage

### Motion
- `prefers-reduced-motion`: Todas las animaciones deshabilitadas
- Transiciones instantáneas para usuarios sensibles

---

## Comparación: Antes → Después

### Estética General
```diff
- Dark theme (#050a14 background)
- Gradientes neón (magenta #ec4899, púrpura #8b5cf6)
- Poppins (sans-serif genérica)
- Elementos apiñados

+ Light theme (#faf8f5 cream background)
+ Colores naturales (sage, terracotta, ocean)
+ Fraunces + Newsreader (serifs refinadas)
+ Compacto pero elegante, todo visible sin scroll
```

### Componentes Específicos
```diff
Landing Page:
- Título: 3-6rem, weight 800, gradiente neón
+ Título: 2.5-4.5rem, weight 300, color ink sólido

Game Interface:
- Wrapper: 440px, fondo oscuro
+ Wrapper: 540px, fondo blanco cálido
- Flag: 190px altura, bordes brillantes
+ Flag: 180px altura (140px mobile), shadow delicada

Team Counters:
- Colores neón saturados
+ Gradientes sutiles: Coral, Slate, Olive

Modals:
- Background: #111827 (dark)
+ Background: #ffffff (warm white)
- Título: Gradiente magenta
+ Título: 1.6rem Fraunces, color ink
```

## Características Visuales Destacadas

### 1. Tipografía Variable
- Fraunces usa `font-variation-settings: 'opsz'`
- Optimización automática para cada tamaño
- Display a 144, body a 80

### 2. Gradientes Sutiles
- Team counters: 135deg, colores desaturados
- Backgrounds: Linear gradients suaves (< 5% diferencia)
- Nunca colores planos, siempre profundidad sutil

### 3. Micro-interacciones
- Hover: `translateY(-2px a -4px)`
- Active: `scale(0.98)`
- Focus: Box-shadow con color sage
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`

### 4. Sistema de Color Semántico
- **Sage** = Acciones positivas
- **Terracotta** = Destacados importantes
- **Ocean** = Información secundaria
- **Rust** = Alertas/urgencia

## Principios de Diseño

### ✅ Hacer
- Espacio negativo generoso
- Tipografía con jerarquía clara
- Colores inspirados en naturaleza/geografía
- Sombras delicadas y realistas (2-8px blur)
- Animaciones sutiles y con propósito
- Serifs contemporáneas > Sans-serifs genéricas
- Light theme > Dark theme (para este contexto)

### ❌ Evitar
- Sans-serifs genéricos (Inter, Roboto)
- Gradientes púrpura/azul cliché
- Animaciones agresivas o llamativas
- Bordes excesivamente redondeados
- Temas oscuros (rompe la elegancia aérea)
- Efectos glow o neón
- Elementos apiñados sin espacio para respirar

---

## Archivos del Sistema

```
/assets/styles/styles.css     → Sistema de diseño completo
/index.html                   → Estructura HTML semántica
/dist/                        → Build de producción optimizado
```

---

## Build & Deploy

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Preview build
npm run preview
```

**Output**:
- `dist/index.html` - 17.51 KB (gzip: 3.67 KB)
- `dist/assets/index-*.css` - 35.08 KB (gzip: 6.22 KB)  
- `dist/assets/index-*.js` - 46.86 KB (gzip: 11.79 KB)

---

## Resultado Final

Una aplicación de quiz de banderas que se siente como hojear un atlas de lujo. Sofisticada, refinada, y completamente distintiva.

**Checklist de Calidad**:
- ✅ Estética Editorial Luxe
- ✅ Compacto (todo en viewport)
- ✅ Elegante (tipografía refinada)
- ✅ Memorable (paleta única)
- ✅ Funcional (UX intuitiva)
- ✅ Accesible (AAA contrast)
- ✅ Performante (< 22 KB gzipped)

## Créditos

**Diseño**: Editorial Luxe System  
**Tipografía**: Fraunces (Undercase Type), Newsreader (Production Type)  
**Fecha**: Mayo 2026  
**Versión**: 2.0.0

---

*"Elegancia a través de la simplicidad. Cada elemento tiene un propósito. El espacio negativo es tan importante como el contenido."*
