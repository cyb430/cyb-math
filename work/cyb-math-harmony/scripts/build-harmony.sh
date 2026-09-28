#!/usr/bin/env bash
set -euo pipefail
project="$(cd "$(dirname "$0")/.." && pwd)"
root="$(cd "$project/../.." && pwd)"
tools="$root/.toolchain/harmony/sdk/command-line-tools"
case "$root" in /mnt/c/*) echo 'New tools and caches must not be installed on C:' >&2; exit 1;; esac
export HOME="$root/.harmony-home"
export HVIGOR_USER_HOME="$HOME/.hvigor"
export OHPM_HOME="$HOME/.ohpm"
export DEVECO_NODE_HOME="$tools/tool/node"
export DEVECO_SDK_HOME="$tools/sdk"
java="$root/.toolchain/harmony/java"
if [ -d "$java/jdk" ]; then
  export JAVA_HOME="$java/jdk"
  export DEVECO_JAVA_HOME="$JAVA_HOME"
  export PATH="$JAVA_HOME/bin:$PATH"
fi
export PATH="$DEVECO_NODE_HOME/bin:$tools/bin:$PATH"
mkdir -p "$HOME" "$HVIGOR_USER_HOME" "$OHPM_HOME"
cd "$project"
node scripts/prepare-web.mjs
bash "$tools/bin/ohpm" install
bash "$tools/bin/hvigorw" --mode module -p product=default -p module=entry@default -p buildMode=release assembleHap --no-daemon
