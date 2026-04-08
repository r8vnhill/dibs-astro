# Lección 2 `evolution`: evolución compatible de una API pública

## Resumen

Escribir la lección `src/pages/notes/software-libraries/api-design/evolution/index.astro` como continuación directa de `fundamentals`, apoyada principalmente en `docs/design-relevant-work.md` y enfocada en una idea central: una API publicada ya no se rediseña libremente; se evoluciona cuidando el contrato observable para no romper a quienes la consumen.

La entrega debe incluir la lección completa y su integración en la serie `api-design`: ruta, orden de navegación y trazabilidad bibliográfica. El cierre será solo con conclusiones, sin ejercicio en esta versión.

## Cambios de implementación

- Crear la nueva lección `evolution` con el mismo patrón editorial de `fundamentals`:
  - `NotesLayout` con abstract de 2 párrafos.
  - 6 secciones conceptuales.
  - `ConclusionsLayout`.
  - `ReferencesFromCatalog`.
- Mantener el foco conceptual y reducir documentación a su rol mínimo dentro de esta lección:
  - comunicar cambios, deprecaciones y migraciones;
  - no convertir la lección en una guía de documentación.
- Usar esta secuencia de secciones:
  1. **Publicación y ciclo de vida de una API**
     - prerelease vs API ya publicada;
     - maintenance, completion y deprecation;
     - regla central: antes de publicar puedes rediseñar; después, debes evolucionar con compatibilidad.
  2. **Compatibilidad como contrato observable**
     - definir compatibilidad como ausencia de ruptura para quien ya usa la API;
     - distinguir contrato explícito y comportamiento observable;
     - introducir la idea de que cambios “internos” también pueden romper si cambian expectativas visibles.
  3. **Estrategias para agregar sin romper**
     - agregar nuevas funciones, tipos o capacidades suele ser más seguro que editar firmas existentes;
     - preferir extensión por adición, overloads o nuevas rutas de uso antes que reemplazo destructivo;
     - enfatizar que “agregar” también requiere revisar impacto en consistencia y uso.
  4. **Deprecación, reemplazo y retiro**
     - deprecación como aviso y no como eliminación inmediata;
     - toda deprecación debe apuntar a reemplazo o estrategia de migración;
     - retiro solo después de un ciclo de transición explícito.
  5. **Versionado como comunicación de cambio**
     - presentar `major.minor.patch` como convención comunicativa;
     - conectar versión con expectativa de cambio, no solo con numeración;
     - incluir idea de que no todo cambio merece nueva “era” de API, pero los cambios incompatibles sí requieren señal clara.
  6. **Tests de regresión como red de seguridad**
     - tests como protección del contrato público;
     - cubrir regresiones de comportamiento, no solo compilación o firmas;
     - mostrar que tests y documentación de cambios acompañan la evolución.
- Mantener ejemplos pequeños y orientados a bibliotecas, no a HTTP ni infraestructura.
- Reusar el tono y recursos de `fundamentals`:
  - lenguaje inclusivo;
  - secciones con `Definition`, `Important`, `Info`, `Tip`, `Warning` o `More` solo cuando aporten claridad;
  - ejemplos breves con firmas tipo Kotlin/Python si ayudan a mostrar cambio compatible vs rompiente.
- Integrar la lección en la navegación:
  - agregar `evolution` al grupo `api-design` en `src/data/course-structure/unit-1.ts` después de `fundamentals`;
  - usar la ruta ya definida en `src/data/course-structure/paths.ts`;
  - conservar trailing slash en el enlace final.
- Completar la trazabilidad bibliográfica:
  - agregar usos para la nueva lección en `src/data/bibliography/sources/05-usages.ttl`;
  - referenciar principalmente `ref:reddy-api-design-for-cpp-2024` y `ref:kotlin-evolution-principles`;
  - no convertir `Write the Docs` en referencia principal de esta lección salvo que quede como apoyo menor al tema de comunicación del cambio.

## APIs, interfaces y contenido

- Nueva URL pública:
  - `/notes/software-libraries/api-design/evolution/`
- Cambio de navegación del grupo `api-design`:
  - `fundamentals -> evolution`
- Título sugerido de la lección:
  - `Evolucionar una API sin romper compatibilidad`
- Descripción SEO sugerida:
  - centrada en ciclo de vida, compatibilidad, deprecación, versionado y tests de regresión.
- Fuentes base por bloque:
  - ciclo de vida, compatibilidad, adición, deprecación y retiro: Reddy Chapter 10;
  - marco de evolución estable y pragmática: Kotlin evolution principles;
  - documentación solo como soporte de cambios y migración, no como eje.

## Test plan

- Verificar que el grupo `api-design` renderiza dos entradas en orden:
  - `fundamentals`
  - `evolution`
- Verificar que la nueva ruta `/notes/software-libraries/api-design/evolution/` aparece en metadata y navegación.
- Verificar que `fundamentals` ya no queda como único nodo del grupo.
- Verificar que las referencias de `evolution` resuelven correctamente desde catálogo.
- Ejecutar:
  - `pnpm test:unit`
  - `pnpm test:astro` si la navegación o render de referencias queda cubierta por esa suite
  - `pnpm build` como validación final de integración estática

## Asunciones y defaults

- La lección será puramente conceptual, sin ejercicio final.
- El nivel de compatibilidad se explicará en términos generales de contrato público y comportamiento observable, sin entrar en detalle fuerte de ABI salvo una mención breve si sirve para ilustrar que no toda compatibilidad es igual.
- La documentación quedará tratada solo como mecanismo para comunicar cambios, deprecaciones y migraciones; su desarrollo completo se reserva para la futura lección `documentation`.
- Los ejemplos serán pequeños, legibles y subordinados a la explicación conceptual, no el centro de la lección.
