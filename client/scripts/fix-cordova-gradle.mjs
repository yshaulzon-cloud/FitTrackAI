// Workaround for a Capacitor 8 bug: `cap sync`/`cap update` regenerates
// android/capacitor-cordova-android-plugins/build.gradle as an EMPTY file,
// which makes the Gradle build fail with:
//   "No matching variant of project :capacitor-cordova-android-plugins ...
//    No variants exist."
// (the app module depends on it as an Android library — see
//  android/app/build.gradle `implementation project(':capacitor-cordova-android-plugins')`).
//
// The whole capacitor-cordova-android-plugins/ dir is gitignored + regenerated,
// so we can't just commit the file — it gets wiped on every sync. Instead this
// script rewrites the standard Android-library stub. It's version-agnostic:
// the stub reads compile/min/target SDK from rootProject.ext, so it always
// matches android/variables.gradle.
//
// Run automatically via `npm run cap:sync` (see package.json). If you ever run
// a bare `npx cap sync android`, run `npm run fix:cordova-gradle` afterwards.

import { writeFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '../android/capacitor-cordova-android-plugins/build.gradle');

const STUB = `ext {
    cdvMinSdkVersion = project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 24
    // Plugin gradle extensions can append to this to have code run at the end.
    cdvPluginPostBuildExtras = []
    cordovaConfig = [:]
}

apply plugin: 'com.android.library'

android {
    namespace "capacitor.cordova.android.plugins"
    compileSdk project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 36
    defaultConfig {
        minSdkVersion project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 24
        targetSdkVersion project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 36
    }
    lintOptions {
        abortOnError false
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

repositories {
    flatDir{
        dirs 'src/main/libs', 'libs'
    }
}

dependencies {
    implementation fileTree(dir: 'src/main/libs', include: ['*.jar'])
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
}

if (hasProperty('postBuildExtras')) {
    postBuildExtras()
}

apply from: "cordova.variables.gradle"
`;

const isEmpty = !existsSync(target) || statSync(target).size === 0;
if (isEmpty) {
  writeFileSync(target, STUB);
  console.log('✓ fix-cordova-gradle: restored capacitor-cordova-android-plugins/build.gradle');
} else {
  console.log('· fix-cordova-gradle: build.gradle already populated, left as-is');
}
