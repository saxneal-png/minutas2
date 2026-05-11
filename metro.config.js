const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Solución para el error "node:sea" en Windows
// Evita que Metro intente crear carpetas con ":" en la ruta .expo/metro/externals
if (config.resolver) {
  config.resolver.unstable_enablePackageExports = false;
  // Forzar que no intente resolver nada con el prefijo node:
  config.resolver.blockList = [
    /node:sea/,
    /node:fs/,
    /node:path/
  ];
}

module.exports = config;
