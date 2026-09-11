# Fewer Bash permission prompts — Savecraft

Add to `Extensions/Savecraft/.claude/settings.json` under `permissions.allow`
(this edit was blocked by the permission classifier when Claude tried it directly,
so it's saved here to paste in manually):

```json
{
  "permissions": {
    "allow": [
      "Bash(grep *)",
      "Bash(dig *)",
      "Bash(firebase login:list)",
      "Bash(node --check *)",
      "Bash(python3 -m json.tool *)",
      "Bash(npm ls *)",
      "Bash(npm root *)",
      "Bash(git check-ignore *)"
    ]
  }
}
```

Based on scanning 18 recent session transcripts. Notes on what was deliberately
left out:

- **`curl`** — 823 calls, highest-volume candidate, but ~28 of them used
  `curl -s ... -X POST/PATCH/DELETE` against Firebase Auth / Firestore REST
  endpoints (including account deletion). Those share the same `curl -s` prefix
  as the safe read checks, so no safe wildcard exists.
- Mutating git: `commit`, `add`, `push`, `worktree add/remove`, `cherry-pick`,
  `merge`, `checkout`, `mv`, `rm`, `stash`.
- Filesystem mutation: `rm`, `mkdir`, `cp`, `chmod`, `sed -i`.
- Arbitrary code execution: `node -e`, `python3 -c`, `npx`, `bash`, `source`.
- Side effects: `firebase deploy`, `firebase serve`, `npm install`, `npm init`.

Already present in the target file and untouched: `Bash(grep *)`, `Bash(dig *)`,
`Bash(firebase login:list)`.
