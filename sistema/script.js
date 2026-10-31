/* =========================================
GESTOK
Dashboard principal
========================================= */

/* =========================================
AUTENTICAÇÃO
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

const quickActions =
document.querySelectorAll(".quick-action");

const navItems =
document.querySelectorAll(".nav-item");

/* =========================================
NÚMERO DE MOVIMENTAÇÕES
-----------------------------------------
Firestore + loja atual
========================================= */

let quantidadeMovimentacoesDashboard = 0;


function atualizarNumeroMovimentacoes(
    total = null
) {

    const elemento =
        document.getElementById(
            "totalMovimentacoes"
        );

    if (!elemento) {
        return;
    }


    if (total !== null) {

        quantidadeMovimentacoesDashboard =
            Number(total) || 0;

    }


    elemento.textContent =
        quantidadeMovimentacoesDashboard;

}
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
ESC FECHA MENU
========================================= */

document.addEventListener(
"keydown",
function (event) {

    if (event.key === "Escape") {

        fecharMenu();

    }

}

);

/* =========================================
NAVEGAÇÃO DO MENU
========================================= */

navItems.forEach(function (item) {

item.addEventListener(
    "click",
    function () {

        navItems.forEach(
            function (nav) {

                nav.classList.remove(
                    "active"
                );

            }
        );


        this.classList.add(
            "active"
        );


        const pagina =
            this
                .querySelector(
                    "span:last-child"
                )
                ?.textContent
                .trim();


        console.log(
            "Página selecionada:",
            pagina
        );


        fecharMenu();

    }
);

});

/* =========================================
AÇÕES RÁPIDAS
========================================= */

quickActions.forEach(function (button) {

button.addEventListener(
    "click",
    function () {

        const pagina =
            this.dataset.page;


        console.log(
            "Abrindo módulo:",
            pagina
        );


        /* =============================
           ENTRADA
        ============================= */

        if (pagina === "Entrada") {

            window.location.href =
                "../entrada/index.html";

            return;

        }


        /* =============================
           SAÍDA
        ============================= */

        if (
            pagina === "Saída" ||
            pagina === "Saida"
        ) {

            window.location.href =
                "../saida/index.html";

            return;

        }


        /* =============================
           MOVIMENTAÇÕES
        ============================= */

        if (
            pagina === "Movimentações" ||
            pagina === "Movimentacoes"
        ) {

            window.location.href =
                "../movimentacoes/index.html";

            return;

        }


        /* =============================
           SOLICITAÇÕES
        ============================= */

        if (
            pagina === "Solicitações" ||
            pagina === "Solicitacoes"
        ) {

            window.location.href =
                "../solicitacoes/index.html";

            return;

        }

    }
);

});

/* =========================================
   MOVIMENTAÇÕES DO DASHBOARD
   -----------------------------------------
   Firestore + isolamento por loja.
========================================= */

let cancelarMovimentacoesDashboard = null;


/* =========================================
   DATA DA MOVIMENTAÇÃO
========================================= */

function obterDataMovimentacaoDashboard(
    data
) {

    if (!data) {
        return null;
    }


    if (
        typeof data.toDate === "function"
    ) {

        const dataTimestamp =
            data.toDate();

        return Number.isNaN(
            dataTimestamp.getTime()
        )
            ? null
            : dataTimestamp;

    }


    const dataConvertida =
        new Date(data);


    return Number.isNaN(
        dataConvertida.getTime()
    )
        ? null
        : dataConvertida;

}


/* =========================================
   FORMATAR DATA
========================================= */

function formatarDataMovimentacao(
    data
) {

    const d =
        obterDataMovimentacaoDashboard(
            data
        );


    if (!d) {
        return "";
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
    ).format(d);

}


/* =========================================
   RENDERIZAR ÚLTIMAS MOVIMENTAÇÕES
========================================= */

function renderizarUltimasMovimentacoesDashboard(
    movimentos
) {

    const painel =
        document.querySelector(
            ".movements-panel"
        );


    if (!painel) {
        return;
    }


    const vazio =
        painel.querySelector(
            ".empty-state"
        );


    const recentes =
        movimentos
            .filter(
                function (item) {

                    return Boolean(
                        obterDataMovimentacaoDashboard(
                            item?.data
                        )
                    );

                }
            )
            .sort(
                function (a, b) {

                    return (
                        obterDataMovimentacaoDashboard(
                            b?.data
                        )?.getTime() || 0
                    ) - (
                        obterDataMovimentacaoDashboard(
                            a?.data
                        )?.getTime() || 0
                    );

                }
            )
            .slice(0, 5);


    let lista =
        painel.querySelector(
            ".dashboard-movements-list"
        );


    /* =====================================
       NENHUMA MOVIMENTAÇÃO
    ===================================== */

    if (!recentes.length) {

        if (lista) {

            lista.remove();

        }


        if (vazio) {

            vazio.style.display =
                "flex";


            vazio.innerHTML = `

                <div class="empty-icon">
                    ↔
                </div>

                <strong>
                    Nenhuma movimentação
                </strong>

                <span>
                    As entradas e saídas aparecerão aqui.
                </span>

            `;

        }


        return;

    }


    /* =====================================
       ESCONDER EMPTY
    ===================================== */

    if (vazio) {

        vazio.style.display =
            "none";

    }


    /* =====================================
       CRIAR LISTA
    ===================================== */

    if (!lista) {

        lista =
            document.createElement(
                "div"
            );


        lista.className =
            "dashboard-movements-list";


        painel.appendChild(
            lista
        );

    }


    /* =====================================
       CARDS
    ===================================== */

    lista.innerHTML =
        recentes
            .map(
                function (item) {

                    const entrada =
                        String(
                            item.tipo || ""
                        )
                        .toLowerCase()
                        .includes(
                            "entrada"
                        );


                    const sinal =
                        entrada
                            ? "+"
                            : "−";


                    const classe =
                        entrada
                            ? "movement-entry"
                            : "movement-exit";


                    const icone =
                        entrada
                            ? "↓"
                            : "↑";


                    const quantidade =
                        Number(
                            item.quantidade ||
                            0
                        );


                    const anterior =
                        item.estoqueAnterior ??
                        item.estoqueAntes ??
                        0;


                    const novo =
                        item.estoqueNovo ??
                        item.estoqueDepois ??
                        0;


                    return `

                        <div
                            class="dashboard-movement ${classe}"
                        >

                            <div class="movement-main">

                                <div class="movement-icon">
                                    ${icone}
                                </div>


                                <div class="movement-info">

                                    <strong>
                                        ${escaparHtmlDashboard(
                                            item.produto ||
                                            "Produto"
                                        )}
                                    </strong>


                                    <span>

                                        ${escaparHtmlDashboard(
                                            item.tipo ||
                                            (
                                                entrada
                                                    ? "Entrada"
                                                    : "Saída"
                                            )
                                        )}

                                        •

                                        ${formatarDataMovimentacao(
                                            item.data
                                        )}

                                    </span>

                                </div>

                            </div>


                            <div class="movement-values">

                                <strong>

                                    ${sinal}${quantidade}

                                    ${escaparHtmlDashboard(
                                        item.unidade ||
                                        "UN"
                                    )}

                                </strong>


                                <span>
                                    ${anterior} → ${novo}
                                </span>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


/* =========================================
   MONITORAR FIRESTORE
========================================= */

async function iniciarMonitoramentoMovimentacoesDashboard() {

    /* =====================================
       CANCELAR LISTENER ANTERIOR
    ===================================== */

    if (
        cancelarMovimentacoesDashboard
    ) {

        cancelarMovimentacoesDashboard();

        cancelarMovimentacoesDashboard =
            null;

    }


    /* =====================================
       OBTER LOJA ATUAL
    ===================================== */

    const lojaId =
        obterLojaDashboardGestok();


    if (!lojaId) {

        quantidadeMovimentacoesDashboard =
            0;


        atualizarNumeroMovimentacoes();


        renderizarUltimasMovimentacoesDashboard(
            []
        );


        return;

    }


    /* =====================================
       REFERÊNCIA FIRESTORE
    ===================================== */

    if (
        typeof referenciaMovimentacoes !==
        "function"
    ) {

        console.error(
            "referenciaMovimentacoes não está disponível."
        );

        return;

    }


    try {

        const referencia =
            referenciaMovimentacoes(
                lojaId
            );


        cancelarMovimentacoesDashboard =
            referencia.onSnapshot(
                function (snapshot) {

                    const movimentos =
                        snapshot.docs.map(
                            function (doc) {

                                return {

                                    id:
                                        doc.id,

                                    ...doc.data()

                                };

                            }
                        );


                    quantidadeMovimentacoesDashboard =
                        movimentos.length;


                    atualizarNumeroMovimentacoes();


                    renderizarUltimasMovimentacoesDashboard(
                        movimentos
                    );


                    console.log(
                        "Movimentações atualizadas:",
                        movimentos.length,
                        "loja:",
                        lojaId
                    );

                },


                function (erro) {

                    console.error(
                        "Erro ao monitorar movimentações:",
                        erro
                    );


                    quantidadeMovimentacoesDashboard =
                        0;


                    atualizarNumeroMovimentacoes();


                    renderizarUltimasMovimentacoesDashboard(
                        []
                    );

                }
            );

    } catch (erro) {

        console.error(
            "Erro ao iniciar movimentações:",
            erro
        );


        quantidadeMovimentacoesDashboard =
            0;


        atualizarNumeroMovimentacoes();


        renderizarUltimasMovimentacoesDashboard(
            []
        );

    }

}
const notificationButton =
document.getElementById(
"notificationButton"
);

const notificationsPanel =
document.getElementById(
"notificationsPanel"
);

const notificationsList =
document.getElementById(
"notificationsList"
);

const notificationsEmpty =
document.getElementById(
"notificationsEmpty"
);

const marcarAvisosLidos =
document.getElementById(
"marcarAvisosLidos"
);

/* =========================================
CACHE
========================================= */

let notificacoesFirestore =
[];

let idsNotificacoesLidas =
new Set();

let cancelarListenerNotificacoes =
null;

/* =========================================
ESCAPAR HTML
========================================= */

function escaparHtml(texto) {

return String(texto ?? "")
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
DATA DA NOTIFICAÇÃO
========================================= */

function converterDataNotificacao(data) {

if (!data) {
    return null;
}

try {

    if (
        typeof data.toDate ===
        "function"
    ) {

        return data.toDate();

    }

    if (
        data instanceof Date
    ) {

        return data;

    }

    const dataConvertida =
        new Date(data);

    if (
        Number.isNaN(
            dataConvertida.getTime()
        )
    ) {

        return null;

    }

    return dataConvertida;

} catch (erro) {

    return null;

}

}

function formatarDataAviso(data) {

const d =
    converterDataNotificacao(
        data
    );

if (!d) {

    return "Agora";

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
).format(d);

}

/* =========================================
IDENTIFICAR USUÁRIO
========================================= */

function obterUidUsuarioNotificacao() {

try {

    if (
        typeof usuarioFirebaseAtual ===
        "function"
    ) {

        const usuario =
            usuarioFirebaseAtual();

        return usuario?.uid || null;

    }

} catch (erro) {

    console.error(
        "Erro ao obter usuário:",
        erro
    );

}

return null;

}



function obterChaveAvisosLidos() {

const uid =
    obterUidUsuarioNotificacao();

if (!uid) {

    return null;

}

return (
    "gestok_notificacoes_lidas_" +
    uid
);

}

function carregarAvisosLidos() {

const chave =
    obterChaveAvisosLidos();

if (!chave) {

    idsNotificacoesLidas =
        new Set();

    return;

}

try {

    const dados =
        JSON.parse(
            localStorage.getItem(
                chave
            ) || "[]"
        );

    if (
        Array.isArray(dados)
    ) {

        idsNotificacoesLidas =
            new Set(
                dados.map(
                    id =>
                        String(id)
                )
            );

    } else {

        idsNotificacoesLidas =
            new Set();

    }

} catch (erro) {

    console.error(
        "Erro ao carregar avisos lidos:",
        erro
    );

    idsNotificacoesLidas =
        new Set();

}

}

function salvarAvisosLidos() {

const chave =
    obterChaveAvisosLidos();

if (!chave) {
    return;
}

try {

    localStorage.setItem(
        chave,
        JSON.stringify(
            Array.from(
                idsNotificacoesLidas
            )
        )
    );

} catch (erro) {

    console.error(
        "Erro ao salvar avisos lidos:",
        erro
    );

}

}

/* =========================================
FILTRAR DESTINO
========================================= */

function notificacaoEhParaTodasAsLojas(
notificacao
) {

return (
    notificacao.destino ===
        "todas" ||
    notificacao.lojasDestino ===
        "todas"
);

}

/* =========================================
ÍCONE
========================================= */

function obterIconeNotificacao(
tipo
) {

const valor =
    String(
        tipo || ""
    )
    .toLowerCase();


if (
    valor.includes(
        "urgente"
    )
) {

    return "⚠";

}


if (
    valor.includes(
        "aviso"
    )
) {

    return "!";

}


if (
    valor.includes(
        "atual"
    )
) {

    return "↻";

}


if (
    valor.includes(
        "recurso"
    )
) {

    return "✦";

}


if (
    valor.includes(
        "manuten"
    )
) {

    return "🔧";

}


return "ℹ";

}

/* =========================================
CLASSE DO TIPO
========================================= */

function obterClasseNotificacao(
tipo
) {

const valor =
    String(
        tipo || ""
    )
    .toLowerCase();


if (
    valor.includes(
        "urgente"
    )
) {

    return "notification-urgent";

}


if (
    valor.includes(
        "aviso"
    )
) {

    return "notification-warning";

}


if (
    valor.includes(
        "atual"
    )
) {

    return "notification-update";

}


return "notification-info";

}

/* =========================================
ATUALIZAR BADGE DO SINO
========================================= */

function atualizarBadgeNotificacoes() {

if (!notificationButton) {
    return;
}


let dot =
    notificationButton.querySelector(
        ".notification-dot"
    );


if (!dot) {

    dot =
        document.createElement(
            "span"
        );

    dot.className =
        "notification-dot";

    notificationButton.appendChild(
        dot
    );

}


const naoLidas =
    notificacoesFirestore.filter(
        function (notificacao) {

            return !idsNotificacoesLidas.has(
                String(
                    notificacao.id
                )
            );

        }
    );


if (naoLidas.length > 0) {

    dot.style.display =
        "flex";

    dot.textContent =
        naoLidas.length > 99
            ? "99+"
            : naoLidas.length;

    notificationButton.classList.add(
        "has-notifications"
    );

} else {

    dot.style.display =
        "none";

    dot.textContent =
        "";

    notificationButton.classList.remove(
        "has-notifications"
    );

}

}

/* =========================================
RENDERIZAR NOTIFICAÇÕES
========================================= */

function atualizarNotificacoes() {

if (!notificationsList) {
    return;
}


atualizarBadgeNotificacoes();


if (
    !notificacoesFirestore.length
) {

    notificationsList.innerHTML =
        "";

    if (notificationsEmpty) {

        notificationsEmpty.hidden =
            false;

    }

    return;

}


if (notificationsEmpty) {

    notificationsEmpty.hidden =
        true;

}


notificationsList.innerHTML =
    notificacoesFirestore
        .slice(0, 20)
        .map(
            function (aviso) {

                const id =
                    String(
                        aviso.id
                    );


                const lido =
                    idsNotificacoesLidas.has(
                        id
                    );


                const classeLida =
                    lido
                        ? "is-read"
                        : "is-unread";


                const classeTipo =
                    obterClasseNotificacao(
                        aviso.tipo
                    );


                const icone =
                    obterIconeNotificacao(
                        aviso.tipo
                    );


                return `

                    <article
                        class="
                            notification-item
                            ${classeLida}
                            ${classeTipo}
                        "
                        data-aviso-id="${escaparHtml(id)}"
                    >

                        <div class="notification-item-icon">
                            ${icone}
                        </div>


                        <div class="notification-item-content">

                            <div class="notification-item-top">

                                <strong>
                                    ${escaparHtml(
                                        aviso.titulo ||
                                        "Aviso do sistema"
                                    )}
                                </strong>


                                ${
                                    lido
                                        ? ""
                                        : `
                                            <span class="notification-new">
                                                NOVO
                                            </span>
                                        `
                                }

                            </div>


                            <p>
                                ${escaparHtml(
                                    aviso.mensagem ||
                                    ""
                                )}
                            </p>


                            <small>
                                ${formatarDataAviso(
                                    aviso.data
                                )}
                            </small>

                        </div>

                    </article>

                `;

            }
        )
        .join("");


notificationsList
    .querySelectorAll(
        ".notification-item"
    )
    .forEach(
        function (item) {

            item.addEventListener(
                "click",
                function () {

                    const id =
                        this.dataset.avisoId;

                    if (!id) {
                        return;
                    }


                    idsNotificacoesLidas.add(
                        String(id)
                    );

                    salvarAvisosLidos();

                    atualizarNotificacoes();

                }
            );

        }
    );

}

/* =========================================
OUVIR FIRESTORE EM TEMPO REAL
========================================= */

function iniciarListenerNotificacoes() {

if (
    cancelarListenerNotificacoes
) {

    cancelarListenerNotificacoes();

    cancelarListenerNotificacoes =
        null;

}


notificacoesFirestore =
    [];

atualizarNotificacoes();


if (
    typeof firebase ===
    "undefined"
) {

    console.error(
        "Firebase não está disponível para notificações."
    );

    return;

}


if (
    !firebase.firestore
) {

    console.error(
        "Firestore não está disponível para notificações."
    );

    return;

}


cancelarListenerNotificacoes =
    firebase
        .firestore()
        .collection(
            "notificacoes"
        )
        .where(
            "ativa",
            "==",
            true
        )
        .onSnapshot(
            function (snapshot) {

                const lista =
                    [];


                snapshot.forEach(
                    function (documento) {

                        const dados =
                            documento.data() ||
                            {};


                        if (
                            !notificacaoEhParaTodasAsLojas(
                                dados
                            )
                        ) {

                            return;

                        }


                        lista.push({

                            id:
                                documento.id,

                            ...dados

                        });

                    }
                );


                lista.sort(
                    function (
                        a,
                        b
                    ) {

                        const dataA =
                            converterDataNotificacao(
                                a.data
                            );

                        const dataB =
                            converterDataNotificacao(
                                b.data
                            );


                        const tempoA =
                            dataA
                                ? dataA.getTime()
                                : 0;


                        const tempoB =
                            dataB
                                ? dataB.getTime()
                                : 0;


                        return (
                            tempoB -
                            tempoA
                        );

                    }
                );


                notificacoesFirestore =
                    lista;


                atualizarNotificacoes();


                console.log(
                    "Notificações atualizadas pelo Firestore:",
                    lista.length
                );

            },
            function (erro) {

                console.error(
                    "Erro ao carregar notificações do Firestore:",
                    erro
                );


                notificacoesFirestore =
                    [];


                atualizarNotificacoes();

            }
        );

}

/* =========================================
ABRIR / FECHAR JANELA EXISTENTE
========================================= */

function alternarNotificacoes() {

if (!notificationsPanel) {
    return;
}


const aberto =
    notificationsPanel.classList.toggle(
        "active"
    );


notificationsPanel.setAttribute(
    "aria-hidden",
    String(!aberto)
);


if (aberto) {

    atualizarNotificacoes();

}

}

/* =========================================
SINO
========================================= */

if (notificationButton) {

notificationButton.addEventListener(
    "click",
    function (evento) {

        evento.stopPropagation();

        alternarNotificacoes();

    }
);

}

/* =========================================
NÃO FECHAR AO CLICAR DENTRO
========================================= */

if (notificationsPanel) {

notificationsPanel.addEventListener(
    "click",
    function (evento) {

        evento.stopPropagation();

    }
);

}

/* =========================================
FECHAR AO CLICAR FORA
========================================= */

document.addEventListener(
"click",
function () {

    if (!notificationsPanel) {
        return;
    }


    notificationsPanel.classList.remove(
        "active"
    );


    notificationsPanel.setAttribute(
        "aria-hidden",
        "true"
    );

}

);

/* =========================================
MARCAR TODAS COMO LIDAS
========================================= */

if (marcarAvisosLidos) {

marcarAvisosLidos.addEventListener(
    "click",
    function () {

        notificacoesFirestore.forEach(
            function (aviso) {

                idsNotificacoesLidas.add(
                    String(
                        aviso.id
                    )
                );

            }
        );


        salvarAvisosLidos();

        atualizarNotificacoes();

    }
);

}

/* =========================================
INICIALIZAR NOTIFICAÇÕES
========================================= */

function inicializarNotificacoesGestok() {

carregarAvisosLidos();

iniciarListenerNotificacoes();

}

/* =========================================
DATA ATUAL
========================================= */

function atualizarData() {

const elemento =
    document.getElementById(
        "currentDate"
    );

if (!elemento) {
    return;
}

const agora =
    new Date();

const meses = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez"
];

const dia =
    String(
        agora.getDate()
    ).padStart(2, "0");

const mes =
    meses[
        agora.getMonth()
    ];

const ano =
    agora.getFullYear();

elemento.textContent =
    `${dia} ${mes} ${ano}`;

}

let cancelarProdutosDashboard = null;

function obterLojaDashboardGestok() {

const usuario =
    usuarioFirebaseAtualGestok();

if (!usuario) {
    return null;
}

/* -----------------------------------------
   PRIMEIRO: CONTEXTO CENTRAL
----------------------------------------- */

if (
    typeof obterLojaAtualGestok ===
    "function"
) {

    const lojaContexto =
        obterLojaAtualGestok();

    if (lojaContexto) {
        return lojaContexto;
    }

}


/* -----------------------------------------
   SEGUNDO: CACHE DA CONTA
----------------------------------------- */

const conta =
    obterContaGestok();

if (!conta || !conta.lojaId) {
    return null;
}

if (
    conta.firebaseUid &&
    conta.firebaseUid !== usuario.uid
) {
    return null;
}

return conta.lojaId;

}

function obterProdutosDashboard() {

const lojaId =
    obterLojaDashboardGestok();

if (!lojaId) {
    return null;
}

return referenciaProdutos(
    lojaId
);

}

/* =========================================
ATUALIZAR DASHBOARD
========================================= */

function atualizarDashboard(
produtos = []
) {

const produtosAtivos =
    produtos.filter(
        function (produto) {

            return produto.ativo !== false;

        }
    );


const estoqueMinimo =
    produtosAtivos.filter(
        function (produto) {

            const quantidade =
                Number(
                    produto.quantidade || 0
                );

            const minimo =
                Number(
                    produto.estoqueMinimo || 0
                );

            return (
                minimo > 0 &&
                quantidade < minimo
            );

        }
    );


const quantidadeTotal =
    produtosAtivos.reduce(
        function (
            total,
            produto
        ) {

            return (
                total +
                Number(
                    produto.quantidade || 0
                )
            );

        },
        0
    );


const elementoProdutos =
    document.getElementById(
        "produtosAtivos"
    );

const elementoEstoqueMinimo =
    document.getElementById(
        "estoqueMinimo"
    );

const elementoEstoqueMaximo =
    document.getElementById(
        "estoqueMaximo"
    );


if (elementoProdutos) {

    elementoProdutos.textContent =
        produtosAtivos.length;

}


if (elementoEstoqueMinimo) {

    elementoEstoqueMinimo.textContent =
        estoqueMinimo.length;

}


if (elementoEstoqueMaximo) {

    elementoEstoqueMaximo.textContent =
        quantidadeTotal;

}


const alertCount =
    document.querySelector(
        ".alert-count"
    );


if (alertCount) {

    alertCount.textContent =
        estoqueMinimo.length;

}


atualizarEstadoAlertas(
    estoqueMinimo
);

}

/* =========================================
MONITORAR PRODUTOS EM TEMPO REAL
========================================= */

function iniciarMonitoramentoProdutosDashboard() {

if (cancelarProdutosDashboard) {

    cancelarProdutosDashboard();

    cancelarProdutosDashboard =
        null;

}


const referencia =
    obterProdutosDashboard();


if (!referencia) {

    atualizarDashboard([]);

    return;

}


/* =====================================
   PRIMEIRA PINTURA PELO CACHE
===================================== */

const lojaId =
    obterLojaDashboardGestok();


if (
    lojaId &&
    typeof obterCacheDashboardGestok ===
        "function"
) {

    const cache =
        obterCacheDashboardGestok(
            lojaId
        );


    if (cache) {

        const produtosAtivos =
            Number(
                cache.produtosAtivos ||
                0
            );


        const estoqueMinimo =
            Number(
                cache.estoqueMinimo ||
                0
            );


        const quantidadeTotal =
            Number(
                cache.quantidadeTotal ||
                0
            );


        const elementoProdutos =
            document.getElementById(
                "produtosAtivos"
            );


        const elementoMinimo =
            document.getElementById(
                "estoqueMinimo"
            );


        const elementoTotal =
            document.getElementById(
                "estoqueMaximo"
            );


        if (elementoProdutos) {

            elementoProdutos.textContent =
                produtosAtivos;

        }


        if (elementoMinimo) {

            elementoMinimo.textContent =
                estoqueMinimo;

        }


        if (elementoTotal) {

            elementoTotal.textContent =
                quantidadeTotal;

        }

    }

}


cancelarProdutosDashboard =
    referencia
        .onSnapshot(
            function (snapshot) {

                const produtos =
                    snapshot.docs.map(
                        function (doc) {

                            return {

                                id:
                                    doc.id,

                                ...doc.data()

                            };

                        }
                    );


                const lojaId =
                    obterLojaDashboardGestok();


                if (
                    lojaId &&
                    typeof salvarCacheDashboardGestok ===
                        "function"
                ) {

                    salvarCacheDashboardGestok(
                        lojaId,
                        produtos
                    );

                }


                atualizarDashboard(
                    produtos
                );


                console.log(
                    "Dashboard atualizado pelo Firestore.",
                    produtos.length,
                    "produtos"
                );

            },
            function (erro) {

                console.error(
                    "Erro ao monitorar produtos do dashboard:",
                    erro
                );


                atualizarDashboard([]);

            }
        );

}

/* =========================================
ATUALIZAR PAINEL DE ALERTAS
========================================= */

function atualizarEstadoAlertas(
produtosAbaixoMinimo
) {

const emptyState =
    document.getElementById(
        "alertEmptyState"
    );

const lista =
    document.getElementById(
        "alertProductsList"
    );


if (!emptyState || !lista) {

    console.warn(
        "Elementos de alerta não encontrados no HTML."
    );

    return;

}


lista.innerHTML =
    "";


if (
    produtosAbaixoMinimo.length === 0
) {

    emptyState.style.display =
        "flex";


    emptyState.innerHTML = `

        <div class="empty-icon success">
            ✓
        </div>

        <strong>
            Tudo certo!
        </strong>

        <span>
            Nenhum produto está abaixo
            do estoque mínimo.
        </span>

    `;

    return;

}


emptyState.style.display =
    "none";


produtosAbaixoMinimo.forEach(
    function (produto) {

        const quantidade =
            Number(
                produto.quantidade || 0
            );


        const minimo =
            Number(
                produto.estoqueMinimo || 0
            );


        const unidade =
            produto.unidade ||
            "UN";


        const card =
            document.createElement(
                "div"
            );


        card.className =
            "alert-product-card";


        card.innerHTML = `

            <div class="alert-product-top">

                <div class="alert-product-icon">
                    !
                </div>

                <div class="alert-product-name">

                    <strong>
                        ${escaparHtmlDashboard(
                            produto.nome ||
                            "Produto sem nome"
                        )}
                    </strong>

                    ${
                        produto.codigo
                            ? `
                                <small>
                                    Código:
                                    ${escaparHtmlDashboard(
                                        produto.codigo
                                    )}
                                </small>
                              `
                            : ""
                    }

                </div>

            </div>


            <div class="alert-product-details">

                <div>

                    <span>
                        Estoque atual
                    </span>

                    <strong>
                        ${quantidade}
                        ${escaparHtmlDashboard(
                            unidade
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Estoque mínimo
                    </span>

                    <strong>
                        ${minimo}
                        ${escaparHtmlDashboard(
                            unidade
                        )}
                    </strong>

                </div>

            </div>


            <div class="alert-product-warning">
                ⚠ Estoque abaixo do mínimo
            </div>

        `;


        lista.appendChild(
            card
        );

    }
);

}

function escaparHtmlDashboard(
texto
) {

return String(texto ?? "")
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
USUÁRIO LOGADO
========================================= */

/* =========================================
   USUÁRIO LOGADO
========================================= */

function atualizarNomeUsuario() {

    const nomePrincipal =
        document.getElementById(
            "nomeUsuario"
        );

    const nomeMenu =
        document.getElementById(
            "nomeUsuarioMenu"
        );

    const avatar =
        document.getElementById(
            "avatarUsuario"
        );


    try {

        const dados =
            localStorage.getItem(
                "gestok_conta"
            );


        if (!dados) {

            console.warn(
                "Nenhuma conta encontrada em gestok_conta."
            );

            return;

        }


        const conta =
            JSON.parse(dados);


        if (
            !conta ||
            typeof conta !== "object"
        ) {

            return;

        }


        /* =====================================
           NOME DA EMPRESA
           -------------------------------------
           Continua sendo usado no centro
           do dashboard.
        ====================================== */

        const nomeEmpresa =
            String(
                conta.nome ||
                ""
            ).trim();


        /* =====================================
           NOME DO USUÁRIO
           -------------------------------------
           Usamos o campo "usuario".
        ====================================== */

        const nomeUsuario =
            String(
                conta.usuario ||
                ""
            ).trim();


        /* =====================================
           NOME NO CENTRO
        ====================================== */

        if (
            nomePrincipal &&
            nomeEmpresa
        ) {

            nomePrincipal.textContent =
                nomeEmpresa;

        }


        /* =====================================
           NOME NO TOPO
        ====================================== */

        if (nomeMenu) {

            nomeMenu.textContent =
                nomeUsuario ||
                nomeEmpresa ||
                "Usuário";

        }


        /* =====================================
           AVATAR
           -------------------------------------
           Agora usa a primeira letra
           do nome do usuário.
        ====================================== */

        if (avatar) {

            const nomeParaAvatar =
                nomeUsuario ||
                nomeEmpresa ||
                "U";

            avatar.textContent =
                nomeParaAvatar
                    .charAt(0)
                    .toUpperCase();

        }

    } catch (erro) {

        console.error(
            "Erro ao carregar usuário:",
            erro
        );

    }

}

/* =========================================
ATUALIZAR QUANDO O ESTOQUE MUDAR
========================================= */

window.addEventListener(
"storage",
function (evento) {

    if (
        evento.key ===
        "gestok_conta"
    ) {

        atualizarNomeUsuario();

        iniciarMonitoramentoProdutosDashboard();

    }

}

);

/* =========================================
ATUALIZAR AO VOLTAR PARA A PÁGINA
========================================= */

document.addEventListener(
"visibilitychange",
function () {

    if (
        document.visibilityState ===
        "visible"
    ) {

        iniciarMonitoramentoProdutosDashboard();

       iniciarMonitoramentoMovimentacoesDashboard();

        atualizarNumeroMovimentacoes();

        atualizarNomeUsuario();

        atualizarNotificacoes();

    }

}

);
let dashboardFirebaseInicializado =
false;

function iniciarDashboardComFirebase() {

if (
    dashboardFirebaseInicializado
) {

    return;

}


dashboardFirebaseInicializado =
    true;


atualizarData();


iniciarMonitoramentoProdutosDashboard();


iniciarMonitoramentoMovimentacoesDashboard();


atualizarNumeroMovimentacoes();


atualizarNomeUsuario();


inicializarNotificacoesGestok();

}

/* =========================================
DOM READY
========================================= */

document.addEventListener(
"DOMContentLoaded",
function () {

    atualizarData();


    if (
        typeof firebase !==
            "undefined" &&
        firebase.auth
    ) {

        firebase
            .auth()
            .onAuthStateChanged(
                function (usuario) {

                    if (!usuario) {

                        window.location.replace(
                            caminhoLoginGestok()
                        );

                        return;

                    }


                    console.log(
                        "Firebase confirmou usuário do Dashboard:",
                        usuario.uid
                    );


                    iniciarDashboardComFirebase();

                }
            );

    } else {

        console.error(
            "Firebase Auth não está disponível no Dashboard."
        );

    }

}

);

/* =========================================
PÁGINA VOLTOU A FICAR VISÍVEL
========================================= */

window.addEventListener(
"pageshow",
function () {

    atualizarData();

    iniciarMonitoramentoProdutosDashboard();

    iniciarMonitoramentoMovimentacoesDashboard();

    atualizarNumeroMovimentacoes();

    atualizarNomeUsuario();

    atualizarNotificacoes();

}

);

/* =========================================
VER TODAS AS MOVIMENTAÇÕES
========================================= */

const verTodasMovimentacoes =
document.getElementById(
"verTodasMovimentacoes"
);

if (verTodasMovimentacoes) {

verTodasMovimentacoes.addEventListener(
    "click",
    function () {

        window.location.href =
            "../movimentacoes/index.html";

    }
);

}


/* =========================================
   GRÁFICO DE MOVIMENTAÇÕES (por mês)
========================================= */

let movimentosGrafico = [];
let graficoCarregado = false;
let mesesGrafico = 7;

try {

    const mesesSalvo = Number(localStorage.getItem("gestok_grafico_meses"));

    if (mesesSalvo === 7 || mesesSalvo === 12) {
        mesesGrafico = mesesSalvo;
    }

} catch (erro) { }

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const MESES_LONGOS = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

function passoEixoGrafico(maximo) {

    const candidatos = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];

    for (let i = 0; i < candidatos.length; i++) {

        if (Math.ceil(maximo / candidatos[i]) <= 5) {
            return candidatos[i];
        }

    }

    return candidatos[candidatos.length - 1];

}

function montarMesesGrafico(quantidade) {

    const hoje = new Date();

    const lista = [];

    for (let i = quantidade - 1; i >= 0; i--) {

        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);

        lista.push({ ano: d.getFullYear(), mes: d.getMonth(), total: 0, entradas: 0, saidas: 0 });

    }

    return lista;

}

function desenharGraficoMovimentacoes() {

    const alvo = document.getElementById("movChart");

    if (!alvo) {
        return;
    }

    if (!graficoCarregado) {

        alvo.innerHTML = '<div class="mov-empty">Carregando dados...</div>';

        return;

    }

    const meses = montarMesesGrafico(mesesGrafico);

    const indice = new Map();

    meses.forEach(function (m, i) {
        indice.set(m.ano * 12 + m.mes, i);
    });

    movimentosGrafico.forEach(function (movimento) {

        const data = obterDataMovimentacaoDashboard(
            movimento.data || movimento.criadoEm || movimento.dataCadastro
        );

        if (!data) {
            return;
        }

        const posicao = indice.get(data.getFullYear() * 12 + data.getMonth());

        if (posicao === undefined) {
            return;
        }

        const mes = meses[posicao];

        mes.total++;

        const tipo = String(movimento.tipo || "").toLowerCase();

        if (tipo.indexOf("entrada") === 0) {
            mes.entradas++;
        } else if (tipo.indexOf("sa") === 0) {
            mes.saidas++;
        }

    });

    const maximo = Math.max.apply(null, meses.map(function (m) { return m.total; }).concat([0]));

    const passo = passoEixoGrafico(Math.max(maximo, 1));

    const intervalos = Math.max(2, Math.ceil(maximo / passo));

    const topo = passo * intervalos;

    const marcas = [];

    for (let i = 0; i <= intervalos; i++) {
        marcas.push({ valor: i * passo, posicao: (i / intervalos) * 100 });
    }

    const vazio = maximo === 0;

    alvo.innerHTML =
        '<div class="mov-plot-wrap">' +
            '<div class="mov-y">' +
                marcas.map(function (t) {
                    return '<span style="bottom:' + t.posicao + '%">' + t.valor.toLocaleString("pt-BR") + '</span>';
                }).join("") +
            '</div>' +
            '<div class="mov-plot">' +
                marcas.map(function (t) {
                    return '<div class="mov-grid-line" style="bottom:' + t.posicao + '%"></div>';
                }).join("") +
                (vazio ? '<div class="mov-empty">Nenhuma movimentação nos últimos ' + mesesGrafico + ' meses.</div>' : "") +
                '<div class="mov-bars">' +
                    meses.map(function (m) {

                        const altura = (m.total / topo) * 100;

                        return '<div class="mov-col">' +
                            '<div class="mov-bar' + (m.total ? "" : " vazio") + '" style="height:' + altura + '%">' +
                                '<span class="mov-tip"><strong>' + MESES_LONGOS[m.mes] + ' de ' + m.ano + '</strong>' +
                                m.total + (m.total === 1 ? " movimentação" : " movimentações") + '<br>' +
                                m.entradas + (m.entradas === 1 ? " entrada" : " entradas") + ' · ' +
                                m.saidas + (m.saidas === 1 ? " saída" : " saídas") + '</span>' +
                            '</div>' +
                        '</div>';

                    }).join("") +
                '</div>' +
            '</div>' +
            '<div class="mov-x">' +
                meses.map(function (m, i) {
                    return '<span>' + MESES_CURTOS[m.mes] +
                        (i === 0 || m.mes === 0 ? '<small>' + m.ano + '</small>' : "") + '</span>';
                }).join("") +
            '</div>' +
        '</div>';

}

function atualizarGraficoMovimentacoes(movimentos) {

    movimentosGrafico = Array.isArray(movimentos) ? movimentos : [];

    graficoCarregado = true;

    desenharGraficoMovimentacoes();

}

(function iniciarGraficoMovimentacoes() {

    const seletor = document.getElementById("graficoPeriodo");

    if (seletor) {

        seletor.value = String(mesesGrafico);

        seletor.addEventListener("change", function () {

            mesesGrafico = Number(seletor.value) === 12 ? 12 : 7;

            try {
                localStorage.setItem("gestok_grafico_meses", String(mesesGrafico));
            } catch (erro) { }

            desenharGraficoMovimentacoes();

        });

    }

    /* O gráfico acompanha a mesma lista de movimentações do painel */
    if (typeof renderizarUltimasMovimentacoesDashboard === "function") {

        const original = renderizarUltimasMovimentacoesDashboard;

        renderizarUltimasMovimentacoesDashboard = function (movimentos) {

            original(movimentos);

            try {
                atualizarGraficoMovimentacoes(movimentos);
            } catch (erro) {
                console.warn("Não foi possível desenhar o gráfico:", erro);
            }

        };

    }

})();
