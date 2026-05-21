# Changelog — Flag Quiz Editorial Luxe

## [2.0.0] - 2026-05-16

### 🎨 Rediseño Completo - Editorial Luxe

#### Added
- **Nuevo sistema de diseño Editorial Luxe**
  - Tipografía: Fraunces (display) + Newsreader (body)
  - Paleta de colores naturales cálidos
  - Variables CSS organizadas y semánticas
  - Sistema de espaciado compacto pero elegante
  
- **Documentación de diseño**
  - `DESIGN.md` - Sistema de diseño completo
  - `REDESIGN_SUMMARY.md` - Resumen de cambios
  - README actualizado con nuevas características

#### Changed
- **Estética general**
  - Dark theme → Light theme con tonos cálidos
  - Poppins → Fraunces + Newsreader
  - Gradientes neón → Colores naturales refinados
  - Sombras brillantes → Sombras delicadas

- **Espaciado (reducción ~40%)**
  - `--space-lg`: 24px → 16px
  - `--space-xl`: 40px → 24px
  - `--space-2xl`: 64px → 32px
  - Padding general reducido proporcionalmente

- **Componentes principales**
  - **Game wrapper**: 440px → 540px max-width
  - **Header**: Padding optimizado, título 2rem → 1.5rem
  - **Flag**: 190px → 180px altura (desktop)
  - **Flag (mobile)**: → 140px altura
  - **Team counters**: 84px → 68px min-height
  - **Team scores**: 2rem → 1.6rem
  
- **Landing page**
  - Hero title: 3-6rem → 2.5-4.5rem (compacto)
  - Subtitle: Max-width 600px → 520px
  - CTA button: Padding reducido, sage green color
  - Steps: Padding y gaps reducidos ~30%
  - Aurora: Más sutil (opacity reducida)

- **Modals y overlays**
  - Modal content: Max-width 440px → 400px
  - Modal header: 2rem → 1.6rem
  - Modal padding: 36px/30px → 24px/16px
  - Winner announcement: Padding reducido
  - Score items: Compactados, font-size 0.9rem

- **Progress container**
  - Padding: 16px → 12px
  - Progress bar height: 6px → 4px
  - Text size: 0.85rem → 0.8rem

#### Improved
- **Performance**
  - CSS bundle optimizado: 35.08 KB (gzip: 6.22 KB)
  - JS bundle optimizado: 46.86 KB (gzip: 11.79 KB)
  - Total gzipped < 22 KB
  - Build time: 308ms con Vite

- **Responsive design**
  - Breakpoints bien definidos (767px, 1023px)
  - Mobile-first approach
  - Elementos ocultos estratégicamente en mobile
  - Espaciado ajustado por viewport

- **Accesibilidad**
  - Contraste AAA en texto principal
  - Focus states con sage outline
  - `prefers-reduced-motion` respetado
  - Semantic HTML mantenido

- **UX refinements**
  - Hover states sutiles (translateY -2px a -4px)
  - Transitions con easing natural
  - Active states con scale(0.98)
  - Sombras que elevan elementos sin dramatismo

#### Color Palette Changes

**Antes (Dark Theme)**:
```css
--dark-bg: #0f172a
--primary: #ec4899 (magenta neón)
--secondary: #8b5cf6 (púrpura)
--team-red: #ef4444
--team-blue: #3b82f6
--team-green: #10b981
```

**Después (Editorial Luxe)**:
```css
--cream-bg: #faf8f5
--sage: #7a9b7f (acción principal)
--terracotta: #c77d5f (acentos)
--ocean: #6b8fa3 (info)
--team-coral: #e88573
--team-slate: #8a95a3
--team-olive: #8fa068
```

#### Typography Changes

**Antes**:
- Font: Poppins (sans-serif genérica)
- Weights: 400, 600, 700
- Tamaños fijos sin optical sizing

**Después**:
- Display: Fraunces (serif variable)
  - Variable settings: `'opsz'` 80-144
  - Weights: 300, 400, 600, 700
  
- Body: Newsreader (serif refinada)
  - Weights: 300, 400, 500, 600
  - Italic variants

#### Component Specifics

**Team Counters**:
```diff
- Background: Colores sólidos brillantes
- Border: 1.5px solid con glow
- Padding: 16px 10px
- Min-height: 84px

+ Background: Gradientes sutiles (cream → sand)
+ Border: 1.5px solid transparente
+ Padding: 12px 8px
+ Min-height: 68px (60px mobile)
```

**Modals**:
```diff
- Background: #111827 (dark)
- Title: Gradiente magenta
- Border: Púrpura con glow

+ Background: #ffffff (warm white)
+ Title: Color ink sólido (Fraunces)
+ Border: Stone sutil
```

**Buttons**:
```diff
- Background: Gradientes neón
- Hover: Glow effect
- Padding: Generoso

+ Background: Sage green sólido
+ Hover: translateY(-2px) + shadow lift
+ Padding: Compacto
```

#### Build Output

```
dist/
├── index.html          17.51 KB → 3.67 KB gzip
├── assets/
│   ├── index-*.js      46.86 KB → 11.79 KB gzip
│   ├── index-*.css     35.08 KB → 6.22 KB gzip
│   └── data/
│       └── flags.json

Total: ~22 KB gzipped 🎉
Build time: 308ms ⚡
```

---

## [1.0.0] - 2026-04-XX

### Initial Release
- MVC architecture implementation
- Multiple game modes (Flags, Capitals, Word Drop)
- Team scoring system
- Responsive design (dark theme)
- 250+ flags database
- Filter system (continent, sovereignty)
- Statistics tracking
- Achievements system
- Keyboard shortcuts
- Landing page with hero section

---

*Para más detalles sobre el sistema de diseño, consulta `DESIGN.md`*  
*Para comparación antes/después, consulta `REDESIGN_SUMMARY.md`*
