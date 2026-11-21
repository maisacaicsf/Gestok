/* =========================================
   GESTOK
   MOVIMENTAÇÕES
   FIRESTORE + MULTI-LOJA
========================================= */

const $ = function (id) {
    return document.getElementById(id);
};


/* =========================================
   ELEMENTOS
========================================= */

const busca = $("busca");
const filtroTipo = $("filtroTipo");
const filtroPeriodo = $("filtroPeriodo");
const limparHistorico = $("limparHistorico");
const listaMovimentacoes = $("listaMovimentacoes");
const emptyState = $("emptyState");
const statusMovimentacoes = $("statusMovimentacoes");


/* =========================================
   ESTADO
========================================= */

let movimentacoesCache = [];
let cancelarMovimentacoes = null;
let lojaAtualMovimentacoes = null;
let carregamentoIniciado = false;
let movimentoExpandidoId = null;
/* Produtos já consultados nos detalhes: reabrir um detalhe fica instantâneo. */
const produtosDetalheCache = new Map();


/* =========================================
   MENU
========================================= */

const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const closeSidebar = document.getElementById("closeSidebar");

function abrirMenu() {

    if (sidebar) {
        sidebar.classList.add("active");
    }

    if (overlay) {
        overlay.classList.add("active");
    }

    document.body.style.overflow = "hidden";
}

function fecharMenu() {

    if (sidebar) {
        sidebar.classList.remove("active");
    }

    if (overlay) {
        overlay.classList.remove("active");
    }

    document.body.style.overflow = "";
}

if (menuButton) {
    menuButton.addEventListener("click", abrirMenu);
}

if (closeSidebar) {
    closeSidebar.addEventListener("click", fecharMenu);
}

if (overlay) {
    overlay.addEventListener("click", fecharMenu);
}

document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {
        fecharMenu();
    }

});


/* =========================================
   LOJA ATUAL
========================================= */

function obterLojaAtualMovimentacoes() {

    try {

        if (typeof obterLojaAtualGestok === "function") {

            const lojaCentral =
                obterLojaAtualGestok();

            if (lojaCentral) {
                return lojaCentral;
            }

        }

    } catch (erro) {

        console.warn(
            "Contexto central indisponível:",
            erro
        );

    }


    try {

        const conta =
            typeof obterContaGestok === "function"
                ? obterContaGestok()
                : null;

        return conta?.lojaId || null;

    } catch (erro) {

        console.error(
            "Erro ao localizar loja atual:",
            erro
        );

        return null;

    }
}


/* =========================================
   AGUARDAR CONTEXTO
========================================= */

async function aguardarLojaMovimentacoes() {

    const inicio = Date.now();
    const limite = 12000;

    while (Date.now() - inicio < limite) {

        const lojaId =
            obterLojaAtualMovimentacoes();

        const usuario =
            typeof usuarioFirebaseAtualGestok === "function"
                ? usuarioFirebaseAtualGestok()
                : (
                    typeof firebase !== "undefined" &&
                    firebase.auth()
                        ? firebase.auth().currentUser
                        : null
                );

        if (usuario && lojaId) {
            return lojaId;
        }

        await new Promise(function (resolve) {
            setTimeout(resolve, 250);
        });

    }

    return null;
}


/* =========================================
   REFERÊNCIA
========================================= */

function obterReferenciaMovimentacoes(lojaId) {

    if (
        typeof referenciaMovimentacoes !== "function"
    ) {

        throw new Error(
            "Firestore do Gestok não foi carregado."
        );

    }

    return referenciaMovimentacoes(lojaId);
}


/* =========================================
   DATA FIRESTORE / ISO
========================================= */

function converterData(valor) {

    if (!valor) {
        return null;
    }

    try {

        if (
            valor &&
            typeof valor.toDate === "function"
        ) {
            const data = valor.toDate();

            return Number.isNaN(data.getTime())
                ? null
                : data;
        }

        if (
            valor &&
            typeof valor.seconds === "number"
        ) {
            const data = new Date(
                valor.seconds * 1000
            );

            return Number.isNaN(data.getTime())
                ? null
                : data;
        }

        const data =
            valor instanceof Date
                ? valor
                : new Date(valor);

        return Number.isNaN(data.getTime())
            ? null
            : data;

    } catch (erro) {

        return null;

    }
}

function formatarData(valor) {

    const data =
        converterData(valor);

    if (!data) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(data);
}


/* =========================================
   ESCAPE HTML
========================================= */

function escaparHtml(valor) {

    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================
   PERÍODO
========================================= */

function dentroDoPeriodo(valor, periodo) {

    if (!periodo) {
        return true;
    }

    const data =
        converterData(valor);

    if (!data) {
        return false;
    }

    const agora = new Date();

    if (periodo === "hoje") {

        const inicioHoje =
            new Date(
                agora.getFullYear(),
                agora.getMonth(),
                agora.getDate(),
                0, 0, 0, 0
            );

        return data.getTime() >= inicioHoje.getTime();
    }

    const dias = Number(periodo);

    if (!Number.isFinite(dias)) {
        return true;
    }

    const limite =
        agora.getTime() -
        (dias * 24 * 60 * 60 * 1000);

    return data.getTime() >= limite;
}


/* =========================================
   FILTRAR
========================================= */

function obterMovimentacoesFiltradas() {

    const termo =
        String(busca?.value || "")
            .trim()
            .toLowerCase();

    const tipo =
        String(filtroTipo?.value || "");

    const periodo =
        String(filtroPeriodo?.value || "");

    return movimentacoesCache
        .filter(function (item) {

            if (tipo && item.tipo !== tipo) {
                return false;
            }

            if (!dentroDoPeriodo(item.data, periodo)) {
                return false;
            }

            if (!termo) {
                return true;
            }

            const texto = [
                item.produto,
                item.codigo,
                item.motivo,
                item.observacao,
                item.tipo
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return texto.includes(termo);

        })
        .sort(function (a, b) {

            const dataA =
                converterData(a.data)?.getTime() || 0;

            const dataB =
                converterData(b.data)?.getTime() || 0;

            return dataB - dataA;
        });
}


/* =========================================
   RENDERIZAR
========================================= */

function renderizarMovimentacoes() {

    if (!listaMovimentacoes || !emptyState) {
        return;
    }

    const filtradas =
        obterMovimentacoesFiltradas();

    listaMovimentacoes.innerHTML = "";

    if (!filtradas.length) {

        emptyState.style.display = "flex";
        return;
    }

    emptyState.style.display = "none";

    listaMovimentacoes.innerHTML =
        filtradas
            .map(function (item) {

                const entrada =
                    String(item.tipo || "")
                        .toLowerCase()
                        .includes("entrada");

                const sinal =
                    entrada ? "+" : "−";

                const classe =
                    entrada ? "entrada" : "saida";

                const quantidade =
                    Number(item.quantidade || 0);

                const unidade =
                    item.unidade || "UN";

                const anterior =
                    Number(item.estoqueAnterior || 0);

                const novo =
                    Number(item.estoqueNovo || 0);

                return `
                    <tr>

                        <td>
                            <span class="badge ${classe}">
                                ${escaparHtml(item.tipo || "—")}
                            </span>
                        </td>

                        <td>
                            <button
                                type="button"
                                class="produto-mov-link"
                                data-abrir-detalhe="${escaparHtml(item.id)}"
                                aria-expanded="${movimentoExpandidoId === item.id ? "true" : "false"}"
                            >
                                <strong>${escaparHtml(item.produto || "—")}</strong>
                                <small>${escaparHtml(item.codigo || "Ver detalhes")}</small>
                            </button>
                        </td>

                        <td>
                            ${sinal}${quantidade}
                            ${escaparHtml(unidade)}
                        </td>

                        <td>
                            ${anterior} → ${novo}
                        </td>

                        <td>
                            ${escaparHtml(item.motivo || "—")}
                        </td>

                        <td>
                            ${formatarData(item.data)}
                        </td>

                    </tr>
                    <tr class="mov-detail-row" data-linha-detalhe="${escaparHtml(item.id)}" ${movimentoExpandidoId === item.id ? "" : "hidden"}>
                        <td colspan="6">
                            <div class="mov-detail-card" data-conteudo-detalhe="${escaparHtml(item.id)}">
                                ${movimentoExpandidoId === item.id ? montarConteudoDetalheMovimentacao(item, produtosDetalheCache.get(String(item.produtoId)) || null) : ""}
                            </div>
                        </td>
                    </tr>
                `;

            })
            .join("");
}


/* =========================================
   DETALHES EXPANSÍVEIS DA MOVIMENTAÇÃO
   (não interfere no carregamento do histórico)
========================================= */

function montarConteudoDetalheMovimentacao(movimento, produto) {
    const camposProduto = [
        ["Produto", produto?.nome || movimento.produto],
        ["Código", produto?.codigo || movimento.codigo],
        ["Categoria", produto?.categoria],
        ["Unidade", produto?.unidade || movimento.unidade],
        ["Preço de venda", produto?.preco !== undefined
            ? Number(produto.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            : undefined],
        ["Estoque atual", produto?.quantidade !== undefined
            ? `${produto.quantidade} ${produto.unidade || movimento.unidade || "UN"}`
            : undefined]
    ];

    const camposMovimento = [
        ["Tipo", movimento.tipo],
        ["Quantidade", `${movimento.quantidade ?? "—"} ${movimento.unidade || "UN"}`],
        ["Estoque anterior", movimento.estoqueAnterior],
        ["Estoque após movimentação", movimento.estoqueNovo],
        ["Motivo", movimento.motivo],
        ["Observação", movimento.observacao],
        ["Data", formatarData(movimento.data)]
    ];

    function montarSecao(titulo, campos) {
        const itens = campos.filter(([nome, valor]) => valor !== undefined && valor !== null && valor !== "");
        if (!itens.length) return "";
        return `<section class="mov-detail-section"><h4>${escaparHtml(titulo)}</h4><div class="mov-detail-grid">${itens.map(([nome, valor]) =>
            `<div class="mov-detail-item"><span>${escaparHtml(nome)}</span><strong>${escaparHtml(valor)}</strong></div>`
        ).join("")}</div></section>`;
    }

    return montarSecao("Produto", camposProduto) + montarSecao("Movimentação", camposMovimento);
}

function preencherDetalheExpandido(id) {
    const movimento = movimentacoesCache.find(item => item.id === id);
    if (!movimento) return;

    const area = listaMovimentacoes.querySelector(`[data-conteudo-detalhe="${CSS.escape(id)}"]`);
    if (!area) return;

    area.innerHTML = montarConteudoDetalheMovimentacao(
        movimento,
        produtosDetalheCache.get(String(movimento.produtoId)) || null
    );
}

function assinaturaProdutoDetalhe(produto) {
    return [
        produto.nome,
        produto.codigo,
        produto.categoria,
        produto.unidade,
        produto.preco,
        produto.quantidade
    ].join("|");
}

/* Complementa o detalhe com os dados do produto SEM bloquear a abertura:
   1) tenta o cache local do Firestore (praticamente instantâneo);
   2) confirma no servidor e só redesenha se algum dado realmente mudou. */
async function carregarProdutoDetalhe(id) {
    const movimento = movimentacoesCache.find(item => item.id === id);

    if (
        !movimento ||
        !movimento.produtoId ||
        !lojaAtualMovimentacoes ||
        typeof referenciaProdutos !== "function"
    ) {
        return;
    }

    const chave = String(movimento.produtoId);
    const referencia = referenciaProdutos(lojaAtualMovimentacoes).doc(chave);

    function aplicar(snapshot) {
        if (!snapshot || !snapshot.exists) return;

        const dados = snapshot.data();
        const anterior = produtosDetalheCache.get(chave);

        produtosDetalheCache.set(chave, dados);

        if (movimentoExpandidoId !== id) return;
        if (anterior && assinaturaProdutoDetalhe(anterior) === assinaturaProdutoDetalhe(dados)) return;

        preencherDetalheExpandido(id);
    }

    try {
        if (!produtosDetalheCache.has(chave)) {
            try {
                aplicar(await referencia.get({ source: "cache" }));
            } catch (erroCache) {
                /* produto ainda não está no cache local: segue para o servidor */
            }
        }

        aplicar(await referencia.get());
    } catch (erro) {
        console.warn("Consulta complementar do produto indisponível; mantendo detalhes do histórico.", erro);
    }
}

/* Abre/fecha só a linha de detalhe, sem redesenhar a tabela inteira. */
function alternarLinhaDetalhe(id, abrir) {
    const seletor = CSS.escape(id);
    const linha = listaMovimentacoes.querySelector(`[data-linha-detalhe="${seletor}"]`);
    const botao = listaMovimentacoes.querySelector(`[data-abrir-detalhe="${seletor}"]`);

    if (botao) botao.setAttribute("aria-expanded", abrir ? "true" : "false");
    if (!linha) return;

    linha.hidden = !abrir;

    if (abrir) {
        preencherDetalheExpandido(id);
    } else {
        const area = linha.querySelector("[data-conteudo-detalhe]");
        if (area) area.innerHTML = "";
    }
}

if (listaMovimentacoes) {
    listaMovimentacoes.addEventListener("click", function (event) {
        const botao = event.target.closest("[data-abrir-detalhe]");
        if (!botao) return;

        const id = botao.getAttribute("data-abrir-detalhe");
        const anteriorId = movimentoExpandidoId;

        movimentoExpandidoId = anteriorId === id ? null : id;

        if (anteriorId) alternarLinhaDetalhe(anteriorId, false);

        if (movimentoExpandidoId) {
            alternarLinhaDetalhe(movimentoExpandidoId, true);
            carregarProdutoDetalhe(movimentoExpandidoId);
        }
    });
}

/* =========================================
   SNAPSHOT EM TEMPO REAL
========================================= */

function iniciarMonitoramentoMovimentacoes(lojaId) {

    if (cancelarMovimentacoes) {

        cancelarMovimentacoes();
        cancelarMovimentacoes = null;

    }

    try {

        const referencia =
            obterReferenciaMovimentacoes(lojaId);

        if (statusMovimentacoes) {
            statusMovimentacoes.textContent =
                "Acompanhando movimentações em tempo real.";
        }

        if (limparHistorico) {
            limparHistorico.disabled = false;
        }

        cancelarMovimentacoes =
            referencia.onSnapshot(
                function (snapshot) {

                    movimentacoesCache =
                        snapshot.docs.map(
                            function (doc) {

                                return {
                                    id: doc.id,
                                    ...doc.data()
                                };
                            }
                        );

                    renderizarMovimentacoes();
                    if (movimentoExpandidoId) {
                        carregarProdutoDetalhe(movimentoExpandidoId);
                    }

                    if (statusMovimentacoes) {

                        statusMovimentacoes.textContent =
                            `${movimentacoesCache.length} ${
                                movimentacoesCache.length === 1
                                    ? "movimentação encontrada"
                                    : "movimentações encontradas"
                            }.`;

                    }

                },
                function (erro) {

                    console.error(
                        "Erro ao acompanhar movimentações:",
                        erro
                    );

                    movimentacoesCache = [];
                    renderizarMovimentacoes();

                    if (statusMovimentacoes) {
                        statusMovimentacoes.textContent =
                            "Não foi possível carregar o histórico.";
                    }

                    if (limparHistorico) {
                        limparHistorico.disabled = true;
                    }

                    alert(
                        typeof mensagemErroFirebaseGestok === "function"
                            ? mensagemErroFirebaseGestok(erro)
                            : "Não foi possível carregar as movimentações."
                    );

                }
            );

    } catch (erro) {

        console.error(
            "Erro ao iniciar movimentações:",
            erro
        );

        if (statusMovimentacoes) {
            statusMovimentacoes.textContent =
                "Não foi possível iniciar o histórico.";
        }
    }
}


/* =========================================
   LIMPAR HISTÓRICO DA LOJA ATUAL
========================================= */

if (limparHistorico) {

    limparHistorico.addEventListener(
        "click",
        async function () {

            if (!lojaAtualMovimentacoes) {

                alert(
                    "Não foi possível identificar a loja atual."
                );

                return;
            }

            const confirmar =
                window.confirm(
                    "Deseja apagar todo o histórico de movimentações desta loja?\n\nEssa ação não altera produtos nem o estoque atual."
                );

            if (!confirmar) {
                return;
            }

            limparHistorico.disabled = true;
            limparHistorico.textContent = "Limpando...";

            try {

                const referencia =
                    obterReferenciaMovimentacoes(
                        lojaAtualMovimentacoes
                    );

                const snapshot =
                    await referencia.get();

                const documentos =
                    snapshot.docs;

                const tamanhoLote = 400;

                for (
                    let inicio = 0;
                    inicio < documentos.length;
                    inicio += tamanhoLote
                ) {

                    const lote =
                        documentos.slice(
                            inicio,
                            inicio + tamanhoLote
                        );

                    const batch =
                        db.batch();

                    lote.forEach(
                        function (documento) {
                            batch.delete(documento.ref);
                        }
                    );

                    await batch.commit();
                }

                alert(
                    "Histórico de movimentações da loja apagado com sucesso."
                );

            } catch (erro) {

                console.error(
                    "Erro ao limpar movimentações:",
                    erro
                );

                alert(
                    typeof mensagemErroFirebaseGestok === "function"
                        ? mensagemErroFirebaseGestok(erro)
                        : "Não foi possível limpar o histórico."
                );

            } finally {

                limparHistorico.textContent =
                    "Limpar histórico";

                limparHistorico.disabled =
                    !lojaAtualMovimentacoes;
            }

        }
    );
}


/* =========================================
   FILTROS
========================================= */

if (busca) {
    busca.addEventListener("input", renderizarMovimentacoes);
}

if (filtroTipo) {
    filtroTipo.addEventListener("change", renderizarMovimentacoes);
}

if (filtroPeriodo) {
    filtroPeriodo.addEventListener("change", renderizarMovimentacoes);
}


/* =========================================
   INICIALIZAÇÃO
========================================= */

async function iniciarMovimentacoes() {

    if (carregamentoIniciado) {
        return;
    }

    carregamentoIniciado = true;

    if (statusMovimentacoes) {
        statusMovimentacoes.textContent =
            "Aguardando autenticação...";
    }

    const lojaId =
        await aguardarLojaMovimentacoes();

    if (!lojaId) {

        if (statusMovimentacoes) {
            statusMovimentacoes.textContent =
                "Não foi possível identificar a loja atual.";
        }

        return;
    }

    lojaAtualMovimentacoes = lojaId;

    iniciarMonitoramentoMovimentacoes(
        lojaId
    );
}


if (
    typeof observarAutenticacaoGestok ===
    "function"
) {

    observarAutenticacaoGestok(
        function (usuario) {

            if (!usuario) {

                if (statusMovimentacoes) {
                    statusMovimentacoes.textContent =
                        "Usuário não autenticado.";
                }

                return;
            }

            iniciarMovimentacoes();
        }
    );

} else if (
    typeof firebase !== "undefined" &&
    firebase.auth
) {

    firebase.auth().onAuthStateChanged(
        function (usuario) {

            if (usuario) {
                iniciarMovimentacoes();
            }
        }
    );

} else {

    iniciarMovimentacoes();
}


/* =========================================
   ENCERRAR LISTENER
========================================= */

window.addEventListener(
    "beforeunload",
    function () {

        if (cancelarMovimentacoes) {
            cancelarMovimentacoes();
            cancelarMovimentacoes = null;
        }
    }
);
