const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Ensure .tflite model files are bundled as assets
config.resolver.assetExts.push('tflite');

module.exports = withNativeWind(config, { input: "./app/global.css" });
