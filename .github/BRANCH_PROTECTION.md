# Branch Protection - Recomendación para `main`

Configurar en GitHub: `Settings > Branches > Add branch protection rule`.

## Regla

- Branch name pattern: `main`

## Requerido

- Require a pull request before merging
- Require approvals: `1` (mínimo)
- Dismiss stale pull request approvals when new commits are pushed
- Require review from Code Owners
- Require status checks to pass before merging
- Require branches to be up to date before merging

## Status checks sugeridos

- `quality`

## Recomendado

- Require conversation resolution before merging
- Include administrators
- Restrict who can push to matching branches (si hay equipo)
- Do not allow force pushes
- Do not allow deletions
