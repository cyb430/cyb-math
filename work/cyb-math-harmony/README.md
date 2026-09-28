# CYB Math for HarmonyOS NEXT

This is a native HarmonyOS Stage application written in ArkTS/ArkUI. It does not use Android compatibility. The home/tool picker, favorites, tablet rail, math shortcut keys, document picker, system share, preferences and lifecycle are native. All 13 mathematical tools use the same self-contained offline HTML engines as the web and other applications inside ArkWeb, so formulas and regression behavior remain aligned.

## Build

- HarmonyOS Command Line Tools 5.1.0.840 / SDK API 18, Java 17 and an existing Linux shell are required. Toolchain and caches may be configured on a non-system drive; `scripts/build-harmony.sh` expects the verified portable tools under the repository's D-drive `.toolchain/harmony/` folder.
- From the repository root, run `wsl.exe -d Ubuntu --exec bash work/cyb-math-harmony/scripts/build-harmony.sh` on Windows. `scripts/prepare-web.mjs` first embeds all 13 canonical engines and the native bridge into generated raw files.
- Output is `entry/build/default/outputs/default/entry-default-unsigned.hap` until a developer signing profile is configured in `build-profile.json5`.

An unsigned HAP is an engineering build, not a distributable installation package. A HarmonyOS developer identity, signing certificate/profile and physical-device test are still required before a consumer release. No private credentials, SDK or generated pages are committed.
