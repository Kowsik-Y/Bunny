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
    config.modResults.manifest.$['package'] = 'com.kowsiky.Bunny';
    return config;
  });
}

function withAndroidGradleProperties(config) {
  return withGradleProperties(config, (config) => {
    const propertiesToAdd = [
      { key: 'android.enableMinifyInReleaseBuilds', value: 'true' },
      { key: 'android.enableShrinkResourcesInReleaseBuilds', value: 'true' },
      { key: 'org.gradle.jvmargs', value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+UseG1GC' }
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
        '-keep class com.kowsiky.Bunny.** { *; }'
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
            include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
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
