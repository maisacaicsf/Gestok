/* =========================================
   GESTOK
   PRODUTOS - FIRESTORE / MULTI-TENANT
========================================= */

const form = document.getElementById("produtoForm");
const produtosLista = document.getElementById("produtosLista");
const produtosVazio = document.getElementById("produtosVazio");
const produtosCount = document.getElementById("produtosCount");

let produtoEditandoId = null;

/* =========================================
   LOJA ATUAL
========================================= */

function obterLojaAtualGestok() {

    const conta = obterContaGestok();
    const usuario = usuarioFirebaseAtualGestok();

    if (!conta || !conta.lojaId || !usuario) {
        return null;
    }

    if (conta.firebaseUid && conta.firebaseUid !== usuario.uid) {
        return null;
    }

    return conta.lojaId;
}

function referenciaProdutosGestok() {

    const lojaId = obterLojaAtualGestok();

    if (!lojaId) {
        throw new Error("Loja atual não identificada.");
    }

    return referenciaProdutos(lojaId);
}

/* =========================================
   UTILITÁRIOS
========================================= */

function gerarId() {
    return Date.now().toString() + Math.random().toString(36).substring(2, 8);
}

function formatarPreco(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================================
   LER PRODUTOS DO FIRESTORE
========================================= */

async function obterProdutos() {

    const snapshot = await referenciaProdutosGestok()
        .orderBy("nome")
        .get();

    return snapshot.docs.map(function (doc) {
        return {
            id: doc.id,
            ...doc.data()
        };
    });
}

/* =========================================
   MIGRAÇÃO ÚNICA DO LEGADO
   -----------------------------------------
   Se existirem produtos antigos no localStorage,
   eles são enviados para a loja atual uma única vez.
========================================= */

async function migrarProdutosLegados() {

    const chave = "gestok_produtos";
    const migrado = localStorage.getItem("gestok_produtos_migrado_firestore");

    if (migrado === "sim") {
        return;
    }

    const dados = localStorage.getItem(chave);

    if (!dados) {
        localStorage.setItem("gestok_produtos_migrado_firestore", "sim");
        return;
    }

    let antigos;

    try {
        antigos = JSON.parse(dados);
    } catch (erro) {
        console.error("Erro ao ler produtos antigos:", erro);
        return;
    }

    if (!Array.isArray(antigos) || antigos.length === 0) {
        localStorage.setItem("gestok_produtos_migrado_firestore", "sim");
        return;
    }

    const colecao = referenciaProdutosGestok();

    for (const produto of antigos) {

        const id = String(produto.id || gerarId());

        const existente = await colecao.doc(id).get();

        if (existente.exists) {
            continue;
        }

        await colecao.doc(id).set({
            nome: String(produto.nome || "").trim(),
            codigo: String(produto.codigo || "").trim(),
            categoria: String(produto.categoria || "").trim(),
            quantidade: Number(produto.quantidade || 0),
            unidade: String(produto.unidade || "UN"),
            estoqueMinimo: Number(produto.estoqueMinimo || 0),
            estoqueMaximo: Number(produto.estoqueMaximo || 0),
            preco: Number(produto.preco || 0),
            descricao: String(produto.descricao || "").trim(),
            ativo: produto.ativo !== false,
            dataCadastro: produto.dataCadastro || new Date().toISOString(),
            dataAtualizacao: new Date().toISOString()
        });
    }

    localStorage.setItem("gestok_produtos_migrado_firestore", "sim");
    console.log("Produtos antigos migrados para o Firestore.");
}

/* =========================================
   SKU DUPLICADO
========================================= */

async function codigoExiste(codigo, idAtual = null) {

    if (!codigo) {
        return false;
    }

    const snapshot = await referenciaProdutosGestok()
        .where("codigo", "==", codigo)
        .limit(10)
        .get();

    return snapshot.docs.some(function (doc) {
        return doc.id !== idAtual;
    });
}

/* =========================================
   RENDERIZAR
========================================= */

function renderizarProdutos(produtos) {

    produtosLista.innerHTML = "";

    produtosCount.textContent = produtos.length === 1
        ? "1 produto"
        : `${produtos.length} produtos`;

    if (produtos.length === 0) {
        produtosVazio.style.display = "flex";
        return;
    }

    produtosVazio.style.display = "none";

    produtos.forEach(function (produto) {

        const statusAtivo = produto.ativo !== false;
        const quantidade = Number(produto.quantidade || 0);
        const minimo = Number(produto.estoqueMinimo || 0);
        const estoqueBaixo = statusAtivo && minimo > 0 && quantidade < minimo;

        const card = document.createElement("div");
        card.className = estoqueBaixo
            ? "product-item stock-low"
            : "product-item";

        card.innerHTML = `
            <div class="product-main">
                <div class="product-icon">📦</div>
                <div class="product-info">
                    <strong>${escaparHTML(produto.nome)}</strong>
                    <span>${escaparHTML(produto.codigo || "Sem código")}</span>
                </div>
            </div>

            <div class="product-details">
                <div>
                    <small>Categoria</small>
                    <strong>${escaparHTML(produto.categoria || "Não definida")}</strong>
                </div>
                <div>
                    <small>Estoque</small>
                    <strong>${quantidade} ${escaparHTML(produto.unidade || "UN")}</strong>
                </div>
                <div>
                    <small>Preço</small>
                    <strong>${formatarPreco(produto.preco)}</strong>
                </div>
            </div>

            <div class="product-status">
                <span class="${statusAtivo ? "status-active" : "status-inactive"}">
                    ● ${statusAtivo ? "Ativo" : "Inativo"}
                </span>
                ${estoqueBaixo ? `<span class="stock-warning">⚠ Estoque baixo</span>` : ""}
            </div>

            <div class="product-actions">
                <button type="button" class="product-action edit" data-action="editar" data-id="${escaparHTML(produto.id)}" title="Editar produto">✎</button>
                <button type="button" class="product-action toggle" data-action="toggle" data-id="${escaparHTML(produto.id)}" title="${statusAtivo ? "Desativar produto" : "Ativar produto"}">${statusAtivo ? "⏸" : "▶"}</button>
                <button type="button" class="product-action delete" data-action="excluir" data-id="${escaparHTML(produto.id)}" title="Excluir produto">🗑</button>
            </div>
        `;

        produtosLista.appendChild(card);
    });
}

/* =========================================
   CARREGAR
========================================= */

async function carregarProdutos() {

    try {
        await migrarProdutosLegados();
        const produtos = await obterProdutos();
        renderizarProdutos(produtos);
    } catch (erro) {
        console.error("Erro ao carregar produtos:", erro);
        alert("Não foi possível carregar os produtos. Verifique sua conexão com o Firebase.");
    }
}

/* =========================================
   EDITAR
========================================= */

async function editarProduto(id) {

    try {

        const doc = await referenciaProdutosGestok().doc(id).get();

        if (!doc.exists) {
            alert("Produto não encontrado.");
            return;
        }

        const produto = { id: doc.id, ...doc.data() };
        produtoEditandoId = id;

        document.getElementById("nome").value = produto.nome || "";
        document.getElementById("codigo").value = produto.codigo || "";
        document.getElementById("categoria").value = produto.categoria || "";
        document.getElementById("quantidade").value = produto.quantidade ?? 0;
        document.getElementById("unidade").value = produto.unidade || "UN";
        document.getElementById("estoqueMinimo").value = produto.estoqueMinimo ?? 0;
        document.getElementById("estoqueMaximo").value = produto.estoqueMaximo ?? 0;
        document.getElementById("preco").value = produto.preco ?? 0;
        document.getElementById("descricao").value = produto.descricao || "";

        document.querySelector(".form-header h2").textContent = "Editar produto";
        document.querySelector(".form-header p").textContent = "Altere as informações do produto e salve as modificações.";
        document.querySelector('#produtoForm button[type="submit"]').textContent = "✓ Salvar alterações";

        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (erro) {
        console.error("Erro ao editar produto:", erro);
        alert("Não foi possível carregar o produto.");
    }
}

/* =========================================
   ATIVAR / DESATIVAR
========================================= */

async function alternarStatusProduto(id) {

    try {

        const ref = referenciaProdutosGestok().doc(id);
        const doc = await ref.get();

        if (!doc.exists) {
            return;
        }

        const produto = doc.data();

        await ref.update({
            ativo: produto.ativo === false,
            dataAtualizacao: new Date().toISOString()
        });

        await carregarProdutos();

    } catch (erro) {
        console.error("Erro ao alterar status:", erro);
        alert("Não foi possível alterar o status do produto.");
    }
}

/* =========================================
   EXCLUIR
========================================= */

async function excluirProduto(id) {

    try {

        const ref = referenciaProdutosGestok().doc(id);
        const doc = await ref.get();

        if (!doc.exists) {
            return;
        }

        const produto = doc.data();

        if (!confirm(`Deseja realmente excluir o produto "${produto.nome || ""}"?`)) {
            return;
        }

        await ref.delete();
        await carregarProdutos();

    } catch (erro) {
        console.error("Erro ao excluir produto:", erro);
        alert("Não foi possível excluir o produto.");
    }
}

/* =========================================
   AÇÕES
========================================= */

produtosLista.addEventListener("click", function (event) {

    const botao = event.target.closest("button[data-action]");

    if (!botao) {
        return;
    }

    const acao = botao.dataset.action;
    const id = botao.dataset.id;

    if (acao === "editar") {
        editarProduto(id);
    }

    if (acao === "toggle") {
        alternarStatusProduto(id);
    }

    if (acao === "excluir") {
        excluirProduto(id);
    }
});

/* =========================================
   SALVAR FORMULÁRIO
========================================= */

form.addEventListener("submit", async function (event) {

    event.preventDefault();

    try {

        const nome = document.getElementById("nome").value.trim();
        const codigo = document.getElementById("codigo").value.trim();

        if (!nome) {
            alert("Digite o nome do produto.");
            return;
        }

        if (await codigoExiste(codigo, produtoEditandoId)) {
            alert("Já existe um produto com este código / SKU.");
            document.getElementById("codigo").focus();
            return;
        }

        const dados = {
            nome: nome,
            codigo: codigo,
            categoria: document.getElementById("categoria").value,
            quantidade: Number(document.getElementById("quantidade").value || 0),
            unidade: document.getElementById("unidade").value,
            estoqueMinimo: Number(document.getElementById("estoqueMinimo").value || 0),
            estoqueMaximo: Number(document.getElementById("estoqueMaximo").value || 0),
            preco: Number(document.getElementById("preco").value || 0),
            descricao: document.getElementById("descricao").value.trim(),
            dataAtualizacao: new Date().toISOString()
        };

        if (produtoEditandoId) {

            await referenciaProdutosGestok()
                .doc(produtoEditandoId)
                .update(dados);

            alert(`Produto "${nome}" atualizado com sucesso!`);

        } else {

            const id = gerarId();

            await referenciaProdutosGestok()
                .doc(id)
                .set({
                    ...dados,
                    ativo: true,
                    dataCadastro: new Date().toISOString()
                });

            alert(`Produto "${nome}" cadastrado com sucesso!`);
        }

        produtoEditandoId = null;
        form.reset();
        document.getElementById("quantidade").value = 0;
        document.getElementById("estoqueMinimo").value = 0;
        document.getElementById("estoqueMaximo").value = 0;

        document.querySelector(".form-header h2").textContent = "Cadastrar produto";
        document.querySelector(".form-header p").textContent = "Preencha as informações abaixo para adicionar um novo produto.";
        document.querySelector('#produtoForm button[type="submit"]').textContent = "✓ Cadastrar produto";

        await carregarProdutos();

    } catch (erro) {
        console.error("Erro ao salvar produto:", erro);
        alert("Não foi possível salvar o produto no Firebase.");
    }
});

/* =========================================
   INICIALIZAÇÃO
========================================= */

document.addEventListener("DOMContentLoaded", function () {

    observarAutenticacaoGestok(function (usuario) {

        if (!usuario) {
            window.location.replace("../login/index.html");
            return;
        }

        carregarProdutos();

        const parametros = new URLSearchParams(window.location.search);
        const idParaEditar = parametros.get("editar");

        if (idParaEditar) {
            editarProduto(idParaEditar);
        }
    });
});
