/* =========================================
   GESTOK
   CONSULTA DE PRODUTOS - FIRESTORE
========================================= */

const tabela = document.getElementById("produtosTabela");
const pesquisa = document.getElementById("pesquisaProduto");
const filtroCategoria = document.getElementById("filtroCategoria");
const filtroStatus = document.getElementById("filtroStatus");
const filtroEstoque = document.getElementById("filtroEstoque");
const ordenacao = document.getElementById("ordenacao");
const limparFiltros = document.getElementById("limparFiltros");
const contador = document.getElementById("produtosCount");
const semResultados = document.getElementById("semResultados");

let todosProdutos = [];

/* =========================================
   PAGINAÇÃO
========================================= */

const paginacao = document.getElementById("paginacao");
const seletorItens = document.getElementById("itensPorPagina");
const paginaInfo = document.getElementById("paginaInfo");
const paginaNav = document.getElementById("paginaNav");

const OPCOES_ITENS = [10, 50, 100];

let itensPorPagina = 10;
let paginaAtual = 1;
let resultadoFiltrado = [];

try {

    const salvo = Number(localStorage.getItem("gestok_produtos_por_pagina"));

    if (OPCOES_ITENS.includes(salvo)) {

        itensPorPagina = salvo;

    }

} catch (erro) { }


function obterLojaAtualGestok() {
    const conta = obterContaGestok();
    const usuario = usuarioFirebaseAtualGestok();
    if (!conta || !conta.lojaId || !usuario) return null;
    if (conta.firebaseUid && conta.firebaseUid !== usuario.uid) return null;
    return conta.lojaId;
}

function referenciaProdutosGestok() {
    const lojaId = obterLojaAtualGestok();
    if (!lojaId) throw new Error("Loja atual não identificada.");
    return referenciaProdutos(lojaId);
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function obterSituacaoEstoque(produto) {
    const quantidade = Number(produto.quantidade || 0);
    const minimo = Number(produto.estoqueMinimo || 0);
    if (quantidade <= 0) return "zerado";
    if (minimo > 0 && quantidade < minimo) return "baixo";
    return "normal";
}

function obterStatus(produto) {
    if (produto.ativo === false) {
        return { classe: "inactive", texto: "Inativo" };
    }
    const situacao = obterSituacaoEstoque(produto);
    if (situacao === "zerado") return { classe: "danger", texto: "Sem estoque" };
    if (situacao === "baixo") return { classe: "warning", texto: "Estoque baixo" };
    return { classe: "success", texto: "Normal" };
}

async function carregarProdutos() {
    try {
        const snapshot = await referenciaProdutosGestok()
            .orderBy("nome")
            .get();

        todosProdutos = snapshot.docs.map(function (doc) {
            return { id: doc.id, ...doc.data() };
        });

        carregarCategorias();

        const restaurou = restaurarEstadoConsulta();

        filtrarProdutos(restaurou);

    } catch (erro) {
        console.error("Erro ao carregar consulta de produtos:", erro);
        alert("Não foi possível carregar os produtos do Firebase.");
    }
}

function carregarCategorias() {
    const categorias = [...new Set(
        todosProdutos
            .map(function (produto) {
                return String(produto.categoria || "").trim();
            })
            .filter(Boolean)
    )];

    categorias.sort(function (a, b) {
        return a.localeCompare(b, "pt-BR");
    });

    filtroCategoria.innerHTML = `<option value="">Todas</option>`;

    categorias.forEach(function (categoria) {
        const option = document.createElement("option");
        option.value = categoria;
        option.textContent = categoria;
        filtroCategoria.appendChild(option);
    });
}

function ordenarProdutos(produtos) {
    const tipo = ordenacao.value;

    return produtos.sort(function (a, b) {
        if (tipo === "nome") {
            return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
        }
        if (tipo === "nome-desc") {
            return String(b.nome || "").localeCompare(String(a.nome || ""), "pt-BR");
        }
        if (tipo === "estoque-menor") {
            return Number(a.quantidade || 0) - Number(b.quantidade || 0);
        }
        if (tipo === "estoque-maior") {
            return Number(b.quantidade || 0) - Number(a.quantidade || 0);
        }
        if (tipo === "codigo") {
            return String(a.codigo || "").localeCompare(String(b.codigo || ""), "pt-BR");
        }
        return 0;
    });
}

function filtrarProdutos(manterPagina) {

    const termo = pesquisa.value.trim().toLowerCase();
    const categoria = filtroCategoria.value;
    const status = filtroStatus.value;
    const estoque = filtroEstoque.value;

    let resultado = todosProdutos.filter(function (produto) {

        const nome = String(produto.nome || "").toLowerCase();
        const codigo = String(produto.codigo || "").toLowerCase();

        if (termo && !nome.includes(termo) && !codigo.includes(termo)) {
            return false;
        }

        if (categoria && produto.categoria !== categoria) {
            return false;
        }

        if (status === "ativo" && produto.ativo === false) {
            return false;
        }

        if (status === "inativo" && produto.ativo !== false) {
            return false;
        }

        if (estoque && obterSituacaoEstoque(produto) !== estoque) {
            return false;
        }

        return true;
    });

    resultadoFiltrado = ordenarProdutos(resultado);

    if (!manterPagina) {

        paginaAtual = 1;

    }

    renderizarPagina();
}

function renderizarProdutos(produtos, totalFiltrado) {

    tabela.innerHTML = "";

    contador.textContent = `${totalFiltrado} ${totalFiltrado === 1 ? "produto" : "produtos"}`;

    if (totalFiltrado === 0) {
        semResultados.style.display = "flex";
        return;
    }

    semResultados.style.display = "none";

    produtos.forEach(function (produto) {

        const quantidade = Number(produto.quantidade || 0);
        const minimo = Number(produto.estoqueMinimo || 0);
        const maximo = Number(produto.estoqueMaximo || 0);
        const unidade = produto.unidade || "UN";
        const status = obterStatus(produto);
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>
                <div class="product-name">
                    <strong>${escaparHTML(produto.nome)}</strong>
                    ${produto.descricao ? `<small>${escaparHTML(produto.descricao)}</small>` : ""}
                </div>
            </td>
            <td>${produto.codigo ? escaparHTML(produto.codigo) : "—"}</td>
            <td>${produto.categoria ? escaparHTML(produto.categoria) : "—"}</td>
            <td><strong>${quantidade}</strong> <span class="unit">${escaparHTML(unidade)}</span></td>
            <td>${minimo} ${escaparHTML(unidade)}</td>
            <td>${maximo > 0 ? `${maximo} ${escaparHTML(unidade)}` : "—"}</td>
            <td>
                <span class="stock-status ${status.classe}">
                    <span class="status-dot"></span>
                    ${status.texto}
                </span>
            </td>
            <td>
                <div class="row-actions">
                    <button type="button" class="edit-button" data-action="editar" data-id="${escaparHTML(produto.id)}">✎ Editar</button>
                    <button type="button" class="row-action" data-action="toggle" data-id="${escaparHTML(produto.id)}" title="${produto.ativo === false ? "Ativar produto" : "Desativar produto"}">${produto.ativo === false ? "▶" : "⏸"}</button>
                    <button type="button" class="row-action danger" data-action="excluir" data-id="${escaparHTML(produto.id)}" title="Excluir produto">🗑</button>
                </div>
            </td>
        `;

        tabela.appendChild(tr);
    });
}

tabela.addEventListener("click", function (event) {

    const botao = event.target.closest("button[data-action]");

    if (!botao) return;

    const id = botao.dataset.id;

    if (!id) return;

    if (botao.dataset.action === "editar") {

        /* Marca que vamos voltar para esta página depois da edição */
        salvarEstadoConsulta();

        try {

            sessionStorage.setItem("gestok_consulta_voltar", "1");

        } catch (erro) { }

        window.location.href = `../index.html?editar=${encodeURIComponent(id)}`;

        return;

    }

    if (botao.dataset.action === "toggle") {

        alternarStatusProduto(id);

    }

    if (botao.dataset.action === "excluir") {

        excluirProduto(id);

    }

});

pesquisa.addEventListener("input", function () { filtrarProdutos(false); });
filtroCategoria.addEventListener("change", function () { filtrarProdutos(false); });
filtroStatus.addEventListener("change", function () { filtrarProdutos(false); });
filtroEstoque.addEventListener("change", function () { filtrarProdutos(false); });
ordenacao.addEventListener("change", function () { filtrarProdutos(false); });

limparFiltros.addEventListener("click", function () {
    pesquisa.value = "";
    filtroCategoria.value = "";
    filtroStatus.value = "";
    filtroEstoque.value = "";
    ordenacao.value = "nome";
    filtrarProdutos();
});

document.addEventListener("DOMContentLoaded", function () {
    observarAutenticacaoGestok(function (usuario) {
        if (!usuario) {
            window.location.replace("../../login/index.html");
            return;
        }
        carregarProdutos();
    });
});


/* =========================================
   PAGINAÇÃO - RENDERIZAR
========================================= */

function renderizarPagina() {

    const total = resultadoFiltrado.length;

    const totalPaginas = Math.max(1, Math.ceil(total / itensPorPagina));

    paginaAtual = Math.min(Math.max(1, paginaAtual), totalPaginas);

    const inicio = (paginaAtual - 1) * itensPorPagina;

    const pagina = resultadoFiltrado.slice(inicio, inicio + itensPorPagina);

    renderizarProdutos(pagina, total);

    renderizarPaginacao(total, totalPaginas, inicio, pagina.length);

    salvarEstadoConsulta();

}


function renderizarPaginacao(total, totalPaginas, inicio, quantidadeNaPagina) {

    if (total === 0) {

        paginacao.style.display = "none";

        return;

    }

    paginacao.style.display = "flex";

    seletorItens.value = String(itensPorPagina);

    paginaInfo.textContent =
        `Mostrando ${inicio + 1}–${inicio + quantidadeNaPagina} de ${total}`;

    if (totalPaginas <= 1) {

        paginaNav.innerHTML = "";

        return;

    }

    const conjunto = new Set([
        1,
        totalPaginas,
        paginaAtual - 1,
        paginaAtual,
        paginaAtual + 1
    ]);

    const numeros = [...conjunto]
        .filter(function (n) { return n >= 1 && n <= totalPaginas; })
        .sort(function (a, b) { return a - b; });

    let html =
        `<button type="button" class="page-btn" data-pagina="${paginaAtual - 1}" ${paginaAtual === 1 ? "disabled" : ""}>‹ Anterior</button>`;

    let anterior = 0;

    numeros.forEach(function (n) {

        if (n - anterior > 1) {

            html += `<span class="page-gap">…</span>`;

        }

        html += `<button type="button" class="page-btn ${n === paginaAtual ? "active" : ""}" data-pagina="${n}">${n}</button>`;

        anterior = n;

    });

    html +=
        `<button type="button" class="page-btn" data-pagina="${paginaAtual + 1}" ${paginaAtual === totalPaginas ? "disabled" : ""}>Próxima ›</button>`;

    paginaNav.innerHTML = html;

}


paginaNav.addEventListener("click", function (event) {

    const botao = event.target.closest("button[data-pagina]");

    if (!botao || botao.disabled) return;

    paginaAtual = Number(botao.dataset.pagina);

    renderizarPagina();

    document.querySelector(".products-panel")
        .scrollIntoView({ behavior: "smooth", block: "start" });

});


seletorItens.addEventListener("change", function () {

    const valor = Number(seletorItens.value);

    itensPorPagina = OPCOES_ITENS.includes(valor) ? valor : 10;

    try {

        localStorage.setItem("gestok_produtos_por_pagina", String(itensPorPagina));

    } catch (erro) { }

    paginaAtual = 1;

    renderizarPagina();

});


/* =========================================
   ESTADO (voltar da edição na mesma página)
========================================= */

function salvarEstadoConsulta() {

    try {

        sessionStorage.setItem("gestok_consulta_estado", JSON.stringify({
            pagina: paginaAtual,
            pesquisa: pesquisa.value,
            categoria: filtroCategoria.value,
            status: filtroStatus.value,
            estoque: filtroEstoque.value,
            ordenacao: ordenacao.value
        }));

    } catch (erro) { }

}


function restaurarEstadoConsulta() {

    try {

        const voltando = sessionStorage.getItem("gestok_consulta_voltar") === "1";

        sessionStorage.removeItem("gestok_consulta_voltar");

        if (!voltando) return false;

        const estado = JSON.parse(sessionStorage.getItem("gestok_consulta_estado") || "null");

        if (!estado) return false;

        pesquisa.value = estado.pesquisa || "";
        filtroCategoria.value = estado.categoria || "";
        filtroStatus.value = estado.status || "";
        filtroEstoque.value = estado.estoque || "";
        ordenacao.value = estado.ordenacao || "nome";

        paginaAtual = Number(estado.pagina) || 1;

        return true;

    } catch (erro) {

        return false;

    }

}


/* =========================================
   ATIVAR / DESATIVAR E EXCLUIR
========================================= */

async function alternarStatusProduto(id) {

    const produto = todosProdutos.find(function (p) { return p.id === id; });

    if (!produto) return;

    try {

        const novoAtivo = produto.ativo === false;

        const agora = new Date().toISOString();

        await referenciaProdutosGestok()
            .doc(id)
            .update({ ativo: novoAtivo, dataAtualizacao: agora });

        produto.ativo = novoAtivo;

        produto.dataAtualizacao = agora;

        filtrarProdutos(true);

    } catch (erro) {

        console.error("Erro ao alterar status:", erro);

        alert("Não foi possível alterar o status do produto.");

    }

}


async function excluirProduto(id) {

    const produto = todosProdutos.find(function (p) { return p.id === id; });

    if (!produto) return;

    if (!confirm(`Deseja realmente excluir o produto "${produto.nome || ""}"?`)) {

        return;

    }

    try {

        await referenciaProdutosGestok().doc(id).delete();

        todosProdutos = todosProdutos.filter(function (p) { return p.id !== id; });

        filtrarProdutos(true);

    } catch (erro) {

        console.error("Erro ao excluir produto:", erro);

        alert("Não foi possível excluir o produto.");

    }

}
