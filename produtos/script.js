/* =========================================
   GESTOK
   PRODUTOS - FIRESTORE / MULTI-TENANT
========================================= */

const form = document.getElementById("produtoForm");

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
   CARREGAR
   (a lista de produtos agora fica na tela de
   Consulta; aqui só migramos produtos antigos)
========================================= */

async function carregarProdutos() {

    try {

        await migrarProdutosLegados();

    } catch (erro) {

        console.error("Erro ao preparar os produtos:", erro);

    }

}


/* =========================================
   MODO CADASTRO / MODO EDIÇÃO
========================================= */

const tituloForm = document.querySelector(".form-header h2");
const subtituloForm = document.querySelector(".form-header p");
const botaoSalvar = document.querySelector('#produtoForm button[type="submit"]');
const rodapeForm = document.querySelector("#produtoForm .form-footer");
const linkSecundario = rodapeForm.querySelector(".secondary-button");
const linkSecundarioOriginal = {
    texto: linkSecundario.textContent.trim(),
    href: linkSecundario.getAttribute("href")
};
let botaoNovoProduto = null;


function limparFormulario() {

    form.reset();

    document.getElementById("quantidade").value = 0;
    document.getElementById("estoqueMinimo").value = 0;
    document.getElementById("estoqueMaximo").value = 0;

}


function mostrarMensagemForm(texto) {

    if (window.gestokNotificar) {

        window.gestokNotificar(texto, "sucesso");

        return;

    }

    alert(texto);

}


function entrarModoEdicao(produto) {

    produtoEditandoId = produto.id;

    document.getElementById("nome").value = produto.nome || "";
    document.getElementById("codigo").value = produto.codigo || "";
    document.getElementById("categoria").value = produto.categoria || "";
    document.getElementById("quantidade").value = produto.quantidade ?? 0;
    document.getElementById("unidade").value = produto.unidade || "UN";
    document.getElementById("estoqueMinimo").value = produto.estoqueMinimo ?? 0;
    document.getElementById("estoqueMaximo").value = produto.estoqueMaximo ?? 0;
    document.getElementById("preco").value = produto.preco ?? 0;
    document.getElementById("descricao").value = produto.descricao || "";

    tituloForm.textContent = "Editar produto";
    subtituloForm.textContent = "Altere as informações do produto e salve as modificações.";
    botaoSalvar.textContent = "✓ Salvar alterações";

    linkSecundario.textContent = "← Voltar para a consulta";
    linkSecundario.setAttribute("href", "consulta/index.html");

    if (!botaoNovoProduto) {

        botaoNovoProduto = document.createElement("button");

        botaoNovoProduto.type = "button";

        botaoNovoProduto.className = "secondary-button";

        botaoNovoProduto.textContent = "+ Novo produto";

        botaoNovoProduto.addEventListener("click", sairModoEdicao);

        rodapeForm.insertBefore(botaoNovoProduto, botaoSalvar);

    }

    /* Mantém o produto aberto mesmo se a página for recarregada */
    try {

        history.replaceState(
            null,
            "",
            window.location.pathname + "?editar=" + encodeURIComponent(produto.id)
        );

    } catch (erro) { }

}


function sairModoEdicao() {

    produtoEditandoId = null;

    limparFormulario();

    tituloForm.textContent = "Cadastrar produto";
    subtituloForm.textContent = "Preencha as informações abaixo para adicionar um novo produto.";
    botaoSalvar.textContent = "✓ Cadastrar produto";

    linkSecundario.textContent = linkSecundarioOriginal.texto;
    linkSecundario.setAttribute("href", linkSecundarioOriginal.href);

    if (botaoNovoProduto) {

        botaoNovoProduto.remove();

        botaoNovoProduto = null;

    }

    try {

        history.replaceState(null, "", window.location.pathname);

    } catch (erro) { }

    document.getElementById("nome").focus();

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

        entrarModoEdicao({ id: doc.id, ...doc.data() });

        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (erro) {

        console.error("Erro ao editar produto:", erro);

        alert("Não foi possível carregar o produto.");

    }

}


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

            /* Continua na tela do produto editado, para editar de novo se quiser */
            entrarModoEdicao({ id: produtoEditandoId, ...dados });

            mostrarMensagemForm(`✓ Produto "${nome}" atualizado com sucesso!`);

            return;

        }

        const id = gerarId();

        await referenciaProdutosGestok()
            .doc(id)
            .set({
                ...dados,
                ativo: true,
                dataCadastro: new Date().toISOString()
            });

        alert(`Produto "${nome}" cadastrado com sucesso!`);

        limparFormulario();

        document.getElementById("nome").focus();

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
