/* =========================================
   GESTOK - CONTROLE DE VALIDADE
========================================= */

let produtosCache = [];
let lotesCache = [];
let resultadoValidade = { linhas: [], semValidade: [] };
let filtradas = [];
let paginaAtual = 1;
let itensPorPagina = 10;
let lojaIdAtual = null;
let listenersIniciados = false;

const OPCOES_ITENS = [10, 50, 100];

try {

    const salvo = Number(localStorage.getItem("gestok_validade_por_pagina"));

    if (OPCOES_ITENS.indexOf(salvo) !== -1) {
        itensPorPagina = salvo;
    }

} catch (erro) { }

const el = function (id) { return document.getElementById(id); };

const tabela = el("validadeTabela");
const pesquisa = el("pesquisaValidade");
const filtroSituacao = el("filtroSituacao");
const filtroCategoria = el("filtroCategoriaVal");
const ordenacao = el("ordenacaoVal");
const paginacao = el("paginacaoVal");
const seletorItens = el("itensPorPaginaVal");
const paginaInfo = el("paginaInfoVal");
const paginaNav = el("paginaNavVal");
const selectProdutoModal = el("produto");


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

function moeda(v) {

    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

}

function qtdTxt(n, unidade) {

    return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 3 }) + " " + (unidade || "UN");

}

function erroValidade(mensagem) {

    const erro = new Error(mensagem);

    erro.amigavel = true;

    return erro;

}

/* O seletor com lupa usa esta lista */
window.gestokFonteProdutos = function () {

    return produtosCache.filter(function (p) { return p.ativo !== false; });

};


/* ---------- dados em tempo real ---------- */

function iniciarListeners(lojaId) {

    if (listenersIniciados) {
        return;
    }

    listenersIniciados = true;

    referenciaProdutos(lojaId).onSnapshot(function (snap) {

        produtosCache = snap.docs.map(function (d) {
            return Object.assign({ id: d.id }, d.data());
        });

        popularSelectProdutos();

        recalcular();

    }, function (erro) {

        console.error("Erro ao carregar produtos:", erro);

        alert("Não foi possível carregar os produtos.");

    });

    referenciaLotes(lojaId).onSnapshot(function (snap) {

        lotesCache = snap.docs.map(function (d) {
            return Object.assign({ id: d.id }, d.data());
        });

        recalcular();

    }, function (erro) {

        console.error("Erro ao carregar lotes:", erro);

        alert("Não foi possível carregar os lotes. Confira se as regras do Firestore foram atualizadas.");

    });

}

function popularSelectProdutos() {

    const ativos = produtosCache
        .filter(function (p) { return p.ativo !== false; })
        .sort(function (a, b) { return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"); });

    const atual = selectProdutoModal.value;

    selectProdutoModal.innerHTML =
        '<option value="">Selecione um produto</option>' +
        ativos.map(function (p) {
            return '<option value="' + esc(p.id) + '">' + esc((p.nome || "Sem nome") + (p.codigo ? " — " + p.codigo : "")) + '</option>';
        }).join("");

    if (atual) {
        selectProdutoModal.value = atual;
    }

}

function recalcular() {

    const ativos = produtosCache.filter(function (p) { return p.ativo !== false; });

    resultadoValidade = window.GestokValidade.calcular(lotesCache, ativos);

    atualizarCartoes();

    popularCategorias();

    aplicarFiltros(true);

}

function popularCategorias() {

    const atual = filtroCategoria.value;

    const categorias = Array.from(new Set(
        produtosCache
            .filter(function (p) { return p.ativo !== false; })
            .map(function (p) { return String(p.categoria || "").trim(); })
            .filter(Boolean)
    )).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });

    filtroCategoria.innerHTML =
        '<option value="">Todas</option>' +
        categorias.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join("");

    if (atual && categorias.indexOf(atual) !== -1) {
        filtroCategoria.value = atual;
    }

}


/* ---------- cartões de resumo ---------- */

function plural(n, um, varios) {

    return n + " " + (n === 1 ? um : varios);

}

function atualizarCartoes() {

    const linhas = resultadoValidade.linhas;

    const soma = function (lista) {
        return lista.reduce(function (s, l) { return s + l.valor; }, 0);
    };

    const vencidos = linhas.filter(function (l) { return l.dias < 0; });
    const ate7 = linhas.filter(function (l) { return l.dias >= 0 && l.dias <= 7; });
    const ate30 = linhas.filter(function (l) { return l.dias >= 0 && l.dias <= 30; });

    el("cardVencidos").textContent = vencidos.length;
    el("cardVencidosSub").textContent = vencidos.length ? moeda(soma(vencidos)) + " em produtos" : "nenhum lote";

    el("card7d").textContent = ate7.length;
    el("card7dSub").textContent = ate7.length ? moeda(soma(ate7)) + " em produtos" : "nenhum lote";

    el("card30d").textContent = ate30.length;
    el("card30dSub").textContent = ate30.length ? moeda(soma(ate30)) + " em produtos" : "nenhum lote";

    el("cardRisco").textContent = moeda(soma(vencidos) + soma(ate7));

    const sem = resultadoValidade.semValidade;

    el("cardSem").textContent = sem.length;
    el("cardSemSub").textContent = sem.length ? plural(sem.length, "produto com estoque", "produtos com estoque") : "nenhum produto";

    el("btnBaixaVencidos").disabled = vencidos.length === 0;

}


/* ---------- filtros ---------- */

function aplicarFiltros(manterPagina) {

    const termos = norm(pesquisa.value).split(/\s+/).filter(Boolean);

    const situacao = filtroSituacao.value;

    const categoria = norm(filtroCategoria.value);

    const base = situacao === "sem" ? resultadoValidade.semValidade : resultadoValidade.linhas;

    let lista = base.filter(function (r) {

        const p = r.produto;

        if (termos.length) {

            const texto = norm((p.nome || "") + " " + (p.codigo || "") + " " + (r.lote || ""));

            if (!termos.every(function (t) { return texto.indexOf(t) !== -1; })) {
                return false;
            }

        }

        if (categoria && norm(p.categoria) !== categoria) {
            return false;
        }

        if (situacao === "vencido") { return r.dias < 0; }
        if (situacao === "7d") { return r.dias >= 0 && r.dias <= 7; }
        if (situacao === "30d") { return r.dias >= 0 && r.dias <= 30; }
        if (situacao === "60d") { return r.dias >= 0 && r.dias <= 60; }
        if (situacao === "ok") { return r.dias > 60; }

        return true;

    });

    const ordem = ordenacao.value;

    lista.sort(function (a, b) {

        if (ordem === "nome") {
            return String(a.produto.nome || "").localeCompare(String(b.produto.nome || ""), "pt-BR");
        }

        if (ordem === "valor") {
            return b.valor - a.valor;
        }

        const da = a.dias === null ? 99999 : a.dias;
        const db_ = b.dias === null ? 99999 : b.dias;

        return ordem === "validade-desc" ? db_ - da : da - db_;

    });

    filtradas = lista;

    if (!manterPagina) {
        paginaAtual = 1;
    }

    renderizarPagina();

}


/* ---------- tabela e paginação ---------- */

function classeBadge(situacao) {

    if (situacao === "7d") { return "s7d"; }
    if (situacao === "30d") { return "s30d"; }
    if (situacao === "60d") { return "s60d"; }

    return situacao;

}

function linhaHTML(r) {

    const p = r.produto;

    const id = esc(r.id);

    const acoes = r.tipo === "sem"
        ? '<button type="button" class="val-acao destaque" data-acao="informar" data-id="' + id + '">Informar validade</button>'
        : '<button type="button" class="val-acao ' + (r.dias < 0 ? "perigo" : "") + '" data-acao="baixa" data-id="' + id +
          '" title="Registra uma saída por vencimento e atualiza o estoque">Dar baixa</button>' +
          '<button type="button" class="val-acao" data-acao="remover" data-id="' + id +
          '" title="Remove só o registro do lote (não altera o estoque)">Remover</button>';

    return '<tr>' +
        '<td class="val-nome"><strong>' + esc(p.nome || "Sem nome") + '</strong><small>' + esc(p.codigo || "sem código") + '</small></td>' +
        '<td>' + (r.lote ? esc(r.lote) : "—") + '</td>' +
        '<td>' + (r.validade ? window.GestokValidade.formatarData(r.validade) : "—") + '</td>' +
        '<td><span class="val-badge ' + classeBadge(r.situacao) + '">' + esc(window.GestokValidade.rotuloDias(r.dias)) + '</span></td>' +
        '<td>' + esc(qtdTxt(r.quantidade, p.unidade)) + '</td>' +
        '<td>' + moeda(r.valor) + '</td>' +
        '<td><div class="val-acoes">' + acoes + '</div></td>' +
        '</tr>';

}

function renderizarPagina() {

    const total = filtradas.length;

    const totalPaginas = Math.max(1, Math.ceil(total / itensPorPagina));

    paginaAtual = Math.min(Math.max(1, paginaAtual), totalPaginas);

    const inicio = (paginaAtual - 1) * itensPorPagina;

    const pagina = filtradas.slice(inicio, inicio + itensPorPagina);

    tabela.innerHTML = pagina.map(linhaHTML).join("");

    el("valCount").textContent = plural(total, "item", "itens");

    const vazio = el("semResultadosVal");

    vazio.style.display = total === 0 ? "flex" : "none";

    el("semResultadosTexto").textContent = resultadoValidade.linhas.length === 0 && filtroSituacao.value !== "sem"
        ? 'Nenhum lote cadastrado ainda. Informe a validade na Entrada de estoque ou use "Adicionar lote".'
        : "Tente alterar a pesquisa ou os filtros.";

    el("btnExportar").disabled = total === 0;

    renderizarPaginacao(total, totalPaginas, inicio, pagina.length);

}

function renderizarPaginacao(total, totalPaginas, inicio, quantidade) {

    if (total === 0) {

        paginacao.style.display = "none";

        return;

    }

    paginacao.style.display = "flex";

    seletorItens.value = String(itensPorPagina);

    paginaInfo.textContent = "Mostrando " + (inicio + 1) + "–" + (inicio + quantidade) + " de " + total;

    if (totalPaginas <= 1) {

        paginaNav.innerHTML = "";

        return;

    }

    const numeros = [1, totalPaginas, paginaAtual - 1, paginaAtual, paginaAtual + 1]
        .filter(function (n, i, arr) { return n >= 1 && n <= totalPaginas && arr.indexOf(n) === i; })
        .sort(function (a, b) { return a - b; });

    let html = '<button type="button" class="page-btn" data-pagina="' + (paginaAtual - 1) + '"' + (paginaAtual === 1 ? " disabled" : "") + '>‹ Anterior</button>';

    let anterior = 0;

    numeros.forEach(function (n) {

        if (n - anterior > 1) {
            html += '<span class="page-gap">…</span>';
        }

        html += '<button type="button" class="page-btn' + (n === paginaAtual ? " active" : "") + '" data-pagina="' + n + '">' + n + '</button>';

        anterior = n;

    });

    html += '<button type="button" class="page-btn" data-pagina="' + (paginaAtual + 1) + '"' + (paginaAtual === totalPaginas ? " disabled" : "") + '>Próxima ›</button>';

    paginaNav.innerHTML = html;

}

paginaNav.addEventListener("click", function (event) {

    const botao = event.target.closest("button[data-pagina]");

    if (!botao || botao.disabled) {
        return;
    }

    paginaAtual = Number(botao.dataset.pagina);

    renderizarPagina();

    document.querySelector(".products-panel").scrollIntoView({ behavior: "smooth", block: "start" });

});

seletorItens.addEventListener("change", function () {

    const valor = Number(seletorItens.value);

    itensPorPagina = OPCOES_ITENS.indexOf(valor) !== -1 ? valor : 10;

    try {
        localStorage.setItem("gestok_validade_por_pagina", String(itensPorPagina));
    } catch (erro) { }

    paginaAtual = 1;

    renderizarPagina();

});

pesquisa.addEventListener("input", function () { aplicarFiltros(false); });
filtroSituacao.addEventListener("change", function () { aplicarFiltros(false); });
filtroCategoria.addEventListener("change", function () { aplicarFiltros(false); });
ordenacao.addEventListener("change", function () { aplicarFiltros(false); });

el("limparFiltrosVal").addEventListener("click", function () {

    pesquisa.value = "";
    filtroSituacao.value = "";
    filtroCategoria.value = "";
    ordenacao.value = "validade";

    aplicarFiltros(false);

});

document.querySelectorAll(".val-card").forEach(function (cartao) {

    cartao.addEventListener("click", function () {

        filtroSituacao.value = cartao.dataset.filtro;

        aplicarFiltros(false);

        document.querySelector(".products-panel").scrollIntoView({ behavior: "smooth", block: "start" });

    });

});


/* ---------- baixa por vencimento ---------- */

async function baixarLote(r) {

    const lojaId = lojaIdAtual;

    const loteRef = referenciaLotes(lojaId).doc(r.id);

    const produtoRef = referenciaProdutos(lojaId).doc(r.produtoId);

    const movimentacaoRef = referenciaMovimentacoes(lojaId).doc();

    const usuario = firebase.auth().currentUser;

    let feito = null;

    await db.runTransaction(async function (transaction) {

        /* todas as leituras antes das escritas */
        const loteSnap = await transaction.get(loteRef);

        const produtoSnap = await transaction.get(produtoRef);

        if (!loteSnap.exists || loteSnap.data().encerrado === true) {
            throw erroValidade("Este lote já foi encerrado.");
        }

        if (!produtoSnap.exists) {
            throw erroValidade("O produto deste lote não existe mais.");
        }

        const produto = produtoSnap.data();

        const anterior = Number(produto.quantidade || 0);

        const quantidade = Math.min(r.quantidade, anterior);

        if (!(quantidade > 0)) {
            throw erroValidade("Não há estoque deste produto para dar baixa.");
        }

        const novo = Math.round((anterior - quantidade) * 1000) / 1000;

        const agora = new Date().toISOString();

        const lote = loteSnap.data();

        const observacao =
            "Baixa por vencimento" +
            (lote.lote ? " — lote " + lote.lote : "") +
            " (venc. " + window.GestokValidade.formatarData(lote.validade) + ")";

        transaction.update(produtoRef, {
            quantidade: novo,
            ultimaSaida: {
                quantidade: quantidade,
                estoqueAnterior: anterior,
                estoqueNovo: novo,
                motivo: "Vencimento",
                observacao: observacao,
                data: agora
            },
            dataAtualizacao: agora
        });

        transaction.set(movimentacaoRef, {
            tipo: "Saída",
            produtoId: produtoRef.id,
            produto: produto.nome || "",
            codigo: produto.codigo || "",
            quantidade: quantidade,
            unidade: produto.unidade || "UN",
            estoqueAnterior: anterior,
            estoqueNovo: novo,
            motivo: "Vencimento",
            observacao: observacao,
            usuarioUid: usuario ? usuario.uid : null,
            lojaId: lojaId,
            data: agora
        });

        transaction.update(loteRef, {
            quantidade: 0,
            encerrado: true,
            encerradoEm: agora,
            motivoEncerramento: "Baixa por vencimento"
        });

        feito = { nome: produto.nome || "produto", quantidade: quantidade, unidade: produto.unidade || "UN" };

    });

    return feito;

}

function todasAsLinhas() {

    return resultadoValidade.linhas.concat(resultadoValidade.semValidade);

}

tabela.addEventListener("click", async function (event) {

    const botao = event.target.closest("[data-acao]");

    if (!botao) {
        return;
    }

    const r = todasAsLinhas().find(function (x) { return x.id === botao.dataset.id; });

    if (!r) {
        return;
    }

    const acao = botao.dataset.acao;

    if (acao === "informar") {

        abrirModalLote(r);

        return;

    }

    if (acao === "remover") {

        if (!confirm("Remover o registro deste lote? O estoque do produto NÃO será alterado.")) {
            return;
        }

        try {

            await referenciaLotes(lojaIdAtual).doc(r.id).delete();

            alert("Lote removido com sucesso.");

        } catch (erro) {

            console.error("Erro ao remover lote:", erro);

            alert("Não foi possível remover o lote.");

        }

        return;

    }

    if (acao === "baixa") {

        const nome = r.produto.nome || "produto";

        if (!confirm(
            "Dar baixa em " + qtdTxt(r.quantidade, r.produto.unidade) + " de \"" + nome + "\" (validade " +
            window.GestokValidade.formatarData(r.validade) + ")?\n\nSerá registrada uma saída por vencimento e o estoque será atualizado."
        )) {
            return;
        }

        botao.disabled = true;

        try {

            const feito = await baixarLote(r);

            alert("Baixa registrada! " + qtdTxt(feito.quantidade, feito.unidade) + " de " + feito.nome + " saíram do estoque.");

        } catch (erro) {

            console.error("Erro na baixa por vencimento:", erro);

            alert(erro && erro.amigavel ? erro.message : "Não foi possível registrar a baixa.");

            botao.disabled = false;

        }

    }

});

el("btnBaixaVencidos").addEventListener("click", async function () {

    const vencidos = resultadoValidade.linhas.filter(function (l) { return l.dias < 0; });

    if (!vencidos.length) {

        alert("Não há lotes vencidos para dar baixa.");

        return;

    }

    const valor = vencidos.reduce(function (s, l) { return s + l.valor; }, 0);

    if (!confirm(
        "Dar baixa em " + plural(vencidos.length, "lote vencido", "lotes vencidos") + " (" + moeda(valor) +
        " em produtos)?\n\nSerá registrada uma saída por vencimento para cada lote."
    )) {
        return;
    }

    const botao = el("btnBaixaVencidos");

    botao.disabled = true;

    let ok = 0;

    let falhas = 0;

    for (const r of vencidos) {

        try {

            await baixarLote(r);

            ok++;

        } catch (erro) {

            console.error("Erro na baixa por vencimento:", erro);

            falhas++;

        }

    }

    alert(
        ok + (ok === 1 ? " lote baixado" : " lotes baixados") + " com sucesso" +
        (falhas ? ". Não foi possível baixar " + falhas + "." : ".")
    );

    botao.disabled = false;

});


/* ---------- adicionar lote ---------- */

const modalLote = el("modalLote");

function abrirModalLote(preset) {

    el("formLote").reset();

    popularSelectProdutos();

    selectProdutoModal.value = preset ? preset.produtoId : "";

    document.dispatchEvent(new Event("gk-sincronizar"));

    el("loteQuantidade").value = preset ? preset.quantidade : "";

    modalLote.hidden = false;

    el("loteValidade").focus();

}

function fecharModalLote() {

    modalLote.hidden = true;

}

el("btnNovoLote").addEventListener("click", function () { abrirModalLote(null); });

el("btnLoteCancelar").addEventListener("click", fecharModalLote);

modalLote.addEventListener("click", function (event) {

    if (event.target === modalLote) {
        fecharModalLote();
    }

});

document.addEventListener("keydown", function (event) {

    if (event.key === "Escape" && !modalLote.hidden) {
        fecharModalLote();
    }

});

el("formLote").addEventListener("submit", async function (event) {

    event.preventDefault();

    const produtoId = selectProdutoModal.value;

    const validade = el("loteValidade").value.trim();

    const quantidade = Number(el("loteQuantidade").value);

    const codigoLote = el("loteCodigo").value.trim();

    if (!produtoId) {

        alert("Selecione um produto.");

        return;

    }

    const ano = Number(validade.slice(0, 4));

    if (!/^\d{4}-\d{2}-\d{2}$/.test(validade) || ano < 2000 || ano > 2100) {

        alert("Informe uma validade válida.");

        return;

    }

    if (!(quantidade > 0)) {

        alert("Informe a quantidade do lote.");

        return;

    }

    const produto = produtosCache.find(function (p) { return p.id === produtoId; });

    if (!produto) {

        alert("Produto não encontrado.");

        return;

    }

    const semLote = resultadoValidade.semValidade.find(function (s) { return s.produtoId === produtoId; });

    const livre = semLote ? semLote.quantidade : 0;

    if (quantidade > livre + 1e-9) {

        alert(
            livre > 0
                ? "Só há " + qtdTxt(livre, produto.unidade) + " sem validade informada para este produto."
                : "Todo o estoque deste produto já tem validade informada. Para novas unidades, use a Entrada de estoque."
        );

        return;

    }

    const salvar = el("btnLoteSalvar");

    salvar.disabled = true;

    try {

        await referenciaLotes(lojaIdAtual).add({
            produtoId: produtoId,
            produto: produto.nome || "",
            codigo: produto.codigo || "",
            lote: codigoLote,
            validade: validade,
            quantidade: quantidade,
            quantidadeInicial: quantidade,
            unidade: produto.unidade || "UN",
            origem: "Manual",
            lojaId: lojaIdAtual,
            criadoEm: new Date().toISOString()
        });

        fecharModalLote();

        alert("Lote salvo com sucesso!");

    } catch (erro) {

        console.error("Erro ao salvar lote:", erro);

        alert("Não foi possível salvar o lote.");

    } finally {

        salvar.disabled = false;

    }

});


/* ---------- exportar CSV ---------- */

el("btnExportar").addEventListener("click", function () {

    if (!filtradas.length) {

        alert("Não há itens para exportar.");

        return;

    }

    const cabecalho = ["Produto", "Código", "Categoria", "Lote", "Validade", "Situação", "Quantidade", "Unidade", "Valor (R$)"];

    const linhas = filtradas.map(function (r) {

        const p = r.produto;

        return [
            p.nome || "",
            p.codigo || "",
            p.categoria || "",
            r.lote || "",
            r.validade ? window.GestokValidade.formatarData(r.validade) : "",
            window.GestokValidade.rotuloDias(r.dias),
            String(r.quantidade).replace(".", ","),
            p.unidade || "UN",
            r.valor.toFixed(2).replace(".", ",")
        ];

    });

    const csv = "\uFEFF" + [cabecalho].concat(linhas).map(function (linha) {
        return linha.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(";");
    }).join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "validade-" + new Date().toISOString().slice(0, 10) + ".csv";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    alert("Arquivo exportado com sucesso!");

});


/* ---------- início ---------- */

document.addEventListener("DOMContentLoaded", function () {

    observarAutenticacaoGestok(function (usuario) {

        if (!usuario) {

            window.location.replace("../login/index.html");

            return;

        }

        Promise.resolve(obterLojaAtualGestok()).then(function (id) {

            if (!id) {

                alert("Não foi possível identificar a loja atual.");

                return;

            }

            lojaIdAtual = id;

            iniciarListeners(id);

        });

    });

});
