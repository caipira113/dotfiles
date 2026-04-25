FROM debian:trixie

ARG TARGETARCH
ARG SETUP_NVIDIA=0

ENV DEBIAN_FRONTEND=noninteractive

# keyrings directory
RUN install -m 0755 -d /etc/apt/keyrings

# NVIDIA Container Toolkit GPG key (conditional)
RUN if [ "$SETUP_NVIDIA" = "1" ]; then \
      apt-get update && \
      apt-get install -y --no-install-recommends ca-certificates curl gnupg && \
      curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
        | gpg --batch --dearmor > /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg; \
    fi

# ca-certificates + curl + gnupg for downstream repo setup
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl gnupg

# VS Code repository
RUN curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
      | gpg --batch --dearmor > /etc/apt/keyrings/microsoft.gpg && \
    chmod 644 /etc/apt/keyrings/microsoft.gpg && \
    printf 'Types: deb\nURIs: https://packages.microsoft.com/repos/code\nSuites: stable\nComponents: main\nArchitectures: amd64 arm64 armhf\nSigned-By: /etc/apt/keyrings/microsoft.gpg\n' \
      > /etc/apt/sources.list.d/vscode.sources

# Claude Desktop repository
RUN curl -fsSL https://pkg.claude-desktop-debian.dev/KEY.gpg \
      | gpg --batch --dearmor -o /usr/share/keyrings/claude-desktop.gpg && \
    chmod 644 /usr/share/keyrings/claude-desktop.gpg && \
    printf 'deb [signed-by=/usr/share/keyrings/claude-desktop.gpg arch=amd64,arm64] https://pkg.claude-desktop-debian.dev stable main\n' \
      > /etc/apt/sources.list.d/claude-desktop.list

# APT packages
# hadolint ignore=DL3008
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      pkg-config \
      git \
      libssl-dev \
      libicu-dev \
      libreadline-dev \
      zlib1g-dev \
      libavcodec-dev \
      libavformat-dev \
      libavutil-dev \
      libswscale-dev \
      libswresample-dev \
      libavfilter-dev \
      clang \
      lld \
      gdb \
      libglfw3-dev \
      libgl-dev \
      libxinerama-dev \
      libxcursor-dev \
      libxrandr-dev \
      libxi-dev \
      libgtk-3-dev \
      aria2 \
      zstd \
      socat \
      openssh-client \
      code \
      claude-desktop \
      ibus \
      ibus-hangul \
      ibus-gtk3 \
      ibus-gtk4 && \
    rm -rf /var/lib/apt/lists/*

# CUDA Toolkit (conditional on NVIDIA, arch-aware)
RUN if [ "$SETUP_NVIDIA" = "1" ]; then \
      case "$TARGETARCH" in \
        amd64) cuda_repo="x86_64";          cuda_pkg="cuda-toolkit-13-2" ;; \
        arm64) cuda_repo="cross-linux-sbsa"; cuda_pkg="cuda-cross-sbsa-13-2" ;; \
        *) echo "Unsupported TARGETARCH: $TARGETARCH"; exit 1 ;; \
      esac && \
      curl -fsSL -o /tmp/cuda-keyring.deb \
        "https://developer.download.nvidia.com/compute/cuda/repos/debian13/${cuda_repo}/cuda-keyring_1.1-1_all.deb" && \
      dpkg -i /tmp/cuda-keyring.deb && \
      rm -f /tmp/cuda-keyring.deb && \
      apt-get update && \
      apt-get install -y --no-install-recommends "$cuda_pkg" && \
      rm -rf /var/lib/apt/lists/*; \
    fi

# Emscripten SDK
RUN git clone https://github.com/emscripten-core/emsdk.git /opt/emsdk && \
    /opt/emsdk/emsdk install latest && \
    /opt/emsdk/emsdk activate latest && \
    chmod -R a+rX /opt/emsdk && \
    chmod -R a+rw /opt/emsdk/upstream/emscripten/cache

# jellyfin-ffmpeg (latest release, arch-aware)
RUN FFMPEG_DEB_URL=$(curl -fsSL https://api.github.com/repos/jellyfin/jellyfin-ffmpeg/releases/latest \
      | grep -oP '"browser_download_url":\s*"\K[^"]*trixie_'"${TARGETARCH}"'\.deb' | head -1) && \
    curl -fsSL -o /tmp/jellyfin-ffmpeg.deb "${FFMPEG_DEB_URL}" && \
    dpkg -i /tmp/jellyfin-ffmpeg.deb || apt-get install -f -y && \
    rm -f /tmp/jellyfin-ffmpeg.deb && \
    ln -sf /usr/lib/jellyfin-ffmpeg/ffmpeg /usr/local/bin/ffmpeg && \
    ln -sf /usr/lib/jellyfin-ffmpeg/ffprobe /usr/local/bin/ffprobe

# Codex Desktop (latest release, arch-aware)
RUN case "$TARGETARCH" in \
      amd64|arm64) codex_arch="$TARGETARCH" ;; \
      *) echo "Unsupported TARGETARCH: $TARGETARCH"; exit 1 ;; \
    esac && \
    CODEX_DEB_URL=$(curl -fsSL https://api.github.com/repos/Haleclipse/CodexDesktop-Rebuild/releases/latest \
      | grep -oP '"browser_download_url":\s*"\K[^"]*codex_[^"]*_'${codex_arch}'\.deb' | head -1) && \
    test -n "${CODEX_DEB_URL}" && \
    curl -fsSL -o /tmp/codex.deb "${CODEX_DEB_URL}" && \
    apt-get update && \
    apt-get install -y --no-install-recommends /tmp/codex.deb && \
    rm -f /tmp/codex.deb && \
    rm -rf /var/lib/apt/lists/*

# Claude Desktop IME wrapper (IBus environment variables) + desktop entry
RUN printf '#!/bin/bash\nexec env IBUS_USE_PORTAL=1 GTK_IM_MODULE=ibus QT_IM_MODULE=ibus XMODIFIERS=@im=ibus claude-desktop "$@"\n' \
      > /usr/local/bin/claude-desktop-ime && \
    chmod +x /usr/local/bin/claude-desktop-ime && \
    sed 's|^Exec=.*|Exec=claude-desktop-ime %U|' \
      /usr/share/applications/claude-desktop.desktop \
      > /usr/share/applications/claude-desktop-ime.desktop

# docker and xdg-open delegated to host via distrobox-host-exec
RUN ln -s /usr/bin/distrobox-host-exec /usr/local/bin/docker && \
    ln -s /usr/bin/distrobox-host-exec /usr/local/bin/xdg-open

# 1Password SSH signing wrapper (delegates to host via distrobox-host-exec)
RUN mkdir -p /opt/1Password && \
    printf '#!/bin/sh\nexec /usr/bin/distrobox-host-exec /opt/1Password/op-ssh-sign "$@"\n' \
      > /opt/1Password/op-ssh-sign && \
    chmod +x /opt/1Password/op-ssh-sign
