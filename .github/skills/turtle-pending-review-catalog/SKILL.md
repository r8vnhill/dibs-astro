---
name: turtle-pending-review-catalog
description: "Agrega o actualiza referencias del catálogo Turtle de bibliografía como pendientes de revisión. Usa este skill cuando haya que revisar `src/data/bibliography/sources/*.ttl`, detectar entradas ya existentes para no duplicarlas y registrar nuevos `dibs:ReferenceUsage` con `pending-revision` sin tocar archivos generados."
argument-hint: "Ruta, título, URL, DOI o referencia a revisar"
---

# Turtle Pending Review Catalog

Agregar referencias al catálogo Turtle como pendientes de revisión sin duplicar entradas.

## Cuándo usarlo

- Cuando haya que incorporar una referencia bibliográfica nueva al catálogo Turtle.
- Cuando una referencia deba quedar marcada como `pending-revision` en lugar de publicarse como recomendada.
- Cuando haya que revisar si una entrada ya existe antes de crear otra.
- Cuando una lección o reporte necesite apuntar a una referencia existente sin repetirla.

## Flujo

1. **Identificar el objetivo real**
   - Determina si se trata de una referencia citeable, un trabajo reutilizable, una persona, una organización o una relación de uso.
   - Si el pedido menciona una lección, un tema o un recurso externo, busca primero la entrada canónica más cercana.

2. **Buscar duplicados antes de editar**
   - Revisa `src/data/bibliography/sources/*.ttl` para encontrar coincidencias por `ref:` ID, URL canónica, DOI, ISBN, título, autor o trabajo padre.
   - Revisa también `src/data/bibliography/catalog.graph.generated.ttl` y `src/data/bibliography/catalog.graph.generated.jsonld` solo para confirmar si la entrada ya existe; no los edites manualmente.
   - Si ya existe una entrada equivalente, actualízala o agrega la relación faltante. No crees una segunda entrada para el mismo recurso.

3. **Elegir el archivo fuente correcto**
   - `00-prefixes.ttl`: solo prefijos compartidos.
   - `01-persons.ttl`: personas.
   - `02-organizations.ttl`: organizaciones e instituciones.
   - `03-works.ttl`: obras reutilizables padre.
   - `04-references.ttl`: referencias citeables.
   - `05-usages.ttl`: relaciones de uso entre lecciones y referencias.

4. **Editar solo la fuente canónica**
   - Mantén los `@prefix` locales intactos.
   - Usa IDs estables y legibles como `ref:<slug>` o `usage:<slug>`.
   - Si la entrada debe quedar pendiente de revisión, usa `dibs:tag pending-revision` en la relación de uso correspondiente.
   - Si la referencia aún no debe mostrarse como recomendada, conserva su estado pendiente en la capa de uso, no mediante duplicados paralelos.

5. **Regenerar el catálogo**
   - Ejecuta `pnpm generate:bibliography-catalog` después de editar los Turtle fuente.
   - No edites manualmente los archivos generados.

6. **Validar el resultado**
   - Verifica que no aparezcan IDs duplicados.
   - Verifica que no se hayan creado dos nodos para la misma URL, DOI o trabajo canónico.
   - Si el generador elimina una entrada pendiente porque no es compatible o falta el nodo destino, corrige la fuente antes de continuar.

## Regla de deduplicación

- Considera duplicada cualquier entrada que represente el mismo recurso canónico, aunque cambie el título visible o el texto descriptivo.
- Si hay dudas entre crear una entrada nueva o ampliar una existente, prefiere ampliar la existente.
- Si el solapamiento no se puede resolver con seguridad, detén la edición y reporta la coincidencia candidata antes de crear nada nuevo.

## Resultado esperado

Al terminar, informa:

- qué referencia se agregó o actualizó;
- en qué archivo Turtle quedó;
- qué coincidencias previas se revisaron para evitar duplicados;
- si se regeneró el catálogo y si quedó limpio.
