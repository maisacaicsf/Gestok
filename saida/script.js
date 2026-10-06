/* =========================================
   GESTOK
   SAÍDA DE ESTOQUE
   FIREBASE / FIRESTORE
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
    document.getElementById("saidaForm");

const selectProduto =
    document.getElementById("produto");

const estoqueAtual =
    document.getElementById("estoqueAtual");

const unidadeProduto =
    document.getElementById("unidadeProduto");

const quantidadeSaida =
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
   VERIFICAR ELEMENTOS
========================================= */

if (!form) {

    console.error(
        "ERRO: elemento #saidaForm não encontrado."
    );

}

if (!selectProduto) {

    console.error(
        "ERRO: elemento #produto não encontrado."
    );

}


/* =========================================
   OBTER LOJA ATUAL
========================================= */

async function obterLojaAtualSaidaGestok() {

    const usuario =
        usuarioFirebaseAtual();


    if (!usuario) {

        throw new Error(
            "Usuário não autenticado."
        );

    }


    const uid =
        usuario.uid;


    console.log(
        "SAÍDA - UID Firebase:",
        uid
    );


    /* =====================================
       PROCURAR USUÁRIO DENTRO DAS LOJAS
    ====================================== */

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
                await lojaDoc.ref
                    .collection("usuarios")
                    .doc(uid)
                    .get();


            if (usuarioDoc.exists) {

                console.log(
                    "SAÍDA - Loja encontrada pelo usuário:",
                    lojaDoc.id
                );

                return lojaDoc.id;

            }

        }

    } catch (erro) {

        console.error(
            "SAÍDA - Erro procurando usuário nas lojas:",
            erro
        );

    }


    /* =====================================
       PROCURAR PELO DONO
    ====================================== */

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


        if (!donoSnapshot.empty) {

            const lojaId =
                donoSnapshot.docs[0].id;


            console.log(
                "SAÍDA - Loja encontrada pelo donoUid:",
                lojaId
            );


            return lojaId;

        }

    } catch (erro) {

        console.error(
            "SAÍDA - Erro procurando loja pelo donoUid:",
            erro
        );

    }


    /* =====================================
       PROCURAR PELO ACESSO
    ====================================== */

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


        if (!acessoSnapshot.empty) {

            const acesso =
                acessoSnapshot
                    .docs[0]
                    .data();


            if (acesso.lojaId) {

                console.log(
                    "SAÍDA - Loja encontrada pelo acesso:",
                    acesso.lojaId
                );


                return acesso.lojaId;

            }

        }

    } catch (erro) {

        console.error(
            "SAÍDA - Erro procurando acesso:",
            erro
        );

    }


    throw new Error(
        "Nenhuma loja foi encontrada para o usuário autenticado."
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

        const lojaId =
            await obterLojaAtualSaidaGestok();


        console.log(
            "SAÍDA - Loja utilizada:",
            lojaId
        );


        const produtosRef =
            referenciaProdutos(lojaId);


        const snapshot =
            await produtosRef.get();


        console.log(
            "SAÍDA - Quantidade de documentos encontrados:",
            snapshot.size
        );


        produtosCache =
            snapshot.docs
                .map(function (doc) {

                    const dados =
                        doc.data();


                    return {

                        id: doc.id,

                        ...dados

                    };

                })
                .filter(function (produto) {

                    return produto.ativo !== false;

                })
                .sort(function (a, b) {

                    const nomeA =
                        String(
                            a.nome || ""
                        ).toLowerCase();


                    const nomeB =
                        String(
                            b.nome || ""
                        ).toLowerCase();


                    return nomeA.localeCompare(
                        nomeB,
                        "pt-BR"
                    );

                });


        console.log(
            "SAÍDA - Produtos ativos:",
            produtosCache
        );


        selectProduto.innerHTML = `
            <option value="">
                Selecione um produto
            </option>
        `;


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
                "SAÍDA - Nenhum produto ativo encontrado."
            );


            return;

        }


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
            "SAÍDA - Lista carregada com sucesso."
        );

    } catch (erro) {

        console.error(
            "SAÍDA - Erro ao carregar produtos:",
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
   OBTER PRODUTO SELECIONADO
========================================= */

function obterProdutoSelecionado() {

    const id =
        selectProduto.value;


    if (!id) {

        return null;

    }


    return produtosCache.find(
        function (produto) {

            return String(produto.id) ===
                String(id);

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

        estoqueAtual.textContent =
            "-";


        unidadeProduto.textContent =
            "-";


        novoEstoque.textContent =
            "-";


        return;

    }


    const estoque =
        Number(
            produto.quantidade || 0
        );


    const quantidade =
        Number(
            quantidadeSaida.value || 0
        );


    const unidade =
        produto.unidade || "UN";


    estoqueAtual.textContent =
        `${estoque} ${unidade}`;


    unidadeProduto.textContent =
        unidade;


    if (quantidade > 0) {

        const resultado =
            estoque - quantidade;


        if (resultado < 0) {

            novoEstoque.textContent =
                "Estoque insuficiente";

        } else {

            novoEstoque.textContent =
                `${resultado} ${unidade}`;

        }

    } else {

        novoEstoque.textContent =
            "-";

    }

}


/* =========================================
   SELECIONAR PRODUTO
========================================= */

if (selectProduto) {

    selectProduto.addEventListener(
        "change",
        function () {

            quantidadeSaida.value = "";

            atualizarInformacoes();

            quantidadeSaida.focus();

        }
    );

}


/* =========================================
   DIGITAR QUANTIDADE
========================================= */

if (quantidadeSaida) {

    quantidadeSaida.addEventListener(
        "input",
        function () {

            atualizarInformacoes();

        }
    );

}


/* =========================================
   REGISTRAR SAÍDA
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


                selectProduto.focus();


                return;

            }


            const quantidade =
                Number(
                    quantidadeSaida.value
                );


            /* =================================
               VALIDAR QUANTIDADE
            ================================= */

            if (
                !Number.isFinite(
                    quantidade
                ) ||
                quantidade <= 0
            ) {

                alert(
                    "Informe uma quantidade válida para a saída."
                );


                quantidadeSaida.focus();


                return;

            }


            /* =================================
               OBTER LOJA
            ================================= */

            let lojaId;


            try {

                lojaId =
                    await obterLojaAtualSaidaGestok();

            } catch (erro) {

                console.error(
                    "SAÍDA - Erro identificando loja:",
                    erro
                );


                alert(
                    "Não foi possível identificar a loja."
                );


                return;

            }


            /* =================================
               REFERÊNCIA DO PRODUTO
            ================================= */

            const produtoRef =
                referenciaProdutos(
                    lojaId
                ).doc(
                    produto.id
                );


            /* =================================
               DADOS DA SAÍDA
            ================================= */

            const motivoValor =
                motivo
                    ? motivo.value
                    : "";


            const observacaoValor =
                observacao
                    ? observacao.value.trim()
                    : "";


            /* =================================
               DATA
            ================================= */

            const agora =
                new Date();


            const timestamp =
                firebase.firestore.Timestamp.fromDate(
                    agora
                );


            try {

                /* =============================
                   TRANSAÇÃO
                ============================== */

                await db.runTransaction(
                    async function (transaction) {

                        const produtoSnapshot =
                            await transaction.get(
                                produtoRef
                            );


                        if (
                            !produtoSnapshot.exists
                        ) {

                            throw new Error(
                                "Produto não encontrado no Firestore."
                            );

                        }


                        const produtoAtual =
                            produtoSnapshot.data();


                        const estoqueAnterior =
                            Number(
                                produtoAtual.quantidade || 0
                            );


                        /* =========================
                           VERIFICAR ESTOQUE
                        ========================== */

                        if (
                            quantidade >
                            estoqueAnterior
                        ) {

                            throw new Error(
                                "ESTOQUE_INSUFICIENTE"
                            );

                        }


                        /* =========================
                           NOVO ESTOQUE
                        ========================== */

                        const estoqueNovo =
                            estoqueAnterior -
                            quantidade;


                        /* =========================
                           ATUALIZAR PRODUTO
                        ========================== */

                        transaction.update(
                            produtoRef,
                            {

                                quantidade:
                                    estoqueNovo,

                                dataAtualizacao:
                                    firebase.firestore.FieldValue.serverTimestamp(),

                                ultimaSaida: {

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
                                        timestamp

                                }

                            }
                        );


                        /* =========================
                           REGISTRAR MOVIMENTAÇÃO
                        ========================== */

                        const movimentacaoRef =
                            referenciaMovimentacoes(
                                lojaId
                            ).doc();


                        transaction.set(
                            movimentacaoRef,
                            {

                                tipo:
                                    "Saída",

                                produtoId:
                                    produto.id,

                                produto:
                                    produtoAtual.nome || "",

                                codigo:
                                    produtoAtual.codigo || "",

                                quantidade:
                                    quantidade,

                                unidade:
                                    produtoAtual.unidade || "UN",

                                estoqueAnterior:
                                    estoqueAnterior,

                                estoqueNovo:
                                    estoqueNovo,

                                motivo:
                                    motivoValor,

                                observacao:
                                    observacaoValor,

                                usuarioUid:
                                    usuarioFirebaseAtual()?.uid || "",

                                lojaId:
                                    lojaId,

                                data:
                                    timestamp

                            }
                        );

                    }
                );


                /* =================================
                   CONFIRMAÇÃO
                ================================= */

                alert(
                    "Saída registrada com sucesso!\n\n" +

                    "Produto: " +
                    produto.nome +

                    "\n" +

                    "Saída: " +
                    quantidade +
                    " " +
                    (produto.unidade || "UN") +

                    "\n" +

                    "Estoque atualizado no Firebase."
                );


                /* =================================
                   LIMPAR FORMULÁRIO
                ================================= */

                form.reset();


                estoqueAtual.textContent =
                    "-";


                unidadeProduto.textContent =
                    "-";


                novoEstoque.textContent =
                    "-";


                await carregarProdutos();


            } catch (erro) {

                console.error(
                    "SAÍDA - Erro ao registrar saída:",
                    erro
                );


                /* =============================
                   ESTOQUE INSUFICIENTE
                ============================== */

                if (
                    erro.message ===
                    "ESTOQUE_INSUFICIENTE"
                ) {

                    const unidade =
                        produto.unidade || "UN";


                    const estoque =
                        Number(
                            produto.quantidade || 0
                        );


                    alert(
                        "Estoque insuficiente!\n\n" +

                        "Produto: " +
                        produto.nome +

                        "\n" +

                        "Estoque atual: " +
                        estoque +
                        " " +
                        unidade +

                        "\n" +

                        "Quantidade solicitada: " +
                        quantidade +
                        " " +
                        unidade
                    );


                    quantidadeSaida.focus();


                    return;

                }


                alert(
                    "Não foi possível registrar a saída.\n\n" +
                    "Verifique sua conexão e tente novamente."
                );

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

        observarUsuarioFirebase(
            async function (usuario) {

                if (!usuario) {

                    console.log(
                        "SAÍDA - Usuário não autenticado."
                    );


                    return;

                }


                console.log(
                    "SAÍDA - Firebase UID:",
                    usuario.uid
                );


                try {

                    await carregarProdutos();

                } catch (erro) {

                    console.error(
                        "SAÍDA - Erro na inicialização:",
                        erro
                    );

                }

            }
        );

    }
);