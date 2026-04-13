#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

ARCH="$(dpkg --print-architecture)"

# ═══════════════════════════════════════════════════════════════════
#  Feature flags (set via environment variables)
#    SETUP_NVIDIA=1   — install NVIDIA container toolkit GPG key
#    SETUP_CURSOR=1   — install Cursor editor
# ═══════════════════════════════════════════════════════════════════
SETUP_NVIDIA="${SETUP_NVIDIA:-0}"
SETUP_CURSOR="${SETUP_CURSOR:-0}"

# ═══════════════════════════════════════════════════════════════════
#  APT mirror → JAIST (Japan)
# ═══════════════════════════════════════════════════════════════════
sudo sed -i \
  -e 's|URIs: http://deb.debian.org/debian$|URIs: http://ftp.jaist.ac.jp/pub/Linux/debian|' \
  /etc/apt/sources.list.d/debian.sources

sudo install -m 0755 -d /etc/apt/keyrings

# ═══════════════════════════════════════════════════════════════════
#  NVIDIA Container Toolkit GPG key (optional)
# ═══════════════════════════════════════════════════════════════════
if [ "$SETUP_NVIDIA" = "1" ]; then
  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
    | gpg --batch --dearmor | sudo tee /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg > /dev/null
fi

# ═══════════════════════════════════════════════════════════════════
#  Docker CE repo
# ═══════════════════════════════════════════════════════════════════
sudo apt update
sudo apt install -y ca-certificates curl gnupg

sudo curl -fsSL https://download.docker.com/linux/debian/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

. /etc/os-release

sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: ${VERSION_CODENAME}
Components: stable
Architectures: ${ARCH}
Signed-By: /etc/apt/keyrings/docker.asc
EOF

# ═══════════════════════════════════════════════════════════════════
#  Cursor repo (optional)
# ═══════════════════════════════════════════════════════════════════
if [ "$SETUP_CURSOR" = "1" ]; then
  curl -fsSL https://downloads.cursor.com/keys/anysphere.asc \
    | gpg --batch --dearmor \
    | sudo tee /etc/apt/keyrings/cursor.gpg > /dev/null
  sudo chmod 644 /etc/apt/keyrings/cursor.gpg
  echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/cursor.gpg] https://downloads.cursor.com/aptrepo stable main" \
    | sudo tee /etc/apt/sources.list.d/cursor.list > /dev/null
fi

# ═══════════════════════════════════════════════════════════════════
#  APT packages
# ═══════════════════════════════════════════════════════════════════
sudo apt update

# Unmount host-bind-mounted libicu files to prevent
# dpkg "Invalid cross-device link" errors during install
for f in /usr/lib/x86_64-linux-gnu/libicu*.so*; do
  sudo umount "$f" 2>/dev/null || true
done

PACKAGES=(
  build-essential
  pkg-config
  libssl-dev
  libicu-dev
  libreadline-dev
  zlib1g-dev
  libavcodec-dev
  libavformat-dev
  libavutil-dev
  libswscale-dev
  libswresample-dev
  libavfilter-dev
  clang
  lld
  gdb
  libglfw3-dev
  libgl-dev
  aria2
  zstd
  socat
  openssh-client
  docker-ce-cli
  docker-buildx-plugin
  docker-compose-plugin
)

[ "$SETUP_CURSOR" = "1" ] && PACKAGES+=(cursor)

sudo apt install -y "${PACKAGES[@]}"

# ═══════════════════════════════════════════════════════════════════
#  Emscripten SDK (system-level, activate manually when needed)
# ═══════════════════════════════════════════════════════════════════
EMSDK_DIR="/opt/emsdk"

if [ ! -d "$EMSDK_DIR" ]; then
  sudo git clone https://github.com/emscripten-core/emsdk.git "$EMSDK_DIR"
else
  sudo git -C "$EMSDK_DIR" pull
fi

sudo "$EMSDK_DIR/emsdk" install latest
sudo "$EMSDK_DIR/emsdk" activate latest
sudo chmod -R a+rX "$EMSDK_DIR"

# ═══════════════════════════════════════════════════════════════════
#  jellyfin-ffmpeg (latest release, arch-aware) + symlink
# ═══════════════════════════════════════════════════════════════════
FFMPEG_DEB_URL=$(curl -fsSL https://api.github.com/repos/jellyfin/jellyfin-ffmpeg/releases/latest \
  | grep -oP '"browser_download_url":\s*"\K[^"]*trixie_'"${ARCH}"'\.deb' | head -1)
curl -fsSL -o /tmp/jellyfin-ffmpeg.deb "${FFMPEG_DEB_URL}"
sudo dpkg -i /tmp/jellyfin-ffmpeg.deb || sudo apt install -f -y
rm -f /tmp/jellyfin-ffmpeg.deb

sudo ln -sf /usr/lib/jellyfin-ffmpeg/ffmpeg /usr/local/bin/ffmpeg
sudo ln -sf /usr/lib/jellyfin-ffmpeg/ffprobe /usr/local/bin/ffprobe

# ═══════════════════════════════════════════════════════════════════
sudo touch /etc/distrobox-setup-done
