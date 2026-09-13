#!/usr/bin/env bash
# ZenGram Android APK Build Script (Standalone, Zero-Android-Studio)
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLS_DIR="$HOME/scratch/android_build"
APP_DIR="$DIR/app/src/main"
OUT_DIR="$DIR/build"

mkdir -p "$OUT_DIR/classes" "$OUT_DIR/res_compiled"

echo "==> 1. Compiling resources..."
"$TOOLS_DIR/aapt2" compile --dir "$APP_DIR/res" -o "$OUT_DIR/res_compiled/res.zip"

echo "==> 2. Linking APK package..."
"$TOOLS_DIR/aapt2" link \
  -I "$TOOLS_DIR/android.jar" \
  --manifest "$APP_DIR/AndroidManifest.xml" \
  -o "$OUT_DIR/base.apk" \
  "$OUT_DIR/res_compiled/res.zip"

echo "==> 3. Compiling Java sources..."
java -jar "$TOOLS_DIR/ecj.jar" \
  -8 \
  -bootclasspath "$TOOLS_DIR/android.jar" \
  -d "$OUT_DIR/classes" \
  "$APP_DIR/java/com/zengram/chat/MainActivity.java"

echo "==> 4. Compiling Dalvik bytecode (D8)..."
java -cp "$TOOLS_DIR/r8.jar" com.android.tools.r8.D8 \
  --lib "$TOOLS_DIR/android.jar" \
  --output "$OUT_DIR/" \
  "$OUT_DIR/classes/com/zengram/chat/"*.class

echo "==> 5. Packaging classes.dex..."
cd "$OUT_DIR"
zip -u base.apk classes.dex

echo "==> 6. Signing APK..."
java -jar "$TOOLS_DIR/uber-apk-signer.jar" \
  --apks "$OUT_DIR/base.apk" \
  --out "$OUT_DIR/signed"

cp "$OUT_DIR/signed/base-aligned-debugSigned.apk" "$DIR/../ZenGram.apk"
echo "==> ZenGram.apk built successfully!"
