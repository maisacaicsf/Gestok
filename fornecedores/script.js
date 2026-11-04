/* =========================================
   GESTOK - FORNECEDORES
========================================= */

let fornecedoresCache = [];
let produtosCache = [];
let filtrados = [];
let paginaAtual = 1;
let itensPorPagina = 10;
let lojaIdAtual = null;
let fornecedorEditandoId = null;
let listenersIniciados = false;

const OPCOES_ITENS = [10, 50, 100];

try {

    const salvo = Number(localStorage.getItem("gestok_fornecedores_por_pagina"));

    if (OPCOES_ITENS.indexOf(salvo) !== -1) {
        itensPorPagina = salvo;
    }

} catch (erro) { }

const el = function (id) { return document.getElementById(id); };

const tabela = el("fornecedoresTabela");
const pesquisa = el("pesquisaForn");
const filtroStatus = el("filtroStatusForn");
const ordenacao = el("ordenacaoForn");
const paginacao = el("paginacaoForn");
const seletorItens = el("itensPorPaginaForn");
const paginaInfo = el("paginaInfoForn");
const paginaNav = el("paginaNavForn");
const modal = el("modalFornecedor");


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

function soDigitos(v) {

    return String(v || "").replace(/\D/g, "");

}

function formatarTelefone(valor) {

    const d = soDigitos(valor).slice(0, 11);

    if (!d) { return ""; }
    if (d.length <= 2) { return "(" + d; }
    if (d.length <= 6) { return "(" + d.slice(0, 2) + ") " + d.slice(2); }
    if (d.length <= 10) { return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6); }

    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);

}

function formatarDocumento(valor) {

    const d = soDigitos(valor).slice(0, 14);

    if (d.length <= 11) {

        return d
            .replace(/^(\d{3})(\d)/, "$1.$2")
            .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1-$2");

    }

    return d
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");

}

function linkWhatsApp(telefone) {

    const d = soDigitos(telefone);

    if (d.length < 10) {
        return "";
    }

    return "https://wa.me/" + (d.length <= 11 ? "55" + d : d);

}

function plural(n, um, varios) {

    return n + " " + (n === 1 ? um : varios);

}

function produtosDoFornecedor(id) {

    return produtosCache.filter(function (p) { return p.fornecedorId === id; });

}


/* ---------- dados em tempo real ---------- */

function iniciarListeners(lojaId) {

    if (listenersIniciados) {
        return;
    }

    listenersIniciados = true;

    referenciaFornecedores(lojaId).onSnapshot(function (snap) {

        fornecedoresCache = snap.docs.map(function (d) {
            return Object.assign({ id: d.id }, d.data());
        });

        recalcular();

    }, function (erro) {

        console.error("Erro ao carregar fornecedores:", erro);

        alert("Não foi possível carregar os fornecedores. Confira se as regras do Firestore foram atualizadas.");

    });

    referenciaProdutos(lojaId).onSnapshot(function (snap) {

        produtosCache = snap.docs.map(function (d) {
            return Object.assign({ id: d.id }, d.data());
        });

        recalcular();

    }, function (erro) {

        console.error("Erro ao carregar produtos:", erro);

    });

}

function recalcular() {

    atualizarCartoes();

    aplicarFiltros(true);

}

function atualizarCartoes() {

    const total = fornecedoresCache.length;

    const ativos = fornecedoresCache.filter(function (f) { return f.ativo !== false; }).length;

    const semForn = produtosCache.filter(function (p) {
        return p.ativo !== false && !p.fornecedorId;
    }).length;

    el("cardTotal").textContent = total;
    el("cardTotalSub").textContent = total ? plural(total, "cadastrado", "cadastrados") : "nenhum cadastrado";
    el("cardAtivos").textContent = ativos;
    el("cardSemForn").textContent = semForn;

}


/* ---------- filtros ---------- */

function aplicarFiltros(manterPagina) {

    const termos = norm(pesquisa.value).split(/\s+/).filter(Boolean);

    const status = filtroStatus.value;

    let lista = fornecedoresCache.filter(function (f) {

        if (status === "ativo" && f.ativo === false) { return false; }
        if (status === "inativo" && f.ativo !== false) { return false; }

        if (termos.length) {

            const texto = norm(
                (f.nome || "") + " " + (f.documento || "") + " " + (f.contato || "") + " " +
                (f.telefone || "") + " " + (f.email || "") + " " + (f.cidade || "")
            );

            return termos.every(function (t) { return texto.indexOf(t) !== -1; });

        }

        return true;

    });

    const ordem = ordenacao.value;

    lista.sort(function (a, b) {

        if (ordem === "produtos") {
            return produtosDoFornecedor(b.id).length - produtosDoFornecedor(a.id).length;
        }

        if (ordem === "recentes") {
            return String(b.criadoEm || "") > String(a.criadoEm || "") ? 1 : -1;
        }

        return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");

    });

    filtrados = lista;

    if (!manterPagina) {
        paginaAtual = 1;
    }

    renderizarPagina();

}

pesquisa.addEventListener("input", function () { aplicarFiltros(false); });
filtroStatus.addEventListener("change", function () { aplicarFiltros(false); });
ordenacao.addEventListener("change", function () { aplicarFiltros(false); });

el("limparFiltrosForn").addEventListener("click", function () {

    pesquisa.value = "";
    filtroStatus.value = "";
    ordenacao.value = "nome";

    aplicarFiltros(false);

});


/* ---------- tabela e paginação ---------- */

function linhaHTML(f) {

    const id = esc(f.id);

    const ativo = f.ativo !== false;

    const qtd = produtosDoFornecedor(f.id).length;

    const zap = linkWhatsApp(f.telefone);

    return '<tr>' +
        '<td class="forn-nome"><strong>' + esc(f.nome || "Sem nome") + '</strong>' +
            (f.documento ? '<small>' + esc(formatarDocumento(f.documento)) + '</small>' : "") + '</td>' +
        '<td class="forn-duas">' + (f.contato ? '<strong>' + esc(f.contato) + '</strong>' : "") +
            (f.telefone ? '<small>' + esc(formatarTelefone(f.telefone)) + '</small>' : "") +
            (!f.contato && !f.telefone ? "—" : "") + '</td>' +
        '<td class="forn-duas">' + (f.email ? '<strong>' + esc(f.email) + '</strong>' : "") +
            (f.cidade ? '<small>' + esc(f.cidade) + '</small>' : "") +
            (!f.email && !f.cidade ? "—" : "") + '</td>' +
        '<td><span class="forn-qtd">' + qtd + '</span></td>' +
        '<td><span class="forn-badge ' + (ativo ? "ativo" : "inativo") + '">' + (ativo ? "Ativo" : "Inativo") + '</span></td>' +
        '<td><div class="forn-acoes">' +
            '<button type="button" class="forn-acao" data-acao="editar" data-id="' + id + '">Editar</button>' +
            (zap ? '<a class="forn-acao zap" href="' + esc(zap) + '" target="_blank" rel="noopener" title="Abrir conversa no WhatsApp">WhatsApp</a>' : "") +
            '<button type="button" class="forn-acao" data-acao="status" data-id="' + id + '">' + (ativo ? "Desativar" : "Ativar") + '</button>' +
            '<button type="button" class="forn-acao perigo" data-acao="excluir" data-id="' + id + '">Excluir</button>' +
        '</div></td>' +
        '</tr>';

}

function renderizarPagina() {

    const total = filtrados.length;

    const totalPaginas = Math.max(1, Math.ceil(total / itensPorPagina));

    paginaAtual = Math.min(Math.max(1, paginaAtual), totalPaginas);

    const inicio = (paginaAtual - 1) * itensPorPagina;

    const pagina = filtrados.slice(inicio, inicio + itensPorPagina);

    tabela.innerHTML = pagina.map(linhaHTML).join("");

    el("fornCount").textContent = plural(total, "fornecedor", "fornecedores");

    el("semResultadosForn").style.display = total === 0 ? "flex" : "none";

    el("semResultadosFornTexto").textContent = fornecedoresCache.length === 0
        ? 'Clique em "＋ Novo fornecedor" para cadastrar o primeiro.'
        : "Tente alterar a pesquisa ou os filtros.";

    renderizarPaginacao(total, totalPaginas, inicio, pagina.length);

}

function renderizarPaginacao(total, totalPaginas, inicio, quantidade) {

    if (total === 0) {

        paginacao.style.display = "none";

        return;

    }

    paginacao.style.display = "flex";

    seletorItens.value = String(itensPorPagina);

    paginaInfo.textContent = "Mostrando " + (inicio + 1) + "–" + (inicio + quantidade) + " de " + total;

    if (totalPaginas <= 1) {

        paginaNav.innerHTML = "";

        return;

    }

    const numeros = [1, totalPaginas, paginaAtual - 1, paginaAtual, paginaAtual + 1]
        .filter(function (n, i, arr) { return n >= 1 && n <= totalPaginas && arr.indexOf(n) === i; })
        .sort(function (a, b) { return a - b; });

    let html = '<button type="button" class="page-btn" data-pagina="' + (paginaAtual - 1) + '"' + (paginaAtual === 1 ? " disabled" : "") + '>‹ Anterior</button>';

    let anterior = 0;

    numeros.forEach(function (n) {

        if (n - anterior > 1) {
            html += '<span class="page-gap">…</span>';
        }

        html += '<button type="button" class="page-btn' + (n === paginaAtual ? " active" : "") + '" data-pagina="' + n + '">' + n + '</button>';

        anterior = n;

    });

    html += '<button type="button" class="page-btn" data-pagina="' + (paginaAtual + 1) + '"' + (paginaAtual === totalPaginas ? " disabled" : "") + '>Próxima ›</button>';

    paginaNav.innerHTML = html;

}

paginaNav.addEventListener("click", function (event) {

    const botao = event.target.closest("button[data-pagina]");

    if (!botao || botao.disabled) {
        return;
    }

    paginaAtual = Number(botao.dataset.pagina);

    renderizarPagina();

    document.querySelector(".products-panel").scrollIntoView({ behavior: "smooth", block: "start" });

});

seletorItens.addEventListener("change", function () {

    const valor = Number(seletorItens.value);

    itensPorPagina = OPCOES_ITENS.indexOf(valor) !== -1 ? valor : 10;

    try {
        localStorage.setItem("gestok_fornecedores_por_pagina", String(itensPorPagina));
    } catch (erro) { }

    paginaAtual = 1;

    renderizarPagina();

});


/* ---------- janela de cadastro / edição ---------- */

function abrirModal(fornecedor) {

    fornecedorEditandoId = fornecedor ? fornecedor.id : null;

    el("formFornecedor").reset();

    el("modalFornTitulo").textContent = fornecedor ? "Editar fornecedor" : "Novo fornecedor";

    el("grupoFornAtivo").style.display = fornecedor ? "" : "none";

    el("fornNome").value = fornecedor ? fornecedor.nome || "" : "";
    el("fornDocumento").value = fornecedor ? formatarDocumento(fornecedor.documento) : "";
    el("fornContato").value = fornecedor ? fornecedor.contato || "" : "";
    el("fornTelefone").value = fornecedor ? formatarTelefone(fornecedor.telefone) : "";
    el("fornEmail").value = fornecedor ? fornecedor.email || "" : "";
    el("fornCidade").value = fornecedor ? fornecedor.cidade || "" : "";
    el("fornObs").value = fornecedor ? fornecedor.observacoes || "" : "";
    el("fornAtivo").checked = fornecedor ? fornecedor.ativo !== false : true;

    modal.hidden = false;

    el("fornNome").focus();

}

function fecharModal() {

    modal.hidden = true;

    fornecedorEditandoId = null;

}

el("btnNovoFornecedor").addEventListener("click", function () { abrirModal(null); });

el("btnFornCancelar").addEventListener("click", fecharModal);

modal.addEventListener("click", function (event) {

    if (event.target === modal) {
        fecharModal();
    }

});

document.addEventListener("keydown", function (event) {

    if (event.key === "Escape" && !modal.hidden) {
        fecharModal();
    }

});

el("fornTelefone").addEventListener("input", function (event) {
    event.target.value = formatarTelefone(event.target.value);
});

el("fornDocumento").addEventListener("input", function (event) {
    event.target.value = formatarDocumento(event.target.value);
});


/* ---------- salvar ---------- */

async function atualizarNomeNosProdutos(fornecedorId, novoNome) {

    const vinculados = produtosDoFornecedor(fornecedorId).filter(function (p) {
        return p.fornecedorNome !== novoNome;
    });

    for (let i = 0; i < vinculados.length; i += 400) {

        const lote = firebase.firestore().batch();

        vinculados.slice(i, i + 400).forEach(function (p) {
            lote.update(referenciaProdutos(lojaIdAtual).doc(p.id), { fornecedorNome: novoNome });
        });

        await lote.commit();

    }

}

el("formFornecedor").addEventListener("submit", async function (event) {

    event.preventDefault();

    const nome = el("fornNome").value.trim();

    const documento = soDigitos(el("fornDocumento").value);

    const telefone = soDigitos(el("fornTelefone").value);

    const email = el("fornEmail").value.trim();

    if (!nome) {

        alert("Digite o nome do fornecedor.");

        return;

    }

    if (documento && documento.length !== 11 && documento.length !== 14) {

        alert("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) completo, ou deixe em branco.");

        return;

    }

    if (telefone && telefone.length < 10) {

        alert("Informe o telefone com DDD, ou deixe em branco.");

        return;

    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

        alert("Informe um e-mail válido, ou deixe em branco.");

        return;

    }

    const outros = fornecedoresCache.filter(function (f) { return f.id !== fornecedorEditandoId; });

    if (outros.some(function (f) { return norm(f.nome) === norm(nome); })) {

        alert("Já existe um fornecedor com este nome.");

        return;

    }

    if (documento && outros.some(function (f) { return soDigitos(f.documento) === documento; })) {

        alert("Já existe um fornecedor com este CNPJ/CPF.");

        return;

    }

    const agora = new Date().toISOString();

    const dados = {
        nome: nome,
        documento: documento,
        contato: el("fornContato").value.trim(),
        telefone: telefone,
        email: email,
        cidade: el("fornCidade").value.trim(),
        observacoes: el("fornObs").value.trim(),
        ativo: fornecedorEditandoId ? el("fornAtivo").checked : true,
        atualizadoEm: agora
    };

    const salvar = el("btnFornSalvar");

    salvar.disabled = true;

    try {

        if (fornecedorEditandoId) {

            const anterior = fornecedoresCache.find(function (f) { return f.id === fornecedorEditandoId; });

            await referenciaFornecedores(lojaIdAtual).doc(fornecedorEditandoId).update(dados);

            if (anterior && anterior.nome !== nome) {
                await atualizarNomeNosProdutos(fornecedorEditandoId, nome);
            }

            fecharModal();

            alert("Fornecedor atualizado com sucesso!");

        } else {

            await referenciaFornecedores(lojaIdAtual).add(Object.assign({}, dados, { criadoEm: agora }));

            fecharModal();

            alert("Fornecedor cadastrado com sucesso!");

        }

    } catch (erro) {

        console.error("Erro ao salvar fornecedor:", erro);

        alert("Não foi possível salvar o fornecedor.");

    } finally {

        salvar.disabled = false;

    }

});


/* ---------- ações da tabela ---------- */

tabela.addEventListener("click", async function (event) {

    const botao = event.target.closest("button[data-acao]");

    if (!botao) {
        return;
    }

    const fornecedor = fornecedoresCache.find(function (f) { return f.id === botao.dataset.id; });

    if (!fornecedor) {
        return;
    }

    const acao = botao.dataset.acao;

    if (acao === "editar") {

        abrirModal(fornecedor);

        return;

    }

    if (acao === "status") {

        try {

            const novoAtivo = fornecedor.ativo === false;

            await referenciaFornecedores(lojaIdAtual).doc(fornecedor.id).update({
                ativo: novoAtivo,
                atualizadoEm: new Date().toISOString()
            });

            alert(novoAtivo ? "Fornecedor ativado." : "Fornecedor desativado.");

        } catch (erro) {

            console.error("Erro ao alterar status:", erro);

            alert("Não foi possível alterar o status do fornecedor.");

        }

        return;

    }

    if (acao === "excluir") {

        const vinculados = produtosDoFornecedor(fornecedor.id);

        const aviso = vinculados.length
            ? "\n\nEle está vinculado a " + plural(vinculados.length, "produto", "produtos") +
              ". Esses produtos ficarão sem fornecedor."
            : "";

        if (!confirm("Excluir o fornecedor \"" + (fornecedor.nome || "") + "\"?" + aviso)) {
            return;
        }

        botao.disabled = true;

        try {

            for (let i = 0; i < vinculados.length; i += 400) {

                const lote = firebase.firestore().batch();

                vinculados.slice(i, i + 400).forEach(function (p) {

                    lote.update(referenciaProdutos(lojaIdAtual).doc(p.id), {
                        fornecedorId: firebase.firestore.FieldValue.delete(),
                        fornecedorNome: firebase.firestore.FieldValue.delete()
                    });

                });

                await lote.commit();

            }

            await referenciaFornecedores(lojaIdAtual).doc(fornecedor.id).delete();

            alert("Fornecedor excluído com sucesso.");

        } catch (erro) {

            console.error("Erro ao excluir fornecedor:", erro);

            alert("Não foi possível excluir o fornecedor.");

            botao.disabled = false;

        }

    }

});


/* ---------- início ---------- */

document.addEventListener("DOMContentLoaded", function () {

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

            iniciarListeners(id);

        });

    });

});
