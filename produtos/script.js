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


/* Validade e lote só no cadastro (lotes de produtos existentes: tela Validade / Entrada) */
function alternarCamposValidade(mostrar) {

    ["grupoValidadeCadastro", "grupoLoteCadastro"].forEach(function (id) {

        const grupo = document.getElementById(id);

        if (grupo) {
            grupo.style.display = mostrar ? "" : "none";
        }

    });

}


/* =========================================
   FORNECEDOR DO PRODUTO
========================================= */

const campoFornecedor = document.getElementById("fornecedor");
const buscaFornecedor = document.getElementById("buscaFornecedor");
const listaFornecedoresBusca = document.getElementById("listaFornecedoresBusca");

let fornecedoresLista = [];

let fornecedoresProntos = Promise.resolve();


function carregarFornecedores() {

    fornecedoresProntos = (async function () {

        try {

            const snap = await referenciaProdutosGestok()
                .parent
                .collection("fornecedores")
                .get();

            fornecedoresLista = snap.docs
                .map(function (d) { return Object.assign({ id: d.id }, d.data()); })
                .sort(function (a, b) {
                    return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
                });

            popularFornecedores();

        } catch (erro) {

            console.error("Erro ao carregar fornecedores:", erro);

        }

    })();

    return fornecedoresProntos;

}


/* Lista os fornecedores ativos; mantém o atual mesmo que esteja inativo */
function popularFornecedores(selecionadoId, selecionadoNome) {

    if (!campoFornecedor) {
        return;
    }

    const atual = selecionadoId !== undefined ? selecionadoId : campoFornecedor.value;

    const ativos = fornecedoresLista.filter(function (f) { return f.ativo !== false; });

    let html = '<option value="">Sem fornecedor</option>' +
        ativos.map(function (f) {
            return '<option value="' + escaparHTML(f.id) + '">' + escaparHTML(f.nome || "Sem nome") + '</option>';
        }).join("");

    if (atual && !ativos.some(function (f) { return f.id === atual; })) {

        const encontrado = fornecedoresLista.find(function (f) { return f.id === atual; });

        html += '<option value="' + escaparHTML(atual) + '">' +
            escaparHTML((encontrado && encontrado.nome) || selecionadoNome || "Fornecedor") + ' (inativo)</option>';

    }

    campoFornecedor.innerHTML = html;

    campoFornecedor.value = atual || "";

    if (listaFornecedoresBusca) {
        listaFornecedoresBusca.innerHTML = ativos.map(function (f) {
            const rotulo = [f.nome, f.documento, f.contato, f.telefone, f.cidade].filter(Boolean).join(" · ");
            return '<option value="' + escaparHTML(rotulo) + '"></option>';
        }).join("");
    }
    if (buscaFornecedor) {
        const selecionado = fornecedoresLista.find(function (f) { return f.id === (atual || ""); });
        buscaFornecedor.value = selecionado ? [selecionado.nome, selecionado.documento, selecionado.contato, selecionado.telefone, selecionado.cidade].filter(Boolean).join(" · ") : "";
    }

}


function nomeDoFornecedorSelecionado() {

    if (!campoFornecedor || !campoFornecedor.value) {
        return "";
    }

    const encontrado = fornecedoresLista.find(function (f) { return f.id === campoFornecedor.value; });

    if (encontrado) {
        return encontrado.nome || "";
    }

    const opcao = campoFornecedor.options[campoFornecedor.selectedIndex];

    return opcao ? String(opcao.textContent).replace(/\s*\(inativo\)\s*$/, "").trim() : "";

}


if (buscaFornecedor) {
    buscaFornecedor.addEventListener("input", function () {
        const termo = String(buscaFornecedor.value || "").trim().toLocaleLowerCase("pt-BR");
        if (!termo) { campoFornecedor.value = ""; return; }
        const encontrado = fornecedoresLista.find(function (f) {
            const rotulo = [f.nome, f.documento, f.contato, f.telefone, f.cidade].filter(Boolean).join(" · ").toLocaleLowerCase("pt-BR");
            return rotulo === termo;
        });
        if (encontrado) campoFornecedor.value = encontrado.id;
    });
    buscaFornecedor.addEventListener("change", function () {
        const termo = String(buscaFornecedor.value || "").trim().toLocaleLowerCase("pt-BR");
        const encontrado = fornecedoresLista.find(function (f) {
            const rotulo = [f.nome, f.documento, f.contato, f.telefone, f.cidade].filter(Boolean).join(" · ").toLocaleLowerCase("pt-BR");
            return rotulo === termo || String(f.nome || "").toLocaleLowerCase("pt-BR") === termo;
        });
        campoFornecedor.value = encontrado ? encontrado.id : "";
        if (termo && !encontrado) {
            alert("Fornecedor não encontrado. Confira a pesquisa ou cadastre um novo fornecedor.");
            buscaFornecedor.focus();
        }
    });
}

/* =========================================
   CATEGORIAS DO PRODUTO
   -----------------------------------------
   - Categorias padrão ficam no código.
   - As criadas pelo usuário ficam em
     lojas/{loja}/categorias (uma por loja).
   - O produto continua guardando só o NOME da
     categoria, então relatórios, filtros e
     validade seguem funcionando sem mudanças.
========================================= */

const CATEGORIAS_PADRAO = ["Eletrônicos", "Informática", "Escritório", "Ferramentas", "Materiais", "Outros"];

const campoCategoria = document.getElementById("categoria");
const modalCategoria = document.getElementById("modalCategoria");
const inputNovaCategoria = document.getElementById("novaCategoriaNome");
const mensagemCategoria = document.getElementById("categoriaMsg");
const blocoMinhasCategorias = document.getElementById("categoriaMinhas");
const listaMinhasCategorias = document.getElementById("categoriaLista");
const botaoNovaCategoria = document.getElementById("botaoNovaCategoria");
const botaoSalvarCategoria = document.getElementById("botaoSalvarCategoria");
const botaoFecharCategoria = document.getElementById("botaoFecharCategoria");
const botaoGerenciarCategorias = document.getElementById("botaoGerenciarCategorias");
const blocoCriarCategoria = document.getElementById("categoriaBlocoCriar");
const tituloModalCategoria = document.getElementById("modalCategoriaTitulo");
const subModalCategoria = document.getElementById("modalCategoriaSub");

/* "criar" = só o campo de nova categoria | "gerenciar" = só a lista (renomear/remover) */
let modoModalCategoria = "criar";

let categoriasPersonalizadas = [];

let categoriaEmEdicaoId = null;

let categoriasProntas = Promise.resolve();


function normalizarCategoria(texto) {

    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

}

/* Id estável: "Bebidas  Geladas" e "bebidas geladas" geram o mesmo documento */
function idDaCategoria(nome) {

    return normalizarCategoria(nome)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

}

function referenciaCategoriasGestok() {

    const lojaId = obterLojaAtualGestok();

    if (!lojaId) {
        throw new Error("Loja atual não identificada.");
    }

    return referenciaCategorias(lojaId);

}

function categoriaJaExiste(nome) {

    const alvo = normalizarCategoria(nome);

    return CATEGORIAS_PADRAO.concat(categoriasPersonalizadas.map(function (c) { return c.nome; }))
        .some(function (n) { return normalizarCategoria(n) === alvo; });

}


function carregarCategorias() {

    categoriasProntas = (async function () {

        try {

            const snap = await referenciaCategoriasGestok().get();

            categoriasPersonalizadas = snap.docs.map(function (d) {
                return { id: d.id, nome: String(d.data().nome || "").trim(), dataCriacao: d.data().dataCriacao };
            }).filter(function (c) { return c.nome; });

            popularCategorias();

        } catch (erro) {

            console.error("Erro ao carregar categorias:", erro);

        }

    })();

    return categoriasProntas;

}


/* Monta o select: padrão + criadas por você. Se o produto tiver uma
   categoria antiga que não está na lista, ela é mantida para não se perder. */
function popularCategorias(selecionado) {

    const atual = selecionado !== undefined ? selecionado : campoCategoria.value;

    const nomes = CATEGORIAS_PADRAO.slice();

    categoriasPersonalizadas.forEach(function (c) {
        if (!nomes.some(function (n) { return normalizarCategoria(n) === normalizarCategoria(c.nome); })) {
            nomes.push(c.nome);
        }
    });

    if (atual && !nomes.some(function (n) { return normalizarCategoria(n) === normalizarCategoria(atual); })) {
        nomes.push(atual);
    }

    nomes.sort(function (a, b) {
        if (a === "Outros") { return 1; }
        if (b === "Outros") { return -1; }
        return a.localeCompare(b, "pt-BR");
    });

    campoCategoria.innerHTML = "";

    const vazio = document.createElement("option");
    vazio.value = "";
    vazio.textContent = "Selecione uma categoria";
    campoCategoria.appendChild(vazio);

    nomes.forEach(function (nome) {
        const opcao = document.createElement("option");
        opcao.value = nome;
        opcao.textContent = nome;
        campoCategoria.appendChild(opcao);
    });

    campoCategoria.value = atual || "";

    atualizarBotaoGerenciarCategorias();

}


/* ---------- janela "Nova categoria" ---------- */

/* Mensagem no padrão do Gestok (toast); cai no alert se o componente não carregou */
function avisarCategoria(texto, tipo) {

    if (window.gestokNotificar) {
        window.gestokNotificar(texto, tipo || "sucesso");
        return;
    }

    alert(texto);

}

function mostrarMensagemCategoria(texto) {

    mensagemCategoria.textContent = texto || "";
    mensagemCategoria.hidden = !texto;

}

function abrirModalCategoria(modo) {

    modoModalCategoria = modo === "gerenciar" ? "gerenciar" : "criar";

    const gerenciando = modoModalCategoria === "gerenciar";

    tituloModalCategoria.textContent = gerenciando ? "Minhas categorias" : "Nova categoria";
    subModalCategoria.textContent = gerenciando
        ? "Renomeie ou remova as categorias que você criou."
        : "Crie uma categoria para organizar seus produtos.";

    blocoCriarCategoria.hidden = gerenciando;
    botaoSalvarCategoria.hidden = gerenciando;
    botaoFecharCategoria.textContent = gerenciando ? "Fechar" : "Cancelar";

    inputNovaCategoria.value = "";
    categoriaEmEdicaoId = null;
    mostrarMensagemCategoria("");
    renderizarMinhasCategorias();

    modalCategoria.hidden = false;

    setTimeout(function () {
        (gerenciando ? botaoFecharCategoria : inputNovaCategoria).focus();
    }, 30);

}

/* O atalho "Renomear ou remover" só aparece se existir alguma categoria criada por você */
function atualizarBotaoGerenciarCategorias() {

    botaoGerenciarCategorias.hidden = categoriasPersonalizadas.length === 0;

}

function fecharModalCategoria() {

    modalCategoria.hidden = true;

    campoCategoria.focus();

}

function renderizarMinhasCategorias() {

    listaMinhasCategorias.innerHTML = "";

    blocoMinhasCategorias.hidden = modoModalCategoria !== "gerenciar" || categoriasPersonalizadas.length === 0;

    categoriasPersonalizadas
        .slice()
        .sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); })
        .forEach(function (cat) {

            const item = document.createElement("li");

            if (categoriaEmEdicaoId === cat.id) {

                const campo = document.createElement("input");
                campo.type = "text";
                campo.className = "categoria-edicao-input";
                campo.maxLength = 40;
                campo.value = cat.nome;
                campo.setAttribute("aria-label", "Novo nome da categoria " + cat.nome);

                const salvar = document.createElement("button");
                salvar.type = "button";
                salvar.className = "categoria-acao categoria-acao-salvar";
                salvar.textContent = "Salvar";
                salvar.addEventListener("click", function () { renomearCategoria(cat, campo.value, salvar); });

                const cancelar = document.createElement("button");
                cancelar.type = "button";
                cancelar.className = "categoria-acao";
                cancelar.textContent = "Cancelar";
                cancelar.addEventListener("click", function () {
                    categoriaEmEdicaoId = null;
                    mostrarMensagemCategoria("");
                    renderizarMinhasCategorias();
                });

                campo.addEventListener("keydown", function (e) {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        renomearCategoria(cat, campo.value, salvar);
                    } else if (e.key === "Escape") {
                        e.stopPropagation();
                        cancelar.click();
                    }
                });

                item.className = "categoria-item-edicao";
                item.appendChild(campo);
                item.appendChild(salvar);
                item.appendChild(cancelar);
                listaMinhasCategorias.appendChild(item);

                setTimeout(function () { campo.focus(); campo.select(); }, 30);

                return;

            }

            const nome = document.createElement("span");
            nome.textContent = cat.nome;

            const acoes = document.createElement("span");
            acoes.className = "categoria-acoes";

            const renomear = document.createElement("button");
            renomear.type = "button";
            renomear.className = "categoria-acao";
            renomear.textContent = "Renomear";
            renomear.setAttribute("aria-label", "Renomear categoria " + cat.nome);
            renomear.addEventListener("click", function () {
                categoriaEmEdicaoId = cat.id;
                mostrarMensagemCategoria("");
                renderizarMinhasCategorias();
            });

            const remover = document.createElement("button");
            remover.type = "button";
            remover.className = "categoria-remover";
            remover.textContent = "Remover";
            remover.setAttribute("aria-label", "Remover categoria " + cat.nome);
            remover.addEventListener("click", function () { removerCategoria(cat); });

            acoes.appendChild(renomear);
            acoes.appendChild(remover);

            item.appendChild(nome);
            item.appendChild(acoes);
            listaMinhasCategorias.appendChild(item);

        });

}

async function salvarNovaCategoria() {

    const nome = inputNovaCategoria.value.replace(/\s+/g, " ").trim();

    if (!nome) {
        mostrarMensagemCategoria("Digite o nome da categoria.");
        inputNovaCategoria.focus();
        return;
    }

    const id = idDaCategoria(nome);

    if (!id) {
        mostrarMensagemCategoria("Use pelo menos uma letra ou número no nome.");
        inputNovaCategoria.focus();
        return;
    }

    if (categoriaJaExiste(nome)) {
        mostrarMensagemCategoria("Essa categoria já existe. Selecione-a na lista.");
        inputNovaCategoria.focus();
        return;
    }

    botaoSalvarCategoria.disabled = true;

    try {

        await referenciaCategoriasGestok().doc(id).set({
            nome: nome,
            dataCriacao: new Date().toISOString()
        });

        categoriasPersonalizadas.push({ id: id, nome: nome });

        popularCategorias(nome);

        fecharModalCategoria();

        avisarCategoria('Categoria "' + nome + '" criada com sucesso.', "sucesso");

    } catch (erro) {

        console.error("Erro ao criar categoria:", erro);

        mostrarMensagemCategoria("Não foi possível criar a categoria. Tente novamente.");

    } finally {

        botaoSalvarCategoria.disabled = false;

    }

}

/* ---------- confirmação no estilo do Gestok (substitui o confirm() do navegador) ---------- */

const modalConfirma = document.getElementById("confirmaCategoria");
const confirmaTitulo = document.getElementById("confirmaCategoriaTitulo");
const confirmaIcone = document.getElementById("confirmaCategoriaIcone");
const confirmaFluxo = document.getElementById("confirmaCategoriaFluxo");
const confirmaDe = document.getElementById("confirmaCategoriaDe");
const confirmaPara = document.getElementById("confirmaCategoriaPara");
const confirmaSeta = document.getElementById("confirmaCategoriaSeta");
const confirmaQtd = document.getElementById("confirmaCategoriaQtd");
const confirmaTexto = document.getElementById("confirmaCategoriaTexto");
const confirmaBotaoOk = document.getElementById("confirmaCategoriaOk");
const confirmaBotaoCancelar = document.getElementById("confirmaCategoriaCancelar");

let resolverConfirmacao = null;

function fecharConfirmacao(resultado) {

    modalConfirma.hidden = true;

    const resolver = resolverConfirmacao;

    resolverConfirmacao = null;

    if (resolver) { resolver(resultado); }

}

/* Abre a janela e devolve uma Promise: true (confirmou) ou false (cancelou) */
function confirmarCategoria(opcoes) {

    if (resolverConfirmacao) { fecharConfirmacao(false); }

    confirmaTitulo.textContent = opcoes.titulo;
    confirmaIcone.textContent = opcoes.icone || "↻";
    confirmaIcone.classList.toggle("perigo", !!opcoes.perigo);

    confirmaDe.textContent = opcoes.de || "";
    confirmaPara.textContent = opcoes.para || "";
    confirmaPara.hidden = !opcoes.para;
    confirmaSeta.hidden = !opcoes.para;
    confirmaFluxo.hidden = !opcoes.de;

    confirmaQtd.innerHTML = "";

    if (typeof opcoes.produtos === "number") {

        confirmaQtd.hidden = false;

        if (opcoes.produtos === 0) {

            confirmaQtd.className = "categoria-confirma-qtd vazio";
            confirmaQtd.textContent = "Nenhum produto usa esta categoria";

        } else {

            confirmaQtd.className = "categoria-confirma-qtd";

            const numero = document.createElement("strong");
            numero.textContent = String(opcoes.produtos);

            const rotulo = document.createElement("span");
            rotulo.textContent = opcoes.produtos === 1 ? "produto será atualizado" : "produtos serão atualizados";

            confirmaQtd.appendChild(numero);
            confirmaQtd.appendChild(rotulo);

        }

    } else {

        confirmaQtd.hidden = true;

    }

    confirmaTexto.textContent = opcoes.texto || "";
    confirmaTexto.hidden = !opcoes.texto;

    confirmaBotaoOk.textContent = opcoes.textoBotao || "Confirmar";
    confirmaBotaoOk.classList.toggle("perigo", !!opcoes.perigo);

    modalConfirma.hidden = false;

    /* Em ações destrutivas o foco começa em "Cancelar" (evita Enter sem querer) */
    setTimeout(function () {
        (opcoes.perigo ? confirmaBotaoCancelar : confirmaBotaoOk).focus();
    }, 30);

    return new Promise(function (resolver) { resolverConfirmacao = resolver; });

}

confirmaBotaoOk.addEventListener("click", function () { fecharConfirmacao(true); });
confirmaBotaoCancelar.addEventListener("click", function () { fecharConfirmacao(false); });

modalConfirma.addEventListener("click", function (e) {
    if (e.target === modalConfirma) { fecharConfirmacao(false); }
});


/* Renomeia a categoria e atualiza TODOS os produtos que a usam.
   - Nome novo: grava a categoria nova, atualiza os produtos e só então
     apaga a antiga (seguro e repetível se a internet cair).
   - Nome que já existe: JUNTA as duas (os produtos vão para a existente
     e a categoria antiga é removida). Serve também para concluir um
     renomear que ficou pela metade. */
async function renomearCategoria(cat, novoNomeDigitado, botao) {

    const novoNome = String(novoNomeDigitado || "").replace(/\s+/g, " ").trim();

    if (!novoNome) {
        mostrarMensagemCategoria("Digite o novo nome da categoria.");
        return;
    }

    if (novoNome === cat.nome) {
        categoriaEmEdicaoId = null;
        mostrarMensagemCategoria("");
        renderizarMinhasCategorias();
        return;
    }

    const novoId = idDaCategoria(novoNome);

    if (!novoId) {
        mostrarMensagemCategoria("Use pelo menos uma letra ou número no nome.");
        return;
    }

    /* Mudar só maiúsculas/acentos/espaços da própria categoria é um renomear normal */
    const mesmoNomeNormalizado = normalizarCategoria(novoNome) === normalizarCategoria(cat.nome);

    /* Se o nome já existe (padrão ou criada por você), vira "juntar" */
    let destino = null;

    if (!mesmoNomeNormalizado && categoriaJaExiste(novoNome)) {

        const alvo = normalizarCategoria(novoNome);

        const custom = categoriasPersonalizadas.find(function (c) { return normalizarCategoria(c.nome) === alvo; });
        const padrao = CATEGORIAS_PADRAO.find(function (n) { return normalizarCategoria(n) === alvo; });

        destino = custom ? { id: custom.id, nome: custom.nome } : { id: null, nome: padrao };

    }

    if (botao) { botao.disabled = true; }

    try {

        const produtosDaCategoria = await referenciaProdutosGestok()
            .where("categoria", "==", cat.nome)
            .get();

        const total = produtosDaCategoria.size;

        const nomeFinal = destino ? destino.nome : novoNome;

        const confirmou = await confirmarCategoria(destino
            ? {
                titulo: "Juntar categorias",
                icone: "⇄",
                de: cat.nome,
                para: destino.nome,
                produtos: total,
                texto: 'A categoria "' + destino.nome + '" já existe. Os produtos serão movidos para ela e "' + cat.nome + '" será removida.',
                textoBotao: "Juntar categorias"
            }
            : {
                titulo: "Renomear categoria",
                icone: "✎",
                de: cat.nome,
                para: novoNome,
                produtos: total,
                texto: total > 0 ? "Todos esses produtos passarão a usar o novo nome." : "",
                textoBotao: "Renomear"
            });

        if (!confirmou) {
            return;
        }

        const colecao = referenciaCategoriasGestok();

        const dataCriacao = cat.dataCriacao || new Date().toISOString();

        /* 1) renomear: grava a categoria com o novo nome (juntar: ela já existe) */
        if (!destino) {
            await colecao.doc(novoId).set({
                nome: novoNome,
                dataCriacao: dataCriacao,
                dataAtualizacao: new Date().toISOString()
            });
        }

        /* 2) produtos, em lotes (limite do Firestore: 500 por lote) */
        const docs = produtosDaCategoria.docs;

        for (let i = 0; i < docs.length; i += 400) {

            const lote = db.batch();

            docs.slice(i, i + 400).forEach(function (d) {
                lote.update(d.ref, { categoria: nomeFinal });
            });

            await lote.commit();

        }

        /* 3) só no fim remove a categoria antiga */
        if (destino || novoId !== cat.id) {
            await colecao.doc(cat.id).delete();
        }

        const selecionadaAgora = normalizarCategoria(campoCategoria.value) === normalizarCategoria(cat.nome);

        categoriasPersonalizadas = categoriasPersonalizadas.filter(function (c) {
            return c.id !== cat.id && (destino || c.id !== novoId);
        });

        if (!destino) {
            categoriasPersonalizadas.push({ id: novoId, nome: novoNome, dataCriacao: dataCriacao });
        }

        categoriaEmEdicaoId = null;

        popularCategorias(selecionadaAgora ? nomeFinal : undefined);

        renderizarMinhasCategorias();

        mostrarMensagemCategoria("");

        const atualizados = total === 0
            ? ""
            : " " + total + (total === 1 ? " produto atualizado." : " produtos atualizados.");

        avisarCategoria(
            destino
                ? 'Categoria "' + cat.nome + '" juntada em "' + nomeFinal + '".' + atualizados
                : 'Categoria renomeada para "' + nomeFinal + '".' + atualizados,
            "sucesso"
        );

    } catch (erro) {

        console.error("Erro ao renomear categoria:", erro);

        mostrarMensagemCategoria("Não foi possível concluir a alteração. Confira a conexão e tente novamente: nenhum dado foi perdido.");

    } finally {

        if (botao) { botao.disabled = false; }

    }

}

async function removerCategoria(cat) {

    try {

        /* Não remove categoria que ainda está em uso por algum produto */
        const emUso = await referenciaProdutosGestok()
            .where("categoria", "==", cat.nome)
            .limit(1)
            .get();

        if (!emUso.empty) {
            mostrarMensagemCategoria('A categoria "' + cat.nome + '" está em uso por produtos. Altere esses produtos antes de removê-la.');
            return;
        }

        const confirmou = await confirmarCategoria({
            titulo: "Remover categoria",
            icone: "🗑",
            de: cat.nome,
            produtos: 0,
            texto: "Essa ação não pode ser desfeita. Você poderá criar a categoria de novo quando quiser.",
            textoBotao: "Remover",
            perigo: true
        });

        if (!confirmou) {
            return;
        }

        await referenciaCategoriasGestok().doc(cat.id).delete();

        categoriasPersonalizadas = categoriasPersonalizadas.filter(function (c) { return c.id !== cat.id; });

        const selecionadaAgora = normalizarCategoria(campoCategoria.value) === normalizarCategoria(cat.nome);

        popularCategorias(selecionadaAgora ? "" : undefined);

        renderizarMinhasCategorias();

        mostrarMensagemCategoria("");

        avisarCategoria('Categoria "' + cat.nome + '" removida.', "sucesso");

        if (categoriasPersonalizadas.length === 0) {
            fecharModalCategoria();
        }

    } catch (erro) {

        console.error("Erro ao remover categoria:", erro);

        mostrarMensagemCategoria("Não foi possível remover a categoria.");

    }

}

botaoNovaCategoria.addEventListener("click", function () { abrirModalCategoria("criar"); });
botaoGerenciarCategorias.addEventListener("click", function () { abrirModalCategoria("gerenciar"); });
botaoSalvarCategoria.addEventListener("click", salvarNovaCategoria);
botaoFecharCategoria.addEventListener("click", fecharModalCategoria);

inputNovaCategoria.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        salvarNovaCategoria();
    }
});

modalCategoria.addEventListener("click", function (e) {
    if (e.target === modalCategoria) {
        fecharModalCategoria();
    }
});

document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") { return; }
    if (!modalConfirma.hidden) {
        fecharConfirmacao(false);
    } else if (!modalCategoria.hidden) {
        fecharModalCategoria();
    }
});


function limparFormulario() {

    form.reset();

    popularFornecedores("");

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
    popularCategorias(produto.categoria || "");
    document.getElementById("quantidade").value = produto.quantidade ?? 0;
    document.getElementById("unidade").value = produto.unidade || "UN";
    document.getElementById("estoqueMinimo").value = produto.estoqueMinimo ?? 0;
    document.getElementById("estoqueMaximo").value = produto.estoqueMaximo ?? 0;
    document.getElementById("preco").value = produto.preco ?? 0;
    document.getElementById("descricao").value = produto.descricao || "";

    popularFornecedores(produto.fornecedorId || "", produto.fornecedorNome || "");

    alternarCamposValidade(false);

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

    alternarCamposValidade(true);

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

        await Promise.all([fornecedoresProntos, categoriasProntas]);

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

        const fornecedorId = campoFornecedor ? campoFornecedor.value : "";

        const fornecedorNome = fornecedorId ? nomeDoFornecedorSelecionado() : "";

        const campoValidade = document.getElementById("validade");

        const campoLote = document.getElementById("lote");

        const validadeValor = !produtoEditandoId && campoValidade
            ? campoValidade.value.trim()
            : "";

        const loteValor = !produtoEditandoId && campoLote
            ? campoLote.value.trim()
            : "";

        if (validadeValor) {

            const anoValidade = Number(validadeValor.slice(0, 4));

            if (!/^\d{4}-\d{2}-\d{2}$/.test(validadeValor) || anoValidade < 2000 || anoValidade > 2100) {

                alert("Informe uma validade válida.");

                return;

            }

            if (!(dados.quantidade > 0)) {

                alert("Para informar a validade, preencha a quantidade inicial em estoque.");

                document.getElementById("quantidade").focus();

                return;

            }

        }

        if (produtoEditandoId) {

            await referenciaProdutosGestok()
                .doc(produtoEditandoId)
                .update({
                    ...dados,
                    ...(fornecedorId
                        ? { fornecedorId: fornecedorId, fornecedorNome: fornecedorNome }
                        : {
                            fornecedorId: firebase.firestore.FieldValue.delete(),
                            fornecedorNome: firebase.firestore.FieldValue.delete()
                        })
                });

            /* Continua na tela do produto editado, para editar de novo se quiser */
            entrarModoEdicao({ id: produtoEditandoId, ...dados, fornecedorId: fornecedorId, fornecedorNome: fornecedorNome });

            mostrarMensagemForm(`✓ Produto "${nome}" atualizado com sucesso!`);

            return;

        }

        const id = gerarId();

        const produtosRef = referenciaProdutosGestok();

        const gravacao = firebase.firestore().batch();

        gravacao.set(produtosRef.doc(id), {
            ...dados,
            ...(fornecedorId ? { fornecedorId: fornecedorId, fornecedorNome: fornecedorNome } : {}),
            ativo: true,
            dataCadastro: new Date().toISOString()
        });

        /* Com validade informada, o estoque inicial já entra como um lote */
        if (validadeValor) {

            gravacao.set(produtosRef.parent.collection("lotes").doc(), {
                produtoId: id,
                produto: nome,
                codigo: codigo,
                lote: loteValor,
                validade: validadeValor,
                quantidade: dados.quantidade,
                quantidadeInicial: dados.quantidade,
                unidade: dados.unidade,
                origem: "Cadastro",
                lojaId: produtosRef.parent.id,
                criadoEm: new Date().toISOString()
            });

        }

        await gravacao.commit();

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

        carregarFornecedores();

        carregarCategorias();

        const parametros = new URLSearchParams(window.location.search);

        const idParaEditar = parametros.get("editar");

        if (idParaEditar) {

            editarProduto(idParaEditar);

        }

    });

});
