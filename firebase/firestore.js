// =========================================
// GESTOK - FIRESTORE / MULTI-TENANT
// =========================================

const db = firebase.firestore();

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
