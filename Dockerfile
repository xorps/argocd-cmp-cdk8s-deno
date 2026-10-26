# SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
# SPDX-License-Identifier: Apache-2.0 OR MIT

FROM denoland/deno:debian-2.9.8@sha256:a0d88a7fcbd44f062cba2748e19df67d30290ad12aa203c7c1e0b12462c483f0

LABEL org.opencontainers.image.source=https://github.com/xorps/argocd-cmp-cdk8s-deno \
      org.opencontainers.image.licenses="Apache-2.0 OR MIT"

ENV CMP_HOME=/opt/cmp \
    DENO_DIR=/opt/cmp/cache \
    DENO_NO_UPDATE_CHECK=1 \
    DENO_NO_PROMPT=1 \
    HOME=/home/argocd

WORKDIR /opt/cmp
COPY deno.json deno.lock ./
COPY bin/preflight.ts ./preflight.ts
# the cache is read-only at runtime, so everything has to land in it now.
# with a lockfile, deno install only sometimes keeps the npm metadata that
# deno info wants later, so resolve once without the lock to make sure it's
# saved, then run deno info offline and fail the build if it reaches out.
RUN deno cache --no-config --no-lock preflight.ts \
 && deno install --frozen \
 && mkdir /tmp/meta && cp deno.json /tmp/meta \
 && (cd /tmp/meta && deno install >/dev/null) \
 && rm -r /tmp/meta \
 && printf 'import "cdk8s";\nimport "cdk8s-plus-34";\nimport "constructs";\n' >/tmp/warm.ts \
 && HTTPS_PROXY=http://127.0.0.1:9 HTTP_PROXY=http://127.0.0.1:9 \
    deno info --config=deno.json --lock=deno.lock --frozen /tmp/warm.ts 2>/tmp/info.log >/dev/null \
 && if grep Download /tmp/info.log; then exit 1; fi \
 && rm /tmp/warm.ts /tmp/info.log \
 && chmod -R a+rX /opt/cmp \
 && mkdir -p /home/argocd/cmp-server/config \
 && chown -R 999:999 /home/argocd

COPY plugin.yaml /home/argocd/cmp-server/config/plugin.yaml
COPY bin/cmp-generate /usr/local/bin/cmp-generate

USER 999
WORKDIR /home/argocd
ENTRYPOINT ["/var/run/argocd/argocd-cmp-server"]
