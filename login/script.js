/* =========================================
   GESTOK
   LOGIN
   CÓDIGO DA LOJA + USUÁRIO + SENHA
   + RECUPERAÇÃO DE SENHA
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {


        /* =====================================
           ELEMENTOS LOGIN
        ===================================== */

        const form =
            document.getElementById(
                "loginForm"
            );


        const mensagem =
            document.getElementById(
                "mensagemLogin"
            );


        const codigoLojaInput =
            document.getElementById(
                "codigoLoja"
            );


        const usuarioInput =
            document.getElementById(
                "usuario"
            );


        const senhaInput =
            document.getElementById(
                "senha"
            );


        const botaoEntrar =
            document.getElementById(
                "btnEntrar"
            );


        /* =====================================
           ELEMENTOS RECUPERAÇÃO
        ===================================== */

        const abrirRecuperacao =
            document.getElementById(
                "abrirRecuperacao"
            );


        const passwordModalOverlay =
            document.getElementById(
                "passwordModalOverlay"
            );


        const fecharRecuperacao =
            document.getElementById(
                "fecharRecuperacao"
            );


        const cancelarRecuperacao =
            document.getElementById(
                "cancelarRecuperacao"
            );


        const recuperacaoForm =
            document.getElementById(
                "recuperacaoForm"
            );


        const codigoLojaRecuperacao =
            document.getElementById(
                "codigoLojaRecuperacao"
            );


        const usuarioRecuperacao =
            document.getElementById(
                "usuarioRecuperacao"
            );


        const passwordStatus =
            document.getElementById(
                "passwordStatus"
            );


        const enviarRecuperacao =
            document.getElementById(
                "enviarRecuperacao"
            );


        /* =====================================
           VERIFICAR FORM
        ===================================== */

        if (!form) {

            return;

        }


        /* =====================================
           FORMATAR CÓDIGO DA LOJA
        ===================================== */

        function formatarCodigo(
            campo
        ) {

            if (!campo) {
                return;
            }


            campo.addEventListener(
                "input",
                function () {

                    this.value =
                        this.value
                            .replace(
                                /\D/g,
                                ""
                            )
                            .slice(
                                0,
                                4
                            );

                }
            );

        }


        formatarCodigo(
            codigoLojaInput
        );


        formatarCodigo(
            codigoLojaRecuperacao
        );


        /* =====================================
           ABRIR RECUPERAÇÃO
        ===================================== */

        function abrirModalRecuperacao() {

            if (
                !passwordModalOverlay
            ) {

                return;

            }


            if (
                codigoLojaInput &&
                codigoLojaRecuperacao
            ) {

                codigoLojaRecuperacao.value =
                    codigoLojaInput.value;

            }


            if (
                usuarioInput &&
                usuarioRecuperacao
            ) {

                usuarioRecuperacao.value =
                    usuarioInput.value;

            }


            esconderStatusRecuperacao();


            passwordModalOverlay.classList.add(
                "active"
            );


            document.body.style.overflow =
                "hidden";


            setTimeout(
                function () {

                    if (
                        codigoLojaRecuperacao.value
                    ) {

                        usuarioRecuperacao?.focus();

                    } else {

                        codigoLojaRecuperacao?.focus();

                    }

                },
                100
            );

        }


        /* =====================================
           FECHAR RECUPERAÇÃO
        ===================================== */

        function fecharModalRecuperacao() {

            if (
                passwordModalOverlay
            ) {

                passwordModalOverlay.classList.remove(
                    "active"
                );

            }


            document.body.style.overflow =
                "";

        }


        if (abrirRecuperacao) {

            abrirRecuperacao.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    abrirModalRecuperacao();

                }
            );

        }


        if (fecharRecuperacao) {

            fecharRecuperacao.addEventListener(
                "click",
                fecharModalRecuperacao
            );

        }


        if (cancelarRecuperacao) {

            cancelarRecuperacao.addEventListener(
                "click",
                fecharModalRecuperacao
            );

        }


        if (passwordModalOverlay) {

            passwordModalOverlay.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target ===
                        passwordModalOverlay
                    ) {

                        fecharModalRecuperacao();

                    }

                }
            );

        }


        /* =====================================
           ESC
        ===================================== */

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Escape"
                ) {

                    fecharModalRecuperacao();

                }

            }
        );


        /* =====================================
           STATUS RECUPERAÇÃO
        ===================================== */

        function mostrarStatusRecuperacao(
            texto,
            tipo
        ) {

            if (
                !passwordStatus
            ) {

                return;

            }


            passwordStatus.textContent =
                texto;


            passwordStatus.className =
                "password-status show " +
                (
                    tipo === "success"
                        ? "success"
                        : "error"
                );

        }


        function esconderStatusRecuperacao() {

            if (
                !passwordStatus
            ) {

                return;

            }


            passwordStatus.textContent =
                "";


            passwordStatus.className =
                "password-status";

        }


        /* =====================================
           RECUPERAR SENHA
        ===================================== */

        async function recuperarSenhaGestok(
            codigoLoja,
            usuario
        ) {

            const db =
                firebase.firestore();


            const acessoRef =
                db
                    .collection(
                        "acessos"
                    )
                    .doc(
                        `${codigoLoja}_${usuario}`
                    );


            const acessoSnap =
                await acessoRef.get();


            if (
                !acessoSnap.exists
            ) {

                throw new Error(
                    "Código da Loja ou usuário não encontrado."
                );

            }


            const acesso =
                acessoSnap.data() ||
                {};


            const emailAuth =
                String(
                    acesso.emailAuth ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            if (!emailAuth) {

                throw new Error(
                    "Esta conta não possui um e-mail de recuperação cadastrado."
                );

            }


            await firebase
                .auth()
                .sendPasswordResetEmail(
                    emailAuth
                );


            return true;

        }


        /* =====================================
           FORMULÁRIO RECUPERAÇÃO
        ===================================== */

        if (
            recuperacaoForm
        ) {

            recuperacaoForm.addEventListener(
                "submit",
                async function (event) {

                    event.preventDefault();


                    const codigoLoja =
                        codigoLojaRecuperacao
                            ?.value
                            .trim() || "";


                    const usuario =
                        usuarioRecuperacao
                            ?.value
                            .trim()
                            .toLowerCase() || "";


                    /* =========================
                       VALIDAR CÓDIGO
                    ========================= */

                    if (
                        codigoLoja.length !==
                        4
                    ) {

                        mostrarStatusRecuperacao(
                            "O Código da Loja deve ter 4 dígitos.",
                            "error"
                        );

                        return;

                    }


                    /* =========================
                       VALIDAR USUÁRIO
                    ========================= */

                    if (!usuario) {

                        mostrarStatusRecuperacao(
                            "Digite seu usuário.",
                            "error"
                        );

                        return;

                    }


                    /* =========================
                       BOTÃO
                    ========================= */

                    if (
                        enviarRecuperacao
                    ) {

                        enviarRecuperacao.disabled =
                            true;

                        enviarRecuperacao.textContent =
                            "Enviando...";

                    }


                    esconderStatusRecuperacao();


                    try {

                        await recuperarSenhaGestok(
                            codigoLoja,
                            usuario
                        );


                        mostrarStatusRecuperacao(

                            "O link de recuperação foi enviado para o e-mail cadastrado nesta conta.",

                            "success"

                        );


                        if (
                            codigoLojaInput
                        ) {

                            codigoLojaInput.value =
                                codigoLoja;

                        }


                        if (
                            usuarioInput
                        ) {

                            usuarioInput.value =
                                usuario;

                        }


                        setTimeout(
                            function () {

                                fecharModalRecuperacao();

                            },
                            3500
                        );


                    } catch (erro) {

                        console.error(
                            "Erro na recuperação de senha:",
                            erro
                        );


                        let texto =
                            "Não foi possível enviar o link de recuperação.";


                        if (
                            erro.code ===
                            "auth/invalid-email"
                        ) {

                            texto =
                                "O e-mail da conta é inválido.";

                        }


                        if (
                            erro.code ===
                            "auth/user-not-found"
                        ) {

                            texto =
                                "Não foi possível localizar a conta.";

                        }


                        if (
                            erro.code ===
                            "auth/too-many-requests"
                        ) {

                            texto =
                                "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

                        }


                        if (
                            erro.code ===
                            "auth/network-request-failed"
                        ) {

                            texto =
                                "Falha de conexão. Verifique sua internet e tente novamente.";

                        }


                        if (
                            erro.message
                            .includes(
                                "não encontrado"
                            )
                        ) {

                            texto =
                                erro.message;

                        }


                        if (
                            erro.message
                            .includes(
                                "não possui um e-mail"
                            )
                        ) {

                            texto =
                                erro.message;

                        }


                        mostrarStatusRecuperacao(
                            texto,
                            "error"
                        );

                    } finally {

                        if (
                            enviarRecuperacao
                        ) {

                            enviarRecuperacao.disabled =
                                false;

                            enviarRecuperacao.textContent =
                                "Enviar link";

                        }

                    }

                }
            );

        }


        /* =====================================
           ENVIO DO LOGIN
        ===================================== */

        form.addEventListener(
            "submit",
            async function (e) {

                e.preventDefault();


                /* =================================
                   OBTER DADOS
                ================================= */

                const codigoLoja =
                    codigoLojaInput?.value
                        .trim() || "";


                const usuario =
                    usuarioInput?.value
                        .trim() || "";


                const senha =
                    senhaInput?.value ||
                    "";


                /* =================================
                   VALIDAR CÓDIGO
                ================================= */

                if (
                    !codigoLoja
                ) {

                    mostrarMensagem(
                        "Digite o Código da Loja.",
                        true
                    );

                    return;

                }


                if (
                    codigoLoja.length !==
                    4
                ) {

                    mostrarMensagem(
                        "O Código da Loja deve ter 4 dígitos.",
                        true
                    );

                    return;

                }


                /* =================================
                   VALIDAR USUÁRIO
                ================================= */

                if (
                    !usuario
                ) {

                    mostrarMensagem(
                        "Digite seu usuário.",
                        true
                    );

                    return;

                }


                /* =================================
                   VALIDAR SENHA
                ================================= */

                if (
                    !senha
                ) {

                    mostrarMensagem(
                        "Digite sua senha.",
                        true
                    );

                    return;

                }


                /* =================================
                   DESABILITAR BOTÃO
                ================================= */

                if (botaoEntrar) {

                    botaoEntrar.disabled =
                        true;

                    botaoEntrar.textContent =
                        "Entrando...";

                }


                /* =================================
                   REALIZAR LOGIN
                ================================= */

                try {

                    const resultado =
                        await entrarGestok(

                            codigoLoja,

                            usuario,

                            senha

                        );


                    /* =============================
                       LOGIN INVÁLIDO
                    ============================== */

                    if (
                        !resultado.ok
                    ) {

                        mostrarMensagem(
                            resultado.mensagem,
                            true
                        );


                        if (
                            botaoEntrar
                        ) {

                            botaoEntrar.disabled =
                                false;

                            botaoEntrar.textContent =
                                "Entrar no Gestok →";

                        }


                        return;

                    }


                    /* =============================
                       PAGAMENTO PENDENTE
                    ============================== */

                    if (
                        !pagamentoAprovadoGestok(
                            resultado.conta
                        )
                    ) {

                        mostrarMensagem(

                            "Login realizado. Finalize o pagamento para liberar o sistema.",

                            false

                        );


                        setTimeout(
                            function () {

                                window.location.href =
                                    "../pagamento/index.html";

                            },
                            700
                        );


                        return;

                    }


                    /* =============================
                       ASSINATURA EXPIRADA
                    ============================== */

                    if (
                        !assinaturaAtivaGestok(
                            resultado.conta
                        )
                    ) {

                        mostrarMensagem(

                            "Sua assinatura expirou. Renove para continuar.",

                            true

                        );


                        setTimeout(
                            function () {

                                window.location.href =
                                    "../pagamento/index.html";

                            },
                            1000
                        );


                        return;

                    }


                    /* =============================
                       LOGIN CONCLUÍDO
                    ============================== */

                    mostrarMensagem(

                        "Login realizado! Abrindo o sistema...",

                        false

                    );


                    setTimeout(
                        function () {

                            window.location.href =
                                "../sistema/index.html";

                        },
                        600
                    );

                } catch (erro) {

                    console.error(
                        "Erro ao realizar login:",
                        erro
                    );


                    mostrarMensagem(
                        "Não foi possível realizar o login.",
                        true
                    );


                    if (
                        botaoEntrar
                    ) {

                        botaoEntrar.disabled =
                            false;

                        botaoEntrar.textContent =
                            "Entrar no Gestok →";

                    }

                }

            }
        );


        /* =====================================
           MENSAGEM LOGIN
        ===================================== */

        function mostrarMensagem(
            texto,
            erro
        ) {

            if (!mensagem) {

                alert(
                    texto
                );

                return;

            }


            mensagem.textContent =
                texto;


            mensagem.className =
                erro
                    ? "form-message error"
                    : "form-message success";


            mensagem.hidden =
                false;

        }

    }
);