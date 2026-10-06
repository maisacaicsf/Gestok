/* =========================================
   GESTOK
   ENTRADA DE ESTOQUE
   FIRESTORE + MULTI-LOJA
========================================= */


/* =========================================
   MENU LATERAL
========================================= */

const sidebar =
    document.getElementById("sidebar");

const overlay =
    document.getElementById("overlay");

const menuButton =
    document.getElementById("menuButton");

const closeSidebar =
    document.getElementById("closeSidebar");


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
   ELEMENTOS
========================================= */

const form =
    document.getElementById("entradaForm");

const selectProduto =
    document.getElementById("produto");

const estoqueAtual =
    document.getElementById("estoqueAtual");

const unidadeProduto =
    document.getElementById("unidadeProduto");

const quantidadeEntrada =
    document.getElementById("quantidade");

const novoEstoque =
    document.getElementById("novoEstoque");

const motivo =
    document.getElementById("motivo");

const observacao =
    document.getElementById("observacao");


/* =========================================
   CACHE DOS PRODUTOS
========================================= */

let produtosCache = [];


/* =========================================
   LOJA ATUAL
   FIREBASE AUTH + FIRESTORE

   NÃO USA:
   - gestok_produtos
   - gestok_conta
   - localStorage
========================================= */

async function obterLojaAtualEntradaGestok() {

    const usuario =
        usuarioFirebaseAtualGestok();


    if (!usuario) {

        throw new Error(
            "Usuário não autenticado."
        );

    }


    const uid =
        usuario.uid;


    console.log(
        "ENTRADA - UID Firebase:",
        uid
    );


    /* =====================================
       MÉTODO 1
       LOJAS / USUARIOS / UID
    ===================================== */

    try {

        const lojasSnapshot =
            await db
                .collection("lojas")
                .get();


        for (
            const lojaDoc
            of lojasSnapshot.docs
        ) {

            const usuarioDoc =
                await lojaDoc
                    .ref
                    .collection("usuarios")
                    .doc(uid)
                    .get();


            if (
                usuarioDoc.exists
            ) {

                console.log(
                    "ENTRADA - Loja encontrada pelo usuário:",
                    lojaDoc.id
                );


                return lojaDoc.id;

            }

        }

    } catch (erro) {

        console.error(
            "Erro procurando usuário nas lojas:",
            erro
        );

    }


    /* =====================================
       MÉTODO 2
       LOJAS / DONOUUID
    ===================================== */

    try {

        const donoSnapshot =
            await db
                .collection("lojas")
                .where(
                    "donoUid",
                    "==",
                    uid
                )
                .limit(1)
                .get();


        if (
            !donoSnapshot.empty
        ) {

            const lojaId =
                donoSnapshot
                    .docs[0]
                    .id;


            console.log(
                "ENTRADA - Loja encontrada pelo donoUid:",
                lojaId
            );


            return lojaId;

        }

    } catch (erro) {

        console.error(
            "Erro procurando loja pelo donoUid:",
            erro
        );

    }


    /* =====================================
       MÉTODO 3
       ACESSOS / UID
    ===================================== */

    try {

        const acessoSnapshot =
            await db
                .collection("acessos")
                .where(
                    "uid",
                    "==",
                    uid
                )
                .limit(1)
                .get();


        if (
            !acessoSnapshot.empty
        ) {

            const acesso =
                acessoSnapshot
                    .docs[0]
                    .data();


            if (
                acesso.lojaId
            ) {

                console.log(
                    "ENTRADA - Loja encontrada pelo acesso:",
                    acesso.lojaId
                );


                return acesso.lojaId;

            }

        }

    } catch (erro) {

        console.error(
            "Erro procurando acesso:",
            erro
        );

    }


    /* =====================================
       NENHUMA LOJA ENCONTRADA
    ===================================== */

    throw new Error(
        "Nenhuma loja foi encontrada para o usuário autenticado."
    );

}


/* =========================================
   REFERÊNCIA DOS PRODUTOS
========================================= */

async function referenciaProdutosEntradaGestok() {

    const lojaId =
        await obterLojaAtualEntradaGestok();


    if (!lojaId) {

        throw new Error(
            "Loja não identificada."
        );

    }


    return referenciaProdutos(
        lojaId
    );

}


/* =========================================
   REFERÊNCIA DAS MOVIMENTAÇÕES
========================================= */

async function referenciaMovimentacoesEntradaGestok() {

    const lojaId =
        await obterLojaAtualEntradaGestok();


    if (!lojaId) {

        throw new Error(
            "Loja não identificada."
        );

    }


    return referenciaMovimentacoes(
        lojaId
    );

}


/* =========================================
   CARREGAR PRODUTOS
========================================= */

async function carregarProdutos() {

    if (!selectProduto) {

        return;

    }


    selectProduto.innerHTML = `
        <option value="">
            Carregando produtos...
        </option>
    `;


    try {

        /* =================================
           DESCOBRIR LOJA
        ================================= */

        const lojaId =
            await obterLojaAtualEntradaGestok();


        console.log(
            "ENTRADA - Loja utilizada:",
            lojaId
        );


        /* =================================
           REFERÊNCIA DIRETA
        ================================= */

        const produtosRef =
            referenciaProdutos(
                lojaId
            );


        /* =================================
           BUSCAR FIRESTORE
        ================================= */

        const snapshot =
            await produtosRef.get();


        console.log(
            "ENTRADA - Quantidade de documentos encontrados:",
            snapshot.size
        );


        /* =================================
           CONVERTER DOCUMENTOS
        ================================= */

        produtosCache =
            snapshot.docs
                .map(function (doc) {

                    const dados =
                        doc.data();


                    return {

                        id:
                            doc.id,

                        ...dados

                    };

                })
                .filter(function (produto) {

                    /*
                       Produto só fica disponível
                       se não estiver explicitamente
                       desativado.
                    */

                    return (
                        produto.ativo !== false
                    );

                })
                .sort(function (a, b) {

                    const nomeA =
                        String(
                            a.nome || ""
                        )
                            .toLowerCase();


                    const nomeB =
                        String(
                            b.nome || ""
                        )
                            .toLowerCase();


                    return nomeA.localeCompare(
                        nomeB,
                        "pt-BR"
                    );

                });


        console.log(
            "ENTRADA - Produtos ativos:",
            produtosCache
        );


        /* =================================
           LIMPAR SELECT
        ================================= */

        selectProduto.innerHTML = `
            <option value="">
                Selecione um produto
            </option>
        `;


        /* =================================
           NENHUM PRODUTO
        ================================= */

        if (
            produtosCache.length === 0
        ) {

            selectProduto.innerHTML = `
                <option value="">
                    Nenhum produto cadastrado
                </option>
            `;


            atualizarInformacoes();


            console.log(
                "ENTRADA - Nenhum produto ativo encontrado."
            );


            return;

        }


        /* =================================
           ADICIONAR PRODUTOS
        ================================= */

        produtosCache.forEach(
            function (produto) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    produto.id;


                const nome =
                    String(
                        produto.nome || ""
                    );


                const codigo =
                    String(
                        produto.codigo || ""
                    );


                if (codigo) {

                    option.textContent =
                        `${nome} — ${codigo}`;

                } else {

                    option.textContent =
                        nome;

                }


                selectProduto.appendChild(
                    option
                );

            }
        );


        atualizarInformacoes();


        console.log(
            "ENTRADA - Lista carregada com sucesso."
        );


    } catch (erro) {

        console.error(
            "ENTRADA - Erro ao carregar produtos:",
            erro
        );


        produtosCache = [];


        selectProduto.innerHTML = `
            <option value="">
                Erro ao carregar produtos
            </option>
        `;


        alert(
            "Não foi possível carregar os produtos da loja."
        );

    }

}


/* =========================================
   PRODUTO SELECIONADO
========================================= */

function obterProdutoSelecionado() {

    const id =
        selectProduto
            ? selectProduto.value
            : "";


    if (!id) {

        return null;

    }


    return produtosCache.find(
        function (produto) {

            return produto.id === id;

        }
    ) || null;

}


/* =========================================
   ATUALIZAR INFORMAÇÕES
========================================= */

function atualizarInformacoes() {

    const produto =
        obterProdutoSelecionado();


    if (!produto) {

        if (estoqueAtual) {

            estoqueAtual.textContent =
                "-";

        }


        if (unidadeProduto) {

            unidadeProduto.textContent =
                "-";

        }


        if (novoEstoque) {

            novoEstoque.textContent =
                "-";

        }


        return;

    }


    const estoque =
        Number(
            produto.quantidade || 0
        );


    const quantidade =
        Number(
            quantidadeEntrada?.value || 0
        );


    if (estoqueAtual) {

        estoqueAtual.textContent =
            estoque;

    }


    if (unidadeProduto) {

        unidadeProduto.textContent =
            produto.unidade || "UN";

    }


    if (novoEstoque) {

        novoEstoque.textContent =
            quantidade > 0
                ? estoque + quantidade
                : "-";

    }

}


/* =========================================
   SELEÇÃO DO PRODUTO
========================================= */

if (selectProduto) {

    selectProduto.addEventListener(
        "change",
        function () {

            if (quantidadeEntrada) {

                quantidadeEntrada.value =
                    "";

            }


            atualizarInformacoes();


            if (quantidadeEntrada) {

                quantidadeEntrada.focus();

            }

        }
    );

}


/* =========================================
   QUANTIDADE
========================================= */

if (quantidadeEntrada) {

    quantidadeEntrada.addEventListener(
        "input",
        function () {

            atualizarInformacoes();

        }
    );

}


/* =========================================
   REGISTRAR ENTRADA
========================================= */

if (form) {

    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const produto =
                obterProdutoSelecionado();


            if (!produto) {

                alert(
                    "Selecione um produto."
                );


                if (selectProduto) {

                    selectProduto.focus();

                }


                return;

            }


            const quantidade =
                Number(
                    quantidadeEntrada?.value
                );


            if (
                !Number.isFinite(
                    quantidade
                ) ||
                quantidade <= 0
            ) {

                alert(
                    "Informe uma quantidade válida para a entrada."
                );


                if (quantidadeEntrada) {

                    quantidadeEntrada.focus();

                }


                return;

            }


            let lojaId;


            try {

                lojaId =
                    await obterLojaAtualEntradaGestok();

            } catch (erro) {

                console.error(
                    "Erro ao identificar loja:",
                    erro
                );


                alert(
                    "Não foi possível identificar a loja atual."
                );


                return;

            }


            const motivoValor =
                motivo
                    ? motivo.value.trim()
                    : "";


            const observacaoValor =
                observacao
                    ? observacao.value.trim()
                    : "";


            const botao =
                form.querySelector(
                    "button[type='submit']"
                );


            const textoOriginal =
                botao
                    ? botao.textContent
                    : "";


            try {

                if (botao) {

                    botao.disabled =
                        true;

                    botao.textContent =
                        "Registrando...";

                }


                const produtoRef =
                    referenciaProdutos(
                        lojaId
                    ).doc(
                        produto.id
                    );


                const movimentacaoRef =
                    referenciaMovimentacoes(
                        lojaId
                    ).doc();


                const usuario =
                    usuarioFirebaseAtualGestok();


                let resultadoEntrada =
                    null;


                /* =================================
                   TRANSAÇÃO ATÔMICA
                ================================= */

                await db.runTransaction(
                    async function (
                        transaction
                    ) {

                        const produtoSnap =
                            await transaction.get(
                                produtoRef
                            );


                        if (
                            !produtoSnap.exists
                        ) {

                            throw new Error(
                                "Produto não encontrado."
                            );

                        }


                        const produtoAtual =
                            produtoSnap.data();


                        if (
                            produtoAtual.ativo ===
                            false
                        ) {

                            throw new Error(
                                "Este produto está inativo."
                            );

                        }


                        const estoqueAnterior =
                            Number(
                                produtoAtual.quantidade ||
                                0
                            );


                        const estoqueNovo =
                            estoqueAnterior +
                            quantidade;


                        const agora =
                            new Date()
                                .toISOString();


                        const ultimaEntrada = {

                            quantidade:
                                quantidade,

                            estoqueAnterior:
                                estoqueAnterior,

                            estoqueNovo:
                                estoqueNovo,

                            motivo:
                                motivoValor,

                            observacao:
                                observacaoValor,

                            data:
                                agora

                        };


                        /* =========================
                           ATUALIZAR PRODUTO
                        ========================= */

                        transaction.update(
                            produtoRef,
                            {

                                quantidade:
                                    estoqueNovo,

                                ultimaEntrada:
                                    ultimaEntrada,

                                dataAtualizacao:
                                    agora

                            }
                        );


                        /* =========================
                           REGISTRAR MOVIMENTAÇÃO
                        ========================= */

                        transaction.set(
                            movimentacaoRef,
                            {

                                tipo:
                                    "Entrada",

                                produtoId:
                                    produtoRef.id,

                                produto:
                                    produtoAtual.nome ||
                                    "",

                                codigo:
                                    produtoAtual.codigo ||
                                    "",

                                quantidade:
                                    quantidade,

                                unidade:
                                    produtoAtual.unidade ||
                                    "UN",

                                estoqueAnterior:
                                    estoqueAnterior,

                                estoqueNovo:
                                    estoqueNovo,

                                motivo:
                                    motivoValor,

                                observacao:
                                    observacaoValor,

                                usuarioUid:
                                    usuario
                                        ? usuario.uid
                                        : null,

                                lojaId:
                                    lojaId,

                                data:
                                    agora

                            }
                        );


                        resultadoEntrada = {

                            nome:
                                produtoAtual.nome ||
                                "",

                            unidade:
                                produtoAtual.unidade ||
                                "UN",

                            estoqueAnterior:
                                estoqueAnterior,

                            estoqueNovo:
                                estoqueNovo

                        };

                    }
                );


                /* =================================
                   SUCESSO
                ================================= */

                alert(
                    `Entrada registrada com sucesso!\n\n` +

                    `Produto: ${resultadoEntrada.nome}\n` +

                    `Entrada: ${quantidade} ${resultadoEntrada.unidade}\n` +

                    `Estoque anterior: ${resultadoEntrada.estoqueAnterior}\n` +

                    `Novo estoque: ${resultadoEntrada.estoqueNovo}`
                );


                /* =================================
                   LIMPAR FORMULÁRIO
                ================================= */

                form.reset();


                if (estoqueAtual) {

                    estoqueAtual.textContent =
                        "-";

                }


                if (unidadeProduto) {

                    unidadeProduto.textContent =
                        "-";

                }


                if (novoEstoque) {

                    novoEstoque.textContent =
                        "-";

                }


                /* =================================
                   RECARREGAR PRODUTOS
                ================================= */

                await carregarProdutos();


            } catch (erro) {

                console.error(
                    "Erro ao registrar entrada:",
                    erro
                );


                alert(
                    mensagemErroFirebaseGestok(
                        erro
                    )
                );


            } finally {

                if (botao) {

                    botao.disabled =
                        false;

                    botao.textContent =
                        textoOriginal ||
                        "↓ Registrar entrada";

                }

            }

        }
    );

}


/* =========================================
   INICIALIZAÇÃO
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        observarAutenticacaoGestok(
            async function (usuario) {

                if (!usuario) {

                    console.log(
                        "ENTRADA - Usuário não autenticado."
                    );

                    return;

                }


                console.log(
                    "ENTRADA - Firebase UID:",
                    usuario.uid
                );


                try {

                    await carregarProdutos();

                } catch (erro) {

                    console.error(
                        "ENTRADA - Erro na inicialização:",
                        erro
                    );

                }

            }
        );

    }
);