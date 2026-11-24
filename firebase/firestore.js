// =========================================
// GESTOK - FIRESTORE / MULTI-TENANT
// =========================================

const db = firebase.firestore();

/* Rede instável / bloqueio de QUIC / antivírus / proxy: se a conexão em tempo
   real falhar, o Firestore troca sozinho para "long polling" (mais compatível). */
try {
    db.settings({ experimentalAutoDetectLongPolling: true, merge: true });
} catch (erro) { }

/* Cache local do Firestore: nas próximas aberturas os dados aparecem
   na hora e são atualizados em seguida com os dados do servidor. */
try {
    db.enablePersistence({ synchronizeTabs: true }).catch(function () { });
} catch (erro) { }

function referenciaLoja(lojaId) {
    return db.collection('lojas').doc(lojaId);
}

function referenciaUsuarios(lojaId) {
    return referenciaLoja(lojaId).collection('usuarios');
}

function referenciaOperadores(lojaId) {
    return referenciaLoja(lojaId).collection('operadores');
}

function referenciaProdutos(lojaId) {
    return referenciaLoja(lojaId).collection('produtos');
}

function referenciaMovimentacoes(lojaId) {
    return referenciaLoja(lojaId).collection('movimentacoes');
}

function referenciaChamados(lojaId) {
    return referenciaLoja(lojaId).collection('chamados');
}

function referenciaSolicitacoes(lojaId) {
    return referenciaLoja(lojaId).collection('solicitacoes');
}

function referenciaLotes(lojaId) {
    return referenciaLoja(lojaId).collection('lotes');
}

function referenciaFornecedores(lojaId) {
    return referenciaLoja(lojaId).collection('fornecedores');
}

function referenciaCategorias(lojaId) {
    return referenciaLoja(lojaId).collection('categorias');
}

/* Categorias nativas do Gestok: usadas no cadastro de produtos e nos relatórios. */
const CATEGORIAS_NATIVAS_GESTOK = ['Eletrônicos', 'Informática', 'Escritório', 'Ferramentas', 'Materiais', 'Outros'];
