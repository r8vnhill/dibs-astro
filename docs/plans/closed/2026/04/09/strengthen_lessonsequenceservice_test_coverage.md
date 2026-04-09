# Plan: Strengthen `LessonSequenceService` test coverage

## Goal

Make the suite better at validating domain behaviour around adjacency resolution and path normalization, especially at boundaries and under non-canonical inputs.

## Planned changes

1. **Replace brittle structural assertions with behavioural ones**
   Remove the `instanceof AdjacentLessons` check and assert only on observable semantics:
   - `previous`
   - `next`
   - `isEmpty()`

2. **Introduce a small fixture builder**
   Add a reusable helper to keep tests focused on intent rather than setup:

   ```ts
   const lesson = (slug: string, href = `/notes/${slug}/`): NavigationNode => ({
       title: `Lesson ${slug.toUpperCase()}`,
       slug,
       href,
   });
   ```

3. **Refactor the main adjacency cases into DDT**
   Use `test.each` to express the core sequence cases as a table:

   * first lesson
   * middle lesson
   * last lesson

   This will reduce duplication and make it easier to add new scenarios later.

4. **Add boundary-condition coverage**
   Expand the suite with explicit tests for:

   * empty lesson list
   * single-lesson list
   * target not found

   These cases are important because they define the service’s behaviour at the edges of the domain.

5. **Strengthen normalization coverage**
   Add tests where:

   * the target path is non-canonical;
   * lesson `href`s themselves are non-canonical.

   This ensures normalization is applied consistently during comparison, not only to the query input.

6. **Add property-based tests with `fast-check`**
   Complement the example-based tests with invariants such as:

   * returned neighbours always come from the input list;
   * `previous` and `next` are never the same lesson;
   * the result is empty iff the normalized target is absent;
   * applying an idempotent normalizer does not change the outcome.

## Expected result

The suite will become more robust, more expressive, and easier to maintain. It will cover both representative examples and broader invariants, while keeping the tests focused on domain behaviour rather than implementation details.
