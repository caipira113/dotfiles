import sunSvg from "./icons/sun.svg" with { type: "text" };
import moonSvg from "./icons/moon.svg" with { type: "text" };
import desktopSvg from "./icons/desktop.svg" with { type: "text" };
import "./design/colors_and_type.css";
import "./design/page.css";

type ThemeChoice = "light" | "dark" | "auto";

type ContentEntry = {
  name: string;
  target: string;
  desc: string;
  href: string;
};

type GithubCommit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { date: string };
  };
};

const REPO = "caipiralink/dotfiles";
const gh = (p: string): string => `https://github.com/${REPO}/blob/main/${p}`;

const CONTENTS: ContentEntry[] = [
  {
    name: "zsh",
    target: "~/.zshrc",
    desc: "zinit for plugins. eza aliases, sccache env, lazy activation of mise/starship/fzf/uv/kubectl/helm/gcloud.",
    href: gh("dot_zshrc"),
  },
  {
    name: "powershell",
    target: "~/.config/powershell/",
    desc: "ps7 profile — psreadline, eza aliases, mise/starship/kubectl/helm, fzf keybindings. distributed to ps5+ps7 paths.",
    href: gh("private_dot_config/powershell/"),
  },
  {
    name: "starship",
    target: "~/.config/starship.toml",
    desc: "minimal — only overrides node.js detection to package.json / .node-version.",
    href: gh("private_dot_config/starship.toml"),
  },
  {
    name: "git",
    target: "~/.gitconfig",
    desc: "ssh commit signing via 1password. personal/work identity templated by chezmoi. signing path adapts to os.",
    href: gh("dot_gitconfig.tmpl"),
  },
  {
    name: "neovim",
    target: "~/.config/nvim/",
    desc: "single-file config with lazy.nvim.",
    href: gh("private_dot_config/nvim/"),
  },
  {
    name: "mise",
    target: "~/.config/mise/",
    desc: "30+ dev tools managed by mise.",
    href: gh("private_dot_config/mise/"),
  },
  {
    name: "distrobox",
    target: "~/.config/distrobox/",
    desc: "debian trixie dev container provisioning.",
    href: gh("private_dot_config/distrobox/"),
  },
  {
    name: "claude",
    target: "~/.claude/",
    desc: "global instructions, per-os settings, and a SessionStart hook that re-injects CLAUDE.md when suppressed.",
    href: gh("dot_claude/"),
  },
  {
    name: "1password",
    target: "~/.config/1Password/",
    desc: "ssh agent vault selection on linux/macos — personal vs work.",
    href: gh("private_dot_config/1Password/"),
  },
  {
    name: "1password · win",
    target: "%LOCALAPPDATA%\\1Password\\",
    desc: "same ssh agent vault selection on windows.",
    href: gh("AppData/Local/1Password/"),
  },
  {
    name: "local/bin",
    target: "~/.local/bin/",
    desc: "convenience symlinks — e.g. dev → ~/.config/distrobox/dev.",
    href: gh("dot_local/private_bin/"),
  },
];

const ICONS: Record<Exclude<ThemeChoice, never>, string> = {
  light: sunSvg,
  auto: desktopSvg,
  dark: moonSvg,
};

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] ?? c,
  );
}

function firstLine(s: string): string {
  const line = s.split("\n")[0] ?? "";
  return line.length > 90 ? `${line.slice(0, 87)}…` : line;
}

function timeAgo(isoStr: string): string {
  const then = new Date(isoStr).getTime();
  const now = Date.now();
  const s = Math.max(1, Math.floor((now - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  const y = Math.floor(mo / 12);
  return `${y}y ago`;
}

function setupHeroTyping(): void {
  const typedEl = document.getElementById("typed");
  if (!typedEl) return;
  const installCmd = "chezmoi init --apply caipiralink/dotfiles";
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    typedEl.textContent = installCmd;
    return;
  }
  let i = 0;
  const tick = (): void => {
    typedEl.textContent = installCmd.slice(0, i++);
    if (i <= installCmd.length) setTimeout(tick, 38 + Math.random() * 30);
  };
  setTimeout(tick, 400);
}

function renderContentsGrid(): void {
  const grid = document.getElementById("contents-grid");
  if (!grid) return;
  grid.innerHTML = CONTENTS.map(
    (c) => `
    <a class="card" href="${escapeHtml(c.href)}" target="_blank" rel="noopener">
      <div class="top">
        <span class="name">${escapeHtml(c.name)}</span>
        <span class="target">${escapeHtml(c.target)}</span>
      </div>
      <p class="desc">${escapeHtml(c.desc)}</p>
      <span class="arrow">→ view on github</span>
    </a>
  `,
  ).join("");
}

async function loadCommits(): Promise<void> {
  const commitList = document.getElementById("commit-list");
  const commitMeta = document.getElementById("commits-meta");
  if (!commitList || !commitMeta) return;

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/commits?per_page=6`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`http ${res.status}`);
    const commits = (await res.json()) as GithubCommit[];
    if (!Array.isArray(commits) || commits.length === 0) {
      commitList.innerHTML = `<li class="commit empty">no commits yet</li>`;
      commitMeta.textContent = "";
      return;
    }
    commitList.innerHTML = commits
      .slice(0, 6)
      .map(
        (c) => `
        <a class="commit" href="${escapeHtml(c.html_url)}" target="_blank" rel="noopener">
          <span class="hash">${escapeHtml(c.sha.slice(0, 7))}</span>
          <span class="msg">${escapeHtml(firstLine(c.commit.message))}</span>
          <span class="when">${escapeHtml(timeAgo(c.commit.author.date))}</span>
        </a>
      `,
      )
      .join("");
    commitMeta.textContent = "from main";
  } catch {
    commitList.innerHTML = `<li class="commit empty">couldn't reach github. <a href="https://github.com/${REPO}/commits/main" style="color:var(--accent)">see on github →</a></li>`;
    commitMeta.textContent = "";
  }
}

function setupTheme(): void {
  const root = document.documentElement;
  const buttons = document.querySelectorAll<HTMLButtonElement>(".theme-toggle [data-theme-set]");

  buttons.forEach((btn) => {
    const choice = btn.dataset.themeSet as ThemeChoice | undefined;
    if (choice && ICONS[choice]) {
      btn.innerHTML = ICONS[choice];
    }
  });

  const current = (): ThemeChoice => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // localStorage not available
    }
    return "auto";
  };

  const apply = (choice: ThemeChoice): void => {
    if (choice === "auto") {
      root.removeAttribute("data-theme");
      try {
        localStorage.removeItem("theme");
      } catch {
        // ignore
      }
    } else {
      root.setAttribute("data-theme", choice);
      try {
        localStorage.setItem("theme", choice);
      } catch {
        // ignore
      }
    }
    buttons.forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.themeSet === choice ? "true" : "false");
    });
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const choice = btn.dataset.themeSet as ThemeChoice | undefined;
      if (choice) apply(choice);
    });
  });

  apply(current());
}

setupHeroTyping();
renderContentsGrid();
void loadCommits();
setupTheme();
