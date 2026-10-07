# Contributor documentation

Start with [architecture](architecture.md) for system boundaries and
[development](development.md) for local work. Ordinary changes need no formal
specification. Architecture changes use the gate in [AGENTS.md](../AGENTS.md).

| Document                                             | Role                                                |
| ---------------------------------------------------- | --------------------------------------------------- |
| [Architecture](architecture.md)                      | Canonical system boundaries and ownership           |
| [Recipe model](recipe-model.md)                      | Canonical data semantics and versioning             |
| [Package reference](../packages/audiobits/README.md) | Exact public API usage and limits                   |
| [Product scope](product.md)                          | Audience and non-goals                              |
| [Roadmap](roadmap.md)                                | Ordered priorities and deferred work                |
| [Development](development.md)                        | Commands and local feedback loop                    |
| [Validation](validation.md)                          | Automated properties, listening and evidence limits |
| [Releases](releases.md)                              | Candidate rehearsal and independent activation      |
| [Website](website.md)                                | Gallery and docs responsibilities                   |
| [Recipe study](recipe-study.md)                      | Contrasting sound requirements and methodology      |

The root README is onboarding; site docs are end-user guidance. Decision notes
preserve material rationale without duplicating API reference. Early process material remains in Git history; the
[historical note](history/README.md) preserves the evidence boundary.
