# Ejaz APK — Build Fix Report

## Root cause found

The ten launcher resources under `app/src/main/res/mipmap-*` had a `.png` filename but their actual file signature was JPEG (`FF D8 FF E0 ...`).
AAPT2 can fail during `:app:processDebugResources` when a resource's extension/format is inconsistent.

## Changes applied

1. Re-encoded all `ic_launcher.png` and `ic_launcher_round.png` files as real PNG files.
2. Removed the obsolete `package="sa.ejaz.transport"` attribute from `AndroidManifest.xml`; the namespace is already defined in `app/build.gradle.kts`.
3. Updated GitHub Actions to use Gradle 8.2 explicitly and build with `--info --stacktrace`.
4. Added an Android-resource validation step to catch invalid resource names and invalid PNG signatures before the Gradle build.
5. Fixed the README workflow filename to `.github/workflows/build-ejaz-apk.yml`.

## Remaining note

The ZIP supplied in this conversation did not contain a Gradle wrapper (`gradlew`). The workflow now provisions Gradle 8.2 directly, so it does not depend on a wrapper being present.
