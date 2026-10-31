/* =========================================
   GESTOK - AVISO DE VALIDADE (painel)
   Mostra no painel quantos lotes já venceram
   ou vencem nos próximos 7 dias.
========================================= */

(function () {

    "use strict";

    if (window.location.pathname.toLowerCase().indexOf("/sistema/") === -1) {
        return;
    }

    function esperarDados(usuario) {

        var lojaId = typeof obterLojaAtualGestok === "function"
            ? obterLojaAtualGestok()
            : null;

        Promise.resolve(lojaId).then(function (id) {

            if (!id || typeof referenciaLotes !== "function") {
                return;
            }

            return Promise.all([
                referenciaProdutos(id).get(),
                referenciaLotes(id).get()
            ]).then(function (resultado) {

                var produtos = resultado[0].docs.map(function (d) {
                    return Object.assign({ id: d.id }, d.data());
                });

                var lotes = resultado[1].docs.map(function (d) {
                    return Object.assign({ id: d.id }, d.data());
                });

                mostrarAviso(window.GestokValidade.calcular(lotes, produtos).linhas);

            });

        }).catch(function () { });

    }

    function mostrarAviso(linhas) {

        var vencidos = linhas.filter(function (l) { return l.dias !== null && l.dias < 0; });

        var proximos = linhas.filter(function (l) { return l.dias !== null && l.dias >= 0 && l.dias <= 7; });

        if (!vencidos.length && !proximos.length) {
            return;
        }

        try {

            if (sessionStorage.getItem("gestok_aviso_validade_fechado") === "1") {
                return;
            }

        } catch (e) { }

        var principal = document.querySelector("main.main-content");

        if (!principal || document.getElementById("gestokAvisoValidade")) {
            return;
        }

        var emRisco = vencidos.concat(proximos).reduce(function (s, l) { return s + l.valor; }, 0);

        var partes = [];

        if (vencidos.length) {
            partes.push("<strong>" + vencidos.length + (vencidos.length === 1 ? " lote vencido" : " lotes vencidos") + "</strong>");
        }

        if (proximos.length) {
            partes.push("<strong>" + proximos.length + (proximos.length === 1 ? " lote vence" : " lotes vencem") + " em até 7 dias</strong>");
        }

        var urgente = vencidos.length > 0;

        var caixa = document.createElement("div");

        caixa.id = "gestokAvisoValidade";

        caixa.setAttribute("role", "status");

        caixa.style.cssText =
            "display:flex;align-items:flex-start;justify-content:space-between;gap:14px;" +
            "margin:0 0 20px;padding:14px 18px;border-radius:14px;font-size:14px;line-height:1.55;" +
            "border:1px solid " + (urgente ? "#f5c2c2" : "#fcd9a8") + ";" +
            "background:" + (urgente ? "#fff1f1" : "#fff6e8") + ";" +
            "color:" + (urgente ? "#8a1c1c" : "#7a4a06") + ";";

        var texto = document.createElement("div");

        texto.innerHTML =
            "<strong>⚠ Atenção à validade:</strong> " + partes.join(" e ") +
            " (" + emRisco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + " em risco). " +
            '<a href="../validade/index.html" style="color:inherit;font-weight:700;">Ver validade</a>';

        var fechar = document.createElement("button");

        fechar.type = "button";

        fechar.setAttribute("aria-label", "Fechar aviso");

        fechar.textContent = "×";

        fechar.style.cssText =
            "border:0;background:transparent;color:inherit;font-size:22px;line-height:1;cursor:pointer;padding:0 4px;";

        fechar.addEventListener("click", function () {

            caixa.remove();

            try {
                sessionStorage.setItem("gestok_aviso_validade_fechado", "1");
            } catch (e) { }

        });

        caixa.appendChild(texto);

        caixa.appendChild(fechar);

        principal.insertBefore(caixa, principal.firstChild);

    }

    document.addEventListener("DOMContentLoaded", function () {

        if (typeof firebase === "undefined" || !firebase.auth || !window.GestokValidade) {
            return;
        }

        var jaFoi = false;

        firebase.auth().onAuthStateChanged(function (usuario) {

            if (!usuario || jaFoi) {
                return;
            }

            jaFoi = true;

            esperarDados(usuario);

        });

    });

})();
