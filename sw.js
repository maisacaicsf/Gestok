/* =========================================
   GESTOK - SERVICE WORKER (PWA)
   -----------------------------------------
   - Páginas, CSS e JS: tenta a internet primeiro
     (sempre atualizado) e usa a cópia guardada
     se estiver sem conexão ou a rede estiver lenta.
   - Bibliotecas do Firebase (versão fixa): guarda
     e reaproveita (abre mais rápido).
   - Dados (Firestore, login, pagamentos): NUNCA
     passam por aqui, vão direto à internet.
   Para forçar atualização geral, troque VERSAO.
========================================= */

const VERSAO = "gestok-pwa-v1";
const CACHE_PAGINAS = VERSAO + "-paginas";
const CACHE_CDN = VERSAO + "-cdn";
const TEMPO_REDE_MS = 5000;

const PRE_CACHE = [
    "offline.html",
    "manifest.webmanifest",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/apple-touch-icon.png",
    "icons/favicon-32.png"
];

function deRaiz(caminho) {
    return new URL(caminho, self.registration.scope).href;
}

self.addEventListener("install", function (evento) {

    evento.waitUntil(
        caches.open(CACHE_PAGINAS)
            .then(function (cache) {
                return cache.addAll(PRE_CACHE.map(deRaiz));
            })
            .then(function () {
                return self.skipWaiting();
            })
    );

});

self.addEventListener("activate", function (evento) {

    evento.waitUntil(
        caches.keys()
            .then(function (chaves) {

                return Promise.all(
                    chaves
                        .filter(function (chave) {
                            return chave.indexOf("gestok-pwa-") === 0 && chave.indexOf(VERSAO) !== 0;
                        })
                        .map(function (chave) {
                            return caches.delete(chave);
                        })
                );

            })
            .then(function () {
                return self.clients.claim();
            })
    );

});

function comTempo(promessa, ms) {

    return new Promise(function (resolve, rejeitar) {

        const relogio = setTimeout(function () {
            rejeitar(new Error("tempo esgotado"));
        }, ms);

        promessa.then(
            function (valor) { clearTimeout(relogio); resolve(valor); },
            function (erro) { clearTimeout(relogio); rejeitar(erro); }
        );

    });

}

/* Internet primeiro; se falhar ou demorar, usa a cópia guardada */
async function redeOuCache(requisicao) {

    const cache = await caches.open(CACHE_PAGINAS);

    const rede = fetch(requisicao).then(function (resposta) {

        if (resposta && resposta.ok) {
            cache.put(requisicao, resposta.clone());
        }

        return resposta;

    });

    try {

        return await comTempo(rede, TEMPO_REDE_MS);

    } catch (erro) {

        const guardada =
            (await cache.match(requisicao)) ||
            (await cache.match(requisicao, { ignoreSearch: true }));

        if (guardada) {
            return guardada;
        }

        return rede; /* sem cópia: espera a rede de verdade */

    }

}

/* Cópia guardada primeiro (arquivos que nunca mudam, como o SDK versionado) */
async function cacheOuRede(requisicao, nomeCache) {

    const cache = await caches.open(nomeCache);

    const guardada = await cache.match(requisicao);

    if (guardada) {
        return guardada;
    }

    const resposta = await fetch(requisicao);

    if (resposta && (resposta.ok || resposta.type === "opaque")) {
        cache.put(requisicao, resposta.clone());
    }

    return resposta;

}

self.addEventListener("fetch", function (evento) {

    const requisicao = evento.request;

    if (requisicao.method !== "GET") {
        return;
    }

    const url = new URL(requisicao.url);

    /* SDK do Firebase (versão fixa na URL) */
    if (url.hostname === "www.gstatic.com" && url.pathname.indexOf("/firebasejs/") === 0) {

        evento.respondWith(cacheOuRede(requisicao, CACHE_CDN));

        return;

    }

    /* Todo o resto de outros endereços (banco, login, pagamentos...) vai direto */
    if (url.origin !== self.location.origin) {
        return;
    }

    if (requisicao.mode === "navigate") {

        evento.respondWith(
            redeOuCache(requisicao).catch(function () {
                return caches.match(deRaiz("offline.html"));
            })
        );

        return;

    }

    evento.respondWith(redeOuCache(requisicao));

});
