# Distrobox Dev Container

Debian Trixie container for builds that need system-level libraries. The host uses [mise](../mise/README.md) for userspace tools — those are available inside the container via shared home directory.

## Usage

```bash
~/.config/distrobox/dev install            # create
~/.config/distrobox/dev install --nvidia    # with NVIDIA support
~/.config/distrobox/dev install --cursor    # with Cursor editor
~/.config/distrobox/dev enter              # enter
~/.config/distrobox/dev remove             # destroy
~/.config/distrobox/dev reinstall          # destroy + create
```

## Image

Pre-built images are pulled from `ghcr.io/caipiralink/dotfiles/dev`. Tags:

| Tag | Contents |
|-----|----------|
| `latest` | Base image |
| `nvidia` | + NVIDIA Container Toolkit GPG key |
| `cursor` | + Cursor editor |
| `nvidia-cursor` | + both |

CI builds all four tags daily from the [`Dockerfile`](Dockerfile).

## What's inside

APT mirror set to SAKURA internet (Japan).

- build-essential, pkg-config, clang, lld, gdb
- libssl-dev, libicu-dev, libreadline-dev, zlib1g-dev
- FFmpeg dev libraries + jellyfin-ffmpeg (from GitHub releases)
- Emscripten SDK (`/opt/emsdk`, activate manually)
- Docker CE CLI + buildx + compose plugin
- aria2, zstd, socat
- 1Password SSH signing wrapper (delegates to host via `distrobox-host-exec`)

```
┌──────────────────────────────────┐
│ Host (WSL2)                      │
│  mise tools ← userspace, in ~/   │
│ ┌──────────────────────────────┐ │
│ │ Distrobox (Debian Trixie)    │ │
│ │  system -dev libs, docker CLI│ │
│ │  home dir = host home        │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```
