/* =========================================
   GESTOK - NOTIFICAÇÕES (PADRÃO ÚNICO)
   -----------------------------------------
   Mensagens no canto inferior direito, no
   mesmo estilo do aviso de "Chamado enviado".

   - Substitui automaticamente os alert() do
     sistema (não bloqueia a tela).
   - Também pode ser chamada direto:
       gestokNotificar("Texto", "sucesso");
     tipos: sucesso | erro | aviso | info
     (sem o tipo, ele descobre pelo texto)
   - Se a página mudar logo depois da
     mensagem, ela continua na página seguinte.
========================================= */

(function () {

    if (window.gestokNotificar) {
        return;
    }

    var ID_AREA = "gestokToastArea";
    var ID_ESTILO = "gestokToastEstilo";
    var CHAVE_PENDENTE = "gestok_toast_pendente";

    var TIPOS = {
        sucesso: { icone: "✓", fundo: "#ecfdf3", cor: "#16a34a" },
        erro: { icone: "✕", fundo: "#fef2f2", cor: "#dc2626" },
        aviso: { icone: "!", fundo: "#fffbeb", cor: "#d97706" },
        info: { icone: "i", fundo: "#eff6ff", cor: "#2563eb" }
    };

    var ultimaExibicao = null;


    function detectarTipo(texto) {

        var t = String(texto || "").toLowerCase();

        if (/n[ãa]o foi poss[íi]vel|erro|falha|inv[áa]lid|incorret|expirou|inexistente|inativ|negad|tente novamente|n[ãa]o encontrad|bloquead|insuficiente|sem permiss/.test(t)) {
            return "erro";
        }

        if (/digite|informe|preencha|selecione|escolha|j[áa] existe|obrigat[óo]ri|precisa|aten[çc][ãa]o|confira|maior que|menor que/.test(t)) {
            return "aviso";
        }

        if (/sucesso|cadastrad|atualizad|registrad|salv|exclu[íi]d|criad|enviad|conclu[íi]d|ativad|alterad|copiad/.test(t)) {
            return "sucesso";
        }

        return "info";

    }


    function injetarEstilo() {

        if (document.getElementById(ID_ESTILO)) {
            return;
        }

        var estilo = document.createElement("style");

        estilo.id = ID_ESTILO;

        estilo.textContent =
            "#" + ID_AREA + "{position:fixed;right:22px;bottom:22px;z-index:20000;display:flex;" +
            "flex-direction:column;gap:10px;align-items:flex-end;pointer-events:none;" +
            "width:min(380px,calc(100% - 32px));}" +
            ".gestok-toast{pointer-events:auto;display:flex;align-items:center;gap:11px;width:100%;" +
            "padding:13px 15px;background:#fff;border:1px solid #e5eaf1;border-radius:12px;" +
            "box-shadow:0 15px 40px rgba(15,23,42,.14);animation:gestokToastIn .25s ease;" +
            "transition:opacity .25s ease,transform .25s ease;box-sizing:border-box;cursor:pointer;}" +
            ".gestok-toast.saindo{opacity:0;transform:translateY(10px);}" +
            ".gestok-toast .toast-icon{width:30px;height:30px;border-radius:8px;display:flex;" +
            "align-items:center;justify-content:center;font-weight:700;flex-shrink:0;}" +
            ".gestok-toast .toast-content{min-width:0;}" +
            ".gestok-toast .toast-content strong{display:block;color:#1e293b;font-size:11px;margin-bottom:2px;}" +
            ".gestok-toast .toast-content span{display:block;color:#64748b;font-size:10px;line-height:1.4;" +
            "white-space:pre-line;word-break:break-word;}" +
            "[data-gk-toast]{display:none!important;}" +
            "@keyframes gestokToastIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}" +
            "@media (prefers-reduced-motion:reduce){.gestok-toast{animation:none;transition:none;}}";

        (document.head || document.documentElement).appendChild(estilo);

    }


    function obterArea() {

        var area = document.getElementById(ID_AREA);

        if (!area) {

            area = document.createElement("div");

            area.id = ID_AREA;

            area.setAttribute("aria-live", "polite");

            (document.body || document.documentElement).appendChild(area);

        }

        return area;

    }


    function fechar(toast) {

        if (!toast || !toast.parentNode) {
            return;
        }

        toast.classList.add("saindo");

        setTimeout(function () {

            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }

        }, 260);

    }


    function exibir(mensagem, tipo) {

        var texto = String(mensagem === undefined || mensagem === null ? "" : mensagem).trim();

        if (!texto) {
            return;
        }

        var cfg = TIPOS[tipo] || TIPOS[detectarTipo(texto)];

        injetarEstilo();

        var area = obterArea();

        /* No máximo 4 mensagens ao mesmo tempo */
        while (area.children.length >= 4) {
            area.removeChild(area.firstChild);
        }

        var toast = document.createElement("div");

        toast.className = "gestok-toast";

        toast.setAttribute("role", "status");

        var icone = document.createElement("div");

        icone.className = "toast-icon";

        icone.textContent = cfg.icone;

        icone.style.background = cfg.fundo;

        icone.style.color = cfg.cor;

        var conteudo = document.createElement("div");

        conteudo.className = "toast-content";

        var titulo = document.createElement("strong");

        titulo.textContent = "Gestok";

        var corpo = document.createElement("span");

        corpo.textContent = texto;

        conteudo.appendChild(titulo);

        conteudo.appendChild(corpo);

        toast.appendChild(icone);

        toast.appendChild(conteudo);

        toast.addEventListener("click", function () {
            fechar(toast);
        });

        area.appendChild(toast);

        var duracao = Math.min(8000, 3500 + texto.length * 35);

        if (cfg === TIPOS.erro) {
            duracao = Math.min(9000, duracao + 1500);
        }

        ultimaExibicao = { mensagem: texto, tipo: tipo || detectarTipo(texto), quando: Date.now() };

        setTimeout(function () {
            fechar(toast);
        }, duracao);

    }


    /* Se a página mudar logo após a mensagem, mostra de novo na próxima */
    window.addEventListener("pagehide", function () {

        try {

            if (ultimaExibicao && Date.now() - ultimaExibicao.quando < 3000) {

                sessionStorage.setItem(CHAVE_PENDENTE, JSON.stringify(ultimaExibicao));

            }

        } catch (erro) { }

    });


    function mostrarPendente() {

        try {

            var bruto = sessionStorage.getItem(CHAVE_PENDENTE);

            if (!bruto) {
                return;
            }

            sessionStorage.removeItem(CHAVE_PENDENTE);

            var dados = JSON.parse(bruto);

            if (dados && dados.mensagem && Date.now() - dados.quando < 8000) {

                exibir(dados.mensagem, dados.tipo);

            }

        } catch (erro) { }

    }


    /* Mensagens "coladas" na tela (ex.: erro do login, "Dados salvos!")
       também viram notificação no mesmo padrão. */
    function espelharMensagem(elemento) {

        if (!elemento || elemento.__gkEspelho) {
            return;
        }

        elemento.__gkEspelho = true;

        elemento.setAttribute("data-gk-toast", "1");

        var observador = new MutationObserver(function (registros) {

            var mudouTexto = registros.some(function (r) {
                return r.type === "childList" || r.type === "characterData";
            });

            if (!mudouTexto) {
                return;
            }

            var texto = String(elemento.textContent || "").trim();

            if (!texto) {
                return;
            }

            var classes = String(elemento.className || "");

            var tipo = /error|danger/.test(classes)
                ? "erro"
                : (/success/.test(classes) ? "sucesso" : undefined);

            exibir(texto, tipo);

        });

        observador.observe(elemento, {
            childList: true,
            characterData: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class"]
        });

    }

    function espelharMensagensDaPagina() {

        var lista = document.querySelectorAll(
            ".form-message, .payment-message, .password-status, .reply-status, #savedMessage"
        );

        for (var i = 0; i < lista.length; i++) {
            espelharMensagem(lista[i]);
        }

    }

    window.gestokEspelharMensagem = espelharMensagem;

    window.gestokNotificar = exibir;

    /* Todos os alert() do sistema passam a usar este padrão */
    window.__alertNativoGestok = window.alert;

    window.alert = function (mensagem) {
        exibir(mensagem);
    };

    if (document.readyState === "loading") {

        document.addEventListener("DOMContentLoaded", function () {

            espelharMensagensDaPagina();

            mostrarPendente();

        });

    } else {

        espelharMensagensDaPagina();

        mostrarPendente();

    }

})();
