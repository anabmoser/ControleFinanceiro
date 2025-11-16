import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
  },Fix: Add environment variables configuration to ViewTransition.config.ts
  
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
