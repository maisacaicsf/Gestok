/* =========================================
   GESTOK - APLICATIVO (PWA)
   -----------------------------------------
   - Registra o service worker (offline e
     abertura mais rápida).
   - Controla o botão "Instalar o Gestok"
     (cartão Aplicativo no Perfil e aviso
     no painel).
   Só funciona em endereço seguro (https)
   ou em localhost.
========================================= */

(function () {

    "use strict";

    var scriptAtual = document.currentScript && document.currentScript.src;

    var CHAVE_AVISO = "gestok_pwa_aviso_fechado";

    var eventoInstalacao = null;

    function seguro() {

        return window.location.protocol === "https:" ||
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1";

    }

    function instaladoComoApp() {

        return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
            window.navigator.standalone === true;

    }

    function ehIOS() {

        return /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
            (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

    }

    /* ---------- service worker ---------- */

    if ("serviceWorker" in navigator && seguro() && scriptAtual) {

        window.addEventListener("load", function () {

            navigator.serviceWorker
                .register(new URL("../sw.js", scriptAtual).href, { scope: new URL("../", scriptAtual).href })
                .catch(function (erro) {
                    console.warn("Service worker não registrado:", erro);
                });

        });

    }

    /* ---------- cartão no Perfil ---------- */

    function atualizarCartao() {

        var estado = document.querySelector("[data-pwa-estado]");

        var botao = document.querySelector("[data-pwa-botao]");

        if (!estado || !botao) {
            return;
        }

        var mostrarBotao = false;

        if (instaladoComoApp()) {

            estado.textContent = "✓ O Gestok já está instalado e aberto como aplicativo neste aparelho.";

        } else if (eventoInstalacao) {

            estado.textContent = "Instale o Gestok para abrir direto da tela inicial, em tela cheia, como um aplicativo.";

            mostrarBotao = true;

        } else if (!seguro()) {

            estado.textContent = "Para instalar, o Gestok precisa estar publicado em um endereço seguro (https).";

        } else if (ehIOS()) {

            estado.textContent = "No iPhone ou iPad (Safari): toque em Compartilhar e depois em “Adicionar à Tela de Início”.";

        } else {

            estado.textContent = "Use o menu do navegador (⋮) e escolha “Instalar app” ou “Adicionar à tela inicial”.";

        }

        botao.style.display = mostrarBotao ? "" : "none";

    }

    function instalar() {

        if (!eventoInstalacao) {
            return Promise.resolve(false);
        }

        eventoInstalacao.prompt();

        return eventoInstalacao.userChoice.then(function (resultado) {

            eventoInstalacao = null;

            atualizarCartao();

            removerAviso();

            return resultado.outcome === "accepted";

        });

    }

    /* ---------- aviso no painel ---------- */

    function removerAviso() {

        var aviso = document.getElementById("gestokAvisoInstalar");

        if (aviso) {
            aviso.remove();
        }

    }

    /* Publicidades do próprio Gestok (uma é sorteada a cada abertura do painel). */
    var PUBLIS = [
        { icone: "🚀", titulo: "Gestok Premium", texto: "Mais produtos, mais operadores e relatórios completos para o seu negócio crescer.", botao: "Ver planos", link: "../planos/index.html" },
        { icone: "📊", titulo: "Decida com dados", texto: "Veja no Gestok o que mais vende, o que está parado e o que precisa repor.", botao: "Ver relatórios", link: "../relatorios/index.html" },
        { icone: "⏰", titulo: "Controle de validade", texto: "Evite perdas: o Gestok avisa antes dos produtos vencerem.", botao: "Ver validades", link: "../validade/index.html" }
    ];

    var AVISO_INSTALAR = { icone: "📲", titulo: "Instale o Gestok no seu aparelho", texto: "para abrir mais rápido, em tela cheia.", instalar: true };

    var CHAVE_ROTACAO = "gestok_aviso_rotacao";

    var contadorAviso = 0;

    /* Alterna a cada abertura do painel: publi, instalar, publi, instalar...
       O aviso de instalar só vale quando o navegador permite instalar. */
    function escolherAviso() {

        var publi = PUBLIS[Math.floor(contadorAviso / 2) % PUBLIS.length];

        if (contadorAviso % 2 === 1 && eventoInstalacao && !instaladoComoApp()) {
            return AVISO_INSTALAR;
        }

        return publi;

    }

    function desenharAviso() {

        var caixa = document.getElementById("gestokAvisoInstalar");

        if (!caixa) {
            return;
        }

        var item = escolherAviso();

        var texto = caixa.querySelector("[data-aviso-texto]");
        var link = caixa.querySelector("[data-aviso-link]");
        var botao = caixa.querySelector("[data-aviso-instalar]");

        texto.innerHTML = "<strong>" + item.icone + " " + item.titulo + "</strong>" +
            (item.instalar ? " " : " — ") + item.texto +
            (item.instalar ? "" : " <span style=\"font-size:11px;opacity:.6;\">Publicidade Gestok</span>");

        if (item.instalar) {
            link.style.display = "none";
            botao.style.display = "inline-flex";
            botao.textContent = "Instalar";
        } else {
            botao.style.display = "none";
            link.style.display = "inline-flex";
            link.href = item.link;
            link.textContent = item.botao;
        }

    }

    /* Chamado quando o navegador libera a instalação (pode chegar depois do banner). */
    function atualizarBotaoInstalarAviso() {
        desenharAviso();
    }

    function mostrarAvisoPainel() {

        try {

            if (window.location.pathname.toLowerCase().indexOf("/sistema/") === -1 ||
                localStorage.getItem(CHAVE_AVISO) === "1") {
                return;
            }

        } catch (e) {
            return;
        }

        var principal = document.querySelector("main.main-content");

        if (!principal || document.getElementById("gestokAvisoInstalar")) {
            return;
        }

        var caixa = document.createElement("div");

        caixa.id = "gestokAvisoInstalar";

        caixa.style.cssText =
            "display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;" +
            "margin:0 0 20px;padding:14px 18px;border-radius:14px;font-size:14px;line-height:1.55;" +
            "border:1px solid var(--gk-primaria-borda,#cfe0fb);background:linear-gradient(90deg,var(--gk-primaria-clara,#eef5ff),#f5f0ff);color:var(--gk-primaria-escura2,#1e3a6e);";

        var texto = document.createElement("div");

        texto.setAttribute("data-aviso-texto", "");

        var acoes = document.createElement("div");

        acoes.style.cssText = "display:flex;align-items:center;justify-content:center;gap:8px;flex-shrink:0;margin-left:auto;";

        var estiloBotao =
            "height:36px;padding:0 18px;border:0;border-radius:9px;background:var(--gk-primaria,#2563eb);color:#fff;box-sizing:border-box;" +
            "font-family:inherit;font-size:13px;font-weight:700;line-height:1;cursor:pointer;white-space:nowrap;" +
            "display:inline-flex;align-items:center;justify-content:center;text-decoration:none;";

        var saibaMais = document.createElement("a");

        saibaMais.setAttribute("data-aviso-link", "");

        saibaMais.style.cssText = estiloBotao;

        var instalarBtn = document.createElement("button");

        instalarBtn.type = "button";

        instalarBtn.setAttribute("data-aviso-instalar", "");

        instalarBtn.style.cssText = estiloBotao + "display:none;";

        instalarBtn.addEventListener("click", instalar);

        var fechar = document.createElement("button");

        fechar.type = "button";

        fechar.setAttribute("aria-label", "Fechar aviso");

        fechar.textContent = "×";

        fechar.style.cssText =
            "border:0;background:transparent;color:inherit;font-size:22px;line-height:1;cursor:pointer;padding:0 4px;";

        fechar.addEventListener("click", function () {

            removerAviso();

            try {
                localStorage.setItem(CHAVE_AVISO, "1");
            } catch (e) { }

        });

        acoes.appendChild(saibaMais);

        acoes.appendChild(instalarBtn);

        acoes.appendChild(fechar);

        caixa.appendChild(texto);

        caixa.appendChild(acoes);

        principal.insertBefore(caixa, principal.firstChild);

        try {
            contadorAviso = parseInt(localStorage.getItem(CHAVE_ROTACAO) || "0", 10) || 0;
            localStorage.setItem(CHAVE_ROTACAO, String(contadorAviso + 1));
        } catch (e) {
            contadorAviso = 0;
        }

        desenharAviso();

    }

    /* ---------- eventos do navegador ---------- */

    window.addEventListener("beforeinstallprompt", function (evento) {

        evento.preventDefault();

        eventoInstalacao = evento;

        atualizarCartao();

        atualizarBotaoInstalarAviso();

    });

    window.addEventListener("appinstalled", function () {

        eventoInstalacao = null;

        atualizarCartao();

        removerAviso();

        if (typeof window.gestokNotificar === "function") {
            window.gestokNotificar("Gestok instalado com sucesso!", "sucesso");
        }

    });

    function iniciar() {

        var botao = document.querySelector("[data-pwa-botao]");

        if (botao) {
            botao.addEventListener("click", instalar);
        }

        atualizarCartao();

        mostrarAvisoPainel();

    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar);
    } else {
        iniciar();
    }

    window.gestokPWA = {
        instalar: instalar,
        podeInstalar: function () { return !!eventoInstalacao; },
        instalado: instaladoComoApp
    };

})();
