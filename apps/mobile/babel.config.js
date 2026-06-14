module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
          },
        },
      ],
      // NOTE: react-native-reanimated/worklets needs a Babel plugin, but on
      // Expo SDK 54 `babel-preset-expo` adds it automatically — do NOT add it
      // here as well, or it will be registered twice and the build will fail.
    ],
  };
};
