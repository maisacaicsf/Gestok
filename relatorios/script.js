/* =========================================
   GESTOK
   RELATÓRIOS
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /* =========================================
           ELEMENTOS
        ========================================= */

        const sidebar =
            document.getElementById("sidebar");

        const overlay =
            document.getElementById("overlay");

        const menuButton =
            document.getElementById("menuButton");

        const closeSidebar =
            document.getElementById("closeSidebar");

        const tipoRelatorio =
            document.getElementById("tipoRelatorio");

        const dataInicial =
            document.getElementById("dataInicial");

        const dataFinal =
            document.getElementById("dataFinal");

        const produtoFiltro =
            document.getElementById("produtoFiltro");

        const tipoMovimentacao =
            document.getElementById("tipoMovimentacao");

        const tipoMovimentacaoGrupo =
            document.getElementById(
                "tipoMovimentacaoGrupo"
            );

        const limparFiltros =
            document.getElementById("limparFiltros");

        const gerarPdf =
            document.getElementById("gerarPdf");

        const previewContent =
            document.getElementById("previewContent");

        const previewDescription =
            document.getElementById(
                "previewDescription"
            );

        const resultCount =
            document.getElementById("resultCount");

        const nomeUsuarioMenu =
            document.getElementById(
                "nomeUsuarioMenu"
            );

        const headerAvatar =
            document.getElementById(
                "headerAvatar"
            );


        /* =========================================
           FIRESTORE
        ========================================= */

        let produtosCache = [];

        let movimentacoesCache = [];

        let lojaIdRelatorios = null;

        let cancelarProdutosRelatorios = null;

        let cancelarMovimentacoesRelatorios = null;

        let firestoreRelatoriosInicializado = false;


        /* =========================================
           MENU
        ========================================= */

        function abrirMenu() {

            if (sidebar) {
                sidebar.classList.add("active");
            }

            if (overlay) {
                overlay.classList.add("active");
            }

            document.body.style.overflow =
                "hidden";

        }


        function fecharMenu() {

            if (sidebar) {
                sidebar.classList.remove("active");
            }

            if (overlay) {
                overlay.classList.remove("active");
            }

            document.body.style.overflow =
                "";

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

                if (
                    event.key === "Escape"
                ) {

                    fecharMenu();

                }

            }
        );


        /* =========================================
           CONTA
        ========================================= */

        function obterConta() {

            try {

                return JSON.parse(
                    localStorage.getItem(
                        "gestok_conta"
                    ) || "null"
                );

            } catch (erro) {

                return null;

            }

        }


        function carregarUsuario() {

            const conta =
                obterConta();

            if (!conta) {
                return;
            }


            const nome =
                conta.nome ||
                conta.usuario ||
                "Usuário";


            if (nomeUsuarioMenu) {

                nomeUsuarioMenu.textContent =
                    nome;

            }


            if (headerAvatar) {

                headerAvatar.textContent =
                    nome
                        .charAt(0)
                        .toUpperCase();

            }

        }


        /* =========================================
           PRODUTOS
        ========================================= */

        function obterProdutos() {

            return Array.isArray(produtosCache)
                ? produtosCache
                : [];

        }


        /* =========================================
           MOVIMENTAÇÕES
        ========================================= */

        function obterMovimentacoes() {

            return Array.isArray(movimentacoesCache)
                ? movimentacoesCache
                : [];

        }


        /* =========================================
           CARREGAR PRODUTOS NO SELECT
        ========================================= */

        function carregarProdutos() {

            if (!produtoFiltro) {
                return;
            }


            const produtos =
                obterProdutos();


            produtoFiltro.innerHTML =
                '<option value="">Todos os produtos</option>';


            produtos
                .filter(function (produto) {

                    return produto &&
                        produto.ativo !== false;

                })
                .sort(function (a, b) {

                    return String(
                        a.nome || ""
                    ).localeCompare(
                        String(
                            b.nome || ""
                        ),
                        "pt-BR"
                    );

                })
                .forEach(function (produto) {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        produto.id ??
                        produto.codigo ??
                        produto.nome;


                    option.textContent =
                        produto.nome ||
                        "Produto sem nome";


                    produtoFiltro.appendChild(
                        option
                    );

                });

        }


        /* =========================================
           MOSTRAR / ESCONDER FILTRO DE MOVIMENTAÇÃO
        ========================================= */

        function atualizarCampos() {

            const tipo =
                tipoRelatorio
                    ? tipoRelatorio.value
                    : "estoque";


            const usaPeriodo =
                tipo === "entradas" ||
                tipo === "saidas" ||
                tipo === "movimentacoes";


            const usaTipo =
                tipo === "movimentacoes";


            if (dataInicial) {

                dataInicial
                    .closest(".date-grid")
                    ?.style
                    .setProperty(
                        "display",
                        usaPeriodo
                            ? "grid"
                            : "none"
                    );

            }


            if (tipoMovimentacaoGrupo) {

                tipoMovimentacaoGrupo.style.display =
                    usaTipo
                        ? "block"
                        : "none";

            }


            atualizarPrevia();

        }


        /* =========================================
           DATA
        ========================================= */

        function normalizarData(
            valor
        ) {

            if (!valor) {
                return null;
            }


            try {

                if (
                    typeof valor.toDate ===
                    "function"
                ) {

                    const dataFirestore =
                        valor.toDate();

                    return dataFirestore instanceof Date &&
                        !Number.isNaN(dataFirestore.getTime())
                        ? dataFirestore
                        : null;

                }


                if (
                    typeof valor === "object" &&
                    typeof valor.seconds === "number"
                ) {

                    const dataSeconds =
                        new Date(
                            valor.seconds * 1000
                        );

                    return Number.isNaN(
                        dataSeconds.getTime()
                    )
                        ? null
                        : dataSeconds;

                }


                const data =
                    valor instanceof Date
                        ? valor
                        : new Date(valor);


                if (
                    Number.isNaN(
                        data.getTime()
                    )
                ) {

                    return null;

                }


                return data;

            } catch (erro) {

                return null;

            }

        }


        function formatarData(
            valor
        ) {

            const data =
                normalizarData(valor);


            if (!data) {
                return "—";
            }


            return data.toLocaleDateString(
                "pt-BR"
            );

        }


        function formatarDataHora(
            valor
        ) {

            const data =
                normalizarData(valor);


            if (!data) {
                return "—";
            }


            return data.toLocaleString(
                "pt-BR",
                {
                    dateStyle: "short",
                    timeStyle: "short"
                }
            );

        }


        /* =========================================
           FILTRAR MOVIMENTAÇÕES
        ========================================= */

        function filtrarMovimentacoes() {

            let movimentacoes =
                obterMovimentacoes();


            const inicio =
                dataInicial?.value
                    ? new Date(
                        dataInicial.value +
                        "T00:00:00"
                    )
                    : null;


            const fim =
                dataFinal?.value
                    ? new Date(
                        dataFinal.value +
                        "T23:59:59"
                    )
                    : null;


            const produtoSelecionado =
                produtoFiltro?.value || "";


            const tipoSelecionado =
                tipoMovimentacao?.value || "";


            movimentacoes =
                movimentacoes.filter(
                    function (movimento) {

                        const data =
                            normalizarData(
                                movimento.data
                            );


                        if (!data) {

                            return false;

                        }


                        if (
                            inicio &&
                            data < inicio
                        ) {

                            return false;

                        }


                        if (
                            fim &&
                            data > fim
                        ) {

                            return false;

                        }


                        if (
                            produtoSelecionado
                        ) {

                            const id =
                                String(
                                    movimento.produtoId ??
                                    ""
                                );


                            const codigo =
                                String(
                                    movimento.codigo ??
                                    ""
                                );


                            const nome =
                                String(
                                    movimento.produto ??
                                    ""
                                );


                            if (
                                produtoSelecionado !== id &&
                                produtoSelecionado !== codigo &&
                                produtoSelecionado !== nome
                            ) {

                                return false;

                            }

                        }


                        if (
                            tipoSelecionado
                        ) {

                            const tipo =
                                String(
                                    movimento.tipo ||
                                    ""
                                ).toLowerCase();


                            if (
                                tipo !==
                                tipoSelecionado
                            ) {

                                return false;

                            }

                        }


                        return true;

                    }
                );


            movimentacoes.sort(
                function (a, b) {

                    return (
                        normalizarData(
                            b.data
                        )?.getTime() || 0
                    ) -
                    (
                        normalizarData(
                            a.data
                        )?.getTime() || 0
                    );

                }
            );


            return movimentacoes;

        }


        /* =========================================
           FILTRAR PRODUTOS
        ========================================= */

        function filtrarProdutos() {

            let produtos =
                obterProdutos();


            const selecionado =
                produtoFiltro?.value || "";


            if (selecionado) {

                produtos =
                    produtos.filter(
                        function (produto) {

                            return (
                                String(
                                    produto.id ??
                                    ""
                                ) ===
                                selecionado
                            ) ||
                            (
                                String(
                                    produto.codigo ??
                                    ""
                                ) ===
                                selecionado
                            ) ||
                            (
                                String(
                                    produto.nome ??
                                    ""
                                ) ===
                                selecionado
                            );

                        }
                    );

            }


            return produtos;

        }


        /* =========================================
           STATUS DO ESTOQUE
        ========================================= */

        function obterStatusEstoque(
            produto
        ) {

            if (
                produto.ativo === false
            ) {

                return {
                    texto: "Inativo",
                    classe: "normal"
                };

            }


            const quantidade =
                Number(
                    produto.quantidade || 0
                );


            const minimo =
                Number(
                    produto.estoqueMinimo || 0
                );


            if (
                minimo > 0 &&
                quantidade < minimo
            ) {

                return {
                    texto: "Abaixo do mínimo",
                    classe: "warning"
                };

            }


            return {
                texto: "Normal",
                classe: "normal"
            };

        }


        /* =========================================
           PRÉVIA - ESTOQUE
        ========================================= */

        function gerarPreviaEstoque() {

            const produtos =
                filtrarProdutos();


            resultCount.textContent =
                produtos.length +
                (
                    produtos.length === 1
                        ? " produto"
                        : " produtos"
                );


            previewDescription.textContent =
                "Produtos e situação atual do estoque.";


            if (!produtos.length) {

                mostrarVazio(
                    "Nenhum produto encontrado."
                );

                return;

            }


            let html = `
                <table class="preview-table">

                    <thead>

                        <tr>

                            <th>Produto</th>

                            <th>Código</th>

                            <th>Estoque</th>

                            <th>Mínimo</th>

                            <th>Unidade</th>

                            <th>Status</th>

                        </tr>

                    </thead>

                    <tbody>
            `;


            produtos.forEach(
                function (produto) {

                    const quantidade =
                        Number(
                            produto.quantidade || 0
                        );


                    const minimo =
                        Number(
                            produto.estoqueMinimo || 0
                        );


                    const unidade =
                        produto.unidade ||
                        "UN";


                    const status =
                        obterStatusEstoque(
                            produto
                        );


                    html += `
                        <tr>

                            <td>
                                <strong>
                                    ${escaparHTML(
                                        produto.nome ||
                                        "Sem nome"
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escaparHTML(
                                    produto.codigo ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${quantidade}
                            </td>

                            <td>
                                ${minimo}
                            </td>

                            <td>
                                ${escaparHTML(
                                    unidade
                                )}
                            </td>

                            <td>
                                <span class="badge ${status.classe}">
                                    ${status.texto}
                                </span>
                            </td>

                        </tr>
                    `;

                }
            );


            html += `
                    </tbody>

                </table>
            `;


            previewContent.innerHTML =
                html;

        }


        /* =========================================
           PRÉVIA - ESTOQUE BAIXO
        ========================================= */

        function gerarPreviaEstoqueBaixo() {

            const produtos =
                filtrarProdutos()
                    .filter(
                        function (produto) {

                            const quantidade =
                                Number(
                                    produto.quantidade ||
                                    0
                                );


                            const minimo =
                                Number(
                                    produto.estoqueMinimo ||
                                    0
                                );


                            return (
                                produto.ativo !== false &&
                                minimo > 0 &&
                                quantidade < minimo
                            );

                        }
                    );


            resultCount.textContent =
                produtos.length +
                (
                    produtos.length === 1
                        ? " produto"
                        : " produtos"
                );


            previewDescription.textContent =
                "Produtos que estão abaixo do estoque mínimo.";


            if (!produtos.length) {

                mostrarVazio(
                    "Nenhum produto está abaixo do estoque mínimo."
                );

                return;

            }


            let html = `
                <table class="preview-table">

                    <thead>

                        <tr>

                            <th>Produto</th>

                            <th>Código</th>

                            <th>Atual</th>

                            <th>Mínimo</th>

                            <th>Falta</th>

                            <th>Unidade</th>

                        </tr>

                    </thead>

                    <tbody>
            `;


            produtos.forEach(
                function (produto) {

                    const quantidade =
                        Number(
                            produto.quantidade || 0
                        );


                    const minimo =
                        Number(
                            produto.estoqueMinimo || 0
                        );


                    const falta =
                        minimo - quantidade;


                    const unidade =
                        produto.unidade ||
                        "UN";


                    html += `
                        <tr>

                            <td>
                                <strong>
                                    ${escaparHTML(
                                        produto.nome ||
                                        "Sem nome"
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escaparHTML(
                                    produto.codigo ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${quantidade}
                            </td>

                            <td>
                                ${minimo}
                            </td>

                            <td>
                                ${falta}
                            </td>

                            <td>
                                ${escaparHTML(
                                    unidade
                                )}
                            </td>

                        </tr>
                    `;

                }
            );


            html += `
                    </tbody>

                </table>
            `;


            previewContent.innerHTML =
                html;

        }


        /* =========================================
           PRÉVIA - MOVIMENTAÇÕES
        ========================================= */

        function gerarPreviaMovimentacoes() {

            const movimentacoes =
                filtrarMovimentacoes();


            resultCount.textContent =
                movimentacoes.length +
                (
                    movimentacoes.length === 1
                        ? " movimentação"
                        : " movimentações"
                );


            previewDescription.textContent =
                "Histórico das movimentações selecionadas.";


            if (!movimentacoes.length) {

                mostrarVazio(
                    "Nenhuma movimentação encontrada."
                );

                return;

            }


            let html = `
                <table class="preview-table">

                    <thead>

                        <tr>

                            <th>Data</th>

                            <th>Tipo</th>

                            <th>Produto</th>

                            <th>Código</th>

                            <th>Quantidade</th>

                            <th>Estoque novo</th>

                        </tr>

                    </thead>

                    <tbody>
            `;


            movimentacoes.forEach(
                function (movimento) {

                    const tipo =
                        String(
                            movimento.tipo ||
                            ""
                        ).toLowerCase();


                    const tipoTexto =
                        tipo === "entrada"
                            ? "Entrada"
                            : "Saída";


                    const classe =
                        tipo === "entrada"
                            ? "entrada"
                            : "saida";


                    const quantidade =
                        Number(
                            movimento.quantidade ||
                            0
                        );


                    html += `
                        <tr>

                            <td>
                                ${formatarDataHora(
                                    movimento.data
                                )}
                            </td>

                            <td>
                                <span class="badge ${classe}">
                                    ${tipoTexto}
                                </span>
                            </td>

                            <td>
                                <strong>
                                    ${escaparHTML(
                                        movimento.produto ||
                                        "—"
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escaparHTML(
                                    movimento.codigo ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${quantidade}
                                ${escaparHTML(
                                    movimento.unidade ||
                                    "UN"
                                )}
                            </td>

                            <td>
                                ${Number(
                                    movimento.estoqueNovo ||
                                    0
                                )}
                            </td>

                        </tr>
                    `;

                }
            );


            html += `
                    </tbody>

                </table>
            `;


            previewContent.innerHTML =
                html;

        }


        /* =========================================
           PRÉVIA
        ========================================= */

        function atualizarPrevia() {

            if (
                !tipoRelatorio ||
                !previewContent
            ) {

                return;

            }


            const tipo =
                tipoRelatorio.value;


            if (
                tipo === "estoque"
            ) {

                gerarPreviaEstoque();

                return;

            }


            if (
                tipo === "estoque-baixo"
            ) {

                gerarPreviaEstoqueBaixo();

                return;

            }


            if (
                tipo === "entradas"
            ) {

                const anterior =
                    tipoMovimentacao?.value;


                if (tipoMovimentacao) {
                    tipoMovimentacao.value =
                        "entrada";
                }


                gerarPreviaMovimentacoes();


                if (tipoMovimentacao) {
                    tipoMovimentacao.value =
                        anterior || "";
                }

                return;

            }


            if (
                tipo === "saidas"
            ) {

                const anterior =
                    tipoMovimentacao?.value;


                if (tipoMovimentacao) {
                    tipoMovimentacao.value =
                        "saida";
                }


                gerarPreviaMovimentacoes();


                if (tipoMovimentacao) {
                    tipoMovimentacao.value =
                        anterior || "";
                }

                return;

            }


            if (
                tipo === "movimentacoes"
            ) {

                gerarPreviaMovimentacoes();

            }

        }


        /* =========================================
           VAZIO
        ========================================= */

        function mostrarVazio(
            mensagem
        ) {

            previewContent.innerHTML = `

                <div class="empty-preview">

                    <div class="empty-icon">
                        ▤
                    </div>

                    <strong>
                        ${escaparHTML(
                            mensagem
                        )}
                    </strong>

                    <span>
                        Tente alterar os filtros
                        selecionados.
                    </span>

                </div>

            `;

        }


        /* =========================================
           ESCAPAR HTML
        ========================================= */

        function escaparHTML(
            valor
        ) {

            return String(
                valor ?? ""
            )
                .replace(
                    /&/g,
                    "&amp;"
                )
                .replace(
                    /</g,
                    "&lt;"
                )
                .replace(
                    />/g,
                    "&gt;"
                )
                .replace(
                    /"/g,
                    "&quot;"
                )
                .replace(
                    /'/g,
                    "&#039;"
                );

        }


        /* =========================================
           TEXTO DO RELATÓRIO
        ========================================= */

        function nomeRelatorio() {

            const tipo =
                tipoRelatorio.value;


            if (
                tipo === "estoque"
            ) {
                return "Relatório de Estoque";
            }


            if (
                tipo === "entradas"
            ) {
                return "Relatório de Entradas";
            }


            if (
                tipo === "saidas"
            ) {
                return "Relatório de Saídas";
            }


            if (
                tipo === "estoque-baixo"
            ) {
                return "Relatório de Estoque Baixo";
            }


            return "Relatório de Movimentações";

        }


        /* =========================================
           DADOS PARA PDF
        ========================================= */

        function obterDadosRelatorio() {

            const tipo =
                tipoRelatorio.value;


            if (
                tipo === "estoque"
            ) {

                return {
                    tipo: "estoque",
                    dados:
                        filtrarProdutos()
                };

            }


            if (
                tipo === "estoque-baixo"
            ) {

                return {
                    tipo: "estoque-baixo",
                    dados:
                        filtrarProdutos()
                            .filter(
                                function (produto) {

                                    const quantidade =
                                        Number(
                                            produto.quantidade ||
                                            0
                                        );


                                    const minimo =
                                        Number(
                                            produto.estoqueMinimo ||
                                            0
                                        );


                                    return (
                                        produto.ativo !== false &&
                                        minimo > 0 &&
                                        quantidade < minimo
                                    );

                                }
                            )
                };

            }


            let tipoMovimento =
                "";


            if (
                tipo === "entradas"
            ) {

                tipoMovimento =
                    "entrada";

            }


            if (
                tipo === "saidas"
            ) {

                tipoMovimento =
                    "saida";

            }


            const movimentos =
                filtrarMovimentacoes()
                    .filter(
                        function (movimento) {

                            if (
                                !tipoMovimento
                            ) {

                                return true;

                            }


                            return String(
                                movimento.tipo ||
                                ""
                            ).toLowerCase() ===
                            tipoMovimento;

                        }
                    );


            return {
                tipo:
                    "movimentacoes",

                dados:
                    movimentos
            };

        }


        /* =========================================
           GERAR PDF
        ========================================= */

        function gerarRelatorioPDF() {

            if (
                !window.jspdf ||
                !window.jspdf.jsPDF
            ) {

                alert(
                    "Não foi possível carregar o gerador de PDF. Verifique sua conexão com a internet."
                );

                return;

            }


            const resultado =
                obterDadosRelatorio();


            if (
                !resultado.dados.length
            ) {

                alert(
                    "Não existem dados para gerar este relatório."
                );

                return;

            }


            const conta =
                obterConta() || {};


            const {
                jsPDF
            } = window.jspdf;


            const doc =
                new jsPDF({
                    orientation:
                        "landscape",
                    unit:
                        "mm",
                    format:
                        "a4"
                });


            const nomeEmpresa =
                conta.nome ||
                "Gestok";


            const codigoLoja =
                conta.codigoLoja ||
                "—";


            const titulo =
                nomeRelatorio();


            /* =====================================
               CABEÇALHO
            ===================================== */

            doc.setFillColor(
                37,
                99,
                235
            );


            doc.rect(
                0,
                0,
                297,
                30,
                "F"
            );


            doc.setTextColor(
                255,
                255,
                255
            );


            doc.setFont(
                "helvetica",
                "bold"
            );


            doc.setFontSize(19);


            doc.text(
                "GESTOK",
                15,
                13
            );


            doc.setFontSize(9);


            doc.setFont(
                "helvetica",
                "normal"
            );


            doc.text(
                "Gestão de estoque",
                15,
                20
            );


            doc.setFont(
                "helvetica",
                "bold"
            );


            doc.setFontSize(14);


            doc.text(
                titulo,
                282,
                13,
                {
                    align:
                        "right"
                }
            );


            doc.setFont(
                "helvetica",
                "normal"
            );


            doc.setFontSize(8);


            doc.text(
                "Documento gerado pelo sistema",
                282,
                20,
                {
                    align:
                        "right"
                }
            );


            /* =====================================
               INFORMAÇÕES
            ===================================== */

            doc.setTextColor(
                40,
                50,
                65
            );


            doc.setFont(
                "helvetica",
                "bold"
            );


            doc.setFontSize(9);


            doc.text(
                "Empresa:",
                15,
                40
            );


            doc.setFont(
                "helvetica",
                "normal"
            );


            doc.text(
                String(nomeEmpresa),
                34,
                40
            );


            doc.setFont(
                "helvetica",
                "bold"
            );


            doc.text(
                "Código da Loja:",
                110,
                40
            );


            doc.setFont(
                "helvetica",
                "normal"
            );


            doc.text(
                String(codigoLoja),
                138,
                40
            );


            doc.setFont(
                "helvetica",
                "bold"
            );


            doc.text(
                "Emissão:",
                205,
                40
            );


            doc.setFont(
                "helvetica",
                "normal"
            );


            doc.text(
                formatarDataHora(
                    new Date()
                ),
                224,
                40
            );


            /* =====================================
               PERÍODO
            ===================================== */

            if (
                resultado.tipo ===
                    "movimentacoes"
            ) {

                const periodoInicial =
                    dataInicial?.value
                        ? formatarData(
                            dataInicial.value +
                            "T00:00:00"
                        )
                        : "Início";


                const periodoFinal =
                    dataFinal?.value
                        ? formatarData(
                            dataFinal.value +
                            "T00:00:00"
                        )
                        : "Atual";


                doc.setFont(
                    "helvetica",
                    "bold"
                );


                doc.text(
                    "Período:",
                    15,
                    48
                );


                doc.setFont(
                    "helvetica",
                    "normal"
                );


                doc.text(
                    periodoInicial +
                    " até " +
                    periodoFinal,
                    33,
                    48
                );

            }


            /* =====================================
               TABELA
            ===================================== */

            let colunas = [];

            let linhas = [];


            if (
                resultado.tipo ===
                "estoque"
            ) {

                colunas = [
                    "Produto",
                    "Código",
                    "Estoque",
                    "Mínimo",
                    "Unidade",
                    "Status"
                ];


                linhas =
                    resultado.dados.map(
                        function (produto) {

                            const quantidade =
                                Number(
                                    produto.quantidade ||
                                    0
                                );


                            const minimo =
                                Number(
                                    produto.estoqueMinimo ||
                                    0
                                );


                            const status =
                                obterStatusEstoque(
                                    produto
                                );


                            return [

                                produto.nome ||
                                    "Sem nome",

                                produto.codigo ||
                                    "—",

                                String(
                                    quantidade
                                ),

                                String(
                                    minimo
                                ),

                                produto.unidade ||
                                    "UN",

                                status.texto

                            ];

                        }
                    );

            }


            if (
                resultado.tipo ===
                "estoque-baixo"
            ) {

                colunas = [
                    "Produto",
                    "Código",
                    "Estoque atual",
                    "Estoque mínimo",
                    "Falta",
                    "Unidade"
                ];


                linhas =
                    resultado.dados.map(
                        function (produto) {

                            const quantidade =
                                Number(
                                    produto.quantidade ||
                                    0
                                );


                            const minimo =
                                Number(
                                    produto.estoqueMinimo ||
                                    0
                                );


                            return [

                                produto.nome ||
                                    "Sem nome",

                                produto.codigo ||
                                    "—",

                                String(
                                    quantidade
                                ),

                                String(
                                    minimo
                                ),

                                String(
                                    minimo -
                                    quantidade
                                ),

                                produto.unidade ||
                                    "UN"

                            ];

                        }
                    );

            }


            if (
                resultado.tipo ===
                "movimentacoes"
            ) {

                colunas = [
                    "Data",
                    "Tipo",
                    "Produto",
                    "Código",
                    "Quantidade",
                    "Estoque anterior",
                    "Estoque novo"
                ];


                linhas =
                    resultado.dados.map(
                        function (movimento) {

                            const quantidade =
                                Number(
                                    movimento.quantidade ||
                                    0
                                );


                            return [

                                formatarDataHora(
                                    movimento.data
                                ),

                                String(
                                    movimento.tipo ||
                                    ""
                                ).toUpperCase(),

                                movimento.produto ||
                                    "—",

                                movimento.codigo ||
                                    "—",

                                quantidade +
                                " " +
                                (
                                    movimento.unidade ||
                                    "UN"
                                ),

                                String(
                                    movimento.estoqueAnterior ??
                                    "—"
                                ),

                                String(
                                    movimento.estoqueNovo ??
                                    "—"
                                )

                            ];

                        }
                    );

            }


            if (
                typeof doc.autoTable !==
                "function"
            ) {

                alert(
                    "O componente da tabela PDF não foi carregado. Recarregue a página e tente novamente."
                );

                return;

            }


            doc.autoTable({

                startY:
                    resultado.tipo ===
                    "movimentacoes"
                        ? 55
                        : 52,

                head: [
                    colunas
                ],

                body:
                    linhas,

                theme:
                    "grid",

                styles: {

                    font:
                        "helvetica",

                    fontSize:
                        8,

                    cellPadding:
                        3,

                    textColor:
                        [
                            55,
                            65,
                            81
                        ]

                },

                headStyles: {

                    fillColor:
                        [
                            37,
                            99,
                            235
                        ],

                    textColor:
                        255,

                    fontStyle:
                        "bold"

                },

                alternateRowStyles: {

                    fillColor:
                        [
                            248,
                            250,
                            252
                        ]

                },

                margin: {

                    left:
                        15,

                    right:
                        15

                }

            });


            /* =====================================
               RESUMO
            ===================================== */

            let finalY =
                doc.lastAutoTable.finalY +
                10;


            if (
                finalY > 185
            ) {

                doc.addPage();

                finalY = 20;

            }


            doc.setFont(
                "helvetica",
                "bold"
            );


            doc.setFontSize(10);


            doc.setTextColor(
                37,
                48,
                65
            );


            doc.text(
                "Resumo",
                15,
                finalY
            );


            doc.setFont(
                "helvetica",
                "normal"
            );


            doc.setFontSize(8);


            let resumo = "";


            if (
                resultado.tipo ===
                "estoque"
            ) {

                const quantidadeTotal =
                    resultado.dados.reduce(
                        function (
                            total,
                            produto
                        ) {

                            return (
                                total +
                                Number(
                                    produto.quantidade ||
                                    0
                                )
                            );

                        },
                        0
                    );


                resumo =
                    "Produtos listados: " +
                    resultado.dados.length +
                    " | Quantidade total em estoque: " +
                    quantidadeTotal;

            }


            if (
                resultado.tipo ===
                "estoque-baixo"
            ) {

                const quantidadeTotal =
                    resultado.dados.reduce(
                        function (
                            total,
                            produto
                        ) {

                            return (
                                total +
                                (
                                    Number(
                                        produto.estoqueMinimo ||
                                        0
                                    ) -
                                    Number(
                                        produto.quantidade ||
                                        0
                                    )
                                )
                            );

                        },
                        0
                    );


                resumo =
                    "Produtos abaixo do mínimo: " +
                    resultado.dados.length +
                    " | Quantidade necessária para atingir o mínimo: " +
                    quantidadeTotal;

            }


            if (
                resultado.tipo ===
                "movimentacoes"
            ) {

                const entradas =
                    resultado.dados.filter(
                        function (movimento) {

                            return String(
                                movimento.tipo ||
                                ""
                            ).toLowerCase() ===
                            "entrada";

                        }
                    ).length;


                const saidas =
                    resultado.dados.filter(
                        function (movimento) {

                            return String(
                                movimento.tipo ||
                                ""
                            ).toLowerCase() ===
                            "saida";

                        }
                    ).length;


                resumo =
                    "Movimentações: " +
                    resultado.dados.length +
                    " | Entradas: " +
                    entradas +
                    " | Saídas: " +
                    saidas;

            }


            doc.text(
                resumo,
                15,
                finalY + 7
            );


            /* =====================================
               RODAPÉ
            ===================================== */

            const totalPaginas =
                doc.internal.getNumberOfPages();


            for (
                let pagina = 1;
                pagina <= totalPaginas;
                pagina++
            ) {

                doc.setPage(
                    pagina
                );


                const altura =
                    doc.internal.pageSize
                        .getHeight();


                doc.setDrawColor(
                    225,
                    229,
                    235
                );


                doc.line(
                    15,
                    altura - 14,
                    282,
                    altura - 14
                );


                doc.setFontSize(
                    7
                );


                doc.setTextColor(
                    130,
                    140,
                    150
                );


                doc.text(
                    "Gestok - Gestão de estoque",
                    15,
                    altura - 8
                );


                doc.text(
                    "Página " +
                    pagina +
                    " de " +
                    totalPaginas,
                    282,
                    altura - 8,
                    {
                        align:
                            "right"
                    }
                );

            }


            /* =====================================
               SALVAR
            ===================================== */

            const dataArquivo =
                new Date()
                    .toISOString()
                    .slice(
                        0,
                        10
                    );


            const nomeArquivo =
                "Gestok_" +
                titulo
                    .replace(
                        /\s+/g,
                        "_"
                    ) +
                "_" +
                dataArquivo +
                ".pdf";


            doc.save(
                nomeArquivo
            );

        }


        /* =========================================
           LIMPAR FILTROS
        ========================================= */

        function limparTudo() {

            if (dataInicial) {
                dataInicial.value = "";
            }

            if (dataFinal) {
                dataFinal.value = "";
            }

            if (produtoFiltro) {
                produtoFiltro.value = "";
            }

            if (tipoMovimentacao) {
                tipoMovimentacao.value = "";
            }


            atualizarPrevia();

        }


        /* =========================================
           EVENTOS
        ========================================= */

        if (tipoRelatorio) {

            tipoRelatorio.addEventListener(
                "change",
                atualizarCampos
            );

        }


        if (dataInicial) {

            dataInicial.addEventListener(
                "change",
                atualizarPrevia
            );

        }


        if (dataFinal) {

            dataFinal.addEventListener(
                "change",
                atualizarPrevia
            );

        }


        if (produtoFiltro) {

            produtoFiltro.addEventListener(
                "change",
                atualizarPrevia
            );

        }


        if (tipoMovimentacao) {

            tipoMovimentacao.addEventListener(
                "change",
                atualizarPrevia
            );

        }


        if (limparFiltros) {

            limparFiltros.addEventListener(
                "click",
                limparTudo
            );

        }


        if (gerarPdf) {

            gerarPdf.addEventListener(
                "click",
                function () {

                    gerarPdf.disabled =
                        true;

                    gerarPdf.innerHTML =
                        "Gerando PDF...";


                    setTimeout(
                        function () {

                            try {

                                gerarRelatorioPDF();

                            } finally {

                                gerarPdf.disabled =
                                    false;

                                gerarPdf.innerHTML =
                                    "<span>▣</span> Gerar PDF";

                            }

                        },
                        100
                    );

                }
            );

        }


        /* =========================================
           FIRESTORE - LOJA ATUAL
        ========================================= */

        function obterLojaAtualRelatorios() {

            try {

                if (
                    typeof obterLojaAtualGestok ===
                    "function"
                ) {

                    const lojaId =
                        obterLojaAtualGestok();

                    if (lojaId) {
                        return lojaId;
                    }

                }

            } catch (erro) {

                console.error(
                    "Erro ao obter loja atual:",
                    erro
                );

            }


            try {

                const conta =
                    obterConta();

                return conta?.lojaId || null;

            } catch (erro) {

                return null;

            }

        }


        function atualizarDadosRelatorios() {

            carregarProdutos();

            atualizarCampos();

        }


        function pararListenersFirestoreRelatorios() {

            if (
                typeof cancelarProdutosRelatorios ===
                "function"
            ) {

                cancelarProdutosRelatorios();

                cancelarProdutosRelatorios = null;

            }


            if (
                typeof cancelarMovimentacoesRelatorios ===
                "function"
            ) {

                cancelarMovimentacoesRelatorios();

                cancelarMovimentacoesRelatorios = null;

            }


            produtosCache = [];

            movimentacoesCache = [];

            lojaIdRelatorios = null;

            firestoreRelatoriosInicializado = false;

        }


        function iniciarListenersFirestoreRelatorios(
            lojaId
        ) {

            if (
                !lojaId ||
                typeof firebase ===
                    "undefined" ||
                !firebase.firestore
            ) {

                return;

            }


            pararListenersFirestoreRelatorios();


            lojaIdRelatorios = lojaId;

            firestoreRelatoriosInicializado = true;


            const referenciaProdutosAtual =
                referenciaProdutos(
                    lojaId
                );


            const referenciaMovimentacoesAtual =
                referenciaMovimentacoes(
                    lojaId
                );


            cancelarProdutosRelatorios =
                referenciaProdutosAtual
                    .onSnapshot(
                        function (snapshot) {

                            produtosCache =
                                snapshot.docs
                                    .map(
                                        function (doc) {

                                            return {
                                                id: doc.id,
                                                ...doc.data()
                                            };

                                        }
                                    );


                            atualizarDadosRelatorios();

                        },
                        function (erro) {

                            console.error(
                                "Erro ao carregar produtos dos relatórios:",
                                erro
                            );

                            produtosCache = [];

                            atualizarDadosRelatorios();

                        }
                    );


            cancelarMovimentacoesRelatorios =
                referenciaMovimentacoesAtual
                    .onSnapshot(
                        function (snapshot) {

                            movimentacoesCache =
                                snapshot.docs
                                    .map(
                                        function (doc) {

                                            return {
                                                id: doc.id,
                                                ...doc.data()
                                            };

                                        }
                                    )
                                    .sort(
                                        function (a, b) {

                                            const dataA =
                                                normalizarData(
                                                    a.data
                                                )?.getTime() || 0;

                                            const dataB =
                                                normalizarData(
                                                    b.data
                                                )?.getTime() || 0;

                                            return dataB - dataA;

                                        }
                                    );


                            atualizarPrevia();

                        },
                        function (erro) {

                            console.error(
                                "Erro ao carregar movimentações dos relatórios:",
                                erro
                            );

                            movimentacoesCache = [];

                            atualizarPrevia();

                        }
                    );

        }


        function iniciarRelatoriosFirestore() {

            if (
                typeof observarAutenticacaoGestok !==
                "function"
            ) {

                console.error(
                    "Gestok: autenticação central não está disponível."
                );

                return;

            }


            observarAutenticacaoGestok(
                function (usuario) {

                    if (!usuario) {

                        pararListenersFirestoreRelatorios();

                        atualizarDadosRelatorios();
                        return;

                    }


                    const lojaId =
                        obterLojaAtualRelatorios();


                    if (!lojaId) {

                        console.error(
                            "Gestok: não foi possível identificar a loja atual para os relatórios."
                        );

                        pararListenersFirestoreRelatorios();
                        atualizarDadosRelatorios();
                        return;

                    }


                    if (
                        firestoreRelatoriosInicializado &&
                        lojaIdRelatorios === lojaId
                    ) {

                        return;

                    }


                    iniciarListenersFirestoreRelatorios(
                        lojaId
                    );

                }
            );

        }


        /* =========================================
           PÁGINA MOSTRADA NOVAMENTE
        ========================================= */

        window.addEventListener(
            "pageshow",
            function () {

                carregarUsuario();

                atualizarCampos();

            }
        );


        /* =========================================
           INICIALIZAÇÃO
        ========================================= */

        carregarUsuario();

        atualizarCampos();

        iniciarRelatoriosFirestore();

    }
);