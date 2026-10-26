/* =========================================
   GESTOK
   ÁREA DE SUPORTE
========================================= */


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

const buscaSuporte =
    document.getElementById("buscaSuporte");

const faqItems =
    document.querySelectorAll(".faq-item");

const supportCards =
    document.querySelectorAll(".support-card");

const btnAbrirChamado =
    document.getElementById("btnAbrirChamado");

const modalChamado =
    document.getElementById("modalChamado");

const fecharChamado =
    document.getElementById("fecharChamado");

const cancelarChamado =
    document.getElementById("cancelarChamado");

const formChamado =
    document.getElementById("formChamado");


/* =========================================
   ESTADO DA AUTENTICAÇÃO
========================================= */

let usuarioFirebaseSuporte =
    null;

let autenticacaoSuportePronta =
    false;

let promessaAutenticacaoSuporte =
    null;


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

            fecharModal();

        }

    }
);


/* =========================================
   MODAL
========================================= */

function abrirModal() {

    if (!modalChamado) {
        return;
    }

    modalChamado.classList.add(
        "active"
    );

    document.body.style.overflow =
        "hidden";

}


function fecharModal() {

    if (!modalChamado) {
        return;
    }

    modalChamado.classList.remove(
        "active"
    );

    document.body.style.overflow =
        "";

}


if (btnAbrirChamado) {

    btnAbrirChamado.addEventListener(
        "click",
        abrirModal
    );

}


if (fecharChamado) {

    fecharChamado.addEventListener(
        "click",
        fecharModal
    );

}


if (cancelarChamado) {

    cancelarChamado.addEventListener(
        "click",
        fecharModal
    );

}


/* =========================================
   FECHAR CLICANDO FORA
========================================= */

if (modalChamado) {

    modalChamado.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                modalChamado
            ) {

                fecharModal();

            }

        }
    );

}


/* =========================================
   FAQ
========================================= */

faqItems.forEach(
    function (item) {

        item.addEventListener(
            "click",
            function () {

                const answer =
                    this.nextElementSibling;

                const jaAberto =
                    this.classList.contains(
                        "open"
                    );


                faqItems.forEach(
                    function (outroItem) {

                        outroItem.classList.remove(
                            "open"
                        );

                        const outraResposta =
                            outroItem.nextElementSibling;

                        if (
                            outraResposta &&
                            outraResposta.classList.contains(
                                "faq-answer"
                            )
                        ) {

                            outraResposta.classList.remove(
                                "open"
                            );

                        }

                    }
                );


                if (
                    !jaAberto &&
                    answer
                ) {

                    this.classList.add(
                        "open"
                    );

                    answer.classList.add(
                        "open"
                    );

                }

            }
        );

    }
);


/* =========================================
   BUSCA FAQ
========================================= */

function pesquisarFAQ() {

    if (!buscaSuporte) {
        return;
    }

    const termo =
        buscaSuporte.value
            .trim()
            .toLowerCase();


    faqItems.forEach(
        function (item) {

            const pergunta =
                item.textContent
                    .trim()
                    .toLowerCase();

            const answer =
                item.nextElementSibling;


            if (
                !termo ||
                pergunta.includes(termo)
            ) {

                item.style.display =
                    "flex";

                if (answer) {
                    answer.style.display =
                        "";
                }

            } else {

                item.style.display =
                    "none";

                if (answer) {
                    answer.style.display =
                        "none";
                }

            }

        }
    );

}


if (buscaSuporte) {

    buscaSuporte.addEventListener(
        "input",
        pesquisarFAQ
    );

}


/* =========================================
   CARDS DE SUPORTE
========================================= */

supportCards.forEach(
    function (card) {

        card.addEventListener(
            "click",
            function () {

                const destino =
                    this.dataset.open;


                if (
                    destino ===
                    "faq"
                ) {

                    const faq =
                        document.getElementById(
                            "faq"
                        );

                    if (faq) {

                        faq.scrollIntoView({
                            behavior:
                                "smooth",
                            block:
                                "start"
                        });

                    }

                }


                if (
                    destino ===
                    "chamado"
                ) {

                    abrirModal();

                }

            }
        );

    }
);


/* =========================================
   CONTA DO USUÁRIO
========================================= */

function obterContaGestokSuporte() {

    try {

        const dados =
            localStorage.getItem(
                "gestok_conta"
            );


        if (!dados) {
            return null;
        }


        const conta =
            JSON.parse(dados);


        if (
            !conta ||
            typeof conta !== "object"
        ) {

            return null;

        }


        return conta;

    } catch (erro) {

        console.error(
            "Erro ao carregar conta do Gestok:",
            erro
        );

        return null;

    }

}


/* =========================================
   CONTEXTO CENTRAL DO GESTOK
========================================= */

function obterContextoSuporte() {

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
            "Erro ao obter contexto do Gestok:",
            erro
        );

    }

    return null;

}


/* =========================================
   OBTER LOJA ATUAL
========================================= */

function obterLojaAtualSuporte() {

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
            "Erro ao obter loja atual:",
            erro
        );

    }


    const contexto =
        obterContextoSuporte();


    if (
        contexto &&
        contexto.lojaId
    ) {

        return contexto.lojaId;

    }


    const conta =
        obterContaGestokSuporte();


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

function obterUsuarioFirebaseSuporte() {

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
   AGUARDAR FIREBASE RESTAURAR A SESSÃO
========================================= */

function aguardarAutenticacaoFirebaseSuporte() {

    if (
        autenticacaoSuportePronta &&
        usuarioFirebaseSuporte
    ) {

        return Promise.resolve(
            usuarioFirebaseSuporte
        );

    }


    if (promessaAutenticacaoSuporte) {

        return promessaAutenticacaoSuporte;

    }


    promessaAutenticacaoSuporte =
        new Promise(
            function (resolve, reject) {

                try {

                    if (
                        typeof firebase ===
                            "undefined" ||
                        !firebase.auth
                    ) {

                        reject(
                            new Error(
                                "Firebase Authentication não está disponível."
                            )
                        );

                        return;

                    }


                    const auth =
                        firebase.auth();


                    const usuarioAtual =
                        auth.currentUser;


                    if (usuarioAtual) {

                        usuarioFirebaseSuporte =
                            usuarioAtual;

                        autenticacaoSuportePronta =
                            true;

                        resolve(
                            usuarioAtual
                        );

                        return;

                    }


                    let finalizado =
                        false;


                    const encerrar =
                        function () {

                            if (
                                !finalizado
                            ) {

                                finalizado =
                                    true;

                                unsubscribe();

                            }

                        };


                    const unsubscribe =
                        auth.onAuthStateChanged(
                            function (usuario) {

                                if (
                                    finalizado
                                ) {

                                    return;

                                }


                                if (usuario) {

                                    usuarioFirebaseSuporte =
                                        usuario;

                                    autenticacaoSuportePronta =
                                        true;

                                    encerrar();

                                    resolve(
                                        usuario
                                    );

                                    return;

                                }


                                encerrar();

                                reject(
                                    new Error(
                                        "Usuário não autenticado no Firebase."
                                    )
                                );

                            },
                            function (erro) {

                                encerrar();

                                reject(
                                    erro
                                );

                            }
                        );


                    setTimeout(
                        function () {

                            if (
                                finalizado
                            ) {

                                return;

                            }


                            encerrar();


                            const usuarioDepois =
                                auth.currentUser;


                            if (
                                usuarioDepois
                            ) {

                                usuarioFirebaseSuporte =
                                    usuarioDepois;

                                autenticacaoSuportePronta =
                                    true;

                                resolve(
                                    usuarioDepois
                                );

                                return;

                            }


                            reject(
                                new Error(
                                    "Tempo limite aguardando autenticação do Firebase."
                                )
                            );

                        },
                        10000
                    );

                } catch (erro) {

                    reject(
                        erro
                    );

                }

            }
        );


    return promessaAutenticacaoSuporte;

}


/* =========================================
   ESCAPAR HTML
========================================= */

function escaparHtmlSuporte(
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
   GERAR ID
========================================= */

function gerarIdChamado() {

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2, 8)
    );

}


/* =========================================
   GERAR NÚMERO DO CHAMADO
========================================= */

function gerarNumeroChamado() {

    const agora =
        new Date();

    const ano =
        agora.getFullYear();

    const mes =
        String(
            agora.getMonth() + 1
        ).padStart(2, "0");

    const dia =
        String(
            agora.getDate()
        ).padStart(2, "0");

    const sequencia =
        String(
            Date.now()
        ).slice(-6);

    return (
        `${ano}${mes}${dia}-${sequencia}`
    );

}


/* =========================================
   DATA ATUAL
========================================= */

function obterDataAtual() {

    return new Date();

}


/* =========================================
   ENVIAR CHAMADO
========================================= */

if (formChamado) {

    formChamado.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const assunto =
                document
                    .getElementById(
                        "assunto"
                    )
                    ?.value
                    .trim();


            const categoria =
                document
                    .getElementById(
                        "categoria"
                    )
                    ?.value
                    .trim();


            const mensagem =
                document
                    .getElementById(
                        "mensagem"
                    )
                    ?.value
                    .trim();


            if (
                !assunto ||
                !categoria ||
                !mensagem
            ) {

                mostrarMensagem(
                    "Preencha todos os campos do chamado."
                );

                return;

            }


            try {

                /* =================================
                   FIREBASE DISPONÍVEL?
                ================================= */

                if (
                    typeof firebase ===
                        "undefined" ||
                    !firebase.firestore ||
                    !firebase.auth
                ) {

                    throw new Error(
                        "Firebase não está disponível."
                    );

                }


                /* =================================
                   AGUARDAR AUTENTICAÇÃO
                ================================= */

                const usuarioFirebase =
                    await aguardarAutenticacaoFirebaseSuporte();


                if (!usuarioFirebase) {

                    throw new Error(
                        "Usuário não autenticado no Firebase."
                    );

                }


                /* =================================
                   CONTA
                ================================= */

                const conta =
                    obterContaGestokSuporte();


                /* =================================
                   CONTEXTO
                ================================= */

                const contexto =
                    obterContextoSuporte();


                /* =================================
                   LOJA
                ================================= */

                const lojaId =
                    obterLojaAtualSuporte();


                if (!lojaId) {

                    throw new Error(
                        "Loja do usuário não encontrada."
                    );

                }


                console.log(
                    "Usuário autenticado:",
                    usuarioFirebase.uid
                );


                console.log(
                    "Loja do chamado:",
                    lojaId
                );


                /* =================================
                   DADOS DO USUÁRIO
                ================================= */

                const usuarioNome =
                    contexto?.usuario ||
                    conta?.usuario ||
                    "";

                const emailUsuario =
                    contexto?.email ||
                    conta?.email ||
                    usuarioFirebase.email ||
                    "";

                const codigoLoja =
                    contexto?.codigoLoja ||
                    conta?.codigoLoja ||
                    "";


                /* =================================
                   DADOS DO CHAMADO
                ================================= */

                const numero =
                    gerarNumeroChamado();


                const agora =
                    firebase.firestore.Timestamp.fromDate(
                        obterDataAtual()
                    );


                const novoChamado = {

                    numero:
                        numero,

                    assunto:
                        assunto,

                    categoria:
                        categoria,

                    mensagem:
                        mensagem,

                    status:
                        "Aberto",

                    uid:
                        usuarioFirebase.uid,

                    usuario:
                        usuarioNome,

                    email:
                        emailUsuario,

                    lojaId:
                        lojaId,

                    codigoLoja:
                        codigoLoja,

                    criadoEm:
                        agora,

                    atualizadoEm:
                        agora,

                    ultimaResposta:
                        null,

                    respondidoPor:
                        null

                };


                /* =================================
                   REFERÊNCIA
                ================================= */

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
                        .doc(
                            gerarIdChamado()
                        );


                /* =================================
                   SALVAR
                ================================= */

                await referencia.set(
                    novoChamado
                );


                /* =================================
                   LIMPAR FORMULÁRIO
                ================================= */

                formChamado.reset();

                fecharModal();


                /* =================================
                   SUCESSO
                ================================= */

                mostrarMensagem(
                    `Chamado #${numero} enviado com sucesso!`
                );


                console.log(
                    "Chamado criado no Firestore:",
                    novoChamado
                );

            } catch (erro) {

                console.error(
                    "Erro ao enviar chamado:",
                    erro
                );


                let mensagem =
                    "Não foi possível enviar o chamado. Tente novamente.";


                if (
                    erro.message ===
                    "Usuário não autenticado no Firebase."
                ) {

                    mensagem =
                        "Sua sessão expirou. Recarregue a página e entre novamente.";

                }


                if (
                    erro.message ===
                    "Tempo limite aguardando autenticação do Firebase."
                ) {

                    mensagem =
                        "O Firebase demorou para restaurar sua sessão. Recarregue a página.";

                }


                if (
                    erro.message ===
                    "Loja do usuário não encontrada."
                ) {

                    mensagem =
                        "Sua loja não foi identificada. Recarregue a página e tente novamente.";

                }


                mostrarMensagem(
                    mensagem
                );

            }

        }
    );

}


/* =========================================
   MONITORAR AUTENTICAÇÃO
========================================= */

function iniciarMonitoramentoAutenticacaoSuporte() {

    try {

        if (
            typeof firebase ===
                "undefined" ||
            !firebase.auth
        ) {

            return;

        }


        firebase
            .auth()
            .onAuthStateChanged(
                function (usuario) {

                    usuarioFirebaseSuporte =
                        usuario || null;

                    autenticacaoSuportePronta =
                        !!usuario;

                    promessaAutenticacaoSuporte =
                        usuario
                            ? Promise.resolve(
                                usuario
                            )
                            : null;


                    if (usuario) {

                        console.log(
                            "Gestok - Usuário Firebase autenticado:",
                            usuario.uid
                        );

                    } else {

                        console.log(
                            "Gestok - Nenhum usuário Firebase autenticado."
                        );

                    }

                }
            );

    } catch (erro) {

        console.error(
            "Erro ao monitorar autenticação:",
            erro
        );

    }

}


/* =========================================
   TOAST
========================================= */

function mostrarMensagem(
    mensagem
) {

    const existente =
        document.querySelector(
            ".gestok-toast"
        );


    if (existente) {
        existente.remove();
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        "gestok-toast";


    toast.innerHTML = `

        <div class="toast-icon">
            ✓
        </div>

        <div class="toast-content">

            <strong>
                Gestok
            </strong>

            <span>
                ${escaparHtmlSuporte(mensagem)}
            </span>

        </div>

    `;


    Object.assign(
        toast.style,
        {

            position:
                "fixed",

            right:
                "22px",

            bottom:
                "22px",

            zIndex:
                "20000",

            display:
                "flex",

            alignItems:
                "center",

            gap:
                "11px",

            width:
                "min(380px, calc(100% - 32px))",

            padding:
                "13px 15px",

            background:
                "#ffffff",

            border:
                "1px solid #e5eaf1",

            borderRadius:
                "12px",

            boxShadow:
                "0 15px 40px rgba(15, 23, 42, .14)",

            animation:
                "gestokToastIn .25s ease"

        }
    );


    const estilo =
        document.createElement(
            "style"
        );


    estilo.textContent = `

        @keyframes gestokToastIn {

            from {
                opacity: 0;
                transform: translateY(10px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }

        }

        .gestok-toast .toast-icon {

            width: 30px;
            height: 30px;

            border-radius: 8px;

            background: #ecfdf3;

            color: #16a34a;

            display: flex;

            align-items: center;

            justify-content: center;

            font-weight: 700;

            flex-shrink: 0;

        }

        .gestok-toast .toast-content strong {

            display: block;

            color: #1e293b;

            font-size: 11px;

            margin-bottom: 2px;

        }

        .gestok-toast .toast-content span {

            display: block;

            color: #64748b;

            font-size: 10px;

            line-height: 1.4;

        }

    `;


    document.head.appendChild(
        estilo
    );


    document.body.appendChild(
        toast
    );


    setTimeout(
        function () {

            toast.style.opacity =
                "0";

            toast.style.transform =
                "translateY(10px)";

            toast.style.transition =
                "all .25s ease";


            setTimeout(
                function () {

                    toast.remove();

                    estilo.remove();

                },
                250
            );

        },
        3500
    );

}


/* =========================================
   INICIALIZAÇÃO
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        iniciarMonitoramentoAutenticacaoSuporte();

        console.log(
            "Gestok - Área de suporte carregada."
        );

    }
);