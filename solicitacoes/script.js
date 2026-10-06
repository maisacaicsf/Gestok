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


                <td>

                    <button
                        class="action-button"
                        type="button"
                        title="Cancelar solicitação"
                        data-cancelar="${escaparHtml(
                            item.id
                        )}"
                    >

                        ×

                    </button>

                </td>

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