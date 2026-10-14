# Discover and adapt owned source

The GitHub source registry distributes editable source, independently of the
runtime package. It is available without a monorepo checkout or MCP. From the
consumer's project, inspect available items and the relevant payload:

```sh
npx shadcn@4.21.4 list joacod/audiobits
npx shadcn@4.21.4 view joacod/audiobits/reactive-thruster
npx shadcn@4.21.4 add joacod/audiobits/reactive-thruster
```

Use the [public registry guide](https://github.com/joacod/audiobits/blob/main/catalog/README.md)
and `registry.json` from the same reviewed repository ref for discovery,
capability requirements and file manifests. Append `#<reviewed-full-commit-SHA>`
to registry addresses for reproducible installs. Compare item requirements with
the installed runtime metadata before adding source; do not upgrade the runtime
as a side effect. If needed, inspect source at that ref and copy only the
relevant files, preserving relative imports.

The pinned CLI's normal `add` supports these universal entries without React,
Tailwind or `components.json`. Its `add --dry-run`, `--diff` and `--view` modes
can enter component setup in an unconfigured application. Use the top-level
`view` command or the guide's disposable preview directory instead; decline
unrelated framework setup. Review existing-file conflicts and preserve local
changes. Do not use `--overwrite` casually.

Recipes install at `src/sounds/recipes/<id>/`; experiences at
`src/sounds/experiences/<id>/`. Import copied files from the consumer's source
tree, never from `../../catalog/` or unpublished package internals. The registry
may evolve independently of an older installed runtime.

Reactive Thruster installs `recipe.ts`, `pointer.ts`, and its integration guide.
Its complete host, demo HTML, and Impact dependency remain in the repository.
Adapt feedback and lifecycle locally; do not replace the application's
entrypoint with the demo.

You own installed source. Catalog source uses 0BSD with no required license
notices or credit. Review later catalog updates as source changes and validate
adapted recipes/controllers against the consumer's runtime. After installation, typechecking, builds and
playback need only local source and `audiobits`, with no registry access.
