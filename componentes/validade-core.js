/* =========================================
   GESTOK - CONTROLE DE VALIDADE (núcleo)
   -----------------------------------------
   Regras de cálculo usadas pela tela de
   Validade e pelo aviso do painel.

   Como funciona: cada ENTRADA com validade (ou
   lote informado manualmente) cria um "lote".
   O estoque do produto continua sendo a verdade.
   Como o que sai primeiro é o que vence primeiro
   (PEPS/FEFO), o que SOBRA em estoque é atribuído
   aos lotes de validade mais distante.
========================================= */

(function () {

    "use strict";

    var MS_DIA = 86400000;

    function num(v) {

        var n = Number(v);

        return isFinite(n) ? n : 0;

    }

    function hojeMeiaNoite() {

        var d = new Date();

        return new Date(d.getFullYear(), d.getMonth(), d.getDate());

    }

    /* "AAAA-MM-DD" -> Date local (sem erro de fuso) */
    function parseValidade(v) {

        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ""));

        if (!m) {
            return null;
        }

        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

    }

    function diasPara(validade) {

        var d = parseValidade(validade);

        if (!d) {
            return null;
        }

        return Math.round((d.getTime() - hojeMeiaNoite().getTime()) / MS_DIA);

    }

    function formatarData(validade) {

        var d = parseValidade(validade);

        return d ? d.toLocaleDateString("pt-BR") : "—";

    }

    function situacao(dias) {

        if (dias === null) { return "sem"; }
        if (dias < 0) { return "vencido"; }
        if (dias === 0) { return "hoje"; }
        if (dias <= 7) { return "7d"; }
        if (dias <= 30) { return "30d"; }
        if (dias <= 60) { return "60d"; }

        return "ok";

    }

    function rotuloDias(dias) {

        if (dias === null) { return "Sem validade informada"; }

        if (dias < 0) {
            return "Vencido há " + (-dias) + (dias === -1 ? " dia" : " dias");
        }

        if (dias === 0) { return "Vence hoje"; }

        if (dias <= 60) {
            return "Vence em " + dias + (dias === 1 ? " dia" : " dias");
        }

        return "Em dia (" + dias + " dias)";

    }

    /* lotes: [{id, produtoId, validade, quantidade, lote, criadoEm, encerrado}]
       produtos: [{id, nome, quantidade, preco, ativo, ...}] */
    function calcular(lotes, produtos) {

        var porProduto = {};

        produtos.forEach(function (p) {
            porProduto[String(p.id)] = p;
        });

        var grupos = {};

        lotes.forEach(function (l) {

            if (l.encerrado === true || num(l.quantidade) <= 0) {
                return;
            }

            var id = String(l.produtoId);

            var p = porProduto[id];

            if (!p || p.ativo === false) {
                return;
            }

            (grupos[id] = grupos[id] || []).push(l);

        });

        var linhas = [];

        Object.keys(grupos).forEach(function (id) {

            var p = porProduto[id];

            var restante = Math.max(0, num(p.quantidade));

            /* validade mais distante primeiro: é o que "sobra" em estoque */
            var ordenados = grupos[id].slice().sort(function (a, b) {

                if (a.validade !== b.validade) {
                    return a.validade < b.validade ? 1 : -1;
                }

                return String(b.criadoEm || "") > String(a.criadoEm || "") ? 1 : -1;

            });

            ordenados.forEach(function (l) {

                var alocado = Math.min(num(l.quantidade), restante);

                restante = Math.round((restante - alocado) * 1000) / 1000;

                if (alocado <= 0) {
                    return;
                }

                var dias = diasPara(l.validade);

                linhas.push({
                    tipo: "lote",
                    id: l.id,
                    produtoId: id,
                    produto: p,
                    lote: l.lote || "",
                    validade: l.validade,
                    dias: dias,
                    situacao: situacao(dias),
                    quantidade: alocado,
                    valor: alocado * num(p.preco)
                });

            });

        });

        /* estoque que não está coberto por nenhum lote */
        var semValidade = [];

        produtos.forEach(function (p) {

            if (p.ativo === false) {
                return;
            }

            var estoque = num(p.quantidade);

            if (estoque <= 0) {
                return;
            }

            var cobertos = (grupos[String(p.id)] || []).reduce(function (soma, l) {
                return soma + num(l.quantidade);
            }, 0);

            var sem = Math.round((estoque - Math.min(estoque, cobertos)) * 1000) / 1000;

            if (sem > 0) {

                semValidade.push({
                    tipo: "sem",
                    id: "sem-" + p.id,
                    produtoId: String(p.id),
                    produto: p,
                    lote: "",
                    validade: null,
                    dias: null,
                    situacao: "sem",
                    quantidade: sem,
                    valor: sem * num(p.preco)
                });

            }

        });

        return { linhas: linhas, semValidade: semValidade };

    }

    window.GestokValidade = {
        calcular: calcular,
        diasPara: diasPara,
        formatarData: formatarData,
        situacao: situacao,
        rotuloDias: rotuloDias
    };

})();
