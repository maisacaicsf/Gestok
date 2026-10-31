/* =========================================
   GESTOK
   AUTENTICAÇÃO CENTRAL
   FIREBASE AUTH + FIRESTORE
========================================= */


/* =========================================
   CHAVES DE CACHE LOCAL
   -----------------------------------------
   IMPORTANTE:
   localStorage NÃO é autenticação.
   Serve apenas como espelho dos dados.
========================================= */

const GESTOK_CONTA = "gestok_conta";
const GESTOK_SESSAO = "gestok_sessao";

/* =========================================
   CONTEXTO CENTRAL DO GESTOK
   -----------------------------------------
   Guarda temporariamente as informações
   essenciais da sessão atual.

   IMPORTANTE:
   Isso NÃO substitui o Firebase Auth.
   O Firebase continua sendo a autoridade.
========================================= */

let gestokContexto = null;


/* =========================================
   DEFINIR CONTEXTO
========================================= */

function definirContextoGestok(
    usuario,
    conta
) {

    if (
        !usuario ||
        !usuario.uid ||
        !conta ||
        !conta.lojaId
    ) {

        gestokContexto = null;

        return null;

    }


    gestokContexto = {

        uid:
            usuario.uid,

        lojaId:
            conta.lojaId,

        codigoLoja:
            conta.codigoLoja || "",

        usuario:
            conta.usuario || "",

        nome:
            conta.nome || "",

        email:
            conta.email || usuario.email || "",

        carregadoEm:
            Date.now()

    };


    return gestokContexto;

}


/* =========================================
   OBTER CONTEXTO
========================================= */

function obterContextoGestok() {

    return gestokContexto;

}


/* =========================================
   OBTER LOJA ATUAL
========================================= */

function obterLojaAtualGestok() {

    return (
        gestokContexto?.lojaId ||
        null
    );

}


/* =========================================
   OBTER UID ATUAL DO CONTEXTO
========================================= */

function obterUidAtualGestok() {

    return (
        gestokContexto?.uid ||
        null
    );

}


/* =========================================
   VERIFICAR CONTEXTO
========================================= */

function contextoGestokCarregado() {

    return Boolean(
        gestokContexto &&
        gestokContexto.uid &&
        gestokContexto.lojaId
    );

}
/* =========================================
   NORMALIZAR ASSINATURA (Timestamp -> ISO)
   -----------------------------------------
   O Firestore devolve datas como Timestamp.
   O espelho local usa texto ISO, que é o
   formato lido por assinaturaAtivaGestok().
========================================= */

function normalizarAssinaturaGestok(assinatura) {

    if (!assinatura || typeof assinatura !== "object") {

        return null;

    }

    const copia = Object.assign({}, assinatura);

    ["inicio", "vencimento"].forEach(function (campo) {

        const valor = copia[campo];

        if (valor && typeof valor.toDate === "function") {

            try {

                copia[campo] = valor.toDate().toISOString();

            } catch (erro) {

                copia[campo] = null;

            }

        }

    });

    return copia;

}


/* =========================================
   OBTER CONTA LOCAL
========================================= */

function obterContaGestok() {

    try {

        const dados =
            localStorage.getItem(
                GESTOK_CONTA
            );

        if (!dados) {
            return null;
        }

        const conta =
            JSON.parse(dados);

        return (
            conta &&
            typeof conta === "object"
        )
            ? conta
            : null;

    } catch (erro) {

        console.error(
            "Erro ao carregar conta local:",
            erro
        );

        return null;

    }

}


/* =========================================
   OBTER SESSÃO LOCAL
========================================= */

function obterSessaoGestok() {

    try {

        const dados =
            localStorage.getItem(
                GESTOK_SESSAO
            );

        if (!dados) {
            return null;
        }

        const sessao =
            JSON.parse(dados);

        return (
            sessao &&
            typeof sessao === "object"
        )
            ? sessao
            : null;

    } catch (erro) {

        return null;

    }

}


/* =========================================
   USUÁRIO FIREBASE ATUAL
========================================= */

function usuarioFirebaseAtualGestok() {

    if (
        typeof firebase === "undefined" ||
        !firebase.auth
    ) {

        return null;

    }

    return (
        firebase.auth().currentUser ||
        null
    );

}


/* =========================================
   UID FIREBASE ATUAL
========================================= */

function uidFirebaseAtualGestok() {

    const usuario =
        usuarioFirebaseAtualGestok();

    return usuario
        ? usuario.uid
        : null;

}


/* =========================================
   VERIFICAR AUTENTICAÇÃO FIREBASE
========================================= */

function usuarioLogadoGestok() {

    return Boolean(
        usuarioFirebaseAtualGestok()
    );

}


/* =========================================
   OBSERVAR AUTENTICAÇÃO
========================================= */

/* =========================================
   OBSERVAR AUTENTICAÇÃO
   -----------------------------------------
   Restaura o contexto quando o Firebase
   recupera automaticamente a sessão.
========================================= */

function observarAutenticacaoGestok(callback) {

    if (
        typeof firebase === "undefined" ||
        !firebase.auth
    ) {

        return null;

    }


    return firebase
        .auth()
        .onAuthStateChanged(
            async function (usuario) {

                /* =====================================
                   SEM USUÁRIO
                ===================================== */

                if (!usuario) {

                    gestokContexto = null;

                    if (
                        typeof callback === "function"
                    ) {

                        callback(null);

                    }

                    return;

                }


                /* =====================================
                   TENTAR RESTAURAR PELO CACHE
                ===================================== */

                const sessao =
                    obterSessaoGestok();


                const conta =
                    obterContaGestok();


                if (
                    sessao &&
                    conta &&
                    sessao.firebaseUid === usuario.uid &&
                    conta.firebaseUid === usuario.uid &&
                    conta.lojaId
                ) {

                    definirContextoGestok(
                        usuario,
                        conta
                    );


                    if (
                        typeof callback === "function"
                    ) {

                        callback(usuario);

                    }

                    return;

                }


                /* =====================================
                   SEM CACHE VÁLIDO
                   BUSCAR INFORMAÇÕES DO USUÁRIO
                ===================================== */

                try {

                    const db =
                        firebase.firestore();


                    const lojasSnap =
                        await db
                            .collection("lojas")
                            .get();


                    let lojaEncontrada =
                        null;


                    let usuarioEncontrado =
                        null;


                    for (
                        const lojaDoc
                        of lojasSnap.docs
                    ) {

                        const usuarioSnap =
                            await lojaDoc
                                .ref
                                .collection("usuarios")
                                .doc(usuario.uid)
                                .get();


                        if (
                            usuarioSnap.exists
                        ) {

                            lojaEncontrada =
                                lojaDoc;


                            usuarioEncontrado =
                                usuarioSnap.data();


                            break;

                        }

                    }


                    /* =====================================
                       LOJA ENCONTRADA
                    ===================================== */

                    if (
                        lojaEncontrada &&
                        usuarioEncontrado
                    ) {

                        const loja =
                            lojaEncontrada.data();


                        const contaRestaurada = {

                            firebaseUid:
                                usuario.uid,

                            lojaId:
                                lojaEncontrada.id,

                            nome:
                                loja.nome || "",

                            email:
                                usuario.email || "",

                            usuario:
                                usuarioEncontrado.usuario || "",

                            codigoLoja:
                                loja.codigo || "",

                            assinatura:
                                normalizarAssinaturaGestok(loja.assinatura) || {

                                    plano:
                                        "Gestok",

                                    valor:
                                        30,

                                    dias:
                                        30,

                                    inicio:
                                        null,

                                    vencimento:
                                        null,

                                    status:
                                        "aguardando_pagamento",

                                    pagamento:
                                        "pendente"

                                }

                        };


                        localStorage.setItem(

                            GESTOK_CONTA,

                            JSON.stringify(
                                contaRestaurada
                            )

                        );


                        definirContextoGestok(

                            usuario,

                            contaRestaurada

                        );

                    }


                } catch (erro) {

                    console.error(
                        "Erro ao restaurar contexto Gestok:",
                        erro
                    );

                }


                /* =====================================
                   CALLBACK DA PÁGINA
                ===================================== */

                if (
                    typeof callback === "function"
                ) {

                    callback(usuario);

                }

            }

        );

}


/* =========================================
   GERAR CÓDIGO DA LOJA
========================================= */

async function gerarCodigoLojaGestok(usuario = "") {

    if (
        typeof firebase === "undefined" ||
        !firebase.firestore
    ) {

        throw new Error(
            "Firebase Firestore não foi carregado."
        );

    }


    const db =
        firebase.firestore();


    usuario =
        String(usuario || "")
            .trim()
            .toLowerCase();


    /* -----------------------------------------
       O cadastro não pode consultar toda a
       coleção lojas, pois as regras de segurança
       impedem uma consulta global.

       Usamos o documento de acesso como teste
       rápido de disponibilidade da combinação
       Código + Usuário.
    ----------------------------------------- */

    for (let tentativa = 0; tentativa < 50; tentativa++) {

        const codigo =
            String(
                Math.floor(
                    1000 +
                    Math.random() * 9000
                )
            );


        if (!usuario) {
            return codigo;
        }


        const acessoSnap =
            await db
                .collection("acessos")
                .doc(`${codigo}_${usuario}`)
                .get();


        if (!acessoSnap.exists) {

            return codigo;

        }

    }


    throw new Error(
        "Não foi possível gerar um código de loja disponível."
    );

}

/* =========================================
   PAGAMENTO APROVADO
========================================= */

/* =========================================
   PAGAMENTO / TESTE GRATUITO
========================================= */

function pagamentoAprovadoGestok(
    conta = obterContaGestok()
) {

    if (
        !conta ||
        !conta.assinatura
    ) {

        return false;

    }


    const assinatura =
        conta.assinatura;


    /* =====================================
       TESTE GRATUITO DE 30 DIAS
    ===================================== */

    if (
        assinatura.status ===
            "teste_gratis" &&
        assinatura.pagamento ===
            "gratis"
    ) {

        return true;

    }


    /* =====================================
       ASSINATURA PAGA
    ===================================== */

    return (
        assinatura.status ===
            "ativa" &&

        assinatura.pagamento ===
            "aprovado"
    );

}


/* =========================================
   ASSINATURA ATIVA
========================================= */

function assinaturaAtivaGestok(
    conta = obterContaGestok()
) {

    if (
        !pagamentoAprovadoGestok(conta)
    ) {

        return false;

    }


    if (
        !conta.assinatura.vencimento
    ) {

        return false;

    }


    const vencimento =
        new Date(
            conta.assinatura.vencimento
        ).getTime();


    return (

        Number.isFinite(vencimento) &&

        vencimento > Date.now()

    );

}


/* =========================================
   CRIAR CONTA
========================================= */

async function criarContaGestok(

    nome,

    email,

    usuario,

    senha

) {

    nome =
        String(nome || "")
            .trim();

    email =
        String(email || "")
            .trim()
            .toLowerCase();

    usuario =
        String(usuario || "")
            .trim()
            .toLowerCase();

    senha =
        String(senha || "");


    /* -----------------------------------------
       VALIDAÇÕES
    ----------------------------------------- */

    if (!nome) {

        return {

            ok: false,

            mensagem:
                "Digite o nome da empresa."

        };

    }


    if (!email) {

        return {

            ok: false,

            mensagem:
                "Digite seu e-mail."

        };

    }


    if (!usuario) {

        return {

            ok: false,

            mensagem:
                "Digite um nome de usuário."

        };

    }


    if (senha.length < 6) {

        return {

            ok: false,

            mensagem:
                "A senha precisa ter pelo menos 6 caracteres."

        };

    }


    if (
        typeof firebase === "undefined" ||
        !firebase.auth ||
        !firebase.firestore
    ) {

        return {

            ok: false,

            mensagem:
                "Firebase não foi carregado corretamente."

        };

    }


    let usuarioFirebase =
        null;


    try {

        /* =====================================
           1. CRIAR USUÁRIO NO FIREBASE AUTH
        ===================================== */

        const credencial =
            await firebase
                .auth()
                .createUserWithEmailAndPassword(
                    email,
                    senha
                );


        usuarioFirebase =
            credencial.user;


        if (
            !usuarioFirebase ||
            !usuarioFirebase.uid
        ) {

            throw new Error(
                "O Firebase não retornou o UID do usuário."
            );

        }


        /* =====================================
           UID REAL DO FIREBASE
        ===================================== */

        const uid =
            usuarioFirebase.uid;


        console.log(
            "Usuário Firebase criado:",
            uid
        );


        /* =====================================
           2. FIRESTORE
        ===================================== */

        const db =
            firebase.firestore();


        /* =====================================
           3. GERAR CÓDIGO DA LOJA
        ===================================== */

        const codigoLoja =
            await gerarCodigoLojaGestok(usuario);


        /* =====================================
           4. CRIAR DOCUMENTO DA LOJA
        ===================================== */

        const lojaRef =
            db
                .collection("lojas")
                .doc();


        const agora =
            firebase.firestore.FieldValue
                .serverTimestamp();
        const inicioTeste =
            new Date();

        const vencimentoTeste =
            new Date(inicioTeste);

        vencimentoTeste.setDate(
            vencimentoTeste.getDate() + 30
        );

        await lojaRef.set({

            nome:
                nome,

            codigo:
                codigoLoja,

            donoUid:
                uid,

            email:
                email,

            criadaEm:
                agora,

            assinatura: {

                plano:
                    "Gestok",

                valor:
                    30,

                dias:
                    30,

                tipo:
                    "teste_gratis",

                inicio:
                    inicioTeste,

                vencimento:
                    vencimentoTeste,

                status:
                    "teste_gratis",

                pagamento:
                    "gratis"

            }

});


        console.log(
            "Loja criada:",
            lojaRef.id
        );


        /* =====================================
           5. CRIAR USUÁRIO DENTRO DA LOJA
        ===================================== */

        await lojaRef
            .collection("usuarios")
            .doc(uid)
            .set({

                uid:
                    uid,

                lojaId:
                    lojaRef.id,

                codigoLoja:
                    codigoLoja,

                nome:
                    nome,

                email:
                    email,

                usuario:
                    usuario,

                perfil:
                    "proprietario",

                criadoEm:
                    agora

            });


        /* =====================================
           6. CRIAR ÍNDICE DE LOGIN
        ===================================== */

        await db
            .collection("acessos")
            .doc(
                `${codigoLoja}_${usuario}`
            )
            .set({

                lojaId:
                    lojaRef.id,

                uid:
                    uid,

                codigoLoja:
                    codigoLoja,

                usuario:
                    usuario,

                emailAuth:
                    email

            });


        /* =====================================
           7. ESPELHO LOCAL
           NÃO É AUTENTICAÇÃO
        ===================================== */

        const conta = {

            firebaseUid:
                uid,

            lojaId:
                lojaRef.id,

            nome:
                nome,

            email:
                email,

            usuario:
                usuario,

            codigoLoja:
                codigoLoja,

            assinatura: {

                plano:
                    "Gestok",

                valor:
                    30,

                dias:
                    30,

                tipo:
                    "teste_gratis",

                inicio:
                    inicioTeste.toISOString(),

                vencimento:
                    vencimentoTeste.toISOString(),

                status:
                    "teste_gratis",

                pagamento:
                    "gratis"

            },

            criadaEm:
                new Date().toISOString()

        };


        localStorage.setItem(

            GESTOK_CONTA,

            JSON.stringify(conta)

        );


        localStorage.setItem(

            GESTOK_SESSAO,

            JSON.stringify({

                logado:
                    true,

                firebaseUid:
                    uid,

                lojaId:
                    lojaRef.id,

                codigoLoja:
                    codigoLoja,

                usuario:
                    usuario,

                loginEm:
                    new Date().toISOString()

            })

        );
        /* =====================================
        DEFINIR CONTEXTO IMEDIATAMENTE
        ===================================== */

        definirContextoGestok(
            usuarioFirebase,
            conta
        );


        /* =====================================
           SUCESSO
        ===================================== */

        return {

            ok: true,

            conta:
                conta,

            usuario:
                usuarioFirebase

        };


    } catch (erro) {

        console.error(
            "Erro ao criar conta Gestok:",
            erro
        );


        /* =====================================
           SE FIRESTORE FALHAR DEPOIS DO AUTH,
           REMOVE O USUÁRIO CRIADO
        ===================================== */

        if (
            usuarioFirebase &&
            usuarioFirebase.uid
        ) {

            try {

                await usuarioFirebase.delete();

                console.log(
                    "Usuário Firebase removido após falha."
                );

            } catch (erroDelete) {

                console.error(
                    "Não foi possível remover usuário Firebase:",
                    erroDelete
                );

            }

        }


        return {

            ok: false,

            mensagem:
                mensagemErroFirebaseGestok(
                    erro
                ),

            erro:
                erro

        };

    }

}


/* =========================================
   CACHE RÁPIDO DO DASHBOARD
   -----------------------------------------
   Guarda somente os números necessários
   para a primeira pintura da tela.
   O Firestore continua sendo a fonte oficial.
========================================= */

function chaveCacheDashboardGestok(lojaId) {

    return `gestok_dashboard_cache_${lojaId}`;

}


function salvarCacheDashboardGestok(lojaId, produtos) {

    if (!lojaId || !Array.isArray(produtos)) {
        return;
    }

    try {

        const ativos = produtos.filter(function (produto) {
            return produto && produto.ativo !== false;
        });

        const estoqueMinimo = ativos.filter(function (produto) {

            const quantidade = Number(produto.quantidade || 0);
            const minimo = Number(produto.estoqueMinimo || 0);

            return minimo > 0 && quantidade < minimo;

        });

        const quantidadeTotal = ativos.reduce(function (total, produto) {
            return total + Number(produto.quantidade || 0);
        }, 0);

        localStorage.setItem(
            chaveCacheDashboardGestok(lojaId),
            JSON.stringify({
                produtosAtivos: ativos.length,
                estoqueMinimo: estoqueMinimo.length,
                quantidadeTotal: quantidadeTotal,
                atualizadoEm: new Date().toISOString()
            })
        );

    } catch (erro) {

        console.warn(
            "Não foi possível salvar o cache do Dashboard:",
            erro
        );

    }

}


function obterCacheDashboardGestok(lojaId) {

    if (!lojaId) {
        return null;
    }

    try {

        const dados = localStorage.getItem(
            chaveCacheDashboardGestok(lojaId)
        );

        if (!dados) {
            return null;
        }

        const cache = JSON.parse(dados);

        return cache && typeof cache === "object"
            ? cache
            : null;

    } catch (erro) {

        return null;

    }

}


async function precarregrarDashboardGestok(lojaId) {

    if (
        !lojaId ||
        typeof firebase === "undefined" ||
        !firebase.firestore
    ) {
        return null;
    }

    try {

        const snapshot = await firebase
            .firestore()
            .collection("lojas")
            .doc(lojaId)
            .collection("produtos")
            .get();

        const produtos = snapshot.docs.map(function (doc) {
            return {
                id: doc.id,
                ...doc.data()
            };
        });

        salvarCacheDashboardGestok(
            lojaId,
            produtos
        );

        return produtos;

    } catch (erro) {

        console.warn(
            "Pré-carregamento do Dashboard não concluído:",
            erro
        );

        return null;

    }

}


/* =========================================
   LOGIN
   CÓDIGO DA LOJA + USUÁRIO + SENHA
========================================= */

async function entrarGestok(

    codigoLoja,

    usuario,

    senha

) {

    codigoLoja =
        String(codigoLoja || "")
            .trim();

    usuario =
        String(usuario || "")
            .trim()
            .toLowerCase();

    senha =
        String(senha || "");


    if (!codigoLoja) {

        return {

            ok: false,

            mensagem:
                "Digite o código da loja."

        };

    }


    if (!usuario) {

        return {

            ok: false,

            mensagem:
                "Digite o usuário."

        };

    }


    if (!senha) {

        return {

            ok: false,

            mensagem:
                "Digite a senha."

        };

    }


    try {

        const db =
            firebase.firestore();


        /* =====================================
           1. LOCALIZAR ACESSO
        ===================================== */

        const acessoRef =
            db
                .collection("acessos")
                .doc(
                    `${codigoLoja}_${usuario}`
                );


        const acessoSnap =
            await acessoRef.get();


        if (!acessoSnap.exists) {

            return {

                ok: false,

                mensagem:
                    "Código da Loja ou usuário incorreto."

            };

        }


        const acesso =
            acessoSnap.data();


        if (
            !acesso.emailAuth ||
            !acesso.uid ||
            !acesso.lojaId
        ) {

            return {

                ok: false,

                mensagem:
                    "Dados de acesso da conta estão incompletos."

            };

        }


        /* =====================================
           2. LOGIN REAL NO FIREBASE AUTH
        ===================================== */

        const usuarioFirebase =
            await firebase
                .auth()
                .signInWithEmailAndPassword(

                    acesso.emailAuth,

                    senha

                );


        const user =
            usuarioFirebase.user;


        if (!user) {

            return {

                ok: false,

                mensagem:
                    "Não foi possível autenticar."

            };

        }


        /* =====================================
           3. CONFERIR UID
        ===================================== */

        if (
            user.uid !== acesso.uid
        ) {

            await firebase
                .auth()
                .signOut();


            return {

                ok: false,

                mensagem:
                    "A conta autenticada não corresponde à loja informada."

            };

        }


        /* =====================================
           4. BUSCAR LOJA
        ===================================== */

        const lojaSnap =
            await db
                .collection("lojas")
                .doc(
                    acesso.lojaId
                )
                .get();


        if (!lojaSnap.exists) {

            await firebase
                .auth()
                .signOut();


            return {

                ok: false,

                mensagem:
                    "Loja não encontrada."

            };

        }


        const loja =
            lojaSnap.data();


        /* =====================================
           5. CONFERIR DONO DA LOJA
        ===================================== */

        if (
            loja.donoUid !== user.uid
        ) {

            await firebase
                .auth()
                .signOut();


            return {

                ok: false,

                mensagem:
                    "Acesso não autorizado para esta loja."

            };

        }


        /* =====================================
           6. MONTAR CONTA LOCAL
        ===================================== */

        const conta = {

            firebaseUid:
                user.uid,

            lojaId:
                acesso.lojaId,

            nome:
                loja.nome || "",

            email:
                user.email || acesso.emailAuth,

            usuario:
                acesso.usuario,

            codigoLoja:
                acesso.codigoLoja,

            assinatura:
                normalizarAssinaturaGestok(loja.assinatura) || {

                    plano:
                        "Gestok",

                    valor:
                        30,

                    dias:
                        30,

                    inicio:
                        null,

                    vencimento:
                        null,

                    status:
                        "aguardando_pagamento",

                    pagamento:
                        "pendente"

                }

        };


        localStorage.setItem(

            GESTOK_CONTA,

            JSON.stringify(conta)

        );


        localStorage.setItem(

            GESTOK_SESSAO,

            JSON.stringify({

                logado:
                    true,

                firebaseUid:
                    user.uid,

                lojaId:
                    acesso.lojaId,

                codigoLoja:
                    acesso.codigoLoja,

                usuario:
                    acesso.usuario,

                loginEm:
                    new Date().toISOString()

            })

        );


        /* =====================================
           DEFINIR CONTEXTO IMEDIATAMENTE
           -------------------------------------
           A página seguinte já recebe a loja
           sem precisar descobri-la novamente.
        ===================================== */

        definirContextoGestok(
            user,
            conta
        );


        /* =====================================
           PRÉ-CARREGAR DADOS DO DASHBOARD
           -------------------------------------
           Se funcionar, o Dashboard já terá
           os números no primeiro carregamento.
           Se falhar, o login continua normal.
        ===================================== */

        await precarregrarDashboardGestok(
            conta.lojaId
        );


        return {

            ok: true,

            conta:
                conta,

            usuario:
                user

        };


    } catch (erro) {

        console.error(
            "Erro ao entrar no Gestok:",
            erro
        );


        return {

            ok: false,

            mensagem:
                mensagemErroFirebaseGestok(
                    erro
                ),

            erro:
                erro

        };

    }

}


/* =========================================
   APROVAR PAGAMENTO
   -----------------------------------------
   TEMPORÁRIO PARA TESTE.
   O PAGAMENTO REAL DEVERÁ SER CONFIRMADO
   PELO BACKEND/WEBHOOK.
========================================= */

async function aprovarPagamentoGestok() {

    /* =====================================
       DESATIVADA POR SEGURANÇA
       A assinatura só pode ser ativada pelo
       servidor (Cloud Functions), após a
       confirmação do pagamento. Nenhuma
       parte do sistema chamava esta função.
    ===================================== */

    return {

        ok: false,

        mensagem:
            "A ativação da assinatura é feita apenas pelo servidor de pagamentos."

    };

}


/* =========================================
   EXIGIR LOGIN
   -----------------------------------------
   IMPORTANTE:
   FIREBASE AUTH É A AUTORIDADE.
========================================= */

function exigirLoginGestok() {

    const usuario =
        usuarioFirebaseAtualGestok();


    const pagina =
        window.location.pathname
            .toLowerCase();


    const paginasPublicas = [

        "/login/index.html",

        "/cadastro/index.html",

        "/planos/index.html",

        "/apresentacao.html",

        "/index.html"

    ];


    const paginaPublica =
        paginasPublicas.some(

            function (item) {

                return pagina.endsWith(item);

            }

        );


    if (paginaPublica) {

        return true;

    }


    /* -----------------------------------------
       SEM FIREBASE AUTH
    ----------------------------------------- */

    if (!usuario) {

        window.location.replace(
            caminhoLoginGestok()
        );

        return false;

    }


    return true;

}


/* =========================================
   CAMINHO DO SISTEMA
========================================= */

function caminhoSistemaGestok() {

    return "../sistema/index.html";

}


/* =========================================
   CAMINHO DO LOGIN
========================================= */

function caminhoLoginGestok() {

    return "../login/index.html";

}


/* =========================================
   CAMINHO DO PAGAMENTO
========================================= */

function caminhoPagamentoGestok() {

    return "../pagamento/index.html";

}


/* =========================================
   SAIR
========================================= */

async function sairGestok() {

    try {

        await firebase
            .auth()
            .signOut();

    } catch (erro) {

        console.error(
            "Erro ao sair do Firebase:",
            erro
        );

    }

    localStorage.removeItem(
        "gestok_sessao"
    );

    localStorage.removeItem(
        "gestok_conta"
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

    if (
        typeof definirContextoGestok ===
        "function"
    ) {

        definirContextoGestok(
            null,
            null
        );

    }

    window.location.replace(
        caminhoLoginGestok()
    );

}


/* =========================================
   DIAS RESTANTES
========================================= */

function diasRestantesGestok(

    conta =
        obterContaGestok()

) {

    if (

        !conta ||

        !conta.assinatura ||

        !conta.assinatura.vencimento

    ) {

        return 0;

    }


    const vencimento =
        new Date(
            conta.assinatura.vencimento
        ).getTime();


    if (
        !Number.isFinite(vencimento)
    ) {

        return 0;

    }


    const diferenca =
        vencimento -
        Date.now();


    return Math.max(

        0,

        Math.ceil(
            diferenca /
            86400000
        )

    );

}


/* =========================================
   MENSAGENS DE ERRO FIREBASE
========================================= */

function mensagemErroFirebaseGestok(
    erro
) {

    if (!erro) {

        return "Ocorreu um erro inesperado.";

    }


    const codigo =
        erro.code || "";


    const mensagens = {

        "auth/email-already-in-use":
            "Este e-mail já está cadastrado no Firebase.",

        "auth/invalid-email":
            "O e-mail informado é inválido.",

        "auth/weak-password":
            "A senha é muito fraca.",

        "auth/user-not-found":
            "Usuário não encontrado.",

        "auth/wrong-password":
            "Senha incorreta.",

        "auth/invalid-credential":
            "Código, usuário ou senha incorretos.",

        "auth/too-many-requests":
            "Muitas tentativas. Aguarde alguns minutos e tente novamente.",

        "auth/network-request-failed":
            "Falha de conexão com o Firebase.",

        "auth/operation-not-allowed":
            "O método de login por e-mail e senha não está habilitado no Firebase.",

        "permission-denied":
            "O Firebase bloqueou o acesso ao Firestore pelas regras de segurança.",

        "failed-precondition":
            "O Firebase recusou a operação por uma condição não atendida."

    };


    if (
        mensagens[codigo]
    ) {

        return mensagens[codigo];

    }


    if (
        erro.message
    ) {

        return erro.message;

    }


    return "Ocorreu um erro ao processar a operação.";

}


/* =========================================
   VERIFICAÇÃO DE ASSINATURA A CADA PÁGINA
   -----------------------------------------
   O login já confere a assinatura, mas quem
   continua logado também precisa ser barrado
   quando o teste grátis ou o plano vencer.
   Lê a assinatura do Firestore (fonte real,
   protegida pelas regras) e atualiza o cache
   local, em vez de confiar no localStorage.
   Se houver falha de rede/permissão, NÃO
   bloqueia o usuário.
========================================= */

(function () {

    function caminhoPaginaGestok() {

        return window.location.pathname.toLowerCase();

    }


    function paginaIsentaAssinaturaGestok() {

        const pagina = caminhoPaginaGestok();

        const isentas = [

            "/login/",
            "/cadastro/",
            "/planos/",
            "/pagamento/",
            "/perfil/",
            "/suporte/",
            "/apresentacao.html"

        ];

        if (
            pagina === "/" ||
            pagina.endsWith("/index.html") &&
            pagina.split("/").filter(Boolean).length <= 1
        ) {

            return true;

        }

        return isentas.some(function (item) {

            return pagina.indexOf(item) !== -1;

        });

    }


    function caminhoPagamentoRelativoGestok() {

        const pagina = caminhoPaginaGestok();

        if (
            pagina.indexOf("/produtos/consulta/") !== -1 ||
            pagina.indexOf("/suporte/chamados/") !== -1
        ) {

            return "../../pagamento/index.html";

        }

        return "../pagamento/index.html";

    }


    async function verificarAssinaturaGestok(usuario) {

        try {

            if (paginaIsentaAssinaturaGestok()) {

                return;

            }

            const conta = obterContaGestok();

            if (!conta || !conta.lojaId) {

                return;

            }

            const snap =
                await firebase
                    .firestore()
                    .collection("lojas")
                    .doc(conta.lojaId)
                    .get();

            if (!snap.exists) {

                return;

            }

            const loja = snap.data();

            if (!loja || loja.donoUid !== usuario.uid) {

                return;

            }

            const assinatura =
                normalizarAssinaturaGestok(loja.assinatura) || {

                    plano: "Gestok",
                    valor: 30,
                    dias: 30,
                    inicio: null,
                    vencimento: null,
                    status: "aguardando_pagamento",
                    pagamento: "pendente"

                };

            const contaAtual =
                Object.assign({}, conta, { assinatura: assinatura });

            localStorage.setItem(
                GESTOK_CONTA,
                JSON.stringify(contaAtual)
            );

            if (!assinaturaAtivaGestok(contaAtual)) {

                window.location.replace(
                    caminhoPagamentoRelativoGestok()
                );

            }

        } catch (erro) {

            console.warn(
                "Não foi possível verificar a assinatura agora:",
                erro && erro.code
            );

        }

    }


    function iniciarVerificacaoAssinaturaGestok() {

        try {

            if (
                typeof firebase === "undefined" ||
                !firebase.apps ||
                !firebase.apps.length ||
                !firebase.auth ||
                !firebase.firestore
            ) {

                return;

            }

            let jaVerificou = false;

            firebase.auth().onAuthStateChanged(function (usuario) {

                if (!usuario || jaVerificou) {

                    return;

                }

                jaVerificou = true;

                verificarAssinaturaGestok(usuario);

            });

        } catch (erro) {

            console.warn("Verificação de assinatura indisponível.");

        }

    }


    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            iniciarVerificacaoAssinaturaGestok
        );

    } else {

        iniciarVerificacaoAssinaturaGestok();

    }

})();


/* =========================================
   AVISO DO PERÍODO GRÁTIS (tela do sistema)
   Mostra até quando vai o teste grátis e
   quanto será cobrado depois.
========================================= */

(function () {

    function mostrarAvisoTesteGratisGestok() {

        try {

            if (window.location.pathname.toLowerCase().indexOf("/sistema/") === -1) {
                return;
            }

            const conta = obterContaGestok();
            const a = conta && conta.assinatura;

            if (
                !a ||
                a.status !== "teste_gratis" ||
                a.pagamento !== "gratis" ||
                !assinaturaAtivaGestok(conta)
            ) {
                return;
            }

            try {
                if (sessionStorage.getItem("gestok_aviso_teste_fechado") === "1") {
                    return;
                }
            } catch (e) { }

            const principal = document.querySelector("main.main-content");

            if (!principal || document.getElementById("gestokAvisoTeste")) {
                return;
            }

            const vencimento = new Date(a.vencimento);
            const dias = Math.max(0, Math.ceil((vencimento.getTime() - Date.now()) / 86400000));
            const dataTxt = vencimento.toLocaleDateString("pt-BR");
            const urgente = dias <= 5;

            const caixa = document.createElement("div");
            caixa.id = "gestokAvisoTeste";
            caixa.setAttribute("role", "status");
            caixa.style.cssText =
                "display:flex;align-items:flex-start;justify-content:space-between;gap:14px;" +
                "margin:0 0 20px;padding:14px 18px;border-radius:14px;font-size:14px;line-height:1.55;" +
                "border:1px solid " + (urgente ? "#fcd9a8" : "#cfe0fb") + ";" +
                "background:" + (urgente ? "#fff6e8" : "#eef5ff") + ";" +
                "color:" + (urgente ? "#7a4a06" : "#1e3a6e") + ";";

            const texto = document.createElement("div");
            texto.innerHTML =
                "<strong>🎁 Você está no período grátis</strong> até <strong>" + dataTxt +
                "</strong> (" + (dias === 1 ? "1 dia restante" : dias + " dias restantes") + ").<br>" +
                "Depois dessa data, será cobrado <strong>R$ 30,00</strong> a cada 30 dias para continuar usando o Gestok. " +
                '<a href="../pagamento/index.html" style="color:inherit;font-weight:700;">Ver pagamento</a>';

            const fechar = document.createElement("button");
            fechar.type = "button";
            fechar.setAttribute("aria-label", "Fechar aviso");
            fechar.textContent = "×";
            fechar.style.cssText =
                "border:0;background:transparent;color:inherit;font-size:22px;line-height:1;cursor:pointer;padding:0 4px;";
            fechar.addEventListener("click", function () {
                caixa.remove();
                try {
                    sessionStorage.setItem("gestok_aviso_teste_fechado", "1");
                } catch (e) { }
            });

            caixa.appendChild(texto);
            caixa.appendChild(fechar);
            principal.insertBefore(caixa, principal.firstChild);

        } catch (erro) {
            console.warn("Aviso do período grátis indisponível.");
        }

    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mostrarAvisoTesteGratisGestok);
    } else {
        mostrarAvisoTesteGratisGestok();
    }

})();
