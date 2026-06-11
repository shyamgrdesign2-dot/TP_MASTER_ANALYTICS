const path = require('path');

module.exports = {
  // Tailwind (scoped to src/pages/analytics via tailwind.config.js content + preflight off)
  // is injected into CRA 5's PostCSS chain. CRA stores postcssOptions.plugins in a
  // shape craco's `plugins` array-concat path doesn't reliably extend, so we use the
  // loaderOptions function and force-prepend tailwindcss + autoprefixer (prepend so
  // @tailwind directives expand before postcss-preset-env runs).
  style: {
    postcss: {
      loaderOptions: (opts) => {
        const tailwindcss = require('tailwindcss');
        const autoprefixer = require('autoprefixer');
        opts.postcssOptions = opts.postcssOptions || {};
        let base = opts.postcssOptions.plugins;
        base = typeof base === 'function' ? base() : (Array.isArray(base) ? base : []);
        opts.postcssOptions.plugins = [tailwindcss, autoprefixer, ...base];
        return opts;
      },
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      // @cloudflare/realtimekit ships both ESM (dist/index.es.js) and CJS (dist/index.cjs.js).
      // CRA 5's outside-app Babel loader applies @babel/plugin-transform-parameters but NOT
      // @babel/plugin-transform-classes, which crashes on super() in arrow functions with rest
      // params present in the ESM build. Aliasing to the CJS build avoids the transform entirely.
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        '@cloudflare/realtimekit': path.resolve(
          __dirname,
          'node_modules/@cloudflare/realtimekit/dist/index.es5.js'
        ),
      };
      return webpackConfig;
    },
  },
};
