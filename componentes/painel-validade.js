/* =========================================
   GESTOK - PAINEL "PRÓXIMOS DA VALIDADE"
   Lista no dashboard os lotes vencidos ou que
   vencem em até 30 dias. Usa os dados já
   calculados pelo aviso-validade.js.
========================================= */

(function () {

    "use strict";

    if (window.location.pathname.toLowerCase().indexOf("/sistema/") === -1) {
        return;
    }

    var LIMITE_DIAS = 30;

    function esc(texto) {

        return String(texto == null ? "" : texto).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
        });

    }

    function renderizar(linhas) {

        var vazio = document.getElementById("validadeEmptyState");
        var lista = document.getElementById("validadeProductsList");
        var contador = document.getElementById("validadeCount");

        if (!vazio || !lista) {
            return;
        }

        var itens = linhas.filter(function (l) {
            return l.dias !== null && l.dias <= LIMITE_DIAS;
        }).sort(function (a, b) {
            return a.dias - b.dias;
        });

        if (contador) {
            contador.textContent = itens.length;
        }

        lista.innerHTML = "";

        if (!itens.length) {

            vazio.innerHTML =
                '<div class="empty-icon success">✓</div>' +
                "<strong>Tudo certo!</strong>" +
                "<span>Nenhum produto vencido ou perto de vencer.</span>";

        }

        vazio.style.display = itens.length ? "none" : "flex";

        itens.forEach(function (l) {

            var p = l.produto || {};

            var unidade = p.unidade || "UN";

            var detalhes = [];

            if (p.codigo) {
                detalhes.push("Código: " + esc(p.codigo));
            }

            if (l.lote) {
                detalhes.push("Lote: " + esc(l.lote));
            }

            var card = document.createElement("div");

            card.className = "alert-product-card validade-card v-" + l.situacao;

            card.innerHTML =
                '<div class="alert-product-top">' +
                    '<div class="alert-product-icon">!</div>' +
                    '<div class="alert-product-name">' +
                        "<strong>" + esc(p.nome || "Produto sem nome") + "</strong>" +
                        (detalhes.length ? "<small>" + detalhes.join(" · ") + "</small>" : "") +
                    "</div>" +
                "</div>" +
                '<div class="alert-product-details">' +
                    "<div><span>Validade</span><strong>" + esc(window.GestokValidade.formatarData(l.validade)) + "</strong></div>" +
                    "<div><span>Quantidade</span><strong>" +
                        esc(Number(l.quantidade).toLocaleString("pt-BR")) + " " + esc(unidade) +
                    "</strong></div>" +
                "</div>" +
                '<div class="alert-product-warning">⚠ ' + esc(window.GestokValidade.rotuloDias(l.dias)) + "</div>";

            lista.appendChild(card);

        });

    }

    function mostrarErro() {

        var vazio = document.getElementById("validadeEmptyState");

        if (!vazio) {
            return;
        }

        vazio.innerHTML =
            '<div class="empty-icon">!</div>' +
            "<strong>Não foi possível verificar</strong>" +
            "<span>Abra a tela de Validade para conferir.</span>";

        vazio.style.display = "flex";

    }

    document.addEventListener("gestok:validade-erro", mostrarErro);

    document.addEventListener("gestok:validade-calculada", function (e) {

        renderizar((e.detail && e.detail.linhas) || []);

    });

    if (Array.isArray(window.GestokValidadeLinhas)) {
        renderizar(window.GestokValidadeLinhas);
    }

})();
