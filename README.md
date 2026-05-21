# 🌍 Flag Quiz — Editorial Luxe Edition

Una aplicación de quiz de banderas con diseño editorial refinado y arquitectura MVC moderna.

## ✨ Características

- 🎨 **Diseño Editorial Luxe**: Estética inspirada en revistas contemporáneas
- 🏴 **250+ Banderas**: Base de datos completa de países y territorios
- 🎮 **Múltiples Modos**: Banderas, Capitales, Letras en Caída
- 📱 **Responsive**: Diseño compacto que funciona en todos los dispositivos
- ⚡ **Optimizado**: Build de producción con Vite, gzip < 12KB total
- ♿ **Accesible**: Contraste AAA, soporte para motion reducido

## 🎨 Diseño Editorial Luxe

### Transformación Visual
**Antes → Después**:
- ❌ Dark theme con gradientes neón → ✅ Light theme con paleta natural cálida
- ❌ Poppins genérica → ✅ Fraunces + Newsreader (serifs refinadas)
- ❌ Elementos apiñados → ✅ Compacto pero elegante, todo visible sin scroll

### Estética
- **Tipografía**: Fraunces (display) + Newsreader (body) con optical sizing
- **Paleta**: Sage (#7a9b7f), Terracotta (#c77d5f), Ocean (#6b8fa3)
- **Espaciado**: Sistema compacto (~40% reducción) manteniendo elegancia
- **Sombras**: Delicadas (2-8px blur), sin efectos neón
- **Animaciones**: Sutiles con easing natural, respetan `prefers-reduced-motion`

### Componentes Clave
- **Game wrapper**: 540px max-width, fondo blanco cálido
- **Flag display**: 180px altura (140px mobile), shadow refinada
- **Team counters**: 68px altura con gradientes sutiles
- **Landing page**: Hero 2.5-4.5rem, CTA sage green

Ver documentación completa del sistema en [`DESIGN.md`](./DESIGN.md)

## 🏗️ Arquitectura Refactorizada

### Estructura del Proyecto

```
flags/
├── src/
│   ├── models/
│   │   ├── Country.js          # Modelo de datos de país
│   │   └── GameState.js        # Estado del juego
│   ├── services/
│   │   ├── CountryService.js   # Servicio de datos de países
│   │   └── GameService.js      # Lógica del juego
│   ├── views/
│   │   └── GameView.js         # Manipulación del DOM
│   ├── controllers/
│   │   └── GameController.js   # Controlador principal
│   ├── utils/                  # Utilidades
│   └── main.js                 # Punto de entrada
├── assets/
│   ├── data/
│   │   └── flags.json          # Datos de países
│   └── styles/
│       └── styles.css          # Estilos CSS
├── bk/
│   ├── code/
│   │   └── script-legacy.js    # Código original (respaldo)
│   └── refactor/               # Documentación de refactoring
├── index.html                  # Página principal
└── README.md                   # Documentación
```

### Patrones Implementados

- **MVC (Model-View-Controller)**: Separación clara de responsabilidades
- **Service Layer**: Servicios para lógica de negocio
- **ES6 Modules**: Modularización del código
- **Dependency Injection**: Inyección de dependencias entre clases

### Mejoras Implementadas

1. **Nombres Descriptivos**: Variables y métodos con nombres claros
2. **Separación de Responsabilidades**: Cada clase tiene una función específica
3. **Encapsulación**: Datos y métodos organizados en clases
4. **Mantenibilidad**: Código más fácil de mantener y extender
5. **Testabilidad**: Estructura que facilita las pruebas unitarias

## 🚀 Inicio Rápido

### Desarrollo
```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev
# Abre http://localhost:5173

# Build de producción
npm run build

# Preview del build
npm run preview
```

### Producción
Los archivos compilados están en `/dist`:
```bash
cd dist
python3 -m http.server 8080
# Abre http://localhost:8080
```

## 📦 Build Output

```
dist/
├── index.html (17.51 KB → 3.67 KB gzip)
└── assets/
    ├── index-*.js (46.86 KB → 11.79 KB gzip)
    ├── index-*.css (35.08 KB → 6.22 KB gzip)
    └── data/flags.json
```

**Total gzipped**: < 22 KB 🎉

## 🎮 Modos de Juego

### 1. Modo Banderas
- Adivina el país viendo su bandera
- 2-3 equipos compiten simultáneamente
- Sistema de puntos: Correcto (rojo/verde), Empate (azul)

### 2. Modo Capitales  
- Identifica la capital del país mostrado
- Misma dinámica de equipos

### 3. Letras en Caída (Word Drop)
- Las letras se revelan una por una
- Modo fácil: Con bandera de pista
- Modo difícil: Sin pista visual
- Sistema de vidas y puntuación

## 🎨 Personalización

### Filtros Disponibles
- **Continentes**: África, América, Asia, Europa, Oceanía
- **Soberanía**: Países soberanos vs territorios
- **Cantidad**: Limitar número de países
- **Modo aleatorio**: Orden shuffle vs secuencial
- **Modo práctica**: Sin límite de tiempo

## 🏆 Objetivos de Diseño Alcanzados

✅ **Compacto pero Elegante**: Todo el contenido visible sin scroll, espaciado optimizado  
✅ **Distintivo**: Estética única que evita clichés, paleta geográfica inspirada  
✅ **Refinado**: Tipografía de revista, sombras delicadas, animaciones sutiles  
✅ **Accesible**: Contraste AAA, responsive, soporte motion reducido  

## 💡 Principio de Diseño

> "Elegancia a través de la simplicidad. Cada elemento tiene un propósito. El espacio negativo es tan importante como el contenido."

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3 (variables + grid + flexbox)
- **JavaScript**: ES6+ modules, MVC architecture
- **Build**: Vite 5 (optimización, tree-shaking, minificación)
- **Fonts**: Google Fonts (Fraunces, Newsreader) con `display=swap`
- **Performance**: < 22 KB gzipped total

## 📄 Documentación

- [`DESIGN.md`](./DESIGN.md) - Sistema de diseño completo
- [`CHANGELOG.md`](./CHANGELOG.md) - Historial de cambios

---

*Diseñado con atención meticulosa al detalle — Mayo 2026*