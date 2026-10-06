/* =========================================
   GESTOK - PERFIL
========================================= */


/* =========================================
   SIDEBAR
========================================= */

const sidebar =
    document.getElementById("sidebar");

const overlay =
    document.getElementById("overlay");

const menuButton =
    document.getElementById("menuButton");

const closeSidebar =
    document.getElementById("closeSidebar");


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


document.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Escape") {

            fecharMenu();

        }

    }
);


/* =========================================
   ABAS
========================================= */

const tabs =
    document.querySelectorAll(".tab");

const tabContents =
    document.querySelectorAll(
        ".tab-content"
    );


tabs.forEach(function (tab) {

    tab.addEventListener(
        "click",
        function () {

            const target =
                tab.dataset.tab;


            tabs.forEach(
                function (item) {

                    item.classList.remove(
                        "active"
                    );

                }
            );


            tabContents.forEach(
                function (content) {

                    content.classList.remove(
                        "active"
                    );

                }
            );


            tab.classList.add(
                "active"
            );


            const targetContent =
                document.getElementById(
                    target
                );


            if (targetContent) {

                targetContent.classList.add(
                    "active"
                );

            }

        }
    );

});


/* =========================================
   ELEMENTOS DO PERFIL
========================================= */

const nameInput =
    document.getElementById(
        "nameInput"
    );

const emailInput =
    document.getElementById(
        "emailInput"
    );

const headerName =
    document.getElementById(
        "nomeUsuarioMenu"
    );

const headerAvatar =
    document.getElementById(
        "headerAvatar"
    );

const saveProfile =
    document.getElementById(
        "saveProfile"
    );

const savedMessage =
    document.getElementById(
        "savedMessage"
    );


/* =========================================
   ELEMENTOS DA ASSINATURA
========================================= */

const subscriptionStatus =
    document.getElementById(
        "subscriptionStatus"
    );

const startDate =
    document.getElementById(
        "startDate"
    );

const endDate =
    document.getElementById(
        "endDate"
    );

const daysRemaining =
    document.getElementById(
        "daysRemaining"
    );

const subscribeButton =
    document.getElementById(
        "subscribeButton"
    );

const planBadge =
    document.getElementById(
        "planBadge"
    );


/* =========================================
   OBTER CONTA
========================================= */

function obterContaGestokPerfil() {

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
            "Erro ao carregar conta:",
            erro
        );

        return null;

    }

}


/* =========================================
   FORMATAR DATA
========================================= */

function formatarDataPerfil(
    data
) {

    if (!data) {

        return "—";

    }


    const dataObj =
        new Date(data);


    if (
        Number.isNaN(
            dataObj.getTime()
        )
    ) {

        return "—";

    }


    return dataObj.toLocaleDateString(
        "pt-BR"
    );

}


/* =========================================
   DIAS RESTANTES
========================================= */

function calcularDiasRestantesPerfil(
    vencimento
) {

    if (!vencimento) {

        return 0;

    }


    const dataFinal =
        new Date(
            vencimento
        );


    if (
        Number.isNaN(
            dataFinal.getTime()
        )
    ) {

        return 0;

    }


    const agora =
        new Date();


    const diferenca =
        dataFinal.getTime() -
        agora.getTime();


    return Math.max(
        0,
        Math.ceil(
            diferenca /
            86400000
        )
    );

}


/* =========================================
   ATUALIZAR DADOS DO PERFIL
========================================= */

function atualizarDadosPerfil() {

    const conta =
        obterContaGestokPerfil();


    if (!conta) {

        console.warn(
            "Conta Gestok não encontrada."
        );

        return;

    }


    /* =====================================
       CÓDIGO DA LOJA
    ===================================== */

    const codigoLoja =
        document.getElementById(
            "codigoLoja"
        );


    if (codigoLoja) {

        codigoLoja.textContent =
            conta.codigoLoja ||
            "----";

    }


    /* =====================================
       NOME DA EMPRESA
    ===================================== */

    const nome =
        String(
            conta.nome || ""
        ).trim();


    /* =====================================
       NOME DO USUÁRIO
    ===================================== */

    const usuario =
        String(
            conta.usuario || ""
        ).trim();


    /* =====================================
       E-MAIL
    ===================================== */

    const email =
        String(
            conta.email || ""
        ).trim();


    /* =====================================
       CAMPO NOME
       CONTINUA SENDO EMPRESA
    ===================================== */

    if (
        nameInput &&
        nome
    ) {

        nameInput.value =
            nome;

    }


    /* =====================================
       CAMPO E-MAIL
    ===================================== */

    if (
        emailInput &&
        email
    ) {

        emailInput.value =
            email;

    }


    /* =====================================
       NOME NO HEADER
       MOSTRA O USUÁRIO
    ===================================== */

    if (headerName) {

        headerName.textContent =
            usuario ||
            "Usuário";

    }


    /* =====================================
       AVATAR
       PRIMEIRA LETRA DO USUÁRIO
    ===================================== */

    if (headerAvatar) {

        const nomeAvatar =
            usuario ||
            "U";

        headerAvatar.textContent =
            nomeAvatar
                .charAt(0)
                .toUpperCase();

    }

}


/* =========================================
   ATUALIZAR ASSINATURA
========================================= */

function atualizarAssinatura() {

    const conta =
        obterContaGestokPerfil();


    if (!conta) {

        return;

    }


    const assinatura =
        conta.assinatura;


    /* =====================================
       SEM ASSINATURA
    ===================================== */

    if (!assinatura) {

        if (subscriptionStatus) {

            subscriptionStatus.textContent =
                "Inativo";

            subscriptionStatus.classList.remove(
                "active"
            );

        }


        if (startDate) {

            startDate.textContent =
                "—";

        }


        if (endDate) {

            endDate.textContent =
                "—";

        }


        if (daysRemaining) {

            daysRemaining.textContent =
                "—";

        }


        if (subscribeButton) {

            subscribeButton.textContent =
                "Assinar por R$ 30,00";

        }


        if (planBadge) {

            planBadge.textContent =
                "Plano Mensal";

        }


        return;

    }


    /* =====================================
       DADOS DA ASSINATURA
    ===================================== */

    const plano =
        assinatura.plano ||
        "Gestok";


    const valor =
        Number(
            assinatura.valor || 30
        );


    const vencimento =
        assinatura.vencimento;


    const inicio =
        assinatura.inicio;


    const status =
        assinatura.status;


    const pagamento =
        assinatura.pagamento;


    const tipo =
        assinatura.tipo || "";


    const dias =
        calcularDiasRestantesPerfil(
            vencimento
        );


    /* =====================================
       PLANO NO TOPO
    ===================================== */

    if (planBadge) {

        if (
            status === "teste_gratis" ||
            tipo === "teste_gratis"
        ) {

            planBadge.textContent =
                "Teste grátis";

        } else {

            planBadge.textContent =
                plano;

        }

    }


    /* =====================================
       PREÇO
    ===================================== */

    const priceStrong =
        document.querySelector(
            ".subscription-card .price strong"
        );


    if (priceStrong) {

        priceStrong.textContent =
            "R$ " +
            valor
                .toFixed(2)
                .replace(".", ",");

    }


    /* =====================================
       TESTE GRÁTIS ATIVO
    ===================================== */

    const testeGratisAtivo =
        (
            (
                status ===
                "teste_gratis"
            ) ||
            (
                tipo ===
                "teste_gratis"
            )
        ) &&
        pagamento ===
            "gratis" &&
        dias > 0;


    if (testeGratisAtivo) {

        if (subscriptionStatus) {

            subscriptionStatus.textContent =
                "Período grátis";

            subscriptionStatus.classList.add(
                "active"
            );

        }


        if (startDate) {

            startDate.textContent =
                formatarDataPerfil(
                    inicio
                );

        }


        if (endDate) {

            endDate.textContent =
                formatarDataPerfil(
                    vencimento
                );

        }


        if (daysRemaining) {

            daysRemaining.textContent =
                dias +
                (
                    dias === 1
                        ? " dia"
                        : " dias"
                );

        }


        if (subscribeButton) {

            subscribeButton.textContent =
                "Assinar por R$ " +
                valor
                    .toFixed(2)
                    .replace(".", ",");

        }


        return;

    }


    /* =====================================
       ASSINATURA PAGA ATIVA
    ===================================== */

    if (
        status === "ativa" &&
        pagamento === "aprovado" &&
        dias > 0
    ) {

        if (subscriptionStatus) {

            subscriptionStatus.textContent =
                "Ativo";

            subscriptionStatus.classList.add(
                "active"
            );

        }


        if (startDate) {

            startDate.textContent =
                formatarDataPerfil(
                    inicio
                );

        }


        if (endDate) {

            endDate.textContent =
                formatarDataPerfil(
                    vencimento
                );

        }


        if (daysRemaining) {

            daysRemaining.textContent =
                dias +
                (
                    dias === 1
                        ? " dia"
                        : " dias"
                );

        }


        if (subscribeButton) {

            subscribeButton.textContent =
                "Renovar por R$ " +
                valor
                    .toFixed(2)
                    .replace(".", ",");

        }


        return;

    }


    /* =====================================
       TESTE GRÁTIS EXPIRADO
    ===================================== */

    if (
        (
            status ===
            "teste_gratis"
        ) ||
        (
            tipo ===
            "teste_gratis"
        )
    ) {

        if (subscriptionStatus) {

            subscriptionStatus.textContent =
                "Teste grátis expirado";

            subscriptionStatus.classList.remove(
                "active"
            );

        }


        if (startDate) {

            startDate.textContent =
                formatarDataPerfil(
                    inicio
                );

        }


        if (endDate) {

            endDate.textContent =
                formatarDataPerfil(
                    vencimento
                );

        }


        if (daysRemaining) {

            daysRemaining.textContent =
                "0 dias";

        }


        if (subscribeButton) {

            subscribeButton.textContent =
                "Assinar por R$ " +
                valor
                    .toFixed(2)
                    .replace(".", ",");

        }


        return;

    }


    /* =====================================
       ASSINATURA PAGA EXPIRADA
    ===================================== */

    if (
        status === "ativa" &&
        pagamento === "aprovado" &&
        dias <= 0
    ) {

        if (subscriptionStatus) {

            subscriptionStatus.textContent =
                "Expirada";

            subscriptionStatus.classList.remove(
                "active"
            );

        }


        if (startDate) {

            startDate.textContent =
                formatarDataPerfil(
                    inicio
                );

        }


        if (endDate) {

            endDate.textContent =
                formatarDataPerfil(
                    vencimento
                );

        }


        if (daysRemaining) {

            daysRemaining.textContent =
                "0 dias";

        }


        if (subscribeButton) {

            subscribeButton.textContent =
                "Renovar por R$ " +
                valor
                    .toFixed(2)
                    .replace(".", ",");

        }


        return;

    }


    /* =====================================
       PAGAMENTO PENDENTE
    ===================================== */

    if (
        pagamento !== "aprovado" &&
        pagamento !== "gratis"
    ) {

        if (subscriptionStatus) {

            subscriptionStatus.textContent =
                "Pagamento pendente";

            subscriptionStatus.classList.remove(
                "active"
            );

        }


        if (startDate) {

            startDate.textContent =
                "—";

        }


        if (endDate) {

            endDate.textContent =
                "—";

        }


        if (daysRemaining) {

            daysRemaining.textContent =
                "—";

        }


        if (subscribeButton) {

            subscribeButton.textContent =
                "Assinar por R$ " +
                valor
                    .toFixed(2)
                    .replace(".", ",");

        }


        return;

    }

}


/* =========================================
   SALVAR ALTERAÇÕES DO PERFIL
========================================= */

if (saveProfile) {

    saveProfile.addEventListener(
        "click",
        function () {

            const nome =
                nameInput
                    ? nameInput.value.trim()
                    : "";


            const email =
                emailInput
                    ? emailInput.value.trim()
                    : "";


            if (!nome) {

                alert(
                    "Digite seu nome."
                );

                return;

            }


            const conta =
                obterContaGestokPerfil();


            if (!conta) {

                alert(
                    "Conta do usuário não encontrada."
                );

                return;

            }


            /* =================================
               NOME CONTINUA SENDO A EMPRESA
            ================================= */

            conta.nome =
                nome;


            conta.email =
                email.toLowerCase();


            localStorage.setItem(
                "gestok_conta",
                JSON.stringify(conta)
            );


            /* Compatibilidade */

            localStorage.setItem(
                "gestok_nome",
                nome
            );


            localStorage.setItem(
                "gestok_email",
                email
            );


            /* =================================
               ATUALIZAR HEADER COM USUÁRIO
            ================================= */

            const usuario =
                String(
                    conta.usuario || ""
                ).trim();


            if (headerName) {

                headerName.textContent =
                    usuario ||
                    "Usuário";

            }


            if (headerAvatar) {

                const nomeAvatar =
                    usuario ||
                    "U";

                headerAvatar.textContent =
                    nomeAvatar
                        .charAt(0)
                        .toUpperCase();

            }


            if (savedMessage) {

                savedMessage.textContent =
                    "Dados salvos!";


                setTimeout(
                    function () {

                        savedMessage.textContent =
                            "";

                    },
                    2500
                );

            }

        }
    );

}


/* =========================================
   ALTERAR SENHA
========================================= */

const changePassword =
    document.getElementById(
        "changePassword"
    );

const passwordInput =
    document.getElementById(
        "passwordInput"
    );


if (changePassword) {

    changePassword.addEventListener(
        "click",
        function () {

            const password =
                passwordInput
                    ? passwordInput.value.trim()
                    : "";


            if (!password) {

                alert(
                    "Digite uma nova senha."
                );

                return;

            }


            if (
                password.length < 6
            ) {

                alert(
                    "A senha precisa ter pelo menos 6 caracteres."
                );

                return;

            }


            const conta =
                obterContaGestokPerfil();


            if (!conta) {

                alert(
                    "Conta do usuário não encontrada."
                );

                return;

            }


            conta.senha =
                password;


            localStorage.setItem(
                "gestok_conta",
                JSON.stringify(conta)
            );


            /* Compatibilidade */

            localStorage.setItem(
                "gestok_senha",
                password
            );


            if (passwordInput) {

                passwordInput.value =
                    "";

            }


            alert(
                "Senha alterada com sucesso!"
            );

        }
    );

}


/* =========================================
   BOTÃO DE ASSINATURA
========================================= */

if (subscribeButton) {

    subscribeButton.addEventListener(
        "click",
        function () {

            window.location.href =
                "../pagamento/index.html";

        }
    );

}


/* =========================================
   INICIALIZAÇÃO
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        atualizarDadosPerfil();

        atualizarAssinatura();

    }
);


/* =========================================
   ATUALIZAR SE A CONTA MUDAR
========================================= */

window.addEventListener(
    "storage",
    function (evento) {

        if (
            evento.key ===
            "gestok_conta"
        ) {

            atualizarDadosPerfil();

            atualizarAssinatura();

        }

    }
);


/* =========================================
   ATUALIZAR AO VOLTAR PARA A PÁGINA
========================================= */

window.addEventListener(
    "pageshow",
    function () {

        atualizarDadosPerfil();

        atualizarAssinatura();

    }
);


/* =========================================
   LOGOUT
========================================= */

const btnLogout =
    document.getElementById(
        "btnLogout"
    );


if (btnLogout) {

    btnLogout.addEventListener(
        "click",
        async function () {

            const confirmar =
                window.confirm(
                    "Deseja realmente sair da sua conta?"
                );


            if (!confirmar) {

                return;

            }


            btnLogout.disabled =
                true;

            btnLogout.textContent =
                "Saindo...";


            try {

                if (
                    typeof sairGestok ===
                    "function"
                ) {

                    await sairGestok();

                } else {

                    await firebase
                        .auth()
                        .signOut();

                    localStorage.removeItem(
                        "gestok_conta"
                    );

                    localStorage.removeItem(
                        "gestok_sessao"
                    );

                    localStorage.removeItem(
                        "gestok_nome"
                    );

                    localStorage.removeItem(
                        "gestok_email"
                    );

                    localStorage.removeItem(
                        "gestok_senha"
                    );

                    window.location.href =
                        "../login/index.html";

                }

            } catch (erro) {

                console.error(
                    "Erro ao sair:",
                    erro
                );

                alert(
                    "Não foi possível sair da conta."
                );

                btnLogout.disabled =
                    false;

                btnLogout.textContent =
                    "Sair da conta";

            }

        }
    );

}