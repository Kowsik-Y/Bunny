const { withProjectBuildGradle, withAndroidManifest, withGradleProperties, withDangerousMod, withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withAndroidJVMTarget(config) {
  return withProjectBuildGradle(config, async (config) => {
    let buildGradle = config.modResults.contents;

    // Append subprojects configuration for Kotlin JVM target
    if (!buildGradle.includes('KotlinCompile')) {
      buildGradle += `\n\nsubprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            jvmTarget = "17"
        }
    }
}\n`;
    }

    config.modResults.contents = buildGradle;
    return config;
  });
}

function withAndroidManifestPackage(config) {
  return withAndroidManifest(config, async (config) => {
    // Explicitly add package name to manifest for React Native CLI autolinking compatibility
    config.modResults.manifest.$['package'] = 'com.bunny';

    // Add permissions for network service discovery (NSD) and TCP
    if (!config.modResults.manifest['uses-permission']) {
      config.modResults.manifest['uses-permission'] = [];
    }
    const permissions = [
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.CHANGE_WIFI_MULTICAST_STATE',
    ];
    permissions.forEach((permission) => {
      const hasPermission = config.modResults.manifest['uses-permission'].some(
        (p) => p.$['android:name'] === permission
      );
      if (!hasPermission) {
        config.modResults.manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });


    const mainActivity = config.modResults.manifest.application[0].activity.find(
      (activity) => activity.$['android:name'] === '.MainActivity'
    );

    if (mainActivity) {
      if (!mainActivity['intent-filter']) {
        mainActivity['intent-filter'] = [];
      }

      const hasAudioIntent = mainActivity['intent-filter'].some((filter) =>
        filter.data && filter.data.some((d) => d.$ && d.$['android:mimeType'] === 'audio/*')
      );

      if (!hasAudioIntent) {
        mainActivity['intent-filter'].push({
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          category: [
            { $: { 'android:name': 'android.intent.category.DEFAULT' } },
            { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
          ],
          data: [
            { $: { 'android:scheme': 'file' } },
            { $: { 'android:scheme': 'content' } },
            { $: { 'android:mimeType': 'audio/*' } },
          ],
        });
      }
    }

    return config;
  });
}

function withAndroidGradleProperties(config) {
  return withGradleProperties(config, (config) => {
    const propertiesToAdd = [
      { key: 'android.enableMinifyInReleaseBuilds', value: 'true' },
      { key: 'android.enableShrinkResourcesInReleaseBuilds', value: 'true' },
      { key: 'org.gradle.jvmargs', value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+UseG1GC' },
      { key: 'reactNativeArchitectures', value: 'armeabi-v7a,arm64-v8a' }
    ];

    propertiesToAdd.forEach((prop) => {
      // Remove any existing entries of the key to prevent duplicates
      config.modResults = config.modResults.filter(item => item.key !== prop.key);
      config.modResults.push({
        type: 'property',
        key: prop.key,
        value: prop.value
      });
    });

    return config;
  });
}

function withAndroidProguardRules(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const filePath = path.join(config.modRequest.projectRoot, 'android/app/proguard-rules.pro');
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      let contents = '';
      if (fs.existsSync(filePath)) {
        contents = fs.readFileSync(filePath, 'utf-8');
      }

      const rules = [
        '# Suppress R8/Proguard warnings for missing classes',
        '-dontwarn com.google.re2j.**',
        '-dontwarn java.beans.**',
        '-dontwarn javax.script.**',
        '-dontwarn **',
        '',
        '# Keep local native Kotlin modules & package structures',
        '-keep class com.bunny.youtubeextractor.** { *; }',
        '-keep class com.bunny.innertube.** { *; }',
        '-keep class com.music.innertube.** { *; }',
        '-keep class com.bunny.nsd.** { *; }',
        '-keep class com.bunny.** { *; }',
        '',
        '# Keep react-native-track-player and kotlin-audio classes and members for Equalizer reflection',
        '-keepclassmembers class com.doublesymmetry.trackplayer.service.MusicService { *** player; }',
        '-keep class com.doublesymmetry.kotlinaudio.** { *; }',
        '-keep interface com.doublesymmetry.kotlinaudio.** { *; }',
        `-keepclassmembers class * {
    *** getAudioSessionId(...);
    *** audioSessionId;
    *** setSkipSilenceEnabled(...);
}`,
        '',
        '# Keep class names implementing ExoPlayer/Media3 Player interfaces to allow reflection by interfaces',
        '-keep class * implements com.google.android.exoplayer2.Player',
        '-keep class * implements androidx.media3.common.Player'
      ];

      let modified = false;
      rules.forEach(rule => {
        if (!contents.includes(rule)) {
          contents += `\n${rule}`;
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(filePath, contents, 'utf-8');
      }
      return config;
    }
  ]);
}

function withAndroidABISplits(config) {
  return withAppBuildGradle(config, async (config) => {
    let appGradle = config.modResults.contents;
    if (!appGradle.includes('splits {')) {
      const splitsBlock = `
    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a"
            universalApk false
        }
    }`;
      appGradle = appGradle.replace(/android\s*\{/, `android {\n${splitsBlock}`);
    }
    config.modResults.contents = appGradle;
    return config;
  });
}

function withAndroidVersioning(config) {
  return withAppBuildGradle(config, async (config) => {
    let appGradle = config.modResults.contents;

    // Read package.json version by traversing upwards until found
    let projectRoot = config.modRequest.projectRoot;
    let packageJsonPath = path.join(projectRoot, 'package.json');
    while (!fs.existsSync(packageJsonPath)) {
      const parent = path.dirname(projectRoot);
      if (parent === projectRoot) {
        break;
      }
      projectRoot = parent;
      packageJsonPath = path.join(projectRoot, 'package.json');
    }

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const versionName = packageJson.version;
      const versionCode = versionName.split('.').reduce((acc, val) => acc * 100 + parseInt(val, 10), 0);

      // Replace versionCode in build.gradle
      appGradle = appGradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);

      // Replace versionName in build.gradle
      appGradle = appGradle.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);
    }

    // Add versionNameSuffix in debug block if not present
    if (!appGradle.includes('versionNameSuffix "-debug"')) {
      appGradle = appGradle.replace(
        /debug\s*\{\s*signingConfig\s+signingConfigs\.debug/,
        'debug {\n            signingConfig signingConfigs.debug\n            versionNameSuffix "-debug"'
      );
    }

    config.modResults.contents = appGradle;
    return config;
  });
}

module.exports = function withAppConfiguration(config) {
  config = withAndroidJVMTarget(config);
  config = withAndroidManifestPackage(config);
  config = withAndroidGradleProperties(config);
  config = withAndroidProguardRules(config);
  config = withAndroidABISplits(config);
  config = withAndroidVersioning(config);
  return config;
};
