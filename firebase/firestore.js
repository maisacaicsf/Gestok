// =========================================
// GESTOK - FIRESTORE / MULTI-TENANT
// =========================================

const db = firebase.firestore();

function referenciaLoja(lojaId) {
    return db.collection('lojas').doc(lojaId);
}

function referenciaUsuarios(lojaId) {
    return referenciaLoja(lojaId).collection('usuarios');
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
