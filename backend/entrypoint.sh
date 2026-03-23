#!/bin/sh
set -e

# Copy kubeconfig and rewrite loopback addresses to host.docker.internal
# so the container can reach the host's Kubernetes API.
# Also skip TLS verification since the cert doesn't include host.docker.internal.
mkdir -p /app/.kube
sed \
  -e 's/127\.0\.0\.1/host.docker.internal/g' \
  -e 's/localhost/host.docker.internal/g' \
  -e 's/certificate-authority-data:.*/insecure-skip-tls-verify: true/' \
  /tmp/.kube/config > /app/.kube/config

exec /server
