# Application code standards

Apply these rules to new code and to the part of an existing module changed by
the current task. Keep the change scoped: preserve established patterns outside
that part and migrate existing debt through small, reviewable refactors.

## Exports and files

- A source file has at most one exported symbol. Default exports, named exports,
  and re-exports all count. Keep supporting implementation details unexported.
- Name the file after its exported symbol and use the suffix assigned to its
  role. Multi-export barrel files are not part of this architecture.
- A model representing an API payload declares the complete payload shape.
  Avoid `Pick`, `Omit`, intersections, and UI state in transport contracts. Give
  each request, response, and error contract its own model when they are distinct.

## Canonical application layout

| Role                     | Location and filename                        |
| ------------------------ | -------------------------------------------- |
| Shared constants         | `app/constants/*.const.ts`                   |
| DI tokens                | `app/constants/tokens/*.token.ts`            |
| Classes and abstractions | `app/declarations/classes/**`                |
| DTOs                     | `app/declarations/dtos/*.dto.ts`             |
| Enums                    | `app/declarations/enums/*.enum.ts`           |
| Interfaces               | `app/declarations/interfaces/*.interface.ts` |
| Models                   | `app/declarations/models/*.model.ts`         |
| Types                    | `app/declarations/types/*.type.ts`           |
| Traits                   | `app/declarations/traits/*.trait.ts`         |
| Guards                   | `app/guards/*.guard.ts`                      |
| Functions                | `app/functions/**`                           |
| Validators               | `app/functions/validators/**`                |
| RxJS operators           | `app/functions/rxjs-operators/**`            |
| NGXS operators           | `app/functions/ngxs-operators/**`            |
| Type guards              | `app/functions/type-guards/**`               |
| Interceptors             | `app/interceptors/*.interceptor.ts`          |
| Request services         | `app/services/requests/*.service.ts`         |
| Regular services         | `app/services/**` or `app/**/**/services/**` |
| Components               | `app/**/**/components/**`                    |
| Page modules             | `app/pages/**`                               |

Use the narrowest matching role. A request service owns HTTP transport only;
regular services consume request services and own application behavior. Import
`HttpClient` only inside `app/services/requests/*.service.ts`.

## TypeScript and Angular code

- Prefer `inject()` for Angular DI. When an external constraint requires
  constructor injection, keep the parameter non-public and expose only the
  smallest API needed by callers.
- Type assertions are forbidden: `as Type`, `as const`, double assertions and
  angle-bracket assertions. Use explicit annotations, `satisfies`, narrowing
  and runtime validation instead. Import aliases and Angular template aliases
  are not type assertions.
- Give every internal and API contract interface `readonly` properties.
- Match member visibility to its consumers: `private` inside the class,
  `protected` for template-only members, and public only for the class API.
- Prefer an early return and a readable block once the remaining branch can
  stand on its own. Use `else` only when it makes a genuinely paired branch
  clearer.

## Explicit, immutable code

- Annotate every variable, property, parameter, function and callback return type.
  TypeScript forbids annotations on a `for…of` binding; use a typed iterable.
- Write an access modifier on every class member and constructor. Make fields
  `readonly`; use `private` for internals, `protected` for templates and `public`
  only for callers. Interfaces use readonly data and typed method signatures;
  TypeScript does not support access modifiers on interface members.
- Replace values instead of mutating objects, arrays, maps, sets or parameters.
  Use readonly contracts and collections; publish a new value through a private
  signal and expose only its readonly view. Assignment, increment/decrement and
  in-place collection operations are forbidden in application TypeScript.
- Enclose every conditional and loop body in braces, including one-line returns.
- Prefer explicit branches, named contracts and explicit dependencies. Avoid
  boolean coercion, magic defaults, generic patch methods and assertions that
  substitute for runtime validation.
- These rules are enforced by ESLint in `pnpm check`; do not disable them or add
  per-file exceptions to make new code pass. Browser rendering is an I/O boundary,
  not permission to mutate application data. Canvas renderers in `public/art/` use JavaScript; application logic belongs in `src/`.

## Plugins and content

- A lab plugin owns its component, data access and view state. It must not import
  another plugin. Register it in the application composition root through
  `LabPlugin` and `LAB_PLUGINS`.
- The registry and lab panel consume only the plugin contract. They do not branch
  on plugin IDs, know widget internals or dispatch widget-specific actions.
- Keep owner settings limited to location, Steam credentials, Spotify credentials
  and workplace name/URL. Credentials belong in the snapshot export environment. Personal content is static.
- Put user-facing copy, accessibility labels and metadata in `src/app/i18n/en.json`
  and consume it through ngx-translate. Do not add a language setting until needed.
- Keep only state needed for actual interaction, animation lifecycle or fetched
  data. Demo controls, preview inventories and editable profile state are removed.

## Angular templates

Keep the rendered DOM as small as semantics and layout allow. Reuse an existing
element for styling or bindings, prefer `ng-container` for structural grouping,
and add a wrapper only when it provides semantics, accessibility, layout, or
behavior that cannot live on an existing node.

## Completion

Every new or materially changed file must match its canonical location, suffix,
export count, visibility, contract completeness, and HTTP boundary.
