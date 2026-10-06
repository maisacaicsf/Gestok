/* =========================================
   GESTOK
   MEUS CHAMADOS
   FIRESTORE
========================================= */


/* =========================================
   ELEMENTOS
========================================= */

const ticketsList =
    document.getElementById(
        "ticketsList"
    );

const emptyState =
    document.getElementById(
        "emptyState"
    );

const buscaChamado =
    document.getElementById(
        "buscaChamado"
    );

const filtroStatus =
    document.getElementById(
        "filtroStatus"
    );

const totalChamados =
    document.getElementById(
        "totalChamados"
    );

const chamadosAbertos =
    document.getElementById(
        "chamadosAbertos"
    );

const chamadosResolvidos =
    document.getElementById(
        "chamadosResolvidos"
    );


/* =========================================
   MODAL
========================================= */

const modalDetalhes =
    document.getElementById(
        "modalDetalhes"
    );

const fecharDetalhes =
    document.getElementById(
        "fecharDetalhes"
    );

const fecharDetalhesBtn =
    document.getElementById(
        "fecharDetalhesBtn"
    );

const detalheAssunto =
    document.getElementById(
        "detalheAssunto"
    );

const detalheNumero =
    document.getElementById(
        "detalheNumero"
    );

const detalheStatus =
    document.getElementById(
        "detalheStatus"
    );

const detalheCategoria =
    document.getElementById(
        "detalheCategoria"
    );

const detalheData =
    document.getElementById(
        "detalheData"
    );

const detalheMensagem =
    document.getElementById(
        "detalheMensagem"
    );

const respostaSuporte =
    document.getElementById(
        "respostaSuporte"
    );


/* =========================================
   NOVO CHAMADO
========================================= */

const novoChamado =
    document.getElementById(
        "novoChamado"
    );


/* =========================================
   CONTROLE FIRESTORE
========================================= */

let chamadosCache = [];

let unsubscribeChamados = null;

let firestoreChamadosInicializado =
    false;

let autenticacaoChamadosIniciada =
    false;


/* =========================================
   CONTA LOCAL
========================================= */

function obterContaGestokChamados() {

    try {

        const dados =
            localStorage.getItem(
                "gestok_conta"
            );

        if (!dados) {

            return null;

        }

        const conta =
            JSON.parse(
                dados
            );

        if (
            !conta ||
            typeof conta !== "object"
        ) {

            return null;

        }

        return conta;

    } catch (erro) {

        console.error(
            "Erro ao carregar conta Gestok:",
            erro
        );

        return null;

    }

}


/* =========================================
   CONTEXTO CENTRAL DO GESTOK
========================================= */

function obterContextoGestokChamados() {

    try {

        if (
            typeof obterContextoGestok ===
            "function"
        ) {

            return (
                obterContextoGestok() ||
                null
            );

        }

    } catch (erro) {

        console.error(
            "Erro ao obter contexto Gestok:",
            erro
        );

    }

    return null;

}


/* =========================================
   OBTER LOJA PELO CONTEXTO
========================================= */

function obterLojaAtualChamados() {

    try {

        if (
            typeof obterLojaAtualGestok ===
            "function"
        ) {

            const lojaId =
                obterLojaAtualGestok();

            if (lojaId) {

                return lojaId;

            }

        }

    } catch (erro) {

        console.error(
            "Erro ao obter loja atual Gestok:",
            erro
        );

    }


    const contexto =
        obterContextoGestokChamados();


    if (
        contexto &&
        contexto.lojaId
    ) {

        return contexto.lojaId;

    }


    const conta =
        obterContaGestokChamados();


    if (
        conta &&
        conta.lojaId
    ) {

        return conta.lojaId;

    }


    return null;

}


/* =========================================
   USUÁRIO FIREBASE
========================================= */

function obterUsuarioFirebaseChamados() {

    try {

        if (
            typeof firebase ===
                "undefined" ||
            !firebase.auth
        ) {

            return null;

        }

        return firebase
            .auth()
            .currentUser || null;

    } catch (erro) {

        console.error(
            "Erro ao obter usuário Firebase:",
            erro
        );

        return null;

    }

}


/* =========================================
   ESPERAR AUTENTICAÇÃO + CONTEXTO
========================================= */

function aguardarUsuarioEContextoChamados() {

    return new Promise(
        function (resolve, reject) {

            let finalizado =
                false;

            let unsubscribeAuth =
                null;

            let tentativas =
                0;

            const maxTentativas =
                50;


            function finalizar(
                sucesso,
                valor
            ) {

                if (finalizado) {

                    return;

                }

                finalizado =
                    true;


                if (
                    typeof unsubscribeAuth ===
                    "function"
                ) {

                    unsubscribeAuth();

                }


                clearInterval(
                    intervalo
                );


                clearTimeout(
                    timeout
                );


                if (sucesso) {

                    resolve(
                        valor
                    );

                } else {

                    reject(
                        valor
                    );

                }

            }


            async function verificar() {

                if (finalizado) {

                    return;

                }


                const usuario =
                    obterUsuarioFirebaseChamados();


                const lojaId =
                    obterLojaAtualChamados();


                if (
                    usuario &&
                    lojaId
                ) {

                    finalizar(
                        true,
                        {
                            usuario,
                            lojaId
                        }
                    );

                    return;

                }


                tentativas++;


                if (
                    tentativas >=
                    maxTentativas
                ) {

                    finalizar(
                        false,
                        new Error(
                            "Não foi possível restaurar a autenticação e a loja do usuário."
                        )
                    );

                }

            }


            const intervalo =
                setInterval(
                    verificar,
                    200
                );


            const timeout =
                setTimeout(
                    function () {

                        finalizar(
                            false,
                            new Error(
                                "Tempo limite aguardando autenticação da conta."
                            )
                        );

                    },
                    12000
                );


            try {

                if (
                    typeof firebase !==
                        "undefined" &&
                    firebase.auth
                ) {

                    unsubscribeAuth =
                        firebase
                            .auth()
                            .onAuthStateChanged(
                                function () {

                                    verificar();

                                }
                            );

                }

            } catch (erro) {

                console.error(
                    "Erro ao observar autenticação:",
                    erro
                );

            }


            verificar();

        }
    );

}


/* =========================================
   NORMALIZAR STATUS
========================================= */

function normalizarStatus(
    status
) {

    return String(
        status || "Aberto"
    )
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /\s+/g,
            "-"
        );

}


/* =========================================
   TEXTO STATUS
========================================= */

function textoStatus(
    status
) {

    if (!status) {

        return "Aberto";

    }

    return status;

}


/* =========================================
   ESCAPAR HTML
========================================= */

function escaparHTML(
    valor
) {

    return String(
        valor ?? ""
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
   CONVERTER DATA FIRESTORE
========================================= */

function converterDataFirestore(
    valor
) {

    if (!valor) {

        return null;

    }


    if (
        typeof valor.toDate ===
        "function"
    ) {

        return valor.toDate();

    }


    if (
        typeof valor === "object" &&
        typeof valor.seconds === "number"
    ) {

        return new Date(
            valor.seconds * 1000
        );

    }


    if (
        valor instanceof Date
    ) {

        return valor;

    }


    const data =
        new Date(
            valor
        );


    if (
        Number.isNaN(
            data.getTime()
        )
    ) {

        return null;

    }


    return data;

}


/* =========================================
   FORMATAR DATA
========================================= */

function formatarData(
    valor
) {

    const data =
        converterDataFirestore(
            valor
        );


    if (!data) {

        return "—";

    }


    return data.toLocaleDateString(
        "pt-BR",
        {
            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );

}


/* =========================================
   OBTER DATA PARA ORDENAÇÃO
========================================= */

function obterTimestampData(
    chamado
) {

    const data =
        converterDataFirestore(
            chamado.criadoEm ||
            chamado.data ||
            chamado.atualizadoEm
        );


    if (!data) {

        return 0;

    }


    return data.getTime();

}


/* =========================================
   ATUALIZAR RESUMO
========================================= */

function atualizarResumo(
    chamados
) {

    const total =
        chamados.length;


    const abertos =
        chamados.filter(
            function (chamado) {

                const status =
                    normalizarStatus(
                        chamado.status
                    );


                return (
                    status ===
                        "aberto" ||

                    status ===
                        "em-atendimento" ||

                    status ===
                        "em-analise"
                );

            }
        ).length;


    const resolvidos =
        chamados.filter(
            function (chamado) {

                const status =
                    normalizarStatus(
                        chamado.status
                    );


                return (
                    status ===
                        "resolvido" ||

                    status ===
                        "fechado"
                );

            }
        ).length;


    if (totalChamados) {

        totalChamados.textContent =
            total;

    }


    if (chamadosAbertos) {

        chamadosAbertos.textContent =
            abertos;

    }


    if (chamadosResolvidos) {

        chamadosResolvidos.textContent =
            resolvidos;

    }

}


/* =========================================
   FILTRAR CHAMADOS
========================================= */

function filtrarChamados(
    chamados
) {

    const busca =
        (
            buscaChamado
                ? buscaChamado.value
                : ""
        )
            .trim()
            .toLowerCase();


    const statusSelecionado =
        filtroStatus
            ? filtroStatus.value
            : "";


    return chamados.filter(
        function (chamado) {

            const assunto =
                String(
                    chamado.assunto ||
                    ""
                ).toLowerCase();


            const numero =
                String(
                    chamado.numero ||
                    ""
                ).toLowerCase();


            const categoria =
                String(
                    chamado.categoria ||
                    ""
                ).toLowerCase();


            const mensagem =
                String(
                    chamado.mensagem ||
                    ""
                ).toLowerCase();


            const correspondeBusca =
                !busca ||

                assunto.includes(
                    busca
                ) ||

                numero.includes(
                    busca
                ) ||

                categoria.includes(
                    busca
                ) ||

                mensagem.includes(
                    busca
                );


            const statusChamado =
                normalizarStatus(
                    chamado.status
                );


            const correspondeStatus =
                !statusSelecionado ||

                statusChamado ===
                    normalizarStatus(
                        statusSelecionado
                    );


            return (
                correspondeBusca &&
                correspondeStatus
            );

        }
    );

}


/* =========================================
   RENDERIZAR CHAMADOS
========================================= */

function renderizarChamados() {

    if (!ticketsList) {

        return;

    }


    const chamados =
        [...chamadosCache];


    atualizarResumo(
        chamados
    );


    const filtrados =
        filtrarChamados(
            chamados
        );


    ticketsList.innerHTML =
        "";


    filtrados.sort(
        function (a, b) {

            return (
                obterTimestampData(b) -
                obterTimestampData(a)
            );

        }
    );


    if (
        filtrados.length === 0
    ) {

        if (emptyState) {

            emptyState.style.display =
                "flex";

        }

        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    filtrados.forEach(
        function (chamado) {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "ticket-item";


            item.dataset.id =
                chamado.id ||
                "";


            const status =
                chamado.status ||
                "Aberto";


            const statusClasse =
                normalizarStatus(
                    status
                );


            item.innerHTML = `

                <div class="ticket-main">

                    <div class="ticket-top">

                        <span class="ticket-number">

                            ${escaparHTML(
                                chamado.numero ||
                                "CHAMADO"
                            )}

                        </span>


                        <span class="ticket-subject">

                            ${escaparHTML(
                                chamado.assunto ||
                                "Sem assunto"
                            )}

                        </span>

                    </div>


                    <div class="ticket-message">

                        ${escaparHTML(
                            chamado.mensagem ||
                            "Nenhuma mensagem informada."
                        )}

                    </div>


                    <div class="ticket-meta">

                        <span>

                            ${escaparHTML(
                                chamado.categoria ||
                                "Geral"
                            )}

                        </span>


                        <span>

                            ${formatarData(
                                chamado.criadoEm ||
                                chamado.data
                            )}

                        </span>

                    </div>

                </div>


                <span
                    class="ticket-status ${statusClasse}"
                >

                    ${escaparHTML(
                        textoStatus(
                            status
                        )
                    )}

                </span>

            `;


            item.addEventListener(
                "click",
                function () {

                    abrirDetalhes(
                        chamado.id
                    );

                }
            );


            ticketsList.appendChild(
                item
            );

        }
    );

}


/* =========================================
   BUSCAR CHAMADO NO CACHE
========================================= */

function encontrarChamado(
    id
) {

    return chamadosCache.find(
        function (chamado) {

            return String(
                chamado.id
            ) === String(
                id
            );

        }
    ) || null;

}


/* =========================================
   ABRIR DETALHES
========================================= */

function abrirDetalhes(
    id
) {

    const chamado =
        encontrarChamado(
            id
        );


    if (!chamado) {

        return;

    }


    if (detalheAssunto) {

        detalheAssunto.textContent =
            chamado.assunto ||
            "Sem assunto";

    }


    if (detalheNumero) {

        detalheNumero.textContent =
            chamado.numero ||
            "—";

    }


    if (detalheStatus) {

        const status =
            chamado.status ||
            "Aberto";


        detalheStatus.textContent =
            textoStatus(
                status
            );


        detalheStatus.className =
            "ticket-status " +
            normalizarStatus(
                status
            );

    }


    if (detalheCategoria) {

        detalheCategoria.textContent =
            chamado.categoria ||
            "Geral";

    }


    if (detalheData) {

        detalheData.textContent =
            formatarData(
                chamado.criadoEm ||
                chamado.data
            );

    }


    if (detalheMensagem) {

        detalheMensagem.textContent =
            chamado.mensagem ||
            "Nenhuma mensagem informada.";

    }


    if (respostaSuporte) {

        const resposta =
            String(
                chamado.resposta ||
                chamado.respostaSuporte ||
                chamado.resposta_suporte ||
                chamado.ultimaResposta ||
                ""
            ).trim();


        if (resposta) {

            respostaSuporte.className =
                "support-response";


            respostaSuporte.innerHTML = `
                <p>
                    ${escaparHTML(
                        resposta
                    )}
                </p>
            `;

        } else {

            respostaSuporte.className =
                "no-response";


            respostaSuporte.innerHTML = `
                <p>
                    O suporte ainda não respondeu
                    este chamado.
                </p>
            `;

        }

    }


    if (modalDetalhes) {

        modalDetalhes.classList.add(
            "active"
        );

        document.body.style.overflow =
            "hidden";

    }

}


/* =========================================
   FECHAR MODAL
========================================= */

function fecharModal() {

    if (!modalDetalhes) {

        return;

    }


    modalDetalhes.classList.remove(
        "active"
    );


    document.body.style.overflow =
        "";

}


if (fecharDetalhes) {

    fecharDetalhes.addEventListener(
        "click",
        fecharModal
    );

}


if (fecharDetalhesBtn) {

    fecharDetalhesBtn.addEventListener(
        "click",
        fecharModal
    );

}


/* =========================================
   CLICAR FORA DO MODAL
========================================= */

if (modalDetalhes) {

    modalDetalhes.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                modalDetalhes
            ) {

                fecharModal();

            }

        }
    );

}


/* =========================================
   BUSCA
========================================= */

if (buscaChamado) {

    buscaChamado.addEventListener(
        "input",
        renderizarChamados
    );

}


/* =========================================
   FILTRO
========================================= */

if (filtroStatus) {

    filtroStatus.addEventListener(
        "change",
        renderizarChamados
    );

}


/* =========================================
   NOVO CHAMADO
========================================= */

if (novoChamado) {

    novoChamado.addEventListener(
        "click",
        function () {

            window.location.href =
                "../index.html#abrirChamado";

        }
    );

}


/* =========================================
   CARREGAR CHAMADOS DO FIRESTORE
========================================= */

async function iniciarListenerChamados() {

    if (
        firestoreChamadosInicializado
    ) {

        return;

    }


    if (
        typeof firebase ===
            "undefined" ||
        !firebase.auth ||
        !firebase.firestore
    ) {

        console.error(
            "Firebase Auth/Firestore não está disponível."
        );

        return;

    }


    try {

        /*
         * ESPERAR AUTENTICAÇÃO E CONTEXTO
         */

        const resultado =
            await aguardarUsuarioEContextoChamados();


        if (
            !resultado ||
            !resultado.usuario ||
            !resultado.lojaId
        ) {

            throw new Error(
                "Usuário ou loja não encontrados."
            );

        }


        const usuario =
            resultado.usuario;

        const lojaId =
            resultado.lojaId;


        console.log(
            "Meus chamados:",
            {
                uid:
                    usuario.uid,

                lojaId:
                    lojaId
            }
        );


        firestoreChamadosInicializado =
            true;


        /*
         * Caminho:
         *
         * lojas/{lojaId}/chamados
         */


        const referencia =
            firebase
                .firestore()
                .collection(
                    "lojas"
                )
                .doc(
                    lojaId
                )
                .collection(
                    "chamados"
                )
                .where(
                    "uid",
                    "==",
                    usuario.uid
                );


        /*
         * Listener em tempo real
         */

        unsubscribeChamados =
            referencia.onSnapshot(
                function (snapshot) {

                    chamadosCache =
                        snapshot.docs.map(
                            function (doc) {

                                return {

                                    id:
                                        doc.id,

                                    ...doc.data()

                                };

                            }
                        );


                    renderizarChamados();

                },

                function (erro) {

                    console.error(
                        "Erro ao acompanhar chamados:",
                        erro
                    );


                    chamadosCache =
                        [];

                    renderizarChamados();


                    if (
                        emptyState
                    ) {

                        emptyState.style.display =
                            "flex";

                    }

                }
            );


    } catch (erro) {

        console.error(
            "Erro ao iniciar chamados:",
            erro
        );


        firestoreChamadosInicializado =
            false;


        if (
            erro.message &&
            erro.message.includes(
                "Tempo limite"
            )
        ) {

            console.warn(
                "O Firebase demorou para restaurar a sessão."
            );

        }

    }

}


/* =========================================
   PARAR LISTENER
========================================= */

function pararListenerChamados() {

    if (
        typeof unsubscribeChamados ===
        "function"
    ) {

        unsubscribeChamados();

        unsubscribeChamados =
            null;

    }


    firestoreChamadosInicializado =
        false;

}


/* =========================================
   AUTENTICAÇÃO
========================================= */

function iniciarAutenticacaoChamados() {

    if (
        autenticacaoChamadosIniciada
    ) {

        return;

    }


    if (
        typeof firebase ===
            "undefined" ||
        !firebase.auth
    ) {

        console.error(
            "Firebase Authentication não está disponível."
        );

        return;

    }


    autenticacaoChamadosIniciada =
        true;


    firebase
        .auth()
        .onAuthStateChanged(
            async function (usuario) {

                if (!usuario) {

                    pararListenerChamados();

                    chamadosCache =
                        [];

                    renderizarChamados();

                    return;

                }


                /*
                 * Aguarda automaticamente
                 * usuário + contexto + loja.
                 */

                try {

                    await aguardarUsuarioEContextoChamados();

                    await iniciarListenerChamados();

                } catch (erro) {

                    console.warn(
                        "Aguardando contexto do Gestok:",
                        erro
                    );

                }

            }
        );

}


/* =========================================
   LIMPEZA AO SAIR
========================================= */

window.addEventListener(
    "beforeunload",
    function () {

        pararListenerChamados();

    }
);


/* =========================================
   INICIALIZAÇÃO
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        chamadosCache =
            [];

        renderizarChamados();

        iniciarAutenticacaoChamados();

    }
);


/* =========================================
   PÁGINA VOLTOU AO FOCO
========================================= */

window.addEventListener(
    "pageshow",
    function () {

        if (
            firebase &&
            firebase.auth &&
            firebase.auth().currentUser
        ) {

            iniciarListenerChamados();

        }

    }
);
/* =====================================================
   CONVERSA CONTÍNUA - CLIENTE
===================================================== */

let chamadoDetalhesAtual = null;
let unsubscribeMensagensCliente = null;

const mensagensChamadoCliente =
    document.getElementById("mensagensChamado");

const formResponderChamado =
    document.getElementById("formResponderChamado");

const mensagemRespostaCliente =
    document.getElementById("mensagemRespostaCliente");

const btnEnviarRespostaCliente =
    document.getElementById("btnEnviarRespostaCliente");

const statusRespostaCliente =
    document.getElementById("statusRespostaCliente");

function pararListenerMensagensCliente() {

    if (typeof unsubscribeMensagensCliente === "function") {
        unsubscribeMensagensCliente();
        unsubscribeMensagensCliente = null;
    }

}

function renderizarMensagensCliente(mensagens, chamado) {

    if (!mensagensChamadoCliente) {
        return;
    }

    const lista = [...mensagens];

    /*
     * Mantém compatibilidade com o primeiro texto do chamado,
     * que fica no documento principal e não necessariamente
     * existe ainda na subcoleção mensagens.
     */

    if (chamado?.mensagem) {

        const existeMensagemInicial =
            lista.some(function (mensagem) {

                return (
                    mensagem.autorTipo === "cliente" &&
                    String(mensagem.mensagem || "").trim() ===
                        String(chamado.mensagem || "").trim()
                );

            });

        if (!existeMensagemInicial) {

            lista.unshift({
                autorTipo: "cliente",
                autorNome: chamado.usuario || "Você",
                mensagem: chamado.mensagem,
                criadoEm: chamado.criadoEm || chamado.data
            });

        }

    }

    /*
     * Compatibilidade com respostas antigas salvas
     * diretamente no documento do chamado.
     */

    const respostaAntiga = String(
        chamado?.respostaSuporte ||
        chamado?.resposta_suporte ||
        chamado?.resposta ||
        ""
    ).trim();

    if (respostaAntiga) {

        const existeRespostaAntiga =
            lista.some(function (mensagem) {

                return (
                    mensagem.autorTipo === "admin" &&
                    String(mensagem.mensagem || "").trim() ===
                        respostaAntiga
                );

            });

        if (!existeRespostaAntiga) {

            lista.push({
                autorTipo: "admin",
                autorNome: chamado.respondidoPor || "Suporte Gestok",
                mensagem: respostaAntiga,
                criadoEm: chamado.ultimaResposta || chamado.atualizadoEm
            });

        }

    }

    if (!lista.length) {

        mensagensChamadoCliente.innerHTML = `
            <div class="conversation-empty">
                Nenhuma mensagem ainda.
            </div>
        `;

        return;

    }

    mensagensChamadoCliente.innerHTML = lista.map(function (mensagem) {

        const admin = mensagem.autorTipo === "admin";

        return `
            <div class="conversation-message ${admin ? "admin" : "cliente"}">
                <div class="conversation-message-top">
                    <strong>
                        ${escaparHTML(
                            mensagem.autorNome ||
                            (admin ? "Suporte Gestok" : "Você")
                        )}
                    </strong>
                    <span>
                        ${formatarData(mensagem.criadoEm)}
                    </span>
                </div>
                <p>
                    ${escaparHTML(mensagem.mensagem || "")}
                </p>
            </div>
        `;

    }).join("");

    mensagensChamadoCliente.scrollTop = mensagensChamadoCliente.scrollHeight;

}

function iniciarListenerMensagensCliente(chamado) {

    pararListenerMensagensCliente();

    if (!chamado?.lojaId || !chamado?.id) {
        return;
    }

    const referencia =
        firebase.firestore()
            .collection("lojas")
            .doc(chamado.lojaId)
            .collection("chamados")
            .doc(chamado.id)
            .collection("mensagens")
            .orderBy("criadoEm", "asc");

    unsubscribeMensagensCliente = referencia.onSnapshot(
        function (snapshot) {

            const mensagens = snapshot.docs.map(function (doc) {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            });

            renderizarMensagensCliente(mensagens, chamado);

        },
        function (erro) {

            console.error("Erro ao carregar conversa do chamado:", erro);

            if (mensagensChamadoCliente) {

                mensagensChamadoCliente.innerHTML = `
                    <div class="conversation-empty error">
                        Não foi possível carregar a conversa.
                    </div>
                `;

            }

        }
    );

}

/* Reimplementa a abertura do modal com a conversa */
function abrirDetalhes(id) {

    const chamado = encontrarChamado(id);

    if (!chamado) {
        return;
    }

    chamadoDetalhesAtual = chamado;

    if (detalheAssunto) {
        detalheAssunto.textContent = chamado.assunto || "Sem assunto";
    }

    if (detalheNumero) {
        detalheNumero.textContent = chamado.numero || "—";
    }

    if (detalheStatus) {

        const status = chamado.status || "Aberto";

        detalheStatus.textContent = textoStatus(status);
        detalheStatus.className =
            "ticket-status " + normalizarStatus(status);

    }

    if (detalheCategoria) {
        detalheCategoria.textContent = chamado.categoria || "Geral";
    }

    if (detalheData) {
        detalheData.textContent = formatarData(chamado.criadoEm || chamado.data);
    }

    if (detalheMensagem) {
        detalheMensagem.textContent =
            chamado.mensagem ||
            "Nenhuma mensagem informada.";
    }

    if (respostaSuporte) {
        respostaSuporte.hidden = true;
    }

    if (modalDetalhes) {
        modalDetalhes.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    iniciarListenerMensagensCliente(chamado);

}

function fecharModal() {

    pararListenerMensagensCliente();
    chamadoDetalhesAtual = null;

    if (!modalDetalhes) {
        return;
    }

    modalDetalhes.classList.remove("active");
    document.body.style.overflow = "";

}

if (formResponderChamado) {

    formResponderChamado.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const mensagem = mensagemRespostaCliente?.value.trim() || "";

            if (!mensagem || !chamadoDetalhesAtual) {
                return;
            }

            try {

                const resultado = await aguardarUsuarioEContextoChamados();
                const usuario = resultado.usuario;
                const lojaId = resultado.lojaId;
                const conta = obterContaGestokChamados() || {};
                const contexto = obterContextoGestokChamados() || {};

                if (btnEnviarRespostaCliente) {
                    btnEnviarRespostaCliente.disabled = true;
                    btnEnviarRespostaCliente.textContent = "Enviando...";
                }

                const agora = firebase.firestore.Timestamp.now();

                const chamadoRef =
                    firebase.firestore()
                        .collection("lojas")
                        .doc(lojaId)
                        .collection("chamados")
                        .doc(chamadoDetalhesAtual.id);

                await chamadoRef.collection("mensagens").add({
                    autorTipo: "cliente",
                    autorUid: usuario.uid,
                    autorNome:
                        contexto.usuario ||
                        conta.usuario ||
                        "Cliente",
                    autorEmail:
                        usuario.email ||
                        conta.email ||
                        "",
                    mensagem: mensagem,
                    criadoEm: agora
                });

                await chamadoRef.update({
                    status: "Aberto",
                    atualizadoEm: agora,
                    ultimaMensagem: mensagem,
                    ultimaMensagemAutor: "cliente",
                    ultimaInteracao: agora
                });

                chamadoDetalhesAtual.status = "Aberto";
                chamadoDetalhesAtual.atualizadoEm = agora;
                chamadoDetalhesAtual.ultimaMensagem = mensagem;
                chamadoDetalhesAtual.ultimaMensagemAutor = "cliente";
                chamadoDetalhesAtual.ultimaInteracao = agora;

                mensagemRespostaCliente.value = "";

                if (statusRespostaCliente) {
                    statusRespostaCliente.textContent = "Resposta enviada com sucesso.";
                    statusRespostaCliente.className = "reply-status success";
                }

                renderizarChamados();

            } catch (erro) {

                console.error("Erro ao responder chamado:", erro);

                if (statusRespostaCliente) {
                    statusRespostaCliente.textContent = "Não foi possível enviar a resposta.";
                    statusRespostaCliente.className = "reply-status error";
                }

            } finally {

                if (btnEnviarRespostaCliente) {
                    btnEnviarRespostaCliente.disabled = false;
                    btnEnviarRespostaCliente.textContent = "Enviar resposta →";
                }

            }

        }
    );

}

(function aplicarEstilosConversaCliente() {

    if (document.getElementById("gestok-conversa-cliente-style")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "gestok-conversa-cliente-style";

    style.textContent = `
        .ticket-conversation {
            max-height: 360px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 4px;
        }

        .conversation-message {
            max-width: 86%;
            padding: 11px 13px;
            border-radius: 11px;
            border: 1px solid #e7ebf0;
            background: #f8fafc;
        }

        .conversation-message.cliente {
            align-self: flex-end;
            background: #edf4ff;
            border-color: #dceaff;
        }

        .conversation-message.admin {
            align-self: flex-start;
            background: #f7f3ff;
            border-color: #e8ddfb;
        }

        .conversation-message-top {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 5px;
        }

        .conversation-message-top strong {
            font-size: 10px;
            color: #1f2937;
        }

        .conversation-message-top span {
            font-size: 8px;
            color: #9ba4b1;
            white-space: nowrap;
        }

        .conversation-message p {
            margin: 0;
            font-size: 10px;
            line-height: 1.5;
            color: #5f6977;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .conversation-empty {
            padding: 25px;
            text-align: center;
            color: #9ba4b1;
            font-size: 10px;
        }

        .conversation-empty.error {
            color: #e44b52;
        }

        .ticket-reply-form {
            display: grid;
            gap: 9px;
            margin-top: 10px;
        }

        .ticket-reply-form textarea {
            width: 100%;
            min-height: 85px;
            padding: 11px;
            border: 1px solid #dfe5ec;
            border-radius: 9px;
            resize: vertical;
            outline: none;
            font-family: inherit;
            font-size: 10px;
        }

        .ticket-reply-form textarea:focus {
            border-color: #3478e5;
            box-shadow: 0 0 0 3px rgba(52,120,229,.10);
        }

        .reply-status {
            min-height: 15px;
            font-size: 9px;
        }

        .reply-status.success {
            color: #159957;
        }

        .reply-status.error {
            color: #e44b52;
        }
    `;

    document.head.appendChild(style);

})();
