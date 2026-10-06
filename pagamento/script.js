/* =========================================
   GESTOK - PAGAMENTO REAL
   MERCADO PAGO + FIREBASE AUTH
   -----------------------------------------
   IMPORTANTE:
   A página de pagamento NÃO pode considerar
   firebase.auth().currentUser como disponível
   imediatamente. O Firebase restaura a sessão
   de forma assíncrona.
========================================= */

document.addEventListener("DOMContentLoaded", async function () {
    const mensagem = document.getElementById("mensagemPagamento");
    const statusBox = document.getElementById("statusPagamento");
    const container = document.getElementById("paymentBrick_container");

    const conta = obterContaGestok();

    if (!conta || !conta.lojaId) {
        window.location.replace("../cadastro/index.html");
        return;
    }

    /*
       Aguarda o Firebase restaurar a sessão.
       Este é o ponto principal da correção:
       quando uma assinatura expirada manda o
       usuário para esta página, o Firebase ainda
       pode estar recuperando o usuário e
       auth.currentUser pode ser null por alguns
       instantes.
    */
    const usuario = await aguardarUsuarioFirebase();

    if (!usuario) {
        mostrarMensagem("Sua sessão expirou. Faça login novamente.", true);
        setTimeout(() => window.location.replace("../login/index.html"), 1200);
        return;
    }

    if (!window.MercadoPago) {
        mostrarMensagem("Não foi possível carregar o Mercado Pago. Verifique sua conexão e tente novamente.", true);
        return;
    }

    try {
        const token = await usuario.getIdToken(true);

        const statusInicial = await requisicaoAPI("/paymentStatus", {
            method: "POST",
            body: { lojaId: conta.lojaId }
        }, token);

        if (statusInicial?.assinaturaAtiva) {
            mostrarMensagem("Sua assinatura já está ativa.", false);
            setTimeout(() => window.location.replace("../sistema/index.html"), 700);
            return;
        }

        let config;
        try {
            const resposta = await fetch(GESTOK_PAGAMENTOS_API + "/paymentConfig", {
                method: "GET",
                cache: "no-store",
                headers: { "Accept": "application/json" }
            });

            const dados = await resposta.json().catch(() => ({}));
            if (!resposta.ok) {
                throw new Error(dados.mensagem || `Servidor de pagamentos respondeu HTTP ${resposta.status}.`);
            }

            if (!dados.publicKey) {
                throw new Error("A Public Key do Mercado Pago não está configurada no servidor.");
            }

            config = dados;
        } catch (erro) {
            console.error("Falha ao carregar configuração do pagamento:", erro);
            if (erro instanceof TypeError && /fetch/i.test(erro.message)) {
                throw new Error("Não foi possível conectar ao servidor de pagamentos. Verifique se as Cloud Functions do Gestok foram publicadas e se o endereço da API está correto.");
            }
            throw erro;
        }

        const mp = new MercadoPago(config.publicKey, { locale: "pt-BR" });
        const bricksBuilder = mp.bricks();

        await bricksBuilder.create("payment", "paymentBrick_container", {
            initialization: {
                amount: 30.00,
                payer: {
                    email: usuario.email || conta.email || ""
                }
            },
            customization: {
                paymentMethods: {
                    creditCard: "all",
                    debitCard: "all",
                    bankTransfer: "pix"
                },
                visual: {
                    style: { theme: "default" },
                    hidePaymentButton: false
                }
            },
            callbacks: {
                onReady: () => {
                    console.log("Mercado Pago Payment Brick pronto.");
                },
                onSubmit: async ({ formData }) => {
                    mostrarMensagem("Enviando pagamento com segurança...", false);
                    if (statusBox) statusBox.hidden = true;

                    try {
                        const idToken = await usuario.getIdToken(true);

                        const resultado = await requisicaoAPI("/createPayment", {
                            method: "POST",
                            body: {
                                lojaId: conta.lojaId,
                                payment: {
                                    ...formData,
                                    request_id: crypto.randomUUID()
                                }
                            }
                        }, idToken);

                        if (!resultado?.ok) {
                            throw new Error(resultado?.mensagem || "Não foi possível criar o pagamento.");
                        }

                        if (resultado.status === "approved") {
                            mostrarMensagem("Pagamento aprovado. Liberando seu Gestok...", false);
                            await aguardarLiberacao(usuario, conta.lojaId);
                            return;
                        }

                        if (resultado.qrCodeBase64 || resultado.qrCode) {
                            mostrarPix(resultado);
                        } else {
                            mostrarMensagem(
                                resultado.status === "in_process"
                                    ? "Pagamento em análise. Aguarde a confirmação do Mercado Pago."
                                    : "Pagamento criado. Estamos aguardando a confirmação.",
                                false
                            );
                        }

                        if (statusBox) statusBox.hidden = false;
                        await aguardarLiberacao(usuario, conta.lojaId);
                    } catch (erro) {
                        console.error("Erro ao processar pagamento:", erro);
                        mostrarMensagem(erro.message || "Não foi possível processar o pagamento.", true);
                        throw erro;
                    }
                },
                onError: (erro) => {
                    console.error("Mercado Pago Brick:", erro);
                    mostrarMensagem("O formulário de pagamento encontrou um erro. Confira os dados e tente novamente.", true);
                }
            }
        });
    } catch (erro) {
        console.error("Erro ao iniciar pagamento:", erro);
        mostrarMensagem(erro.message || "Não foi possível iniciar o pagamento. Confira a configuração do Mercado Pago.", true);
    }

    async function aguardarLiberacao(usuarioFirebase, lojaId) {
        if (statusBox) statusBox.hidden = false;
        let tentativas = 0;

        while (tentativas < 60) {
            tentativas++;
            await new Promise(resolve => setTimeout(resolve, 3000));

            try {
                const idToken = await usuarioFirebase.getIdToken(true);
                const resultado = await requisicaoAPI("/paymentStatus", {
                    method: "POST",
                    body: { lojaId }
                }, idToken);

                if (resultado?.assinaturaAtiva) {
                    mostrarMensagem("Pagamento confirmado! Seu Gestok foi liberado.", false);
                    if (statusBox) statusBox.hidden = true;
                    setTimeout(() => window.location.replace("../sistema/index.html"), 700);
                    return;
                }

                if (resultado?.status === "rejected" || resultado?.status === "cancelled") {
                    mostrarMensagem("O Mercado Pago não aprovou o pagamento. Você pode tentar novamente.", true);
                    if (statusBox) statusBox.hidden = true;
                    return;
                }
            } catch (erro) {
                console.warn("Falha ao consultar status:", erro);
            }
        }

        mostrarMensagem("Ainda estamos aguardando a confirmação. Você pode permanecer nesta página e aguardar a atualização.", false);
    }

    async function requisicaoAPI(path, options, idToken) {
        let resposta;
        try {
            resposta = await fetch(GESTOK_PAGAMENTOS_API + path, {
                method: options.method || "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + idToken
                },
                body: options.body ? JSON.stringify(options.body) : undefined
            });
        } catch (erro) {
            console.error("Falha de rede na API de pagamentos:", erro);
            throw new Error("Não foi possível conectar ao servidor de pagamentos. Verifique se as Cloud Functions foram publicadas e se o endereço da API está correto.");
        }

        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            throw new Error(dados.mensagem || "Erro na comunicação com o servidor de pagamentos.");
        }

        return dados;
    }

    function aguardarUsuarioFirebase() {
        return new Promise(resolve => {
            let finalizado = false;
            let unsubscribe = null;

            const concluir = usuario => {
                if (finalizado) return;
                finalizado = true;
                if (typeof unsubscribe === "function") unsubscribe();
                resolve(usuario || null);
            };

            try {
                if (!firebase?.auth) {
                    concluir(null);
                    return;
                }

                /* Se já estiver disponível, não precisamos esperar. */
                const atual = firebase.auth().currentUser;
                if (atual) {
                    concluir(atual);
                    return;
                }

                /* Caso contrário, espera o Firebase restaurar a sessão. */
                unsubscribe = firebase.auth().onAuthStateChanged(usuario => {
                    if (usuario) {
                        concluir(usuario);
                    }
                });

                /* Proteção contra sessão realmente inexistente. */
                setTimeout(() => concluir(firebase.auth().currentUser), 8000);
            } catch (erro) {
                console.error("Erro ao aguardar autenticação Firebase:", erro);
                concluir(null);
            }
        });
    }

    function mostrarPix(resultado) {
        const antigo = document.getElementById("pixRealArea");
        if (antigo) antigo.remove();

        const area = document.createElement("div");
        area.id = "pixRealArea";
        area.className = "pix-real-area";

        if (resultado.qrCodeBase64) {
            const img = document.createElement("img");
            img.src = "data:image/png;base64," + resultado.qrCodeBase64;
            img.alt = "QR Code Pix";
            img.className = "pix-qr";
            area.appendChild(img);
        }

        const titulo = document.createElement("strong");
        titulo.textContent = "Pague com Pix";
        area.appendChild(titulo);

        if (resultado.qrCode) {
            const input = document.createElement("textarea");
            input.readOnly = true;
            input.value = resultado.qrCode;
            input.className = "pix-copy";
            area.appendChild(input);

            const copiar = document.createElement("button");
            copiar.type = "button";
            copiar.className = "pix-copy-button";
            copiar.textContent = "Copiar Pix Copia e Cola";
            copiar.addEventListener("click", async () => {
                await navigator.clipboard.writeText(resultado.qrCode);
                copiar.textContent = "Pix copiado ✓";
                setTimeout(() => copiar.textContent = "Copiar Pix Copia e Cola", 1800);
            });
            area.appendChild(copiar);
        }

        container.prepend(area);
        mostrarMensagem("Pix gerado. Após o pagamento, o Mercado Pago confirmará automaticamente e o sistema será liberado.", false);
    }

    function mostrarMensagem(texto, erro) {
        if (!mensagem) return;
        mensagem.textContent = texto;
        mensagem.className = erro
            ? "payment-message error"
            : "payment-message success";
        mensagem.hidden = false;
    }
});
