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
        filtrarProdutos();

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

function filtrarProdutos() {

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

    resultado = ordenarProdutos(resultado);
    renderizarProdutos(resultado);
}

function renderizarProdutos(produtos) {

    tabela.innerHTML = "";

    contador.textContent = `${produtos.length} ${produtos.length === 1 ? "produto" : "produtos"}`;

    if (produtos.length === 0) {
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
                <button type="button" class="edit-button" data-id="${escaparHTML(produto.id)}">✎ Editar</button>
            </td>
        `;

        tabela.appendChild(tr);
    });
}

tabela.addEventListener("click", function (event) {
    const botao = event.target.closest(".edit-button");
    if (!botao) return;

    const id = botao.dataset.id;
    if (!id) return;

    window.location.href = `../index.html?editar=${encodeURIComponent(id)}`;
});

pesquisa.addEventListener("input", filtrarProdutos);
filtroCategoria.addEventListener("change", filtrarProdutos);
filtroStatus.addEventListener("change", filtrarProdutos);
filtroEstoque.addEventListener("change", filtrarProdutos);
ordenacao.addEventListener("change", filtrarProdutos);

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
