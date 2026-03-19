# UI de `OutputBlock` para comandos intercalados y salida neutra

## Resumen
- Rediseñar `OutputBlock` para que deje de asumir un único `code` plano y pueda renderizar una secuencia ordenada de entradas visuales.
- Modelar esa secuencia con subcomponentes hijos, no con strings parseados ni props especiales, para soportar intercalado real:
  - comando atenuado
  - salida normal
  - otro comando atenuado
  - más salida
- Hacer que el prompt visual (`>`) lo agregue automáticamente el componente de comando.
- Mantener compatibilidad razonable con el uso actual de `OutputBlock` basado en `code`, al menos durante una primera etapa de transición.

## Cambios de implementación
- Convertir `OutputBlock` en un contenedor más rico en `src/components/ui/code/txt/OutputBlock.astro`:
  - debe seguir aceptando `title` y `footer` como hoy
  - debe aceptar contenido compuesto mediante `slot` por defecto
  - debe conservar la apariencia general del bloque de salida
- Crear subcomponentes específicos para las piezas internas del bloque, por ejemplo en `src/components/ui/code/txt/`:
  - `OutputCommand.astro`
  - `OutputText.astro` o `OutputLine.astro`
- Comportamiento de los subcomponentes:
  - `OutputCommand` renderiza una línea monoespaciada, atenuada, con prompt automático al inicio
  - `OutputText` renderiza salida normal, sin cambio de color respecto del bloque actual
  - ambos deben respetar whitespace y saltos de línea sin depender de parsing textual frágil
- Estructura objetivo de uso:
  - `<OutputBlock>`
  - `<OutputCommand>command param1 param2</OutputCommand>`
  - `<OutputText>output</OutputText>`
  - `<OutputCommand>command2 foo</OutputCommand>`
  - `</OutputBlock>`
- Mantener una vía de compatibilidad para los usos actuales con `code`:
  - opción recomendada para la primera iteración: si se recibe `code`, `OutputBlock` renderiza internamente un único bloque de salida normal como hoy
  - si hay children en el slot por defecto, se usa el modo nuevo basado en subcomponentes
  - documentar claramente que el modo nuevo es el preferido para casos mixtos
- No usar parsing de prefijos dentro de un string como `> ...`, porque oculta intención editorial y hace más difícil distinguir semánticamente comando de salida.

## APIs e interfaces
- API nueva propuesta:
  - `OutputBlock`
    - `code?: string`
    - `lang?: string`
    - `title?: string`
    - `footer` vía slot existente
    - children opcionales por slot por defecto
  - `OutputCommand`
    - `prompt?: string` opcional, con valor por defecto `">"`
    - contenido por slot por defecto
  - `OutputText`
    - contenido por slot por defecto
- Reglas de precedencia:
  - si `OutputBlock` recibe children, esos children definen el contenido visible del bloque
  - si no recibe children y sí recibe `code`, se mantiene el comportamiento actual
  - evitar permitir simultáneamente `code` y children sin una política clara; recomendación: priorizar children y emitir advertencia en desarrollo, o prohibir la mezcla en la implementación
- No introducir markup arbitrario dentro de una única línea de comando en esta versión; el foco es la secuencia visual, no el rich text inline.

## Plan de pruebas
- Añadir tests de render para `OutputBlock` y los nuevos subcomponentes:
  - `OutputBlock` con `code` solo mantiene el comportamiento actual
  - `OutputBlock` con children renderiza entradas en el orden exacto en que fueron declaradas
  - `OutputCommand` muestra prompt automático y estilo muted/secondary
  - `OutputText` mantiene color y estilo neutrales
  - la combinación `OutputCommand → OutputText → OutputCommand` se renderiza con separación visual correcta y sin colapsar whitespace
- Validar manualmente un caso real en la lección de Nushell:
  - una línea de comando atenuada
  - salida descriptiva debajo
  - otra línea de comando posterior
- Confirmar que los `OutputBlock` existentes del repo no cambian visualmente cuando siguen usando solo `code`.

## Supuestos y decisiones cerradas
- Se descarta el enfoque basado en props tipo `command` porque no escala al intercalado arbitrario.
- Se descarta el parsing de strings con prefijos porque complica mantenimiento y hace la API más implícita.
- El prompt se agrega automáticamente en `OutputCommand`; quien escribe el contenido solo aporta el comando limpio.
- La mejora apunta a claridad pedagógica y editorial: distinguir visualmente “esto se ejecutó” de “esto salió”, sin colorear la salida normal.
