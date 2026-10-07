#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES=arm64 -DCMAKE_OSX_DEPLOYMENT_TARGET=13.0
cmake --build build --target MixMaestro_VST3 MixMaestroTests --config Release --parallel 3
./build/MixMaestroTests_artefacts/Release/MixMaestroTests
plugin_path="$PWD/build/MixMaestro_artefacts/Release/VST3/Mix Maestro.vst3"
test -d "$plugin_path"
codesign --force --deep --sign - "$plugin_path"
codesign --verify --deep --strict "$plugin_path"
lipo "$plugin_path/Contents/MacOS/Mix Maestro" -verify_arch arm64
mkdir -p package-root/Library/Audio/Plug-Ins/VST3 dist
ditto "$plugin_path" "package-root/Library/Audio/Plug-Ins/VST3/Mix Maestro.vst3"
pkgbuild --root package-root --identifier com.emrecords.mixmaestro.installer --version 1.0.0 --install-location / dist/Mix_Maestro_1.0.0_AppleSilicon.pkg
pkgutil --payload-files dist/Mix_Maestro_1.0.0_AppleSilicon.pkg
shasum -a 256 dist/Mix_Maestro_1.0.0_AppleSilicon.pkg > dist/SHA256.txt
