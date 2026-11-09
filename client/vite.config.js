import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa';
export default defineConfig({
 build:{manifest:true},
 plugins:[react(),VitePWA({
  strategies:'injectManifest',srcDir:'src',filename:'sw.js',registerType:'autoUpdate',
  injectManifest:{globPatterns:['index.html','manifest.webmanifest','wake.js','icons/*.{png,svg,ico}'],maximumFileSizeToCacheInBytes:6000000},
  devOptions:{enabled:true,type:'module'},
  manifest:{id:'/',name:'Zepter Management Overview',short_name:'Zepter Overview',description:'Interni pregled sektora, projekata i aktivnosti',
   lang:'sr-Latn',start_url:'/',display:'standalone',scope:'/',background_color:'#FFFFFF',theme_color:'#FFFFFF',
   icons:[{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any maskable'},
          {src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]}
 })],
 server:{port:5173,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:4000',changeOrigin:true},'/socket.io':{target:'http://127.0.0.1:4000',ws:true,changeOrigin:true}}}
});
