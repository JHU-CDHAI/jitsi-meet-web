# JHU-CDHAI haichat-web — jitsi/web with our custom frontend build.
#
# The webapp is built on the host first (Debian GPG breaks inside Docker
# Desktop's bookworm builds). Build + package workflow (run from this dir):
#   npm ci --prefer-offline --no-audit --no-fund
#   NODE_OPTIONS=--max-old-space-size=8192 make
#   docker build --platform linux/arm64 -t haichat-web:dev -f Dockerfile .
#
# The submodule is pinned to upstream tag 9139 so the build output matches
# the jitsi-meet-web 1.0.9139-1 debian package inside jitsi/web:stable.

FROM jitsi/web:stable

# Overlay our build output onto the stock jitsi-meet-web assets.
COPY libs            /usr/share/jitsi-meet/libs
COPY css             /usr/share/jitsi-meet/css
COPY static          /usr/share/jitsi-meet/static
COPY images          /usr/share/jitsi-meet/images
COPY fonts           /usr/share/jitsi-meet/fonts
COPY sounds          /usr/share/jitsi-meet/sounds
COPY lang            /usr/share/jitsi-meet/lang
COPY index.html      /usr/share/jitsi-meet/index.html
COPY base.html       /usr/share/jitsi-meet/base.html
COPY body.html       /usr/share/jitsi-meet/body.html
COPY head.html       /usr/share/jitsi-meet/head.html
COPY fonts.html      /usr/share/jitsi-meet/fonts.html
COPY title.html      /usr/share/jitsi-meet/title.html
COPY plugin.head.html /usr/share/jitsi-meet/plugin.head.html
COPY manifest.json   /usr/share/jitsi-meet/manifest.json
COPY pwa-worker.js   /usr/share/jitsi-meet/pwa-worker.js
