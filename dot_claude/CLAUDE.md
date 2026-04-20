# Communication

- Respond in Korean by default. Write code, comments, commit messages, PR descriptions, and issue text in English.
- Do not use emojis. Not in response text, code, documentation, or commit messages. Maintain a professional tone.

# Working style

- Stay within the requested scope. Do not slip in surrounding refactors or formatting cleanup.
- Do not add comments, docstrings, README files, or documentation that were not explicitly requested.
- Do not claim "done" without verification. Actually run the build, tests, and linter. If verification is not possible, state that explicitly.
- After two consecutive failures on the same problem, stop and report (1) the current hypothesis, (2) confirmed facts, and (3) possible alternatives. Then wait for direction. Do not keep charging in the same direction on your own.
- When stuck, do not wipe the file or implementation and rewrite from scratch. Narrow down the cause incrementally (add logs, eliminate one hypothesis at a time, minimize the diff).

# Guard rails

- Do not bypass verification steps such as `--no-verify`, suppressing type or lint errors, or skipping pre-commit hooks. If a hook fails, fix the root cause.
- Always get explicit confirmation before installing packages or adding, upgrading, or downgrading dependencies.
- Do not hide incomplete work behind TODO or FIXME comments. Report unfinished parts explicitly in the response body.
- Do not include debugging `print`, `console.log`, or temporary log statements in the final commit.

# Shell

- IMPORTANT: On Windows (detected via `C:\...` paths or `win32` platform), the default shell is PowerShell (pwsh 7+). From the very first command, use the PowerShell tool and follow pwsh syntax (`Get-ChildItem`, `$env:VAR`, `&&`/`||`, here-string `@'...'@`). Do not fall back to the Bash tool or bash syntax (`ls`, `$VAR`, `export`, `cat <<EOF`).
- Use the Bash tool only when the user explicitly requests WSL or a bash environment. On macOS and Linux, bash/zsh is the default.
- For privilege elevation on Windows 11, use the built-in `sudo` command (e.g., `sudo New-Item -Path 'C:\ProgramData\foo'`). Do not use `Start-Process -Verb RunAs`, `runas`, or similar legacy UAC elevation patterns.

# Git

- Commit messages must fit in a single subject line (≤50 chars). If you cannot summarize in one subject line, split the commit smaller. Do not include a body by default.
- Use Conventional Commits prefixes: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`, `perf`, `style`.
- Do not add `Co-Authored-By` or any other attribution to commit messages.
- `git push` on the current working branch is allowed after commits are made. Force push (prefer `--force-with-lease` over `--force`) is allowed on the same branch after rebasing it onto an updated target branch (e.g., `git rebase origin/main`). Never force-push to `main`, `master`, or other protected/shared branches; if the user asks, warn and require explicit confirmation.
- PR creation and remote branch deletion still require an explicit request.

# Tools

When multiple tools have overlapping capabilities, pick by use case. Fall back to built-in tools if a given MCP tool is not available.

- Official library documentation: `context7` (`resolve-library-id` → `query-docs`). Try this before a general web search.
- Cloudflare documentation: `search_cloudflare_documentation`.
- Semantic web search: `exa.web_search_exa` by default. For simple keyword lookups, the built-in `WebSearch` is fine.
- Verbatim body of a static page (default): `exa.web_fetch_exa`. Clean markdown; adjust size via `maxCharacters`. Use `firecrawl_scrape` when metadata or the full page is needed.
- JS-rendered, SPA, or WASM pages: must use `firecrawl_scrape` (with `waitFor`). `WebFetch` and `exa.web_fetch_exa` do not execute JS and return empty content.
- Fast summary or query over a static page: built-in `WebFetch`. Note that it rewrites content via an internal LLM, so do not trust its output for verbatim quotes, numbers, code, or parameter specs.
- Login, click, form input, and other interactions: `firecrawl_interact`.
- Crawling multiple pages or entire sites: `firecrawl_crawl`, `firecrawl_map`.
- Local dev server UI verification: Claude Preview.
- Browser automation or UI verification on external sites: Claude in Chrome.
