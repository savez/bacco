import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'dev-dist/**', '.specify/**', 'bacco/**'] },
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        __APP_VERSION__: 'readonly',
      },
    },
    rules: {
      'vue/no-v-html': 'error',
      'vue/multi-word-component-names': 'off',
      // Regole puramente di formattazione, in conflitto con uno stile più compatto;
      // la sostanza (correttezza, sicurezza, accessibilità) resta coperta dal resto.
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
    },
  },
]
