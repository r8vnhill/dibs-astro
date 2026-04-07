# Revisión Contextual de `api-design/fundamentals`

## Resumen

La lección en [index.astro](/e:/teaching/DIBS/projects/astro-website/src/pages/notes/software-libraries/api-design/fundamentals/index.astro) ya está bien encaminada como apertura conceptual a principios de diseño. En relación con la lección anterior, [what-is/index.astro](/e:/teaching/DIBS/projects/astro-website/src/pages/notes/software-libraries/what-is/index.astro), el foco es coherente: pasa de “la biblioteca como API/contrato” a “qué principios permiten juzgar ese contrato”.

El problema principal no es de contenido faltante, sino de **articulación pedagógica**: la lección promete una vista panorámica, pero por momentos profundiza de forma desigual; además, en la secuencia real de [unit-1.ts](/e:/teaching/DIBS/projects/astro-website/src/data/course-structure/unit-1.ts) queda como cierre del bloque sin preparar de forma suficientemente concreta el paso siguiente del curso.

## Findings

1. **La pregunta de entrada todavía puede afinarse mejor con respecto a la lección anterior.**
   `what-is` cierra instalando la biblioteca como API, contrato y punto de integración. `fundamentals` retoma bien esa idea, pero no formula con suficiente nitidez la nueva pregunta curricular: “si una biblioteca es una API, ¿con qué criterios iniciales discutimos si está bien diseñada?”. Ese puente existe implícitamente, no explícitamente.

2. **La lección promete panorama, pero la profundidad está repartida de forma desigual.**
   El abstract ya aclara que no busca agotar los principios, pero el desarrollo no siempre respeta esa promesa. “Perspectiva de quien consume” recibe bastante más densidad que los demás principios, especialmente con la lista de seis principios, mientras encapsulación y minimalidad quedan más breves. Eso puede hacer que la lección se lea menos como mapa inicial y más como introducción panorámica con un bloque sobredesarrollado.

3. **Los ejemplos son útiles, pero falta una lógica editorial más visible entre ellos.**
   Direcciones, cuenta bancaria, carrito de compras y transferencias funcionan por separado, pero la lección no explicita por qué va cambiando de dominio. Eso aumenta carga cognitiva y debilita el hilo conductor. No hace falta unificar todo en un solo caso, pero sí conviene marcar mejor que cada ejemplo ilustra un principio distinto.

4. **La conexión con el vocabulario de la lección anterior queda incompleta.**
   `what-is` enfatiza claridad, coherencia, estabilidad y extensibilidad como criterios para pensar bibliotecas. `fundamentals` introduce dominio, encapsulación, minimalidad, usabilidad y perspectiva de consumo, pero no los presenta como una profundización o descomposición de esos criterios ya instalados. Eso puede hacer que el estudiantado perciba dos listas distintas en lugar de una progresión.

5. **El cierre funciona como cierre conceptual local, pero no prepara con suficiente precisión la progresión real.**
   En la secuencia actual no hay una lección siguiente dentro del grupo `api-design`, así que esta nota opera de facto como cierre de tramo. El cierre actual dice que volverán a estos principios más adelante, lo cual está bien, pero todavía no instala una pregunta más concreta sobre dónde reaparecerán: modelado, documentación, evolución, scripting como laboratorio, etc.

## Proposed Improvements

1. **Reescribir la apertura para formular explícitamente la nueva pregunta de la unidad.**
   Mantener el abstract breve, pero hacer visible el puente: después de entender que una biblioteca se juzga como API/contrato, esta lección propone un primer vocabulario para discutir su calidad.

2. **Reequilibrar la profundidad entre principios.**
   Reducir un poco el bloque de “perspectiva de quien consume” o compactar su lista de seis principios en 3-4 criterios más sintéticos, para que el tono de toda la lección siga siendo introductorio y no parezca que solo ese principio se desarrolla en serio.

3. **Agregar una frase de orientación al inicio de cada principio o una transición breve entre bloques.**
   Algo del tipo: “si el problema es representar bien el mundo del dominio…”, “si el problema es proteger reglas…”, “si el problema es no sobrecargar la superficie…”. Eso ordena mejor la lectura sin reescribir el contenido.

4. **Explicitar la relación con la lección anterior mediante una mini síntesis o callout corto.**
   Incluir una línea o bloque breve que diga que estos cinco principios ayudan a concretar criterios ya introducidos antes, como claridad, coherencia y calidad del contrato público.

5. **Fortalecer el cierre como bisagra curricular.**
   Si esta lección queda como cierre de U1, el cierre debería anticipar con más precisión que los principios reaparecerán cuando el curso entre en casos concretos de APIs, tooling o evolución de bibliotecas, no solo “más adelante” en abstracto.

6. **Opcional: usar un ejemplo recurrente o una etiqueta editorial para los cambios de dominio.**
   Si no se quiere unificar todo en un solo caso, basta con rotular mejor la función de cada ejemplo: uno para modelado, otro para invariantes, otro para ergonomía, otro para errores y consumo.

## Assumptions/Open Questions

- Asumo que la secuencia vigente de la unidad es la de [unit-1.ts](/e:/teaching/DIBS/projects/astro-website/src/data/course-structure/unit-1.ts), donde `fundamentals` va después de `what-is` y no tiene una siguiente lección inmediata dentro de `api-design`.
- Asumo también que esta lección debe seguir siendo **introductoria y conceptual**, no una nota extensa sobre patrones o compatibilidad.

## Suggested Reframing

Presentar la lección no como “los principios completos del diseño de APIs”, sino como **un primer vocabulario para discutir calidad de diseño**. Ese reframing ya está insinuado, pero conviene volverlo la idea organizadora explícita de toda la nota: no enseñar todavía a resolver todos los problemas de diseño, sino dar criterios para nombrarlos y reconocerlos cuando reaparezcan en el resto del curso.
