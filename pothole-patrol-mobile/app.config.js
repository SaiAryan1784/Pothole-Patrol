module.exports = {
  expo: {
    name: "Pothole Patrol",
    slug: "pothole-patrol-mobile",
    cli: {
      appVersionSource: "remote"
    },
    owner: "saiaryan1784",
    version: "1.0.0",
    extra: {
      eas: {
        projectId: "c6a71cbd-fcbc-4705-8734-b98b655b2a78"
      }
    },
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.saiaryan1784"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundColor: "#ffffff"
      },
      package: "com.saiaryan1784",
      googleServicesFile: "./google-services.json",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ],
      "expo-location",
      "expo-camera",
      "@react-native-firebase/app"
    ],
    experiments: {
      typedRoutes: true
    }
  }
};
