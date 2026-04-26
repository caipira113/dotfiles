# Distrobox Dev Container

Debian Trixie container for builds that need system-level libraries. The host uses [mise](../mise/README.md) for userspace tools — those are available inside the container via shared home directory.

## Usage

```bash
~/.config/distrobox/dev install            # create
~/.config/distrobox/dev install --nvidia    # with NVIDIA support
~/.config/distrobox/dev install --vm        # rootful systemd container for VM experiments
~/.config/distrobox/dev enter              # enter
~/.config/distrobox/dev remove             # destroy
~/.config/distrobox/dev reinstall          # destroy + create
```

## Image

Pre-built images are pulled from `ghcr.io/caipiralink/dotfiles/dev`. Tags:

| Tag | Contents |
|-----|----------|
| `latest` | Base image |
| `nvidia` | + NVIDIA Container Toolkit GPG key + CUDA Toolkit 13.2 (arch-aware) |

CI builds both tags daily from the [`Dockerfile`](Dockerfile).

## What's inside

- build-essential, pkg-config, clang, lld, gdb
- libssl-dev, libicu-dev, libreadline-dev, zlib1g-dev
- FFmpeg dev libraries + jellyfin-ffmpeg (from GitHub releases)
- Emscripten SDK (`/opt/emsdk`, activate manually)
- Visual Studio Code, Claude Desktop, Codex Desktop
- aria2, zstd, socat
- `docker`, `xdg-open` delegated to host via `distrobox-host-exec`
- 1Password SSH signing wrapper (delegates to host via `distrobox-host-exec`)

```
┌──────────────────────────────────┐
│ Host (WSL2)                      │
│  mise tools ← userspace, in ~/   │
│ ┌──────────────────────────────┐ │
│ │ Distrobox (Debian Trixie)    │ │
│ │  system -dev libs            │ │
│ │  home dir = host home        │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```
