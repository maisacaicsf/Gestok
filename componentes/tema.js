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


/* =========================================
   GESTOK - TEMA SAZONAL (Black Friday, Natal, Ano Novo...)
   -----------------------------------------
   - O tema é escolhido pelo painel ADMIN (aba Temas) e
     gravado em configuracoes/tema no Firestore.
   - Aqui ele é lido pela API REST (não interfere no login
     nem no cache offline do Firestore) e aplicado em todas
     as telas: cor principal, faixa no topo e aviso rápido.
   - A última versão fica guardada neste aparelho, então o
     tema aparece na hora, antes mesmo da internet responder.
   - Convive com o modo claro/escuro do Perfil.
========================================= */

(function () {

    "use strict";

    if (window.gestokTemaSazonal) {
        return;
    }

    var CHAVE_CACHE = "gestok_tema_sazonal";
    var CHAVE_AVISO = "gestok_tema_sazonal_aviso";
    var INTERVALO_MS = 120000;
    var PROJETO = "gestok-3bce2";

    var raiz = document.documentElement;
    var temaAtual = null;
    var efeito = null;

    function corValida(c) {
        return typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);
    }

    function escurecer(hex, fator) {

        var n = parseInt(hex.slice(1), 16);
        var r = Math.round(((n >> 16) & 255) * (1 - fator));
        var g = Math.round(((n >> 8) & 255) * (1 - fator));
        var b = Math.round((n & 255) * (1 - fator));

        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);

    }

    function clarear(hex, fator) {

        var n = parseInt(hex.slice(1), 16);
        var r = Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * fator);
        var g = Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * fator);
        var b = Math.round((n & 255) + (255 - (n & 255)) * fator);

        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);

    }

    function lerCache() {

        try {
            return JSON.parse(localStorage.getItem(CHAVE_CACHE) || "null");
        } catch (e) {
            return null;
        }

    }

    function salvarCache(tema) {

        try {

            if (tema) {
                localStorage.setItem(CHAVE_CACHE, JSON.stringify(tema));
            } else {
                localStorage.removeItem(CHAVE_CACHE);
            }

        } catch (e) { }

    }

    function normalizar(tema) {

        if (!tema || !tema.ativo || tema.ativo === "padrao") {
            return null;
        }

        var c = tema.cores || {};

        if (!corValida(c.primaria)) {
            return null;
        }

        return {
            ativo: String(tema.ativo),
            nome: String(tema.nome || "").slice(0, 40),
            emoji: String(tema.emoji || "").slice(0, 8),
            cores: {
                primaria: c.primaria,
                destaque: corValida(c.destaque) ? c.destaque : c.primaria
            }
        };

    }

    function metaCor(cor) {

        var meta = document.querySelector('meta[name="theme-color"]');

        if (!meta) {
            return;
        }

        if (!meta.hasAttribute("data-original")) {
            meta.setAttribute("data-original", meta.getAttribute("content") || "");
        }

        meta.setAttribute("content", cor || meta.getAttribute("data-original"));

    }

    function removerElementos() {

        var ids = ["gkTemaFaixa", "gkTemaAviso", "gkTemaEfeito"];

        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }

    }

    function garantirEstilo() {

        if (document.getElementById("gkTemaSazonalEstilo")) {
            return;
        }

        var s = document.createElement("style");

        s.id = "gkTemaSazonalEstilo";

        s.textContent =
            "#gkTemaFaixa{position:fixed;top:0;left:0;right:0;height:5px;z-index:2147483000;pointer-events:none}" +
            "#gkTemaAviso{position:fixed;left:50%;bottom:22px;transform:translate(-50%,20px);opacity:0;z-index:2147483000;" +
            "padding:10px 18px;border-radius:99px;color:#fff;font:700 13px/1.2 Inter,-apple-system,Segoe UI,sans-serif;" +
            "box-shadow:0 8px 24px rgba(0,0,0,.22);pointer-events:none;transition:.4s ease;max-width:90vw;text-align:center}" +
            "#gkTemaAviso.on{opacity:1;transform:translate(-50%,0)}" +
            "#gkTemaEfeito{position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:2147482000}" +
            "#gkTemaEfeito span{position:absolute;top:-30px;opacity:.75;animation:gkQueda linear infinite}" +
            "@keyframes gkQueda{to{transform:translateY(112vh) rotate(360deg)}}" +
            "@media (prefers-reduced-motion:reduce){#gkTemaEfeito{display:none}}";

        (document.head || raiz).appendChild(s);

    }

    function desenhar() {

        removerElementos();

        if (!temaAtual || !document.body) {
            return;
        }

        garantirEstilo();

        var c = temaAtual.cores;

        var faixa = document.createElement("div");
        faixa.id = "gkTemaFaixa";
        faixa.style.background = "linear-gradient(90deg," + c.primaria + "," + c.destaque + "," + c.primaria + ")";
        document.body.appendChild(faixa);

        /* Efeito leve só para Natal e Ano Novo */
        var simbolo = temaAtual.ativo === "natal" ? "❄" : (temaAtual.ativo === "anonovo" ? "✨" : "");

        if (simbolo) {

            var caixa = document.createElement("div");
            caixa.id = "gkTemaEfeito";

            for (var i = 0; i < 14; i++) {

                var f = document.createElement("span");
                f.textContent = simbolo;
                f.style.left = (Math.random() * 100) + "%";
                f.style.fontSize = (12 + Math.random() * 14) + "px";
                f.style.animationDuration = (9 + Math.random() * 9) + "s";
                f.style.animationDelay = (-Math.random() * 14) + "s";
                caixa.appendChild(f);

            }

            document.body.appendChild(caixa);

        }

        /* Aviso rápido, uma vez por tema a cada visita ao app */
        var rotulo = (temaAtual.emoji ? temaAtual.emoji + " " : "") + temaAtual.nome;

        var jaMostrou = false;

        try {
            jaMostrou = sessionStorage.getItem(CHAVE_AVISO) === temaAtual.ativo;
        } catch (e) { }

        if (rotulo.trim() && !jaMostrou) {

            var aviso = document.createElement("div");
            aviso.id = "gkTemaAviso";
            aviso.textContent = rotulo + " no Gestok!";
            aviso.style.background = c.primaria;
            document.body.appendChild(aviso);

            setTimeout(function () { aviso.classList.add("on"); }, 400);
            setTimeout(function () { aviso.classList.remove("on"); }, 4500);
            setTimeout(function () {
                if (aviso.parentNode) { aviso.parentNode.removeChild(aviso); }
            }, 5200);

            try {
                sessionStorage.setItem(CHAVE_AVISO, temaAtual.ativo);
            } catch (e) { }

        }

    }

    function aplicar(tema) {

        temaAtual = normalizar(tema);

        if (!temaAtual) {

            raiz.style.removeProperty("--gk-primaria");
            raiz.style.removeProperty("--gk-primaria-escura");
            raiz.style.removeProperty("--gk-primaria-clara");
            raiz.style.removeProperty("--gk-primaria-borda");
            raiz.style.removeProperty("--gk-primaria-media");
            raiz.style.removeProperty("--gk-primaria-escura2");
            raiz.style.removeProperty("--gk-primaria-rgb");
            metaCor(null);
            removerElementos();
            return;

        }

        raiz.style.setProperty("--gk-primaria", temaAtual.cores.primaria);
        raiz.style.setProperty("--gk-primaria-escura", escurecer(temaAtual.cores.primaria, 0.15));
        raiz.style.setProperty("--gk-primaria-clara", clarear(temaAtual.cores.primaria, 0.92));
        raiz.style.setProperty("--gk-primaria-borda", clarear(temaAtual.cores.primaria, 0.78));
        raiz.style.setProperty("--gk-primaria-media", clarear(temaAtual.cores.primaria, 0.25));
        raiz.style.setProperty("--gk-primaria-escura2", escurecer(temaAtual.cores.primaria, 0.3));
        raiz.style.setProperty("--gk-primaria-rgb", parseInt(temaAtual.cores.primaria.slice(1, 3), 16) + "," +
            parseInt(temaAtual.cores.primaria.slice(3, 5), 16) + "," + parseInt(temaAtual.cores.primaria.slice(5, 7), 16));
        metaCor(temaAtual.cores.primaria);

        if (document.body) {
            desenhar();
        }

    }

    function campo(f, nome) {
        return f && f[nome] && typeof f[nome].stringValue === "string" ? f[nome].stringValue : "";
    }

    function buscar() {

        var chave = "";

        try {
            chave = (typeof firebaseConfig !== "undefined" && firebaseConfig.apiKey) || "";
        } catch (e) { }

        if (!chave || !navigator.onLine) {
            return;
        }

        var url = "https://firestore.googleapis.com/v1/projects/" + PROJETO +
            "/databases/(default)/documents/configuracoes/tema?key=" + encodeURIComponent(chave);

        fetch(url, { cache: "no-store" })
            .then(function (r) {

                if (r.status === 404) {
                    return { fields: null };
                }

                if (!r.ok) {
                    throw new Error("HTTP " + r.status);
                }

                return r.json();

            })
            .then(function (doc) {

                var f = doc.fields;
                var novo = null;

                if (f) {

                    var cores = (f.cores && f.cores.mapValue && f.cores.mapValue.fields) || {};

                    novo = {
                        ativo: campo(f, "ativo"),
                        nome: campo(f, "nome"),
                        emoji: campo(f, "emoji"),
                        cores: {
                            primaria: campo(cores, "primaria"),
                            destaque: campo(cores, "destaque")
                        }
                    };

                }

                var final = normalizar(novo);

                /* só redesenha se algo mudou */
                if (JSON.stringify(final) !== JSON.stringify(temaAtual)) {
                    aplicar(final);
                }

                salvarCache(final);

            })
            .catch(function () {
                /* sem rede ou sem permissão: continua com o tema guardado */
            });

    }

    window.gestokTemaSazonal = {
        atualizar: buscar,
        atual: function () { return temaAtual; }
    };

    /* 1) aplica na hora o que está guardado (antes de a página aparecer) */
    aplicar(lerCache());

    /* 2) quando o corpo da página existir, desenha faixa/efeitos e consulta o servidor */
    function iniciar() {

        desenhar();

        setTimeout(buscar, 600);
        setInterval(function () {
            if (!document.hidden) { buscar(); }
        }, INTERVALO_MS);

        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) { buscar(); }
        });

        window.addEventListener("online", buscar);

    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar);
    } else {
        iniciar();
    }

})();
