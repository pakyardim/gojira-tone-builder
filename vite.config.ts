import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Binary preset/setting templates, imported with `?inline` (see src/lib/preset.ts, src/lib/modules.ts).
  assetsInclude: ['**/*.bin', '**/*.pst'],
})
