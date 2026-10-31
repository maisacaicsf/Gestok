/* =========================================
   GESTOK - SELETOR DE PRODUTO
   -----------------------------------------
   Usado nas telas de Entrada e Saída.

   - Digite o nome ou o código (ou leia o código
     de barras) e escolha na lista rápida.
   - A lupa abre a lista completa de produtos,
     com busca e itens por página (10, 50, 100).
   - O <select id="produto"> original continua
     existindo (escondido): o restante do sistema
     segue funcionando exatamente como antes.
========================================= */

(function () {

    "use strict";

    function criarSeletor(cfg) {

    var select = document.getElementById(cfg.selectId);

    if (!select || select.tagName !== "SELECT" || select.__gkSeletor) {
        return;
    }

    select.__gkSeletor = true;

    var ehSaida = window.location.pathname.toLowerCase().indexOf("/saida/") !== -1;

    var OPCOES = [10, 50, 100];

    var porPagina = 10;
    var pagina = 1;
    var modalTermo = "";
    var modalIdx = 0;
    var rapidoTermo = "";
    var rapidoLista = [];
    var rapidoIdx = 0;
    var selecionados = [];

    try {

        var salvo = Number(localStorage.getItem("gestok_seletor_por_pagina"));

        if (OPCOES.indexOf(salvo) !== -1) {
            porPagina = salvo;
        }

    } catch (e) { }


    /* ---------- utilidades ---------- */

    function esc(v) {

        return String(v === undefined || v === null ? "" : v)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    }

    function norm(t) {

        return String(t || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    }

    function produtos() {

        try {

            if (typeof window.gestokFonteProdutos === "function") {
                return window.gestokFonteProdutos() || [];
            }

            if (typeof produtosCache !== "undefined" && Array.isArray(produtosCache)) {
                return produtosCache;
            }

        } catch (e) { }

        return [];

    }

    function filtrar(termo) {

        var lista = produtos();

        var partes = norm(termo).split(/\s+/).filter(Boolean);

        if (!partes.length) {
            return lista.slice();
        }

        return lista.filter(function (p) {

            var texto = norm((p.nome || "") + " " + (p.codigo || "") + " " + (p.categoria || ""));

            return partes.every(function (parte) {
                return texto.indexOf(parte) !== -1;
            });

        });

    }

    function estoqueTexto(p) {

        var q = Number(p.quantidade);

        if (!isFinite(q)) {
            q = 0;
        }

        return q.toLocaleString("pt-BR", { maximumFractionDigits: 3 }) + " " + (p.unidade || "UN");

    }

    function badgeSemEstoque(p) {

        return ehSaida && Number(p.quantidade) <= 0
            ? ' <span class="gk-zero">sem estoque</span>'
            : "";

    }


    /* ---------- estilo ---------- */

    var estilo = document.createElement("style");

    estilo.textContent =
        ".gk-field input.gk-input,.gk-search input{width:100%;height:42px;padding:0 12px;border:1px solid #dfe4eb;border-radius:9px;background:#fff;color:#1e293b;font-family:inherit;font-size:13px;box-sizing:border-box;outline:none;transition:border-color .2s ease,box-shadow .2s ease}" +
        ".gk-field input.gk-input::placeholder,.gk-search input::placeholder{color:#9aa4b2}" +
        ".gk-field input.gk-input:focus,.gk-search input:focus{border-color:#5790ed;box-shadow:0 0 0 3px rgba(87,144,237,.15)}" +
        ".gk-btn,.gk-mais,.gk-todos,.gk-multi button{font-family:inherit}" +
        ".gk-picker{position:relative}" +
        ".gk-field{position:relative}" +
        ".gk-field .gk-ico{position:absolute;left:13px;top:50%;width:16px;height:16px;margin-top:-8px;color:#94a3b8;pointer-events:none}" +
        ".gk-field input.gk-input{padding-left:38px;padding-right:78px}" +
        ".gk-actions{position:absolute;right:6px;top:50%;margin-top:-15px;display:flex;gap:4px}" +
        ".gk-btn{width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:#64748b;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;padding:0}" +
        ".gk-btn:hover{background:#eef2f7;color:#1e293b}" +
        ".gk-btn.gk-lupa{background:#eef3fd;color:#3155a5}" +
        ".gk-btn.gk-lupa:hover{background:#dfe9fb}" +
        ".gk-btn svg{width:16px;height:16px}" +
        ".gk-drop{position:absolute;z-index:60;left:0;right:0;top:calc(100% + 6px);background:#fff;border:1px solid #e1e7ef;border-radius:12px;box-shadow:0 18px 40px rgba(15,23,42,.14);overflow:hidden}" +
        ".gk-item{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 14px;cursor:pointer;font-size:13px;color:#1e293b}" +
        ".gk-item.ativo,.gk-item:hover{background:#f1f5ff}" +
        ".gk-item small,.gk-row small{display:block;color:#7b8794;font-size:11px;margin-top:2px}" +
        ".gk-est{white-space:nowrap;font-size:12px;color:#475569;text-align:right}" +
        ".gk-mais{display:block;width:100%;padding:10px 14px;border:0;border-top:1px solid #edf0f4;background:#fafbfd;color:#3155a5;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;text-align:left}" +
        ".gk-mais:hover{background:#f1f5ff}" +
        ".gk-todos{margin-left:auto;margin-right:10px;padding:7px 12px;border:1px solid #dbe2ec;border-radius:8px;background:#fff;color:#3155a5;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer}" +
        ".gk-todos:hover{background:#f1f5ff}" +
        ".gk-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}" +
        ".gk-chips:empty{display:none}" +
        ".gk-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 6px 5px 11px;border-radius:999px;background:#eef3fd;color:#274690;font-size:12px;font-weight:600}" +
        ".gk-chip button{width:18px;height:18px;border:0;border-radius:50%;background:#d5e1fa;color:#274690;font-size:13px;line-height:1;cursor:pointer;padding:0}" +
        ".gk-chip button:hover{background:#c0d1f6}" +
        ".gk-ck{width:36px;font-size:16px;color:#3155a5}" +
        ".gk-multi{display:flex;align-items:center;justify-content:flex-end;gap:10px;width:100%;border-top:1px solid #edf0f4;padding-top:12px}" +
        ".gk-multi span{margin-right:auto;font-weight:600}" +
        ".gk-multi button{height:34px;padding:0 14px;border-radius:8px;border:1px solid #dbe2ec;background:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;color:#3155a5}" +
        ".gk-multi .gk-concluir{background:#3155a5;border-color:#3155a5;color:#fff}" +
        ".gk-vazio{padding:18px;color:#7b8794;font-size:13px;text-align:center}" +
        ".gk-zero{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:999px;background:#fef2f2;color:#dc2626;font-size:10px;font-weight:700}" +
        ".gk-overlay{position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:20px}" +
        ".gk-overlay[hidden]{display:none}" +
        ".gk-modal{width:min(780px,100%);max-height:min(88vh,720px);display:flex;flex-direction:column;background:#fff;border-radius:16px;box-shadow:0 30px 80px rgba(15,23,42,.3);overflow:hidden}" +
        ".gk-head{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid #edf0f4}" +
        ".gk-head h3{margin:0;font-size:16px;color:#1e293b}" +
        ".gk-head p{margin:2px 0 0;font-size:12px;color:#7b8794}" +
        ".gk-search{position:relative;padding:14px 22px;border-bottom:1px solid #edf0f4}" +
        ".gk-search .gk-ico{position:absolute;left:35px;top:50%;width:16px;height:16px;margin-top:-8px;color:#94a3b8;pointer-events:none}" +
        ".gk-search input{padding-left:38px}" +
        ".gk-body{overflow:auto;flex:1;min-height:120px}" +
        "table.gk-table{width:100%;border-collapse:collapse;font-size:13px}" +
        ".gk-table th{position:sticky;top:0;background:#f8fafc;text-align:left;padding:10px 22px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#64748b;border-bottom:1px solid #edf0f4}" +
        ".gk-table th:last-child,.gk-table td:last-child{text-align:right}" +
        ".gk-table td{padding:11px 22px;border-bottom:1px solid #f1f4f8;color:#1e293b}" +
        ".gk-row{cursor:pointer}" +
        ".gk-row:hover,.gk-row.ativo{background:#f1f5ff}" +
        ".gk-foot{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:14px 22px;border-top:1px solid #edf0f4;font-size:13px;color:#5b6678}" +
        ".gk-foot label{display:flex;align-items:center;gap:8px;font-weight:600}" +
        ".gk-foot select{width:auto;height:34px;padding:0 10px;border:1px solid #dbe2ec;border-radius:8px;background:#fff;color:#1e293b;font-family:inherit;font-size:13px;cursor:pointer;outline:none}" +
        ".gk-foot select:focus{border-color:#5790ed;box-shadow:0 0 0 3px rgba(87,144,237,.15)}" +
        ".gk-nav{display:flex;align-items:center;gap:6px;flex-wrap:wrap}" +
        ".gk-pg{min-width:34px;height:34px;padding:0 11px;border:1px solid #dbe2ec;border-radius:8px;background:#fff;color:#3155a5;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer}" +
        ".gk-pg:hover:not(:disabled){background:#f1f5ff;border-color:#b9c8ec}" +
        ".gk-pg.active{background:#3155a5;border-color:#3155a5;color:#fff}" +
        ".gk-pg:disabled{opacity:.45;cursor:not-allowed}" +
        ".gk-gap{padding:0 4px;color:#9aa3b2}" +
        "@media(max-width:600px){.gk-foot{justify-content:center}.gk-table th,.gk-table td{padding:10px 14px}.gk-head,.gk-search{padding-left:14px;padding-right:14px}.gk-search .gk-ico{left:27px}}";

    if (!document.getElementById("gkSeletorEstilo")) {

        estilo.id = "gkSeletorEstilo";

        document.head.appendChild(estilo);

    }

    var ICONE_LUPA =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';


    /* ---------- campo de busca ---------- */

    var caixa = document.createElement("div");

    caixa.className = "gk-picker";

    caixa.innerHTML =
        '<div class="gk-field">' +
            '<span class="gk-ico">' + ICONE_LUPA + '</span>' +
            '<input type="text" id="' + cfg.inputId + '" class="gk-input" autocomplete="off" ' +
                'placeholder="' + cfg.placeholder + '" aria-label="Buscar produto">' +
            '<div class="gk-actions">' +
                '<button type="button" class="gk-btn gk-limpar" title="Limpar produto" hidden>×</button>' +
                '<button type="button" class="gk-btn gk-lupa" title="Ver todos os produtos">' + ICONE_LUPA + '</button>' +
            '</div>' +
        '</div>' +
        '<div class="gk-drop" hidden></div>' +
        '<div class="gk-chips"></div>';

    select.style.display = "none";

    select.required = false;

    select.tabIndex = -1;

    select.parentNode.insertBefore(caixa, select.nextSibling);

    var campo = caixa.querySelector(".gk-input");
    var botaoLimpar = caixa.querySelector(".gk-limpar");
    var botaoLupa = caixa.querySelector(".gk-lupa");
    var drop = caixa.querySelector(".gk-drop");
    var chips = caixa.querySelector(".gk-chips");

    var rotulo = document.querySelector('label[for="' + cfg.selectId + '"]');

    if (rotulo) {
        rotulo.setAttribute("for", cfg.inputId);
    }

    /* O restante do sistema chama select.focus() quando falta escolher o produto */
    select.focus = function () {
        campo.focus();
    };


    function nomeDoProduto(id) {

        var lista = produtos();

        for (var i = 0; i < lista.length; i++) {

            if (String(lista[i].id) === String(id)) {
                return lista[i].nome || "Sem nome";
            }

        }

        return id;

    }


    function desenharChips() {

        if (!cfg.multiplo) {
            return;
        }

        chips.innerHTML = selecionados.map(function (id) {

            return '<span class="gk-chip">' + esc(nomeDoProduto(id)) +
                '<button type="button" data-rem="' + esc(id) + '" title="Remover">×</button></span>';

        }).join("");

    }


    function aplicarSelecao() {

        desenharChips();

        botaoLimpar.hidden = !selecionados.length;

        if (modal && !modal.hidden) {
            desenharModal();
        }

        document.dispatchEvent(new CustomEvent("gk-selecao-produtos", { detail: { ids: selecionados.slice() } }));

    }


    function alternar(id) {

        id = String(id);

        var posicao = selecionados.indexOf(id);

        if (posicao === -1) {
            selecionados.push(id);
        } else {
            selecionados.splice(posicao, 1);
        }

        aplicarSelecao();

    }


    function sincronizar() {

        if (cfg.multiplo) {

            campo.value = "";

            botaoLimpar.hidden = !selecionados.length;

            desenharChips();

            return;

        }

        var opcao = select.options[select.selectedIndex];

        if (select.value && opcao) {

            campo.value = String(opcao.textContent).replace(/\s+/g, " ").trim();

            botaoLimpar.hidden = false;

        } else {

            campo.value = "";

            botaoLimpar.hidden = true;

        }

    }


    function escolher(id) {

        if (cfg.multiplo) {

            if (id === "") {
                selecionados = [];
            } else if (selecionados.indexOf(String(id)) === -1) {
                selecionados.push(String(id));
            }

            aplicarSelecao();

            fecharRapido();

            campo.value = "";

            rapidoTermo = "";

            return;

        }

        select.value = id;

        select.dispatchEvent(new Event("change", { bubbles: true }));

        sincronizar();

        fecharRapido();

        fecharModal();

    }


    /* ---------- lista rápida ---------- */

    function fecharRapido() {

        drop.hidden = true;

        rapidoIdx = 0;

    }


    function desenharRapido() {

        var lista = filtrar(rapidoTermo);

        var exato = rapidoTermo
            ? lista.filter(function (p) { return norm(p.codigo) === norm(rapidoTermo); })
            : [];

        if (exato.length) {

            lista = exato.concat(lista.filter(function (p) { return exato.indexOf(p) === -1; }));

        }

        var total = lista.length;

        rapidoLista = lista.slice(0, 6);

        if (rapidoIdx >= rapidoLista.length) {
            rapidoIdx = 0;
        }

        if (!total) {

            drop.innerHTML = '<div class="gk-vazio">Nenhum produto encontrado.</div>';

        } else {

            drop.innerHTML =
                rapidoLista.map(function (p, i) {

                    return '<div class="gk-item' + (i === rapidoIdx ? " ativo" : "") + '" data-id="' + esc(p.id) + '">' +
                        '<div><strong>' + esc(p.nome || "Sem nome") + '</strong>' + badgeSemEstoque(p) +
                        '<small>' + esc(p.codigo || "sem código") + '</small></div>' +
                        '<div class="gk-est">' + esc(estoqueTexto(p)) + '</div></div>';

                }).join("") +
                '<button type="button" class="gk-mais" data-mais="1">Ver todos os produtos' +
                (total > rapidoLista.length ? " (" + total + ")" : "") + ' →</button>';

        }

        drop.hidden = false;

    }


    function marcarRapido() {

        var itens = drop.querySelectorAll(".gk-item");

        for (var i = 0; i < itens.length; i++) {
            itens[i].classList.toggle("ativo", i === rapidoIdx);
        }

    }


    campo.addEventListener("focus", function () {

        campo.select();

        rapidoTermo = "";

        desenharRapido();

    });

    campo.addEventListener("input", function () {

        rapidoTermo = campo.value;

        rapidoIdx = 0;

        desenharRapido();

    });

    campo.addEventListener("keydown", function (e) {

        if (e.key === "ArrowDown" || e.key === "ArrowUp") {

            e.preventDefault();

            if (drop.hidden) {
                desenharRapido();
            }

            if (rapidoLista.length) {

                rapidoIdx = (rapidoIdx + (e.key === "ArrowDown" ? 1 : -1) + rapidoLista.length) % rapidoLista.length;

                marcarRapido();

            }

        } else if (e.key === "Enter") {

            /* Enter nunca deve enviar o formulário a partir da busca */
            e.preventDefault();

            if (!drop.hidden && rapidoLista[rapidoIdx]) {

                escolher(rapidoLista[rapidoIdx].id);

            } else if (rapidoTermo.trim()) {

                abrirModal(rapidoTermo);

            }

        } else if (e.key === "Escape") {

            fecharRapido();

            sincronizar();

        }

    });

    campo.addEventListener("blur", function () {

        setTimeout(function () {

            if (!campo.matches(":focus") && !modal.__aberto) {

                fecharRapido();

                sincronizar();

            }

        }, 150);

    });

    drop.addEventListener("mousedown", function (e) {

        e.preventDefault();

        var item = e.target.closest(".gk-item");

        if (item) {

            escolher(item.getAttribute("data-id"));

            return;

        }

        if (e.target.closest("[data-mais]")) {

            abrirModal(rapidoTermo);

        }

    });

    botaoLimpar.addEventListener("click", function () {

        if (cfg.multiplo) {

            selecionados = [];

            aplicarSelecao();

            campo.focus();

            return;

        }

        select.value = "";

        select.dispatchEvent(new Event("change", { bubbles: true }));

        sincronizar();

        campo.focus();

    });

    botaoLupa.addEventListener("click", function () {

        abrirModal("");

    });


    /* ---------- lista completa (lupa) ---------- */

    var modal = document.createElement("div");

    modal.className = "gk-overlay";

    modal.hidden = true;

    modal.innerHTML =
        '<div class="gk-modal" role="dialog" aria-modal="true" aria-label="Selecionar produto">' +
            '<div class="gk-head">' +
                '<div><h3>' + cfg.titulo + '</h3><p>Clique em um produto para escolher.</p></div>' +
                (cfg.permitirTodos ? '<button type="button" class="gk-todos">' + (cfg.rotuloTodos || "Todos os produtos") + '</button>' : '') +
                '<button type="button" class="gk-btn gk-fechar" title="Fechar">×</button>' +
            '</div>' +
            '<div class="gk-search"><span class="gk-ico">' + ICONE_LUPA + '</span>' +
                '<input type="text" class="gk-busca" autocomplete="off" placeholder="Buscar por nome ou código..."></div>' +
            '<div class="gk-body"></div>' +
            '<div class="gk-foot"></div>' +
        '</div>';

    document.body.appendChild(modal);

    var modalBusca = modal.querySelector(".gk-busca");
    var modalCorpo = modal.querySelector(".gk-body");
    var modalRodape = modal.querySelector(".gk-foot");


    function abrirModal(termo) {

        fecharRapido();

        modalTermo = termo || "";

        modalBusca.value = modalTermo;

        pagina = 1;

        modalIdx = 0;

        modal.hidden = false;

        modal.__aberto = true;

        desenharModal();

        modalBusca.focus();

        modalBusca.select();

    }


    function fecharModal() {

        if (modal.hidden) {
            return;
        }

        modal.hidden = true;

        modal.__aberto = false;

    }


    function desenharModal() {

        var todos = filtrar(modalTermo);

        var total = todos.length;

        var totalPaginas = Math.max(1, Math.ceil(total / porPagina));

        pagina = Math.min(Math.max(1, pagina), totalPaginas);

        var inicio = (pagina - 1) * porPagina;

        var fatia = todos.slice(inicio, inicio + porPagina);

        if (modalIdx >= fatia.length) {
            modalIdx = Math.max(0, fatia.length - 1);
        }

        modalCorpo.innerHTML = fatia.length
            ? '<table class="gk-table"><thead><tr>' + (cfg.multiplo ? '<th></th>' : '') + '<th>Produto</th><th>Estoque</th></tr></thead><tbody>' +
              fatia.map(function (p, i) {

                  return '<tr class="gk-row' + (i === modalIdx ? " ativo" : "") + '" data-id="' + esc(p.id) + '">' +
                      (cfg.multiplo ? '<td class="gk-ck">' + (selecionados.indexOf(String(p.id)) !== -1 ? "☑" : "☐") + '</td>' : '') +
                      '<td><strong>' + esc(p.nome || "Sem nome") + '</strong>' + badgeSemEstoque(p) +
                      '<small>' + esc(p.codigo || "sem código") + (p.categoria ? " · " + esc(p.categoria) : "") + '</small></td>' +
                      '<td>' + esc(estoqueTexto(p)) + '</td></tr>';

              }).join("") +
              '</tbody></table>'
            : '<div class="gk-vazio">' +
              (produtos().length ? "Nenhum produto encontrado." : "Nenhum produto cadastrado.") + '</div>';

        var numeros = [1, totalPaginas, pagina - 1, pagina, pagina + 1]
            .filter(function (n, i, arr) { return n >= 1 && n <= totalPaginas && arr.indexOf(n) === i; })
            .sort(function (a, b) { return a - b; });

        var nav = "";

        if (totalPaginas > 1) {

            nav += '<button type="button" class="gk-pg" data-pg="' + (pagina - 1) + '"' + (pagina === 1 ? " disabled" : "") + '>‹ Anterior</button>';

            var anterior = 0;

            numeros.forEach(function (n) {

                if (n - anterior > 1) {
                    nav += '<span class="gk-gap">…</span>';
                }

                nav += '<button type="button" class="gk-pg' + (n === pagina ? " active" : "") + '" data-pg="' + n + '">' + n + '</button>';

                anterior = n;

            });

            nav += '<button type="button" class="gk-pg" data-pg="' + (pagina + 1) + '"' + (pagina === totalPaginas ? " disabled" : "") + '>Próxima ›</button>';

        }

        modalRodape.innerHTML =
            '<label>Itens por página <select class="gk-por-pagina">' +
            OPCOES.map(function (n) {
                return '<option value="' + n + '"' + (n === porPagina ? " selected" : "") + '>' + n + '</option>';
            }).join("") +
            '</select></label>' +
            '<span>' + (total ? "Mostrando " + (inicio + 1) + "–" + (inicio + fatia.length) + " de " + total : "0 produtos") + '</span>' +
            '<div class="gk-nav">' + nav + '</div>' +
            (cfg.multiplo
                ? '<div class="gk-multi"><span>' + selecionados.length + ' selecionado(s)</span>' +
                  '<button type="button" class="gk-limpar-sel">Limpar</button>' +
                  '<button type="button" class="gk-concluir">Concluir</button></div>'
                : '');

    }


    function destacarModal() {

        var linhas = modalCorpo.querySelectorAll(".gk-row");

        for (var i = 0; i < linhas.length; i++) {

            linhas[i].classList.toggle("ativo", i === modalIdx);

            if (i === modalIdx) {
                linhas[i].scrollIntoView({ block: "nearest" });
            }

        }

    }


    modalBusca.addEventListener("input", function () {

        modalTermo = modalBusca.value;

        pagina = 1;

        modalIdx = 0;

        desenharModal();

    });

    modalBusca.addEventListener("keydown", function (e) {

        var linhas = modalCorpo.querySelectorAll(".gk-row");

        if (e.key === "ArrowDown" && linhas.length) {

            e.preventDefault();

            modalIdx = Math.min(modalIdx + 1, linhas.length - 1);

            destacarModal();

        } else if (e.key === "ArrowUp" && linhas.length) {

            e.preventDefault();

            modalIdx = Math.max(modalIdx - 1, 0);

            destacarModal();

        } else if (e.key === "Enter") {

            e.preventDefault();

            if (linhas[modalIdx]) {

                if (cfg.multiplo) {
                    alternar(linhas[modalIdx].getAttribute("data-id"));
                } else {
                    escolher(linhas[modalIdx].getAttribute("data-id"));
                }

            }

        }

    });

    modal.addEventListener("click", function (e) {

        if (e.target.closest(".gk-todos")) {

            escolher("");

            if (cfg.multiplo) {
                desenharModal();
            }

            return;

        }

        if (e.target === modal || e.target.closest(".gk-fechar")) {

            fecharModal();

            campo.focus();

            return;

        }

        var linha = e.target.closest(".gk-row");

        if (e.target.closest(".gk-concluir")) {

            fecharModal();

            campo.focus();

            return;

        }

        if (e.target.closest(".gk-limpar-sel")) {

            selecionados = [];

            aplicarSelecao();

            return;

        }

        if (linha) {

            if (cfg.multiplo) {
                alternar(linha.getAttribute("data-id"));
            } else {
                escolher(linha.getAttribute("data-id"));
            }

            return;

        }

        var botao = e.target.closest("[data-pg]");

        if (botao && !botao.disabled) {

            pagina = Number(botao.getAttribute("data-pg"));

            modalIdx = 0;

            desenharModal();

            modalCorpo.scrollTop = 0;

        }

    });

    modal.addEventListener("change", function (e) {

        if (!e.target.classList.contains("gk-por-pagina")) {
            return;
        }

        var valor = Number(e.target.value);

        porPagina = OPCOES.indexOf(valor) !== -1 ? valor : 10;

        try {
            localStorage.setItem("gestok_seletor_por_pagina", String(porPagina));
        } catch (err) { }

        pagina = 1;

        modalIdx = 0;

        desenharModal();

    });

    document.addEventListener("keydown", function (e) {

        if (e.key === "Escape" && !modal.hidden) {

            fecharModal();

            campo.focus();

        }

    });


    /* ---------- manter tudo sincronizado ---------- */

    new MutationObserver(sincronizar).observe(select, { childList: true });

    var formulario = select.closest("form");

    if (formulario) {

        formulario.addEventListener("reset", function () {
            setTimeout(sincronizar, 0);
        });

    }

    if (cfg.multiplo) {

        window.gestokProdutosSelecionados = function () {
            return selecionados.slice();
        };

        document.addEventListener("gk-limpar-selecao", function () {

            selecionados = [];

            aplicarSelecao();

        });

        chips.addEventListener("click", function (e) {

            var remover = e.target.closest("[data-rem]");

            if (!remover) {
                return;
            }

            var id = remover.getAttribute("data-rem");

            selecionados = selecionados.filter(function (x) { return x !== id; });

            aplicarSelecao();

        });

    }

    document.addEventListener("gk-sincronizar", sincronizar);

    sincronizar();

    }

    [
        {
            selectId: "produto",
            inputId: "produtoBusca",
            placeholder: "Buscar produto por nome ou código...",
            titulo: "Selecionar produto",
            permitirTodos: false
        },
        {
            selectId: "produtoFiltro",
            inputId: "produtoFiltroBusca",
            placeholder: "Todos os produtos — busque e adicione vários (ex.: cerveja, feijão)",
            titulo: "Selecionar produtos para o relatório",
            permitirTodos: true,
            rotuloTodos: "Limpar seleção",
            multiplo: true
        }
    ].forEach(criarSeletor);

})();
