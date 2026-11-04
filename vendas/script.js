/* =========================================
   GESTOK - REGISTRAR VENDAS
   Pensado para ser rápido: leitor de código de
   barras, 3*código, formas de pagamento e troco.
========================================= */

let produtosCache = [];
let carrinho = [];
let forma = "dinheiro";
let ocupado = false;
let lojaIdAtual = null;
let listenersIniciados = false;
let vendasDia = [];
let desinscreverHistorico = null;
let vendaDetalhe = null;
let resultadosAtuais = [];
let idxResultado = 0;
let paginaAtual = 1;
let itensPorPagina = 10;
let somAtivo = true;
let ultimaVendaConcluida = null;

const OPCOES_ITENS = [10, 50, 100];

const NOMES_FORMA = { dinheiro: "Dinheiro", pix: "PIX", debito: "Débito", credito: "Crédito" };

try {

    const salvo = Number(localStorage.getItem("gestok_vendas_por_pagina"));

    if (OPCOES_ITENS.indexOf(salvo) !== -1) {
        itensPorPagina = salvo;
    }

    somAtivo = localStorage.getItem("gestok_vendas_som") !== "0";

} catch (erro) { }

const el = function (id) { return document.getElementById(id); };

const campoBusca = el("campoBusca");
const campoRecebido = el("campoRecebido");
const campoDesconto = el("campoDesconto");
const campoObs = el("campoObs");


/* ---------- utilidades ---------- */

function esc(v) {

    return String(v === undefined || v === null ? "" : v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}

function norm(t) {

    return String(t || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

}

function moeda(v) {

    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

}

function fmtQtd(n) {

    return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

}

const centavos = function (v) { return Math.round(Number(v) * 100); };

const arred3 = function (n) { return Math.round(n * 1000) / 1000; };

function plural(n, um, varios) {

    return n + " " + (n === 1 ? um : varios);

}

/* Aceita "10", "10,5", "10.5" e "1.234,56" */
function lerValor(txt) {

    let t = String(txt || "").trim().replace(/[^\d.,]/g, "");

    if (!t) { return 0; }

    if (t.indexOf(",") !== -1) {
        t = t.replace(/\./g, "").replace(",", ".");
    }

    return Number(t) || 0;

}

/* "5,00" = R$ 5,00 · "10%" = 10% do subtotal */
function lerDesconto(txt, subtotalCent) {

    const t = String(txt || "").trim();

    if (!t) { return 0; }

    if (t.slice(-1) === "%") {

        const pct = Math.min(100, Math.max(0, lerValor(t.slice(0, -1))));

        return Math.round(subtotalCent * pct / 100);

    }

    return Math.min(subtotalCent, Math.max(0, centavos(lerValor(t))));

}

function erroVenda(mensagem) {

    const erro = new Error(mensagem);

    erro.amigavel = true;

    return erro;

}

function dataLocalISO(data) {

    const d = data || new Date();

    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

}

function dataDaVenda(venda) {

    const c = venda.criadoEm;

    return c && typeof c.toDate === "function" ? c.toDate() : new Date();

}


/* ---------- som e mensagens do leitor ---------- */

let audioCtx = null;

function beep(tipo) {

    if (!somAtivo) { return; }

    try {

        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();

        const osc = audioCtx.createOscillator();

        const ganho = audioCtx.createGain();

        osc.connect(ganho);

        ganho.connect(audioCtx.destination);

        osc.type = tipo === "erro" ? "square" : "sine";

        osc.frequency.value = tipo === "erro" ? 180 : 1100;

        ganho.gain.value = 0.08;

        osc.start();

        osc.stop(audioCtx.currentTime + (tipo === "erro" ? 0.28 : 0.07));

    } catch (erro) { }

}

let timerDica = null;

const DICA_PADRAO = "Dica: use <strong>3*código</strong> para lançar 3 unidades de uma vez.";

function feedback(texto, tipo) {

    const caixa = el("ultimaLeitura");

    caixa.className = "vend-dica" + (tipo ? " " + tipo : "");

    caixa.textContent = texto;

    beep(tipo === "erro" ? "erro" : "ok");

    clearTimeout(timerDica);

    timerDica = setTimeout(function () {

        caixa.className = "vend-dica";

        caixa.innerHTML = DICA_PADRAO;

    }, tipo === "erro" ? 4500 : 2800);

}

function atualizarBotaoSom() {

    el("btnSom").textContent = somAtivo ? "🔊 Som ligado" : "🔇 Som desligado";

}


/* ---------- produtos ---------- */

function produtosAtivos() {

    return produtosCache.filter(function (p) { return p.ativo !== false; });

}

function estoqueDe(p) {

    return Number(p.quantidade !== undefined ? p.quantidade : p.estoque) || 0;

}

function acharPorCodigo(texto) {

    const t = norm(texto);

    if (!t) { return null; }

    const lista = produtosAtivos();

    let achado = lista.find(function (p) { return norm(p.codigo) === t; });

    /* leitores que acrescentam/retiram zeros à esquerda */
    if (!achado && /^\d+$/.test(t)) {

        const sem = t.replace(/^0+/, "");

        if (sem) {

            achado = lista.find(function (p) {

                const c = norm(p.codigo);

                return /^\d+$/.test(c) && c.replace(/^0+/, "") === sem;

            });

        }

    }

    return achado || null;

}

function buscarPorTexto(termo) {

    const partes = norm(termo).split(/\s+/).filter(Boolean);

    if (!partes.length) { return []; }

    return produtosAtivos()
        .filter(function (p) {

            const texto = norm((p.nome || "") + " " + (p.codigo || "") + " " + (p.categoria || ""));

            return partes.every(function (parte) { return texto.indexOf(parte) !== -1; });

        })
        .sort(function (a, b) {

            const ia = norm(a.nome).indexOf(partes[0]) === 0 ? 0 : 1;
            const ib = norm(b.nome).indexOf(partes[0]) === 0 ? 0 : 1;

            return ia - ib || String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");

        })
        .slice(0, 8);

}


/* ---------- carrinho ---------- */

function subtotalCent() {

    return carrinho.reduce(function (soma, i) { return soma + centavos(i.preco * i.qtd); }, 0);

}

function adicionar(p, qtd) {

    qtd = Number(qtd);

    if (!(qtd > 0)) {

        feedback("Quantidade inválida.", "erro");

        return false;

    }

    if (p.unidade !== "KG" && !Number.isInteger(qtd)) {

        feedback("Este produto só pode ser vendido em quantidade inteira.", "erro");

        return false;

    }

    const preco = Number(p.preco || 0);

    if (!(preco > 0)) {

        feedback("\"" + (p.nome || "Produto") + "\" está sem preço cadastrado.", "erro");

        return false;

    }

    const estoque = estoqueDe(p);

    if (estoque <= 0) {

        feedback("Sem estoque: " + (p.nome || "produto"), "erro");

        return false;

    }

    const existente = carrinho.find(function (i) { return i.id === p.id; });

    const nova = (existente ? existente.qtd : 0) + qtd;

    if (nova > estoque + 1e-9) {

        feedback("Estoque insuficiente de " + (p.nome || "produto") + " (disponível: " + fmtQtd(estoque) + ").", "erro");

        return false;

    }

    if (existente) {

        existente.qtd = arred3(nova);

        existente.recente = true;

    } else {

        carrinho.unshift({
            id: p.id,
            nome: p.nome || "Sem nome",
            codigo: p.codigo || "",
            unidade: p.unidade || "UN",
            preco: preco,
            qtd: qtd,
            recente: true
        });

    }

    feedback("✓ " + (p.nome || "Produto") + " — " + moeda(preco) + (qtd !== 1 ? "  × " + fmtQtd(qtd) : ""), "ok");

    render();

    setTimeout(function () {

        carrinho.forEach(function (i) { i.recente = false; });

        render();

    }, 700);

    return true;

}

/* mantém o carrinho coerente quando preço/estoque mudam no banco */
function sincronizarCarrinho() {

    carrinho = carrinho.filter(function (i) {

        const p = produtosCache.find(function (x) { return x.id === i.id; });

        if (!p || p.ativo === false) { return false; }

        i.preco = Number(p.preco || 0);

        const estoque = estoqueDe(p);

        if (i.qtd > estoque) { i.qtd = estoque; }

        return i.qtd > 0;

    });

}

function render() {

    const area = el("carrinho");

    el("carrinhoVazio").hidden = carrinho.length > 0;

    area.innerHTML = carrinho.map(function (i, idx) {

        return '<div class="vend-item' + (i.recente ? " novo" : "") + '">' +
            '<div class="vend-qtd">' +
                '<button type="button" data-acao="menos" data-i="' + idx + '" aria-label="Diminuir">−</button>' +
                '<button type="button" class="valor" data-acao="editar" data-i="' + idx + '" title="Digitar quantidade">' + fmtQtd(i.qtd) + '</button>' +
                '<button type="button" data-acao="mais" data-i="' + idx + '" aria-label="Aumentar">+</button>' +
            '</div>' +
            '<div class="vend-item-nome">' + esc(i.nome) + '<small>' + esc(i.codigo || "sem código") + ' · ' + moeda(i.preco) + ' / ' + esc(i.unidade) + '</small></div>' +
            '<div class="vend-item-total">' + moeda(i.preco * i.qtd) + '</div>' +
            '<button type="button" class="vend-remover" data-acao="remover" data-i="' + idx + '" aria-label="Remover">×</button>' +
        '</div>';

    }).join("");

    const sub = subtotalCent();

    const desconto = lerDesconto(campoDesconto.value, sub);

    const total = sub - desconto;

    el("subtotalTxt").textContent = moeda(sub / 100);

    el("linhaDesconto").hidden = desconto === 0;

    el("descontoTxt").textContent = "- " + moeda(desconto / 100);

    el("totalTxt").textContent = moeda(total / 100);

    const soma = carrinho.reduce(function (s, i) { return s + i.qtd; }, 0);

    el("contaItens").textContent = fmtQtd(soma) + (soma === 1 ? " item" : " itens");

    /* campo "recebido" vazio = pagamento exato */
    const recebido = campoRecebido.value.trim() ? centavos(lerValor(campoRecebido.value)) : total;

    el("trocoTxt").textContent = moeda(Math.max(0, recebido - total) / 100);

    const faltaDinheiro = forma === "dinheiro" && recebido < total;

    el("btnFinalizar").disabled = !carrinho.length || ocupado || faltaDinheiro;

    el("rotuloFinalizar").textContent = ocupado ? "REGISTRANDO..." : "FINALIZAR VENDA";

}


/* ---------- leitura do código de barras / busca ---------- */

function limparBusca() {

    campoBusca.value = "";

    fecharResultados();

    campoBusca.focus();

}

function fecharResultados() {

    el("resultadosBusca").hidden = true;

    resultadosAtuais = [];

    idxResultado = 0;

}

/* "3*789123" ou "3x789123": quantidade antes do código */
function interpretarEntrada(texto) {

    const m = /^(\d+(?:[.,]\d+)?)\s*[*xX]\s*(.+)$/.exec(texto.trim());

    return m ? { qtd: lerValor(m[1]), termo: m[2].trim() } : { qtd: 1, termo: texto.trim() };

}

function desenharResultados(texto) {

    const caixa = el("resultadosBusca");

    const termo = interpretarEntrada(texto).termo;

    if (!termo) {

        fecharResultados();

        return;

    }

    resultadosAtuais = buscarPorTexto(termo);

    if (idxResultado >= resultadosAtuais.length) { idxResultado = 0; }

    caixa.innerHTML = resultadosAtuais.length
        ? resultadosAtuais.map(function (p, i) {

            const estoque = estoqueDe(p);

            return '<div class="vend-res' + (i === idxResultado ? " ativo" : "") + (estoque <= 0 ? " sem" : "") + '" data-id="' + esc(p.id) + '">' +
                '<div><strong>' + esc(p.nome || "Sem nome") + '</strong><small>' + esc(p.codigo || "sem código") + ' · ' +
                (estoque <= 0 ? '<span class="esgotado">sem estoque</span>' : "estoque " + fmtQtd(estoque) + " " + esc(p.unidade || "UN")) + '</small></div>' +
                '<span class="preco">' + moeda(p.preco) + '</span></div>';

        }).join("")
        : '<div class="vend-res-vazio">Nenhum produto encontrado.</div>';

    caixa.hidden = false;

}

function processarEntrada(texto) {

    const bruto = String(texto || "").trim();

    if (!bruto) { return; }

    /* o código inteiro pode conter "x" ou "*": tenta como código primeiro */
    const direto = acharPorCodigo(bruto);

    if (direto) {

        adicionar(direto, 1);

        limparBusca();

        return;

    }

    const entrada = interpretarEntrada(bruto);

    const escolhido = acharPorCodigo(entrada.termo) ||
        (resultadosAtuais.length ? resultadosAtuais[idxResultado] : null) ||
        buscarPorTexto(entrada.termo)[0];

    if (!escolhido) {

        feedback("Produto não encontrado: " + bruto, "erro");

        campoBusca.select();

        return;

    }

    adicionar(escolhido, entrada.qtd);

    limparBusca();

}

/* Leitores que NÃO enviam Enter: se um código completo chega "de uma vez", já lança */
let ultimoInput = 0;
let intervalos = [];
let timerLeitor = null;

campoBusca.addEventListener("input", function () {

    desenharResultados(campoBusca.value);

    const agora = performance.now();

    if (agora - ultimoInput > 300) {
        intervalos = [];
    } else {
        intervalos.push(agora - ultimoInput);
    }

    ultimoInput = agora;

    clearTimeout(timerLeitor);

    timerLeitor = setTimeout(function () {

        const valor = campoBusca.value.trim();

        if (valor.length < 4 || intervalos.length < 3) { return; }

        const media = intervalos.reduce(function (s, v) { return s + v; }, 0) / intervalos.length;

        /* digitação humana é bem mais lenta que um leitor */
        if (media > 45) { return; }

        const produto = acharPorCodigo(valor);

        if (produto) {

            adicionar(produto, 1);

            limparBusca();

        }

    }, 110);

});

campoBusca.addEventListener("keydown", function (event) {

    if (event.key === "Enter" || event.key === "Tab" && campoBusca.value.trim() && acharPorCodigo(campoBusca.value)) {

        event.preventDefault();

        clearTimeout(timerLeitor);

        processarEntrada(campoBusca.value);

    } else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && resultadosAtuais.length) {

        event.preventDefault();

        idxResultado = (idxResultado + (event.key === "ArrowDown" ? 1 : -1) + resultadosAtuais.length) % resultadosAtuais.length;

        desenharResultados(campoBusca.value);

    }

});

el("resultadosBusca").addEventListener("mousedown", function (event) {

    event.preventDefault();

    const linha = event.target.closest(".vend-res[data-id]");

    if (!linha) { return; }

    const produto = produtosCache.find(function (p) { return p.id === linha.dataset.id; });

    if (produto) {

        adicionar(produto, interpretarEntrada(campoBusca.value).qtd);

        limparBusca();

    }

});

campoBusca.addEventListener("blur", function () {

    setTimeout(fecharResultados, 150);

});

/* O leitor "digita" onde estiver o foco: se o foco se perdeu, devolvemos para a busca */
document.addEventListener("keydown", function (event) {

    if (event.ctrlKey || event.altKey || event.metaKey) { return; }

    if (document.querySelector(".vend-overlay:not([hidden])")) { return; }

    const alvo = event.target;

    const emCampo = alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.tagName === "SELECT" || alvo.isContentEditable);

    if (emCampo) { return; }

    if (event.key.length === 1 || event.key === "Enter") {

        campoBusca.focus();

    }

});


/* ---------- carrinho: botões ---------- */

el("carrinho").addEventListener("click", function (event) {

    const botao = event.target.closest("[data-acao]");

    if (!botao) { return; }

    const idx = Number(botao.dataset.i);

    const item = carrinho[idx];

    if (!item) { return; }

    const produto = produtosCache.find(function (p) { return p.id === item.id; });

    const estoque = produto ? estoqueDe(produto) : item.qtd;

    if (botao.dataset.acao === "mais") {

        if (item.qtd + 1 > estoque + 1e-9) {

            feedback("Estoque insuficiente (disponível: " + fmtQtd(estoque) + ").", "erro");

            return;

        }

        item.qtd = arred3(item.qtd + 1);

    } else if (botao.dataset.acao === "menos") {

        item.qtd = arred3(item.qtd - 1);

        if (item.qtd <= 0) { carrinho.splice(idx, 1); }

    } else if (botao.dataset.acao === "editar") {

        const v = lerValor(prompt("Quantidade de \"" + item.nome + "\" (" + item.unidade + "):", fmtQtd(item.qtd)));

        if (!(v > 0)) { return; }

        if (item.unidade !== "KG" && !Number.isInteger(v)) {

            feedback("Este produto só pode ser vendido em quantidade inteira.", "erro");

            return;

        }

        if (v > estoque + 1e-9) {

            feedback("Estoque insuficiente (disponível: " + fmtQtd(estoque) + ").", "erro");

            return;

        }

        item.qtd = arred3(v);

    } else {

        carrinho.splice(idx, 1);

    }

    render();

    campoBusca.focus();

});


/* ---------- pagamento ---------- */

document.querySelectorAll(".vend-forma").forEach(function (botao) {

    botao.addEventListener("click", function () {

        document.querySelectorAll(".vend-forma").forEach(function (b) { b.classList.remove("ativo"); });

        botao.classList.add("ativo");

        forma = botao.dataset.forma;

        el("blocoRecebido").hidden = forma !== "dinheiro";

        if (forma !== "dinheiro") { campoRecebido.value = ""; }

        render();

        campoBusca.focus();

    });

});

document.querySelectorAll("[data-rapido]").forEach(function (botao) {

    botao.addEventListener("click", function () {

        const total = (subtotalCent() - lerDesconto(campoDesconto.value, subtotalCent())) / 100;

        campoRecebido.value = botao.dataset.rapido === "exato"
            ? total.toFixed(2).replace(".", ",")
            : Number(botao.dataset.rapido).toFixed(2).replace(".", ",");

        render();

    });

});

campoRecebido.addEventListener("input", render);
campoDesconto.addEventListener("input", render);

campoRecebido.addEventListener("keydown", function (event) {

    if (event.key === "Enter") {

        event.preventDefault();

        finalizar();

    }

});

el("btnLimparVenda").addEventListener("click", function () {

    if (carrinho.length && !confirm("Limpar todos os itens da venda?")) { return; }

    novaVenda();

});

el("btnSom").addEventListener("click", function () {

    somAtivo = !somAtivo;

    try {
        localStorage.setItem("gestok_vendas_som", somAtivo ? "1" : "0");
    } catch (erro) { }

    atualizarBotaoSom();

    if (somAtivo) { beep("ok"); }

    campoBusca.focus();

});

function novaVenda() {

    carrinho = [];

    campoRecebido.value = "";

    campoDesconto.value = "";

    campoObs.value = "";

    el("modalConcluida").hidden = true;

    render();

    limparBusca();

}


/* ---------- finalizar venda ---------- */

async function finalizar() {

    if (ocupado || !carrinho.length) { return; }

    const sub = subtotalCent();

    const desconto = lerDesconto(campoDesconto.value, sub);

    const totalEsperado = sub - desconto;

    const recebidoInformado = campoRecebido.value.trim() ? centavos(lerValor(campoRecebido.value)) : totalEsperado;

    if (forma === "dinheiro" && recebidoInformado < totalEsperado) {

        feedback("O valor recebido é menor que o total.", "erro");

        return;

    }

    ocupado = true;

    render();

    const lojaId = lojaIdAtual;

    const lojaRef = referenciaLoja(lojaId);

    const contadorRef = lojaRef.collection("contadores").doc("vendas");

    const vendaRef = lojaRef.collection("vendas").doc();

    const itensCarrinho = carrinho.map(function (i) { return Object.assign({}, i); });

    const formaVenda = forma;

    const observacao = campoObs.value.trim();

    const usuario = firebase.auth().currentUser;

    const conta = typeof obterContaGestok === "function" ? obterContaGestok() : null;

    try {

        const venda = await db.runTransaction(async function (transaction) {

            /* todas as leituras antes das escritas */
            const contadorSnap = await transaction.get(contadorRef);

            const produtoSnaps = [];

            for (const item of itensCarrinho) {
                produtoSnaps.push(await transaction.get(referenciaProdutos(lojaId).doc(item.id)));
            }

            let subtotal = 0;

            const linhas = produtoSnaps.map(function (ps, idx) {

                const item = itensCarrinho[idx];

                if (!ps.exists) { throw erroVenda("Um produto da venda não existe mais."); }

                const p = ps.data();

                if (p.ativo === false) { throw erroVenda("Produto inativo: " + p.nome); }

                const preco = Number(p.preco || 0);

                if (Math.abs(preco - item.preco) > 0.0001) {
                    throw erroVenda("O preço de \"" + p.nome + "\" mudou para " + moeda(preco) + ". Confira o carrinho e finalize de novo.");
                }

                const estoque = Number(p.quantidade !== undefined ? p.quantidade : p.estoque) || 0;

                if (item.qtd > estoque + 1e-9) {
                    throw erroVenda("Estoque insuficiente: " + p.nome + " (disponível: " + fmtQtd(estoque) + ")");
                }

                const totalItem = centavos(preco * item.qtd);

                subtotal += totalItem;

                return {
                    ref: ps.ref,
                    p: p,
                    qtd: item.qtd,
                    preco: preco,
                    unidade: p.unidade || "UN",
                    estoque: estoque,
                    novo: arred3(estoque - item.qtd),
                    totalItem: totalItem
                };

            });

            const descontoCent = Math.min(desconto, subtotal);

            const totalCent = subtotal - descontoCent;

            const recebidoCent = formaVenda === "dinheiro" ? recebidoInformado : totalCent;

            if (recebidoCent < totalCent) { throw erroVenda("O valor recebido é menor que o total."); }

            const numero = (contadorSnap.exists ? Number(contadorSnap.data().ultimo || 0) : 0) + 1;

            const agora = new Date().toISOString();

            const motivo = "Venda";

            linhas.forEach(function (l) {

                transaction.update(l.ref, {
                    quantidade: l.novo,
                    ultimaSaida: {
                        quantidade: l.qtd,
                        estoqueAnterior: l.estoque,
                        estoqueNovo: l.novo,
                        motivo: motivo,
                        observacao: "Venda nº " + numero,
                        data: agora
                    },
                    dataAtualizacao: agora
                });

                transaction.set(referenciaMovimentacoes(lojaId).doc(), {
                    tipo: "Saída",
                    produtoId: l.ref.id,
                    produto: l.p.nome || "",
                    codigo: l.p.codigo || "",
                    quantidade: l.qtd,
                    unidade: l.unidade,
                    estoqueAnterior: l.estoque,
                    estoqueNovo: l.novo,
                    motivo: motivo,
                    observacao: "Venda nº " + numero + (observacao ? " — " + observacao : ""),
                    usuarioUid: usuario ? usuario.uid : null,
                    lojaId: lojaId,
                    origem: "Gestok",
                    vendaId: vendaRef.id,
                    data: agora
                });

            });

            transaction.set(contadorRef, { ultimo: numero }, { merge: true });

            transaction.set(vendaRef, {
                numero: numero,
                lojaId: lojaId,
                origem: "Gestok",
                operadorNome: (conta && (conta.nome || conta.usuario)) || (usuario && usuario.email) || "Gestok",
                formaPagamento: formaVenda,
                itens: linhas.map(function (l) {
                    return {
                        produtoId: l.ref.id,
                        nome: l.p.nome || "",
                        codigo: l.p.codigo || "",
                        unidade: l.unidade,
                        quantidade: l.qtd,
                        preco: l.preco,
                        total: l.totalItem / 100
                    };
                }),
                valorBruto: subtotal / 100,
                desconto: descontoCent / 100,
                valorTotal: totalCent / 100,
                valorRecebido: recebidoCent / 100,
                troco: (recebidoCent - totalCent) / 100,
                observacao: observacao,
                status: "finalizada",
                criadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });

            return {
                numero: numero,
                valorTotal: totalCent / 100,
                valorBruto: subtotal / 100,
                desconto: descontoCent / 100,
                valorRecebido: recebidoCent / 100,
                troco: (recebidoCent - totalCent) / 100,
                formaPagamento: formaVenda,
                data: Date.now(),
                itens: linhas.map(function (l) {
                    return { nome: l.p.nome || "", unidade: l.unidade, quantidade: l.qtd, preco: l.preco, total: l.totalItem / 100 };
                })
            };

        });

        ultimaVendaConcluida = venda;

        mostrarConcluida(venda);

        beep("ok");

    } catch (erro) {

        console.error("Erro ao registrar venda:", erro);

        feedback(erro && erro.amigavel ? erro.message : "Não foi possível registrar a venda. Verifique a internet e tente de novo.", "erro");

    } finally {

        ocupado = false;

        render();

    }

}

el("btnFinalizar").addEventListener("click", finalizar);

function mostrarConcluida(venda) {

    el("okNumero").textContent = venda.numero;

    el("okTotal").textContent = moeda(venda.valorTotal);

    el("okTroco").textContent = moeda(venda.troco);

    el("okLinhaTroco").hidden = venda.formaPagamento !== "dinheiro";

    el("receipt").innerHTML = montarComprovante(venda);

    el("modalConcluida").hidden = false;

    el("btnOkNova").focus();

}

el("btnOkNova").addEventListener("click", novaVenda);

el("btnOkImprimir").addEventListener("click", function () { window.print(); });


/* ---------- comprovante não fiscal ---------- */

function montarComprovante(v) {

    const conta = typeof obterContaGestok === "function" ? obterContaGestok() : null;

    const loja = (conta && (conta.nomeLoja || conta.loja || conta.nome)) || "Gestok";

    const itens = v.itens.map(function (i) {

        return '<div class="r-item"><span>' + fmtQtd(i.quantidade) + " " + esc(i.unidade) + " x " + esc(i.nome) + '</span><span>' + moeda(i.total) + '</span></div>';

    }).join("");

    return '<div class="r-center"><b>' + esc(loja) + '</b><br>CUPOM NÃO FISCAL</div><hr>' +
        '<div>Venda nº ' + v.numero + '</div><div>' + new Date(v.data).toLocaleString("pt-BR") + '</div><hr>' +
        itens + '<hr>' +
        (v.desconto > 0 ? '<div class="r-item"><span>Subtotal</span><span>' + moeda(v.valorBruto) + '</span></div><div class="r-item"><span>Desconto</span><span>- ' + moeda(v.desconto) + '</span></div>' : "") +
        '<div class="r-item r-total"><span>TOTAL</span><span>' + moeda(v.valorTotal) + '</span></div>' +
        '<div class="r-item"><span>' + esc(NOMES_FORMA[v.formaPagamento] || v.formaPagamento) + '</span><span>' + moeda(v.valorRecebido) + '</span></div>' +
        (v.formaPagamento === "dinheiro" ? '<div class="r-item"><span>Troco</span><span>' + moeda(v.troco) + '</span></div>' : "") +
        '<hr><div class="r-center">Documento sem valor fiscal.<br>Obrigado pela preferência!</div>';

}


/* ---------- histórico do dia ---------- */

function iniciarHistorico() {

    if (desinscreverHistorico) {

        desinscreverHistorico();

        desinscreverHistorico = null;

    }

    const partes = (el("dataHistorico").value || dataLocalISO()).split("-").map(Number);

    const inicio = new Date(partes[0], partes[1] - 1, partes[2], 0, 0, 0);

    const fim = new Date(partes[0], partes[1] - 1, partes[2] + 1, 0, 0, 0);

    desinscreverHistorico = referenciaLoja(lojaIdAtual)
        .collection("vendas")
        .where("criadoEm", ">=", inicio)
        .where("criadoEm", "<", fim)
        .orderBy("criadoEm", "desc")
        .onSnapshot(function (snap) {

            vendasDia = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });

            atualizarHistorico();

        }, function (erro) {

            console.error("Erro ao carregar vendas:", erro);

            alert("Não foi possível carregar as vendas. Confira se as regras do Firestore foram atualizadas.");

        });

}

function atualizarHistorico() {

    const validas = vendasDia.filter(function (v) { return v.status !== "cancelada"; });

    const faturamento = validas.reduce(function (s, v) { return s + Number(v.valorTotal || 0); }, 0);

    el("resQtd").textContent = validas.length;

    el("resFat").textContent = moeda(faturamento);

    el("resTicket").textContent = moeda(validas.length ? faturamento / validas.length : 0);

    const porForma = {};

    validas.forEach(function (v) {

        porForma[v.formaPagamento] = (porForma[v.formaPagamento] || 0) + Number(v.valorTotal || 0);

    });

    const textoFormas = Object.keys(NOMES_FORMA)
        .filter(function (k) { return porForma[k]; })
        .map(function (k) { return NOMES_FORMA[k] + " " + moeda(porForma[k]); })
        .join(" · ");

    el("resFormas").textContent = textoFormas || "—";

    el("histCount").textContent = plural(vendasDia.length, "venda", "vendas");

    renderizarTabela();

}

function renderizarTabela() {

    const total = vendasDia.length;

    const totalPaginas = Math.max(1, Math.ceil(total / itensPorPagina));

    paginaAtual = Math.min(Math.max(1, paginaAtual), totalPaginas);

    const inicio = (paginaAtual - 1) * itensPorPagina;

    const pagina = vendasDia.slice(inicio, inicio + itensPorPagina);

    el("historicoTabela").innerHTML = pagina.map(function (v) {

        const itens = (v.itens || []);

        const resumo = itens.slice(0, 2).map(function (i) { return fmtQtd(i.quantidade) + "× " + esc(i.nome); }).join(", ") +
            (itens.length > 2 ? " +" + (itens.length - 2) : "");

        const cancelada = v.status === "cancelada";

        return '<tr class="' + (cancelada ? "cancelada" : "") + '">' +
            '<td><strong>#' + esc(v.numero || "—") + '</strong></td>' +
            '<td>' + dataDaVenda(v).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) + '</td>' +
            '<td>' + (resumo || "—") + '</td>' +
            '<td>' + esc(NOMES_FORMA[v.formaPagamento] || v.formaPagamento || "—") + '</td>' +
            '<td><strong>' + moeda(v.valorTotal) + '</strong></td>' +
            '<td><span class="vend-badge origem">' + esc(v.origem || "PDV") + '</span></td>' +
            '<td><span class="vend-badge ' + (cancelada ? "cancelada" : "finalizada") + '">' + (cancelada ? "Cancelada" : "Finalizada") + '</span></td>' +
            '<td><div class="vend-acoes">' +
                '<button type="button" class="vend-acao" data-acao="ver" data-id="' + esc(v.id) + '">Ver</button>' +
                (cancelada ? "" : '<button type="button" class="vend-acao perigo" data-acao="cancelar" data-id="' + esc(v.id) + '">Cancelar</button>') +
            '</div></td></tr>';

    }).join("");

    el("semVendas").style.display = total === 0 ? "flex" : "none";

    const pag = el("paginacaoVend");

    if (total === 0) {

        pag.style.display = "none";

        return;

    }

    pag.style.display = "flex";

    el("itensPorPaginaVend").value = String(itensPorPagina);

    el("paginaInfoVend").textContent = "Mostrando " + (inicio + 1) + "–" + (inicio + pagina.length) + " de " + total;

    if (totalPaginas <= 1) {

        el("paginaNavVend").innerHTML = "";

        return;

    }

    const numeros = [1, totalPaginas, paginaAtual - 1, paginaAtual, paginaAtual + 1]
        .filter(function (n, i, arr) { return n >= 1 && n <= totalPaginas && arr.indexOf(n) === i; })
        .sort(function (a, b) { return a - b; });

    let html = '<button type="button" class="page-btn" data-pagina="' + (paginaAtual - 1) + '"' + (paginaAtual === 1 ? " disabled" : "") + '>‹ Anterior</button>';

    let anterior = 0;

    numeros.forEach(function (n) {

        if (n - anterior > 1) { html += '<span class="page-gap">…</span>'; }

        html += '<button type="button" class="page-btn' + (n === paginaAtual ? " active" : "") + '" data-pagina="' + n + '">' + n + '</button>';

        anterior = n;

    });

    html += '<button type="button" class="page-btn" data-pagina="' + (paginaAtual + 1) + '"' + (paginaAtual === totalPaginas ? " disabled" : "") + '>Próxima ›</button>';

    el("paginaNavVend").innerHTML = html;

}

el("paginaNavVend").addEventListener("click", function (event) {

    const botao = event.target.closest("button[data-pagina]");

    if (!botao || botao.disabled) { return; }

    paginaAtual = Number(botao.dataset.pagina);

    renderizarTabela();

});

el("itensPorPaginaVend").addEventListener("change", function () {

    const valor = Number(el("itensPorPaginaVend").value);

    itensPorPagina = OPCOES_ITENS.indexOf(valor) !== -1 ? valor : 10;

    try {
        localStorage.setItem("gestok_vendas_por_pagina", String(itensPorPagina));
    } catch (erro) { }

    paginaAtual = 1;

    renderizarTabela();

});

el("dataHistorico").addEventListener("change", function () {

    paginaAtual = 1;

    iniciarHistorico();

});


/* ---------- detalhe e cancelamento ---------- */

function abrirDetalhe(venda) {

    vendaDetalhe = venda;

    const cancelada = venda.status === "cancelada";

    el("detTitulo").textContent = "Venda nº " + (venda.numero || "—") + (cancelada ? " (cancelada)" : "");

    el("detSub").textContent = dataDaVenda(venda).toLocaleString("pt-BR") + " · " + (venda.origem || "PDV") +
        (venda.operadorNome ? " · " + venda.operadorNome : "");

    el("detItens").innerHTML = (venda.itens || []).map(function (i) {

        return '<div class="vend-det-item"><span>' + esc(i.nome) + '<small>' + fmtQtd(i.quantidade) + " " + esc(i.unidade || "UN") + " × " + moeda(i.preco) + '</small></span><b>' + moeda(i.total) + '</b></div>';

    }).join("");

    const linhas = [];

    if (Number(venda.desconto) > 0) {

        linhas.push('<div class="vend-linha"><span>Subtotal</span><b>' + moeda(venda.valorBruto) + '</b></div>');
        linhas.push('<div class="vend-linha desconto"><span>Desconto</span><b>- ' + moeda(venda.desconto) + '</b></div>');

    }

    linhas.push('<div class="vend-linha"><span>Total</span><b>' + moeda(venda.valorTotal) + '</b></div>');
    linhas.push('<div class="vend-linha"><span>' + esc(NOMES_FORMA[venda.formaPagamento] || venda.formaPagamento || "Pagamento") + '</span><b>' + moeda(venda.valorRecebido) + '</b></div>');

    if (venda.formaPagamento === "dinheiro") {
        linhas.push('<div class="vend-linha"><span>Troco</span><b>' + moeda(venda.troco) + '</b></div>');
    }

    if (venda.observacao) {
        linhas.push('<div class="vend-linha"><span>Observação</span><b>' + esc(venda.observacao) + '</b></div>');
    }

    el("detResumo").innerHTML = linhas.join("");

    el("btnDetCancelar").hidden = cancelada;

    el("modalDetalhe").hidden = false;

}

function fecharDetalhe() {

    el("modalDetalhe").hidden = true;

    vendaDetalhe = null;

}

el("btnDetFechar").addEventListener("click", fecharDetalhe);

el("modalDetalhe").addEventListener("click", function (event) {

    if (event.target === el("modalDetalhe")) { fecharDetalhe(); }

});

el("btnDetImprimir").addEventListener("click", function () {

    if (!vendaDetalhe) { return; }

    const v = vendaDetalhe;

    el("receipt").innerHTML = montarComprovante({
        numero: v.numero,
        data: dataDaVenda(v).getTime(),
        itens: (v.itens || []).map(function (i) {
            return { nome: i.nome, unidade: i.unidade || "UN", quantidade: i.quantidade, preco: i.preco, total: i.total };
        }),
        valorBruto: Number(v.valorBruto || v.valorTotal || 0),
        desconto: Number(v.desconto || 0),
        valorTotal: Number(v.valorTotal || 0),
        valorRecebido: Number(v.valorRecebido || v.valorTotal || 0),
        troco: Number(v.troco || 0),
        formaPagamento: v.formaPagamento
    });

    window.print();

});

el("btnDetCancelar").addEventListener("click", async function () {

    if (vendaDetalhe) {

        const venda = vendaDetalhe;

        if (await cancelarVenda(venda)) {
            fecharDetalhe();
        }

    }

});

el("historicoTabela").addEventListener("click", async function (event) {

    const botao = event.target.closest("button[data-acao]");

    if (!botao) { return; }

    const venda = vendasDia.find(function (v) { return v.id === botao.dataset.id; });

    if (!venda) { return; }

    if (botao.dataset.acao === "ver") {

        abrirDetalhe(venda);

    } else {

        await cancelarVenda(venda);

    }

});

async function cancelarVenda(venda) {

    if (!confirm("Cancelar a venda nº " + (venda.numero || "") + "?\n\nOs produtos voltam para o estoque e a venda sai do faturamento.")) {
        return false;
    }

    const lojaId = lojaIdAtual;

    const vendaRef = referenciaLoja(lojaId).collection("vendas").doc(venda.id);

    const usuario = firebase.auth().currentUser;

    try {

        await db.runTransaction(async function (transaction) {

            const vendaSnap = await transaction.get(vendaRef);

            if (!vendaSnap.exists || vendaSnap.data().status === "cancelada") {
                throw erroVenda("Esta venda já foi cancelada.");
            }

            const dados = vendaSnap.data();

            /* junta itens repetidos do mesmo produto */
            const agrupado = new Map();

            (dados.itens || []).forEach(function (i) {

                const atual = agrupado.get(i.produtoId) || { item: i, quantidade: 0 };

                atual.quantidade += Number(i.quantidade || 0);

                agrupado.set(i.produtoId, atual);

            });

            const entradas = Array.from(agrupado.entries());

            const snaps = [];

            for (const par of entradas) {
                snaps.push(await transaction.get(referenciaProdutos(lojaId).doc(par[0])));
            }

            const agora = new Date().toISOString();

            entradas.forEach(function (par, idx) {

                const ps = snaps[idx];

                if (!ps.exists) { return; }

                const p = ps.data();

                const anterior = Number(p.quantidade || 0);

                const quantidade = par[1].quantidade;

                const novo = arred3(anterior + quantidade);

                transaction.update(ps.ref, { quantidade: novo, dataAtualizacao: agora });

                transaction.set(referenciaMovimentacoes(lojaId).doc(), {
                    tipo: "Entrada",
                    produtoId: ps.ref.id,
                    produto: p.nome || "",
                    codigo: p.codigo || "",
                    quantidade: quantidade,
                    unidade: p.unidade || "UN",
                    estoqueAnterior: anterior,
                    estoqueNovo: novo,
                    motivo: "Cancelamento de venda",
                    observacao: "Venda nº " + (dados.numero || "") + " cancelada",
                    usuarioUid: usuario ? usuario.uid : null,
                    lojaId: lojaId,
                    data: agora
                });

            });

            transaction.update(vendaRef, {
                status: "cancelada",
                canceladaEm: agora,
                canceladaPor: usuario ? usuario.uid : null
            });

        });

        alert("Venda cancelada com sucesso. Os produtos voltaram para o estoque.");

        return true;

    } catch (erro) {

        console.error("Erro ao cancelar venda:", erro);

        alert(erro && erro.amigavel ? erro.message : "Não foi possível cancelar a venda.");

        return false;

    }

}


/* ---------- atalhos de teclado ---------- */

document.addEventListener("keydown", function (event) {

    if (event.key === "F2") {

        event.preventDefault();

        campoBusca.focus();

    } else if (event.key === "F9") {

        event.preventDefault();

        finalizar();

    } else if (event.key === "Escape") {

        if (!el("modalDetalhe").hidden) {

            fecharDetalhe();

        } else if (!el("modalConcluida").hidden) {

            novaVenda();

        } else if (!el("resultadosBusca").hidden) {

            fecharResultados();

        } else if (carrinho.length && confirm("Cancelar a venda atual?")) {

            novaVenda();

        }

    }

});


/* ---------- início ---------- */

document.addEventListener("DOMContentLoaded", function () {

    atualizarBotaoSom();

    el("dataHistorico").value = dataLocalISO();

    el("dataHistorico").max = dataLocalISO();

    render();

    observarAutenticacaoGestok(function (usuario) {

        if (!usuario) {

            window.location.replace("../login/index.html");

            return;

        }

        Promise.resolve(obterLojaAtualGestok()).then(function (id) {

            if (!id) {

                alert("Não foi possível identificar a loja atual.");

                return;

            }

            lojaIdAtual = id;

            if (listenersIniciados) { return; }

            listenersIniciados = true;

            referenciaProdutos(id).onSnapshot(function (snap) {

                produtosCache = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });

                sincronizarCarrinho();

                render();

            }, function (erro) {

                console.error("Erro ao carregar produtos:", erro);

                alert("Não foi possível carregar os produtos.");

            });

            iniciarHistorico();

            campoBusca.focus();

        });

    });

});
