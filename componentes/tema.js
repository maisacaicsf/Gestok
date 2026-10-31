/* =========================================
   GESTOK - TEMA (claro / escuro / automático)
   -----------------------------------------
   - A escolha é feita no Perfil > Aparência e
     fica salva neste navegador.
   - É aplicado ANTES da página aparecer (sem
     "piscar" branco) e vale para todas as telas.
   - Funciona invertendo as cores da interface
     (imagens e vídeos são mantidos como estão).
   - API: gestokTema.definir("claro" | "escuro" | "automatico")
========================================= */

(function () {

    "use strict";

    if (window.gestokTema) {
        return;
    }

    var CHAVE = "gestok_tema";

    var raiz = document.documentElement;

    function lerModo() {

        try {

            var valor = localStorage.getItem(CHAVE);

            return valor === "escuro" || valor === "automatico" ? valor : "claro";

        } catch (e) {

            return "claro";

        }

    }

    function sistemaEscuro() {

        return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);

    }

    function aplicar(modo) {

        var escuro = modo === "escuro" || (modo === "automatico" && sistemaEscuro());

        if (escuro) {
            raiz.setAttribute("data-tema", "escuro");
        } else {
            raiz.removeAttribute("data-tema");
        }

    }

    /* ---------- estilo do tema escuro ---------- */

    var estilo = document.createElement("style");

    estilo.id = "gestokTemaEstilo";

    estilo.textContent =
        'html[data-tema="escuro"]{filter:invert(.9) hue-rotate(180deg);background:#fff}' +
        'html[data-tema="escuro"] img,' +
        'html[data-tema="escuro"] video,' +
        'html[data-tema="escuro"] picture,' +
        'html[data-tema="escuro"] canvas,' +
        'html[data-tema="escuro"] iframe,' +
        'html[data-tema="escuro"] .tema-previa,' +
        'html[data-tema="escuro"] .gk-sem-tema{filter:hue-rotate(180deg) invert(1) contrast(1.25)}' +
        'html[data-tema="escuro"] [class*="overlay"]{background-color:rgba(255,255,255,.55)!important}';

    (document.head || raiz).appendChild(estilo);

    aplicar(lerModo());

    /* ---------- opções na tela de Perfil ---------- */

    var MENSAGENS = {
        claro: "Tema claro ativado.",
        escuro: "Tema escuro ativado.",
        automatico: "Tema automático ativado. Ele acompanha o seu dispositivo."
    };

    function marcarOpcoes() {

        var atual = lerModo();

        var opcoes = document.querySelectorAll("[data-tema-opcao]");

        for (var i = 0; i < opcoes.length; i++) {

            var ativa = opcoes[i].getAttribute("data-tema-opcao") === atual;

            opcoes[i].classList.toggle("ativo", ativa);

            opcoes[i].setAttribute("aria-checked", ativa ? "true" : "false");

        }

    }

    function definir(modo) {

        if (modo !== "escuro" && modo !== "automatico") {
            modo = "claro";
        }

        try {
            localStorage.setItem(CHAVE, modo);
        } catch (e) { }

        aplicar(modo);

        marcarOpcoes();

    }

    window.gestokTema = {
        obter: lerModo,
        definir: definir,
        escuroAtivo: function () {
            return raiz.getAttribute("data-tema") === "escuro";
        }
    };

    /* "Automático": acompanha o sistema operacional em tempo real */
    if (window.matchMedia) {

        var consulta = window.matchMedia("(prefers-color-scheme: dark)");

        var aoMudarSistema = function () {

            if (lerModo() === "automatico") {
                aplicar("automatico");
            }

        };

        if (consulta.addEventListener) {
            consulta.addEventListener("change", aoMudarSistema);
        } else if (consulta.addListener) {
            consulta.addListener(aoMudarSistema);
        }

    }

    /* Outras abas abertas acompanham a mudança */
    window.addEventListener("storage", function (evento) {

        if (evento.key === CHAVE) {

            aplicar(lerModo());

            marcarOpcoes();

        }

    });

    function iniciarOpcoes() {

        var opcoes = document.querySelectorAll("[data-tema-opcao]");

        if (!opcoes.length) {
            return;
        }

        marcarOpcoes();

        for (var i = 0; i < opcoes.length; i++) {

            opcoes[i].addEventListener("click", function (evento) {

                var modo = evento.currentTarget.getAttribute("data-tema-opcao");

                definir(modo);

                if (typeof window.gestokNotificar === "function") {
                    window.gestokNotificar(MENSAGENS[lerModo()], "sucesso");
                }

            });

        }

    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciarOpcoes);
    } else {
        iniciarOpcoes();
    }

})();
