---
name: canofold-docs-from-code
description: Update Canofold documentation and examples from verified source-code changes. Use when an API, component, CLI behavior, config option, or output contract changed and the user wants docs synchronized.
---

# Maintain Canofold docs from code

Make the documentation describe implemented behavior in the version its readers will use.

## Establish the facts

1. Locate the code repository, documentation repository, relevant Git diff, and installed or published Canofold version. Read the implementation, public exports or schema, and focused tests before changing prose.
2. Separate behavior already released from work only present on a development branch. A website that consumes published packages must not describe unreleased local source as currently available unless the user is preparing a release and the page is explicitly staged for it.
3. Trace each changed user-visible fact to affected pages, snippets, component demos, configuration examples, language variants, and versioned copies. Ask only if the intended release or target audience cannot be inferred from the task and repositories.

## Update

- Edit the smallest set of pages that makes the changed behavior understandable: purpose, usage, constraints, and migration steps where applicable. Preserve unaffected wording and authored choices.
- Keep examples executable against the target version. Reuse real component and demo sources rather than copying a second implementation into prose.
- Treat translations as separate content. Update them when the source facts and language are clear; otherwise identify the exact passages requiring review. Do not advance `translation.sourceHash` without reviewing the corresponding translation.
- Preserve established public URLs. If moving a page is necessary, account for links and redirects.
- When syntax or page structure is involved, follow the project's Canofold configuration and version-matched documentation rather than assuming generic Markdown rules.

## Verify and report

Run the narrow checks that exercise the change, such as `canofold check`, targeted tests or typechecks for copied examples, and a build or preview when generated output or component behavior is affected. Distinguish checks you ran from checks still needed. Report the code evidence for the changed claims, edited pages, and any release or translation gap.
