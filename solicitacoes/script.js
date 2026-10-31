/* =========================================
   GESTOK
   SOLICITAÇÕES DE COMPRA
   FIRESTORE
========================================= */

if (!exigirLoginGestok()) {
    throw new Error(
        "Acesso bloqueado: assinatura necessária."
    );
}


/* =========================================
   ELEMENTOS
========================================= */

const sidebar =
    document.getElementById("sidebar");

const overlay =
    document.getElementById("overlay");

const menuButton =
    document.getElementById("menuButton");

const closeSidebar =
    document.getElementById("closeSidebar");


const btnNovaSolicitacao =
    document.getElementById(
        "btnNovaSolicitacao"
    );

const modalOverlay =
    document.getElementById(
        "modalOverlay"
    );

const fecharModal =
    document.getElementById(
        "fecharModal"
    );

const cancelarModal =
    document.getElementById(
        "cancelarModal"
    );


const solicitacaoForm =
    document.getElementById(
        "solicitacaoForm"
    );

const produtoSelect =
    document.getElementById(
        "produto"
    );

const estoqueAtual =
    document.getElementById(
        "estoqueAtual"
    );

const estoqueMinimo =
    document.getElementById(
        "estoqueMinimo"
    );

const unidadeProduto =
    document.getElementById(
        "unidadeProduto"
    );

const stockInfo =
    document.getElementById(
        "stockInfo"
    );


const listaSolicitacoes =
    document.getElementById(
        "listaSolicitacoes"
    );

const emptyState =
    document.getElementById(
        "emptyState"
    );


const busca =
    document.getElementById(
        "busca"
    );

const filtroStatus =
    document.getElementById(
        "filtroStatus"
    );

const limparFiltros =
    document.getElementById(
        "limparFiltros"
    );


/* =========================================
   FIRESTORE
========================================= */

let produtosCache = [];

let solicitacoesCache = [];

let lojaIdAtual = null;

let cancelarListenerProdutos = null;

let cancelarListenerSolicitacoes = null;


/* =========================================
   MENU
========================================= */

function abrirMenu() {

    if (sidebar) {
        sidebar.classList.add("active");
    }

    if (overlay) {
        overlay.classList.add("active");
    }

    document.body.style.overflow =
        "hidden";
}


function fecharMenu() {

    if (sidebar) {
        sidebar.classList.remove("active");
    }

    if (overlay) {
        overlay.classList.remove("active");
    }

    document.body.style.overflow =
        "";
}


if (menuButton) {

    menuButton.addEventListener(
        "click",
        abrirMenu
    );

}


if (closeSidebar) {

    closeSidebar.addEventListener(
        "click",
        fecharMenu
    );

}


if (overlay) {

    overlay.addEventListener(
        "click",
        fecharMenu
    );

}


/* =========================================
   ESC
========================================= */

document.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Escape") {

            fecharMenu();

            fecharModalSolicitacao();

        }

    }
);


/* =========================================
   PRODUTOS
========================================= */

function obterProdutos() {

    return Array.isArray(produtosCache)
        ? produtosCache
        : [];

}


/* =========================================
   SOLICITAÇÕES
========================================= */

function obterSolicitacoes() {

    return Array.isArray(
        solicitacoesCache
    )
        ? solicitacoesCache
        : [];

}


/* =========================================
   DATA FIRESTORE
========================================= */

function normalizarData(
    valor
) {

    if (!valor) {
        return null;
    }


    try {

        if (
            typeof valor.toDate ===
            "function"
        ) {

            const data =
                valor.toDate();

            return data instanceof Date &&
                !Number.isNaN(
                    data.getTime()
                )
                ? data
                : null;

        }


        if (
            typeof valor === "object" &&
            typeof valor.seconds ===
                "number"
        ) {

            const data =
                new Date(
                    valor.seconds * 1000
                );

            return Number.isNaN(
                data.getTime()
            )
                ? null
                : data;

        }


        const data =
            valor instanceof Date
                ? valor
                : new Date(valor);


        if (
            Number.isNaN(
                data.getTime()
            )
        ) {

            return null;

        }


        return data;

    } catch (erro) {

        console.error(
            "Erro ao normalizar data:",
            erro
        );

        return null;

    }

}


function formatarData(
    valor
) {

    const data =
        normalizarData(valor);


    if (!data) {
        return "-";
    }


    return data.toLocaleDateString(
        "pt-BR"
    );

}


/* =========================================
   CARREGAR PRODUTOS NO SELECT
========================================= */

function carregarProdutos() {

    if (!produtoSelect) {
        return;
    }


    const produtos =
        obterProdutos();


    produtoSelect.innerHTML = `
        <option value="">
            Selecione um produto
        </option>
    `;


    const produtosAtivos =
        produtos
            .filter(function (produto) {

                return (
                    produto.ativo !== false
                );

            })
            .sort(function (a, b) {

                return String(
                    a.nome || ""
                ).localeCompare(
                    String(
                        b.nome || ""
                    ),
                    "pt-BR"
                );

            });


    produtosAtivos.forEach(
        function (produto) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                produto.id;


            option.textContent =
                produto.codigo
                    ? `${produto.nome} — ${produto.codigo}`
                    : (
                        produto.nome ||
                        "Produto sem nome"
                    );


            produtoSelect.appendChild(
                option
            );

        }
    );

}


/* =========================================
   MOSTRAR ESTOQUE DO PRODUTO
========================================= */

function atualizarInformacoesProduto() {

    const produtos =
        obterProdutos();


    const produto =
        produtos.find(
            function (item) {

                return (
                    String(item.id) ===
                    String(
                        produtoSelect.value
                    )
                );

            }
        );


    if (!produto) {

        if (stockInfo) {

            stockInfo.style.display =
                "none";

        }

        return;

    }


    const quantidade =
        Number(
            produto.quantidade || 0
        );


    const minimo =
        Number(
            produto.estoqueMinimo || 0
        );


    const unidade =
        produto.unidade || "UN";


    if (estoqueAtual) {

        estoqueAtual.textContent =
            `${quantidade} ${unidade}`;

    }


    if (estoqueMinimo) {

        estoqueMinimo.textContent =
            `${minimo} ${unidade}`;

    }


    if (unidadeProduto) {

        unidadeProduto.textContent =
            unidade;

    }


    if (stockInfo) {

        stockInfo.style.display =
            "grid";

    }


    const motivo =
        document.getElementById(
            "motivo"
        );


    if (
        motivo &&
        minimo > 0 &&
        quantidade < minimo
    ) {

        motivo.value =
            "Estoque abaixo do mínimo";

    }

}


/* =========================================
   MODAL
========================================= */

function abrirModalSolicitacao() {

    carregarProdutos();


    if (solicitacaoForm) {

        solicitacaoForm.reset();

    }


    if (stockInfo) {

        stockInfo.style.display =
            "none";

    }


    if (modalOverlay) {

        modalOverlay.classList.add(
            "active"
        );

    }


    document.body.style.overflow =
        "hidden";

}


function fecharModalSolicitacao() {

    if (modalOverlay) {

        modalOverlay.classList.remove(
            "active"
        );

    }


    document.body.style.overflow =
        "";

}


if (btnNovaSolicitacao) {

    btnNovaSolicitacao.addEventListener(
        "click",
        abrirModalSolicitacao
    );

}


if (fecharModal) {

    fecharModal.addEventListener(
        "click",
        fecharModalSolicitacao
    );

}


if (cancelarModal) {

    cancelarModal.addEventListener(
        "click",
        fecharModalSolicitacao
    );

}


if (modalOverlay) {

    modalOverlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                modalOverlay
            ) {

                fecharModalSolicitacao();

            }

        }
    );

}


/* =========================================
   PRODUTO SELECIONADO
========================================= */

if (produtoSelect) {

    produtoSelect.addEventListener(
        "change",
        atualizarInformacoesProduto
    );

}


/* =========================================
   STATUS
========================================= */

function classeStatus(
    status
) {

    if (status === "Pendente") {

        return "status-pendente";

    }


    if (status === "Em análise") {

        return "status-analise";

    }


    if (status === "Aprovada") {

        return "status-aprovada";

    }


    if (status === "Recusada") {
        return "status-recusada";
    }

    if (status === "Recebida") {
        return "status-recebida";
    }

    return "status-cancelada";

}


/* =========================================
   ESCAPAR HTML
========================================= */

function escaparHtml(
    texto
) {

    return String(
        texto ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================
   ATUALIZAR RESUMO
========================================= */

function atualizarResumo() {

    const solicitacoes =
        obterSolicitacoes();


    const produtos =
        obterProdutos();


    const pendentes =
        solicitacoes.filter(
            function (item) {

                return (
                    item.status ===
                    "Pendente"
                );

            }
        ).length;


    const aprovadas =
        solicitacoes.filter(
            function (item) {

                return (
                    item.status ===
                    "Aprovada"
                );

            }
        ).length;


    const abaixoMinimo =
        produtos.filter(
            function (produto) {

                const quantidade =
                    Number(
                        produto.quantidade ||
                        0
                    );


                const minimo =
                    Number(
                        produto.estoqueMinimo ||
                        0
                    );


                return (
                    produto.ativo !== false &&
                    minimo > 0 &&
                    quantidade < minimo
                );

            }
        ).length;


    const elementoPendentes =
        document.getElementById(
            "totalPendentes"
        );


    const elementoAprovadas =
        document.getElementById(
            "totalAprovadas"
        );


    const elementoAbaixoMinimo =
        document.getElementById(
            "totalAbaixoMinimo"
        );


    const elementoTotal =
        document.getElementById(
            "totalSolicitacoes"
        );


    if (elementoPendentes) {

        elementoPendentes.textContent =
            pendentes;

    }


    if (elementoAprovadas) {

        elementoAprovadas.textContent =
            aprovadas;

    }


    if (elementoAbaixoMinimo) {

        elementoAbaixoMinimo.textContent =
            abaixoMinimo;

    }


    if (elementoTotal) {

        elementoTotal.textContent =
            solicitacoes.length;

    }

}


/* =========================================
   FILTRAR
========================================= */

function obterSolicitacoesFiltradas() {

    const solicitacoes =
        obterSolicitacoes();


    const termo =
        (
            busca?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const status =
        filtroStatus?.value ||
        "";


    return solicitacoes.filter(
        function (item) {

            const texto =
                [
                    item.produto,
                    item.codigo,
                    item.motivo,
                    item.observacao
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


            const correspondeBusca =
                !termo ||
                texto.includes(
                    termo
                );


            const correspondeStatus =
                !status ||
                item.status ===
                    status;


            return (
                correspondeBusca &&
                correspondeStatus
            );

        }
    );

}


/* =========================================
   RENDERIZAR
========================================= */

function renderizarSolicitacoes() {

    if (!listaSolicitacoes) {
        return;
    }


    const solicitacoes =
        obterSolicitacoesFiltradas()
            .sort(
                function (a, b) {

                    return (
                        normalizarData(
                            b.data
                        )?.getTime() || 0
                    ) -
                    (
                        normalizarData(
                            a.data
                        )?.getTime() || 0
                    );

                }
            );


    listaSolicitacoes.innerHTML =
        "";


    const tableWrap =
        document.querySelector(
            ".table-wrap"
        );


    if (
        solicitacoes.length === 0
    ) {

        if (emptyState) {

            emptyState.style.display =
                "flex";

        }


        if (tableWrap) {

            tableWrap.style.display =
                "none";

        }


        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    if (tableWrap) {

        tableWrap.style.display =
            "block";

    }


    solicitacoes.forEach(
        function (item) {

            const tr =
                document.createElement(
                    "tr"
                );


            const statusClass =
                classeStatus(
                    item.status
                );


            tr.innerHTML = `

                <td>

                    <div class="product-name">

                        ${escaparHtml(
                            item.produto ||
                            "-"
                        )}

                    </div>

                    ${
                        item.codigo
                            ? `
                                <span class="product-code">
                                    Código: ${escaparHtml(
                                        item.codigo
                                    )}
                                </span>
                              `
                            : ""
                    }

                </td>


                <td>

                    ${Number(
                        item.estoqueAtual || 0
                    )}

                    ${escaparHtml(
                        item.unidade ||
                        "UN"
                    )}

                </td>


                <td>

                    <strong>

                        ${Number(
                            item.quantidade || 0
                        )}

                        ${escaparHtml(
                            item.unidade ||
                            "UN"
                        )}

                    </strong>

                </td>


                <td>

                    ${escaparHtml(
                        item.motivo ||
                        "-"
                    )}

                </td>


                <td>

                    ${formatarData(
                        item.data
                    )}

                </td>


                <td>

                    <span
                        class="status-badge ${statusClass}"
                    >

                        ${escaparHtml(
                            item.status ||
                            "-"
                        )}

                    </span>

                </td>


                <td>${gerarAcoesSolicitacao(item)}</td>

            `;


            listaSolicitacoes.appendChild(
                tr
            );

        }
    );

}


/* =========================================
   OBTER CONTEXTO DO USUÁRIO
========================================= */

function obterDadosUsuarioAtual() {

    let usuario = null;

    try {

        if (
            typeof usuarioFirebaseAtual ===
            "function"
        ) {

            usuario =
                usuarioFirebaseAtual();

        }

    } catch (erro) {

        console.error(
            "Erro ao obter usuário Firebase:",
            erro
        );

    }


    let contexto = null;

    try {

        if (
            typeof obterContextoGestok ===
            "function"
        ) {

            contexto =
                obterContextoGestok();

        }

    } catch (erro) {

        console.error(
            "Erro ao obter contexto Gestok:",
            erro
        );

    }


    return {
        usuario,
        contexto
    };

}


/* =========================================
   CRIAR SOLICITAÇÃO
========================================= */

if (solicitacaoForm) {

    solicitacaoForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            try {

                const lojaId =
                    obterLojaAtualGestok();


                if (!lojaId) {

                    alert(
                        "Não foi possível identificar a loja atual."
                    );

                    return;

                }


                const produtos =
                    obterProdutos();


                const produto =
                    produtos.find(
                        function (item) {

                            return (
                                String(
                                    item.id
                                ) ===
                                String(
                                    produtoSelect.value
                                )
                            );

                        }
                    );


                if (!produto) {

                    alert(
                        "Selecione um produto."
                    );

                    return;

                }


                const quantidade =
                    Number(
                        document.getElementById(
                            "quantidade"
                        )?.value
                    );


                if (
                    !Number.isFinite(
                        quantidade
                    ) ||
                    quantidade <= 0
                ) {

                    alert(
                        "Informe uma quantidade válida."
                    );

                    return;

                }


                const motivo =
                    document.getElementById(
                        "motivo"
                    )?.value ||
                    "Reposição de estoque";


                const observacao =
                    (
                        document.getElementById(
                            "observacao"
                        )?.value ||
                        ""
                    ).trim();


                const dadosUsuario =
                    obterDadosUsuarioAtual();


                const usuario =
                    dadosUsuario.usuario;


                const contexto =
                    dadosUsuario.contexto;


                const novaSolicitacao = {

                    lojaId:

                        lojaId,

                    uid:

                        usuario?.uid ||
                        contexto?.uid ||
                        null,

                    usuario:

                        contexto?.usuario ||
                        "",

                    email:

                        usuario?.email ||
                        contexto?.email ||
                        "",

                    codigoLoja:

                        contexto?.codigoLoja ||
                        "",


                    produtoId:

                        produto.id,

                    produto:

                        produto.nome ||
                        "",

                    codigo:

                        produto.codigo ||
                        "",


                    estoqueAtual:

                        Number(
                            produto.quantidade ||
                            0
                        ),

                    estoqueMinimo:

                        Number(
                            produto.estoqueMinimo ||
                            0
                        ),


                    quantidade:

                        quantidade,

                    unidade:

                        produto.unidade ||
                        "UN",


                    motivo:

                        motivo,

                    observacao:

                        observacao,


                    status:

                        "Pendente",


                    data:

                        firebase.firestore
                            .FieldValue
                            .serverTimestamp(),


                    criadoEm:

                        firebase.firestore
                            .FieldValue
                            .serverTimestamp(),


                    atualizadoEm:

                        firebase.firestore
                            .FieldValue
                            .serverTimestamp()

                };


                await referenciaSolicitacoes(
                    lojaId
                ).add(
                    novaSolicitacao
                );


                fecharModalSolicitacao();


                alert(
                    "Solicitação de compra criada com sucesso!"
                );

            } catch (erro) {

                console.error(
                    "Erro ao criar solicitação:",
                    erro
                );


                alert(
                    "Não foi possível criar a solicitação. Verifique sua conexão e tente novamente."
                );

            }

        }
    );

}


/* =========================================
   CANCELAR SOLICITAÇÃO
========================================= */

if (listaSolicitacoes) {

    listaSolicitacoes.addEventListener(
        "click",
        async function (event) {

            const botao =
                event.target.closest(
                    "[data-cancelar]"
                );


            if (!botao) {
                return;
            }


            const id =
                botao.dataset.cancelar;


            if (!id) {
                return;
            }


            const confirmar =
                confirm(
                    "Deseja cancelar esta solicitação?"
                );


            if (!confirmar) {
                return;
            }


            try {

                const lojaId =
                    obterLojaAtualGestok();


                if (!lojaId) {

                    alert(
                        "Não foi possível identificar a loja atual."
                    );

                    return;

                }


                await referenciaSolicitacoes(
                    lojaId
                )
                    .doc(id)
                    .update({

                        status:
                            "Cancelada",

                        atualizadoEm:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp()

                    });


            } catch (erro) {

                console.error(
                    "Erro ao cancelar solicitação:",
                    erro
                );


                alert(
                    "Não foi possível cancelar a solicitação."
                );

            }

        }
    );

}


/* =========================================
   FILTROS
========================================= */

if (busca) {

    busca.addEventListener(
        "input",
        renderizarSolicitacoes
    );

}


if (filtroStatus) {

    filtroStatus.addEventListener(
        "change",
        renderizarSolicitacoes
    );

}


if (limparFiltros) {

    limparFiltros.addEventListener(
        "click",
        function () {

            if (busca) {
                busca.value = "";
            }


            if (filtroStatus) {
                filtroStatus.value = "";
            }


            renderizarSolicitacoes();

        }
    );

}


/* =========================================
   FIRESTORE
========================================= */

function pararListenersFirestore() {

    if (
        typeof cancelarListenerProdutos ===
        "function"
    ) {

        cancelarListenerProdutos();

        cancelarListenerProdutos =
            null;

    }


    if (
        typeof cancelarListenerSolicitacoes ===
        "function"
    ) {

        cancelarListenerSolicitacoes();

        cancelarListenerSolicitacoes =
            null;

    }


    produtosCache = [];

    solicitacoesCache = [];

}


/* =========================================
   INICIAR FIRESTORE
========================================= */

function iniciarFirestoreSolicitacoes(
    lojaId
) {

    if (!lojaId) {

        console.error(
            "Gestok: lojaId não informado."
        );

        return;

    }


    pararListenersFirestore();


    lojaIdAtual =
        lojaId;


    /* =====================================
       PRODUTOS
    ===================================== */

    cancelarListenerProdutos =
        referenciaProdutos(
            lojaId
        ).onSnapshot(
            function (snapshot) {

                produtosCache =
                    snapshot.docs
                        .map(
                            function (doc) {

                                return {

                                    id:
                                        doc.id,

                                    ...doc.data()

                                };

                            }
                        );


                carregarProdutos();

                atualizarResumo();

                atualizarInformacoesProduto();

            },
            function (erro) {

                console.error(
                    "Erro ao carregar produtos:",
                    erro
                );


                produtosCache =
                    [];


                carregarProdutos();

                atualizarResumo();

            }
        );


    /* =====================================
       SOLICITAÇÕES
    ===================================== */

    cancelarListenerSolicitacoes =
        referenciaSolicitacoes(
            lojaId
        ).onSnapshot(
            function (snapshot) {

                solicitacoesCache =
                    snapshot.docs
                        .map(
                            function (doc) {

                                return {

                                    id:
                                        doc.id,

                                    ...doc.data()

                                };

                            }
                        )
                        .sort(
                            function (a, b) {

                                return (
                                    normalizarData(
                                        b.data
                                    )?.getTime() ||
                                    0
                                ) -
                                (
                                    normalizarData(
                                        a.data
                                    )?.getTime() ||
                                    0
                                );

                            }
                        );


                atualizarResumo();

                renderizarSolicitacoes();

            },
            function (erro) {

                console.error(
                    "Erro ao carregar solicitações:",
                    erro
                );


                solicitacoesCache =
                    [];


                atualizarResumo();

                renderizarSolicitacoes();

            }
        );

}


/* =========================================
   AUTENTICAÇÃO
========================================= */

function iniciarModuloSolicitacoes() {

    if (
        typeof observarAutenticacaoGestok !==
        "function"
    ) {

        console.error(
            "Gestok: observarAutenticacaoGestok não está disponível."
        );

        return;

    }


    observarAutenticacaoGestok(
        function (usuario) {

            if (!usuario) {

                pararListenersFirestore();

                return;

            }


            const lojaId =
                obterLojaAtualGestok();


            if (!lojaId) {

                console.error(
                    "Gestok: não foi possível identificar a loja."
                );

                pararListenersFirestore();

                return;

            }


            if (
                lojaIdAtual === lojaId &&
                cancelarListenerProdutos &&
                cancelarListenerSolicitacoes
            ) {

                return;

            }


            iniciarFirestoreSolicitacoes(
                lojaId
            );

        }
    );

}


/* =========================================
   INICIALIZAÇÃO
========================================= */

carregarProdutos();

atualizarResumo();

renderizarSolicitacoes();

iniciarModuloSolicitacoes();


/* =========================================
   FLUXO DE COMPRA
   Pendente → (Em análise) → Aprovada → Recebida
   - Aprovar / Recusar / Reabrir / Cancelar
   - Receber: dá entrada no estoque e registra a
     movimentação automaticamente
   - Sugerir reposição: produtos abaixo do mínimo
   - Copiar lista de compras
========================================= */

const STATUS_EM_ABERTO = ["Pendente", "Em análise", "Aprovada"];


function gerarAcoesSolicitacao(item) {

    const id = escaparHtml(item.id);

    const botao = function (acao, rotulo, classe, titulo) {

        return `<button type="button" class="sol-acao ${classe}" data-acao="${acao}" data-id="${id}" title="${titulo}">${rotulo}</button>`;

    };

    const botoes = [];

    if (item.status === "Pendente") {

        botoes.push(botao("aprovar", "Aprovar", "ok", "Aprovar a compra"));
        botoes.push(botao("analisar", "Analisar", "", "Marcar como em análise"));
        botoes.push(botao("recusar", "Recusar", "perigo", "Recusar a solicitação"));

    } else if (item.status === "Em análise") {

        botoes.push(botao("aprovar", "Aprovar", "ok", "Aprovar a compra"));
        botoes.push(botao("recusar", "Recusar", "perigo", "Recusar a solicitação"));

    } else if (item.status === "Aprovada") {

        botoes.push(botao("receber", "Receber", "destaque", "A mercadoria chegou: dar entrada no estoque"));

    } else if (item.status === "Recusada" || item.status === "Cancelada") {

        botoes.push(botao("reabrir", "Reabrir", "", "Voltar para pendente"));

    }

    if (STATUS_EM_ABERTO.indexOf(item.status) !== -1) {

        botoes.push(`<button class="action-button" type="button" title="Cancelar solicitação" data-cancelar="${id}">×</button>`);

    }

    return `<div class="sol-acoes">${botoes.join("")}</div>`;

}


function obterOverlaySolicitacoes(id) {

    let overlay = document.getElementById(id);

    if (!overlay) {

        overlay = document.createElement("div");

        overlay.id = id;

        overlay.className = "sol-overlay";

        overlay.hidden = true;

        overlay.addEventListener("click", function (event) {

            if (event.target === overlay) {
                overlay.hidden = true;
            }

        });

        document.body.appendChild(overlay);

    }

    return overlay;

}


document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {

        document.querySelectorAll(".sol-overlay").forEach(function (o) {
            o.hidden = true;
        });

    }

});


/* ---------- mudar status ---------- */

const MENSAGENS_STATUS = {
    aprovar: "Solicitação aprovada.",
    analisar: "Solicitação marcada como em análise.",
    recusar: "Solicitação recusada.",
    reabrir: "Solicitação reaberta (pendente)."
};

const NOVO_STATUS = {
    aprovar: "Aprovada",
    analisar: "Em análise",
    recusar: "Recusada",
    reabrir: "Pendente"
};

if (listaSolicitacoes) {

    listaSolicitacoes.addEventListener("click", async function (event) {

        const botao = event.target.closest("[data-acao]");

        if (!botao) {
            return;
        }

        const acao = botao.dataset.acao;

        const item = obterSolicitacoes().find(function (s) {
            return s.id === botao.dataset.id;
        });

        if (!item) {
            return;
        }

        if (acao === "receber") {

            abrirModalReceber(item);

            return;

        }

        const novoStatus = NOVO_STATUS[acao];

        if (!novoStatus) {
            return;
        }

        if (acao === "recusar" && !confirm(`Recusar a solicitação de "${item.produto || "produto"}"?`)) {
            return;
        }

        try {

            const lojaId = obterLojaAtualGestok();

            if (!lojaId) {

                alert("Não foi possível identificar a loja atual.");

                return;

            }

            await referenciaSolicitacoes(lojaId)
                .doc(item.id)
                .update({
                    status: novoStatus,
                    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
                });

            alert(MENSAGENS_STATUS[acao]);

        } catch (erro) {

            console.error("Erro ao atualizar solicitação:", erro);

            alert("Não foi possível atualizar a solicitação.");

        }

    });

}


/* ---------- receber mercadoria (dá entrada no estoque) ---------- */

function abrirModalReceber(item) {

    const overlay = obterOverlaySolicitacoes("solModalReceber");

    const unidade = item.unidade || "UN";

    const decimal = unidade === "KG";

    overlay.innerHTML = `
        <div class="sol-card" role="dialog" aria-modal="true">
            <h3>Receber mercadoria</h3>
            <p class="sol-sub">Ao confirmar, o estoque é atualizado e a entrada aparece em Movimentações.</p>
            <div class="sol-resumo">
                <span><strong>${escaparHtml(item.produto || "-")}</strong>${item.codigo ? " · " + escaparHtml(item.codigo) : ""}</span>
                <span>Pedido: <strong>${Number(item.quantidade || 0)} ${escaparHtml(unidade)}</strong></span>
            </div>
            <label for="solQtdRecebida">Quantidade recebida</label>
            <input type="number" id="solQtdRecebida" min="${decimal ? "0.001" : "1"}" step="${decimal ? "0.001" : "1"}" value="${Number(item.quantidade || 0)}">
            <div class="sol-rodape">
                <button type="button" class="secondary-button" id="solReceberCancelar">Cancelar</button>
                <button type="button" class="primary-button" id="solReceberConfirmar">Confirmar recebimento</button>
            </div>
        </div>`;

    overlay.hidden = false;

    const campo = overlay.querySelector("#solQtdRecebida");

    campo.focus();

    campo.select();

    overlay.querySelector("#solReceberCancelar").onclick = function () {
        overlay.hidden = true;
    };

    const confirmar = overlay.querySelector("#solReceberConfirmar");

    campo.addEventListener("keydown", function (event) {

        if (event.key === "Enter") {
            confirmar.click();
        }

    });

    confirmar.onclick = async function () {

        const quantidade = Number(campo.value);

        if (!(quantidade > 0)) {

            alert("Digite a quantidade recebida.");

            return;

        }

        if (!decimal && !Number.isInteger(quantidade)) {

            alert("Este produto aceita apenas quantidade inteira.");

            return;

        }

        confirmar.disabled = true;

        confirmar.textContent = "Registrando...";

        try {

            const resultado = await receberSolicitacao(item, quantidade);

            overlay.hidden = true;

            alert(`Recebimento registrado! Estoque de ${resultado.nome}: ${resultado.anterior} → ${resultado.novo} ${resultado.unidade}.`);

        } catch (erro) {

            console.error("Erro ao receber solicitação:", erro);

            alert(erro && erro.message && erro.codigoGestok
                ? erro.message
                : "Não foi possível registrar o recebimento.");

            confirmar.disabled = false;

            confirmar.textContent = "Confirmar recebimento";

        }

    };

}


function erroGestok(mensagem) {

    const erro = new Error(mensagem);

    erro.codigoGestok = true;

    return erro;

}


async function receberSolicitacao(item, quantidade) {

    const lojaId = obterLojaAtualGestok();

    if (!lojaId) {
        throw erroGestok("Não foi possível identificar a loja atual.");
    }

    if (!item.produtoId) {
        throw erroGestok("Esta solicitação não tem produto vinculado.");
    }

    const solicitacaoRef = referenciaSolicitacoes(lojaId).doc(item.id);

    const produtoRef = referenciaProdutos(lojaId).doc(item.produtoId);

    const movimentacaoRef = referenciaMovimentacoes(lojaId).doc();

    const usuario = obterDadosUsuarioAtual().usuario;

    let resultado = null;

    await db.runTransaction(async function (transaction) {

        /* todas as leituras antes das escritas */
        const solicitacaoSnap = await transaction.get(solicitacaoRef);

        const produtoSnap = await transaction.get(produtoRef);

        if (!solicitacaoSnap.exists || solicitacaoSnap.data().status !== "Aprovada") {
            throw erroGestok("Esta solicitação não está mais aprovada.");
        }

        if (!produtoSnap.exists) {
            throw erroGestok("O produto desta solicitação não existe mais.");
        }

        const produto = produtoSnap.data();

        if (produto.ativo === false) {
            throw erroGestok("Este produto está inativo.");
        }

        const anterior = Number(produto.quantidade || 0);

        const novo = Math.round((anterior + quantidade) * 1000) / 1000;

        const agora = new Date().toISOString();

        const motivo = "Compra (solicitação)";

        const observacao = "Recebimento de solicitação de compra";

        transaction.update(produtoRef, {
            quantidade: novo,
            ultimaEntrada: {
                quantidade: quantidade,
                estoqueAnterior: anterior,
                estoqueNovo: novo,
                motivo: motivo,
                observacao: observacao,
                data: agora
            },
            dataAtualizacao: agora
        });

        transaction.set(movimentacaoRef, {
            tipo: "Entrada",
            produtoId: produtoRef.id,
            produto: produto.nome || "",
            codigo: produto.codigo || "",
            quantidade: quantidade,
            unidade: produto.unidade || "UN",
            estoqueAnterior: anterior,
            estoqueNovo: novo,
            motivo: motivo,
            observacao: observacao,
            usuarioUid: usuario ? usuario.uid : null,
            lojaId: lojaId,
            data: agora
        });

        transaction.update(solicitacaoRef, {
            status: "Recebida",
            quantidadeRecebida: quantidade,
            recebidoEm: agora,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });

        resultado = {
            nome: produto.nome || "produto",
            anterior: anterior,
            novo: novo,
            unidade: produto.unidade || "UN"
        };

    });

    return resultado;

}


/* ---------- sugerir reposição ---------- */

function quantidadeSugerida(produto) {

    const atual = Number(produto.quantidade || 0);

    const minimo = Number(produto.estoqueMinimo || 0);

    const maximo = Number(produto.estoqueMaximo || 0);

    const alvo = maximo > minimo ? maximo : minimo * 2;

    return Math.max(1, Math.ceil(alvo - atual));

}


function abrirModalSugestao() {

    const overlay = obterOverlaySolicitacoes("solModalSugestao");

    const emAberto = new Set(
        obterSolicitacoes()
            .filter(function (s) { return STATUS_EM_ABERTO.indexOf(s.status) !== -1; })
            .map(function (s) { return String(s.produtoId); })
    );

    const abaixo = obterProdutos()
        .filter(function (p) {
            return p.ativo !== false &&
                Number(p.estoqueMinimo || 0) > 0 &&
                Number(p.quantidade || 0) < Number(p.estoqueMinimo || 0);
        })
        .sort(function (a, b) {
            return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
        });

    const sugestoes = abaixo.filter(function (p) { return !emAberto.has(String(p.id)); });

    const jaTem = abaixo.length - sugestoes.length;

    if (!sugestoes.length) {

        overlay.innerHTML = `
            <div class="sol-card" role="dialog" aria-modal="true">
                <h3>Sugerir reposição</h3>
                <div class="sol-vazio">${abaixo.length
                    ? "Todos os produtos abaixo do mínimo já têm uma solicitação em aberto."
                    : "Nenhum produto está abaixo do estoque mínimo. Tudo certo por aqui!"}</div>
                <div class="sol-rodape"><button type="button" class="secondary-button" id="solSugFechar">Fechar</button></div>
            </div>`;

        overlay.hidden = false;

        overlay.querySelector("#solSugFechar").onclick = function () { overlay.hidden = true; };

        return;

    }

    overlay.innerHTML = `
        <div class="sol-card" role="dialog" aria-modal="true">
            <h3>Sugerir reposição</h3>
            <p class="sol-sub">Produtos abaixo do estoque mínimo. Ajuste as quantidades e desmarque o que não quiser pedir.${jaTem ? ` (${jaTem} já ${jaTem === 1 ? "tem" : "têm"} solicitação em aberto e ${jaTem === 1 ? "ficou" : "ficaram"} de fora.)` : ""}</p>
            <table class="sol-sug">
                <thead><tr><th><input type="checkbox" id="solSugTodos" checked></th><th>Produto</th><th>Estoque / mín.</th><th>Quantidade</th></tr></thead>
                <tbody>
                    ${sugestoes.map(function (p) {
                        return `<tr data-id="${escaparHtml(p.id)}">
                            <td><input type="checkbox" class="sol-sug-ck" checked></td>
                            <td><strong>${escaparHtml(p.nome || "-")}</strong><small>${escaparHtml(p.codigo || "sem código")}</small></td>
                            <td>${Number(p.quantidade || 0)} / ${Number(p.estoqueMinimo || 0)} ${escaparHtml(p.unidade || "UN")}</td>
                            <td><input type="number" class="sol-sug-qtd" min="1" step="1" value="${quantidadeSugerida(p)}"></td>
                        </tr>`;
                    }).join("")}
                </tbody>
            </table>
            <div class="sol-rodape">
                <span class="sol-contagem" id="solSugContagem"></span>
                <button type="button" class="secondary-button" id="solSugCancelar">Cancelar</button>
                <button type="button" class="primary-button" id="solSugCriar">Criar solicitações</button>
            </div>
        </div>`;

    overlay.hidden = false;

    const marcas = function () { return Array.from(overlay.querySelectorAll(".sol-sug-ck")); };

    const atualizarContagem = function () {

        const total = marcas().filter(function (m) { return m.checked; }).length;

        overlay.querySelector("#solSugContagem").textContent = `${total} de ${sugestoes.length} selecionado(s)`;

        overlay.querySelector("#solSugCriar").disabled = total === 0;

    };

    atualizarContagem();

    overlay.querySelector("#solSugTodos").addEventListener("change", function (event) {

        marcas().forEach(function (m) { m.checked = event.target.checked; });

        atualizarContagem();

    });

    overlay.querySelectorAll(".sol-sug-ck").forEach(function (m) {
        m.addEventListener("change", atualizarContagem);
    });

    overlay.querySelector("#solSugCancelar").onclick = function () { overlay.hidden = true; };

    const criar = overlay.querySelector("#solSugCriar");

    criar.onclick = async function () {

        const escolhidos = [];

        overlay.querySelectorAll("tbody tr").forEach(function (linha) {

            if (!linha.querySelector(".sol-sug-ck").checked) {
                return;
            }

            const produto = sugestoes.find(function (p) { return String(p.id) === linha.dataset.id; });

            const quantidade = Number(linha.querySelector(".sol-sug-qtd").value);

            if (produto && quantidade > 0) {
                escolhidos.push({ produto: produto, quantidade: Math.ceil(quantidade) });
            }

        });

        if (!escolhidos.length) {

            alert("Informe a quantidade dos produtos selecionados.");

            return;

        }

        criar.disabled = true;

        criar.textContent = "Criando...";

        try {

            const lojaId = obterLojaAtualGestok();

            if (!lojaId) {
                throw new Error("loja");
            }

            const dados = obterDadosUsuarioAtual();

            const usuario = dados.usuario;

            const contexto = dados.contexto;

            const referencia = referenciaSolicitacoes(lojaId);

            for (let i = 0; i < escolhidos.length; i += 400) {

                const lote = db.batch();

                escolhidos.slice(i, i + 400).forEach(function (escolhido) {

                    const p = escolhido.produto;

                    lote.set(referencia.doc(), {
                        lojaId: lojaId,
                        uid: usuario?.uid || contexto?.uid || null,
                        usuario: contexto?.usuario || "",
                        email: usuario?.email || contexto?.email || "",
                        codigoLoja: contexto?.codigoLoja || "",
                        produtoId: p.id,
                        produto: p.nome || "",
                        codigo: p.codigo || "",
                        estoqueAtual: Number(p.quantidade || 0),
                        estoqueMinimo: Number(p.estoqueMinimo || 0),
                        quantidade: escolhido.quantidade,
                        unidade: p.unidade || "UN",
                        motivo: "Estoque abaixo do mínimo",
                        observacao: "Criada pela sugestão de reposição",
                        status: "Pendente",
                        data: firebase.firestore.FieldValue.serverTimestamp(),
                        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
                    });

                });

                await lote.commit();

            }

            overlay.hidden = true;

            alert(`${escolhidos.length} ${escolhidos.length === 1 ? "solicitação criada" : "solicitações criadas"} com sucesso!`);

        } catch (erro) {

            console.error("Erro ao criar solicitações sugeridas:", erro);

            alert("Não foi possível criar as solicitações.");

            criar.disabled = false;

            criar.textContent = "Criar solicitações";

        }

    };

}


/* ---------- copiar lista de compras ---------- */

async function copiarListaDeCompras() {

    const abertas = obterSolicitacoes().filter(function (s) {
        return STATUS_EM_ABERTO.indexOf(s.status) !== -1;
    });

    if (!abertas.length) {

        alert("Não há solicitações em aberto para a lista de compras.");

        return;

    }

    const agrupado = new Map();

    abertas.forEach(function (s) {

        const chave = String(s.produtoId || s.produto);

        const atual = agrupado.get(chave) || {
            produto: s.produto || "-",
            unidade: s.unidade || "UN",
            quantidade: 0
        };

        atual.quantidade += Number(s.quantidade || 0);

        agrupado.set(chave, atual);

    });

    const linhas = Array.from(agrupado.values())
        .sort(function (a, b) { return a.produto.localeCompare(b.produto, "pt-BR"); })
        .map(function (i) { return `• ${i.produto} — ${i.quantidade} ${i.unidade}`; });

    const texto = `Lista de compras (${new Date().toLocaleDateString("pt-BR")})\n\n${linhas.join("\n")}`;

    try {

        if (navigator.clipboard && navigator.clipboard.writeText) {

            await navigator.clipboard.writeText(texto);

        } else {

            const area = document.createElement("textarea");

            area.value = texto;

            area.style.position = "fixed";

            area.style.opacity = "0";

            document.body.appendChild(area);

            area.select();

            document.execCommand("copy");

            area.remove();

        }

        alert(`Lista copiada! ${linhas.length} ${linhas.length === 1 ? "produto" : "produtos"}. Cole no WhatsApp ou onde quiser.`);

    } catch (erro) {

        console.error("Erro ao copiar lista:", erro);

        alert("Não foi possível copiar a lista.");

    }

}


const btnSugerir = document.getElementById("btnSugerir");

const btnCopiarLista = document.getElementById("btnCopiarLista");

if (btnSugerir) {
    btnSugerir.addEventListener("click", abrirModalSugestao);
}

if (btnCopiarLista) {
    btnCopiarLista.addEventListener("click", copiarListaDeCompras);
}
