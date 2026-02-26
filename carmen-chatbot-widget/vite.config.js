import { defineConfig } from 'vite';

export default defineConfig({
  
  build: {
    lib: {
      entry: 'src/index.js', 
      name: 'CarmenBot',
      fileName: () => `carmen-widget.js`,
      formats: ['umd'], 
    },
  
    cssCodeSplit: false, 
  },
});