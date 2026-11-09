/* =========================================
   GESTOK — CARREGAMENTO INICIAL
   Aguarda os primeiros retornos do Firebase antes de liberar a tela.
========================================= */
(function () {
    if (window.__gestokLoadingInstalled) return;
    window.__gestokLoadingInstalled = true;

    const inicio = Date.now();
    let pendentes = 0;
    let ultimoEvento = Date.now();
    let encerrado = false;
    let timer;

    const estilo = document.createElement('style');
    estilo.textContent = `
      #gestok-loading-screen{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(248,250,252,.97);backdrop-filter:blur(5px);opacity:1;visibility:visible;transition:opacity .28s ease,visibility .28s ease;font-family:inherit}
      #gestok-loading-screen.gestok-loading-hidden{opacity:0;visibility:hidden;pointer-events:none}
      #gestok-loading-screen .gestok-loading-card{display:flex;flex-direction:column;align-items:center;gap:12px;padding:30px 36px;text-align:center}
      #gestok-loading-screen .gestok-loading-brand{font-size:23px;font-weight:750;letter-spacing:-.5px;color:#172554}
      #gestok-loading-screen .gestok-loading-brand span{display:inline-flex;width:30px;height:30px;align-items:center;justify-content:center;margin-right:8px;border-radius:9px;background:#2563eb;color:white;font-size:15px;vertical-align:middle}
      #gestok-loading-screen .gestok-loading-spinner{width:34px;height:34px;border:3px solid #dbeafe;border-top-color:#2563eb;border-radius:50%;animation:gestok-spin .8s linear infinite}
      #gestok-loading-screen .gestok-loading-title{font-size:14px;font-weight:650;color:#334155}
      #gestok-loading-screen .gestok-loading-subtitle{font-size:12px;color:#94a3b8}
      @keyframes gestok-spin{to{transform:rotate(360deg)}}
      @media(prefers-reduced-motion:reduce){#gestok-loading-screen .gestok-loading-spinner{animation-duration:2s}}
    `;
    (document.head || document.documentElement).appendChild(estilo);

    const tela = document.createElement('div');
    tela.id = 'gestok-loading-screen';
    tela.setAttribute('role', 'status');
    tela.setAttribute('aria-live', 'polite');
    tela.innerHTML = '<div class="gestok-loading-card"><div class="gestok-loading-brand"><span>G</span>Gestok</div><div class="gestok-loading-spinner" aria-hidden="true"></div><div class="gestok-loading-title">Conectando ao sistema...</div><div class="gestok-loading-subtitle">Carregando informações e sincronizando dados.</div></div>';
    (document.body || document.documentElement).appendChild(tela);

    function atividade() {
        ultimoEvento = Date.now();
        agendarFechamento();
    }
    function iniciar() { pendentes++; atividade(); }
    function concluir() { pendentes = Math.max(0, pendentes - 1); atividade(); }

    function agendarFechamento() {
        clearTimeout(timer);
        if (encerrado) return;
        timer = setTimeout(() => {
            const tempoMinimo = 650;
            const ocioso = Date.now() - ultimoEvento >= 550;
            if (pendentes === 0 && ocioso && Date.now() - inicio >= tempoMinimo) {
                encerrado = true;
                tela.classList.add('gestok-loading-hidden');
                setTimeout(() => tela.remove(), 350);
            } else {
                agendarFechamento();
            }
        }, 180);
    }

    // Leituras pontuais (.get())
    function instrumentarGet(proto) {
        if (!proto || typeof proto.get !== 'function' || proto.get.__gestokWrapped) return;
        const original = proto.get;
        function wrappedGet() {
            iniciar();
            let resultado;
            try { resultado = original.apply(this, arguments); }
            catch (erro) { concluir(); throw erro; }
            return Promise.resolve(resultado).then(
                valor => { concluir(); return valor; },
                erro => { concluir(); throw erro; }
            );
        }
        wrappedGet.__gestokWrapped = true;
        proto.get = wrappedGet;
    }

    // Listeners em tempo real: conta somente até a primeira resposta.
    function instrumentarSnapshot(proto) {
        if (!proto || typeof proto.onSnapshot !== 'function' || proto.onSnapshot.__gestokWrapped) return;
        const original = proto.onSnapshot;
        function wrappedSnapshot() {
            const args = Array.from(arguments);
            let indice = typeof args[0] === 'function' ? 0 : -1;
            if (indice < 0 && args[0] && typeof args[0] === 'object') indice = -2;
            if (indice === -1) return original.apply(this, args);
            iniciar();
            let primeiraResposta = false;
            const finalizar = () => {
                if (!primeiraResposta) { primeiraResposta = true; concluir(); }
            };
            if (indice >= 0) {
                const sucesso = args[indice];
                args[indice] = function () { finalizar(); return sucesso.apply(this, arguments); };
                const erroIndex = args.findIndex((a, i) => i > indice && typeof a === 'function');
                if (erroIndex >= 0) { const erro = args[erroIndex]; args[erroIndex] = function () { finalizar(); return erro.apply(this, arguments); }; }
            } else {
                const observador = args[0];
                args[0] = Object.assign({}, observador, {
                    next: function () { finalizar(); if (observador.next) return observador.next.apply(this, arguments); },
                    error: function () { finalizar(); if (observador.error) return observador.error.apply(this, arguments); }
                });
            }
            try { return original.apply(this, args); }
            catch (erro) { finalizar(); throw erro; }
        }
        wrappedSnapshot.__gestokWrapped = true;
        proto.onSnapshot = wrappedSnapshot;
    }

    function instrumentarFirebase() {
        if (!window.firebase || !firebase.firestore) return false;
        const fs = firebase.firestore;
        instrumentarGet(fs.Query && fs.Query.prototype);
        instrumentarGet(fs.DocumentReference && fs.DocumentReference.prototype);
        instrumentarSnapshot(fs.Query && fs.Query.prototype);
        instrumentarSnapshot(fs.DocumentReference && fs.DocumentReference.prototype);
        return true;
    }

    // O arquivo é carregado logo após a inicialização do Firebase.
    instrumentarFirebase();

    // Aguarda também a restauração da sessão antes de considerar a página ociosa.
    try {
        const authProto = window.firebase && firebase.auth && firebase.auth.Auth && firebase.auth.Auth.prototype;
        if (authProto && typeof authProto.onAuthStateChanged === 'function' && !authProto.onAuthStateChanged.__gestokWrapped) {
            const originalAuth = authProto.onAuthStateChanged;
            function wrappedAuth(next, error, completed) {
                if (typeof next !== 'function') return originalAuth.apply(this, arguments);
                iniciar();
                const args = Array.from(arguments);
                args[0] = function () { concluir(); return next.apply(this, arguments); };
                if (typeof error === 'function') { args[1] = function () { concluir(); return error.apply(this, arguments); }; }
                return originalAuth.apply(this, args);
            }
            wrappedAuth.__gestokWrapped = true;
            authProto.onAuthStateChanged = wrappedAuth;
        }
    } catch (e) { console.warn('Gestok: não foi possível acompanhar a autenticação.', e); }

    window.GestokLoading = {
        hide: function () { pendentes = 0; ultimoEvento = Date.now(); agendarFechamento(); },
        show: function (mensagem) {
            if (encerrado) return;
            tela.classList.remove('gestok-loading-hidden');
            const titulo = tela.querySelector('.gestok-loading-title');
            if (titulo && mensagem) titulo.textContent = mensagem;
            atividade();
        }
    };
    agendarFechamento();
})();
