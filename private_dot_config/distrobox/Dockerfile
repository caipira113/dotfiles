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
RUN curl -fsSL https://aaddrick.github.io/claude-desktop-debian/KEY.gpg \
      | gpg --batch --dearmor > /etc/apt/keyrings/claude-desktop.gpg && \
    chmod 644 /etc/apt/keyrings/claude-desktop.gpg && \
    printf 'Types: deb\nURIs: https://aaddrick.github.io/claude-desktop-debian\nSuites: stable\nComponents: main\nArchitectures: amd64 arm64\nSigned-By: /etc/apt/keyrings/claude-desktop.gpg\n' \
      > /etc/apt/sources.list.d/claude-desktop.sources

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

# Claude Desktop IME wrapper (IBus environment variables) + desktop entry
RUN printf '#!/bin/bash\nexec env IBUS_USE_PORTAL=1 GTK_IM_MODULE=ibus QT_IM_MODULE=ibus XMODIFIERS=@im=ibus claude-desktop "$@"\n' \
      > /usr/local/bin/claude-desktop-ime && \
    chmod +x /usr/local/bin/claude-desktop-ime && \
    sed 's|^Exec=.*|Exec=claude-desktop-ime %U|' \
      /usr/share/applications/claude-desktop.desktop \
      > /usr/share/applications/claude-desktop-ime.desktop

# docker delegated to host via distrobox-host-exec
RUN ln -s /usr/bin/distrobox-host-exec /usr/local/bin/docker

# 1Password SSH signing wrapper (delegates to host via distrobox-host-exec)
RUN mkdir -p /opt/1Password && \
    printf '#!/bin/sh\nexec /usr/bin/distrobox-host-exec /opt/1Password/op-ssh-sign "$@"\n' \
      > /opt/1Password/op-ssh-sign && \
    chmod +x /opt/1Password/op-ssh-sign
