# Claude Code permissions for this project

*(See `1_savecraft-documentation.md` for what every file in this folder is for.)*

Notes on `.claude/settings.json` (one directory up from here) — not SaveCraft product
documentation, but kept in this folder for one-folder convenience rather than split out on its
own.

`settings.json` holds a project-level `permissions.allow` list to cut down repeated approval
prompts, scoped deliberately narrow:

```json
{
  "permissions": {
    "allow": [
      "Bash(grep *)",
      "Bash(dig *)",
      "Bash(firebase login:list)"
    ]
  }
}
```

`grep`/`dig`/`firebase login:list` are unconditionally read-only regardless of flags — chosen by
scanning recent session transcripts for the most frequent Bash calls, then keeping only patterns
that (a) aren't already covered by Claude Code's own built-in read-only auto-allow list (`cd`,
`cat`, `head`, `tail`, `echo`, `wc`, `ls`, `find`, `git status`/`diff`/`log`/`branch`/`rev-parse`,
`lsof`, etc. — these never needed a rule) and (b) can't be turned destructive by a hidden flag.
`curl` was deliberately left out despite being a frequent candidate — most calls used
`-s`/`-sI`/`-sf` (all safe), but a wildcard rule can't distinguish those from
`curl -sX POST ... -d '...'`, and this project's owner explicitly did not want anything that could
enable a mutating request to slip through unprompted. Interpreters/shells/package-runners
(`python3`, `node -e`, `npx`, `bash -c`, `source`) are never allowlisted here even when read-only
in a specific observed use, since a wildcard rule covering them is equivalent to unprompted
arbitrary code execution.

**Separate, pre-existing file — not part of this setup, worth knowing about:**
`/Users/lizpasekal/Documents/Votecraft.org/.claude/settings.local.json` (one directory *above*
this project, at the shared monorepo root) already has its own, considerably more permissive
`permissions.allow` list — including blanket `"Edit"`/`"Write"` and two genuinely risky entries,
`Bash(python3 -c ' *)` and `Bash(node -e:*)`, both real arbitrary-code-execution allowances. It
predates this project's own `.claude/settings.json`, wasn't created alongside it, and hasn't been
modified from here. Because it lives at the monorepo root rather than at this project's own path,
it may not even be in effect for sessions whose working directory is this Savecraft folder
specifically (Claude Code project settings are path-scoped) — which could explain permission
prompts persisting despite that file looking permissive on paper. Flagging this for whoever next
touches permissions here, not recommending any specific change to it.
