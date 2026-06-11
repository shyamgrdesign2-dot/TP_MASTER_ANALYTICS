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
      // mini-css-extract-plugin emits "Conflicting order" warnings when CSS
      // modules and global CSS are imported in different orders across chunks.
      // They're harmless (the styles don't actually conflict), but Vercel runs
      // with CI=true, which makes CRA treat any warning as a build error. Tell
      // the plugin to ignore CSS ordering so the production build stays green.
      const miniCss = webpackConfig.plugins.find(
        (p) => p && p.constructor && p.constructor.name === 'MiniCssExtractPlugin'
      );
      if (miniCss) miniCss.options.ignoreOrder = true;

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
