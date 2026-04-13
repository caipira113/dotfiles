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

## What's inside

APT mirror set to SAKURA internet (Japan).

- build-essential, pkg-config
- libssl-dev, libicu-dev, libreadline-dev, zlib1g-dev
- FFmpeg dev libraries + jellyfin-ffmpeg (from GitHub releases)
- Docker CE CLI + buildx + compose plugin
- aria2, zstd, socat

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
