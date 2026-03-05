// O celular precisa ver isso para liberar a instalação
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Aplicativo Instalado');
});

// Isso permite que o app funcione mesmo se a internet oscilar no mercado
self.addEventListener('fetch', (e) => {
    // Para a versão Beta, deixamos ele vazio, mas o celular exige que ele exista!
});