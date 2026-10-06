/* =========================================
   GESTOK
   SIDEBAR UNIVERSAL
   CAMINHOS AUTOMÁTICOS
========================================= */

(function () {

    "use strict";


    /* =====================================
       DESCOBRIR CAMINHO DA RAIZ
    ===================================== */

    function obterPrefixoGestok() {

        const caminho =
            window.location.pathname
                .replace(/\\/g, "/");


        const partes =
            caminho.split("/");


        /*
         * Remove o nome do arquivo
         */

        if (
            partes.length > 0 &&
            partes[partes.length - 1]
                .includes(".")
        ) {

            partes.pop();

        }


        /*
         * Descobre quantas pastas existem
         * depois da raiz do projeto.
         *
         * Exemplos:
         *
         * /ESTOQUE/entrada/
         * → ../
         *
         * /ESTOQUE/produtos/
         * → ../
         *
         * /ESTOQUE/produtos/consulta/
         * → ../../
         */


        let profundidade = 0;


        /*
         * Procuramos as pastas conhecidas
         * do Gestok.
         */

        const pastasGestok = [

            "sistema",
            "entrada",
            "saida",
            "produtos",
            "movimentacoes",
            "relatorios",
            "solicitacoes",
            "perfil",
            "suporte",
            "redes_sociais",
            "login",
            "cadastro",
            "planos"

        ];


        let indiceGestok = -1;


        for (
            let i = partes.length - 1;
            i >= 0;
            i--
        ) {

            if (
                pastasGestok.includes(
                    partes[i].toLowerCase()
                )
            ) {

                indiceGestok = i;

                break;

            }

        }


        /*
         * Se encontrou uma pasta do Gestok,
         * tudo que vier depois dela indica
         * a profundidade.
         */

        if (indiceGestok !== -1) {

            profundidade =
                partes.length -
                indiceGestok;

        }


        /*
         * Para páginas dentro da pasta
         * produtos/consulta:
         *
         * /ESTOQUE/produtos/consulta/
         *
         * precisamos subir duas vezes.
         */

        let prefixo = "";


        for (
            let i = 0;
            i < profundidade;
            i++
        ) {

            prefixo += "../";

        }


        return prefixo;

    }


    /* =====================================
       GERAR URL
    ===================================== */

    function urlGestok(caminho) {

        const prefixo =
            obterPrefixoGestok();

        return prefixo + caminho;

    }


    /* =====================================
       HTML DA SIDEBAR
    ===================================== */

    function criarHTMLSidebar() {

        return `

            <div
                id="sidebarOverlay"
                class="sidebar-overlay"
            ></div>


            <aside
                id="gestokSidebar"
                class="gestok-sidebar"
            >


                <!-- =========================
                     TOPO
                ========================== -->

                <div class="sidebar-top">

                    <div class="gestok-brand">

                        <div class="brand-icon">
                            G
                        </div>

                        <div class="brand-text">

                            <strong>
                                Gestok
                            </strong>

                            <small>
                                Gestão de estoque
                            </small>

                        </div>

                    </div>


                    <button
                        type="button"
                        id="sidebarClose"
                        class="sidebar-close"
                        aria-label="Fechar menu"
                    >
                        ×
                    </button>

                </div>


                <!-- =========================
                     NAVEGAÇÃO
                ========================== -->

                <nav class="sidebar-navigation">


                    <!-- PRINCIPAL -->

                    <div class="sidebar-section-title">
                        PRINCIPAL
                    </div>


                    <a
                        href="${urlGestok("sistema/index.html")}"
                        class="sidebar-nav-item"
                        data-page="dashboard"
                    >

                        <span class="sidebar-nav-icon">
                            ⌂
                        </span>

                        <span>
                            Dashboard
                        </span>

                    </a>


                    <!-- ESTOQUE -->

                    <div class="sidebar-section-title">
                        ESTOQUE
                    </div>


                    <a
                        href="${urlGestok("produtos/consulta/index.html")}"
                        class="sidebar-nav-item"
                        data-page="produtos"
                    >

                        <span class="sidebar-nav-icon">
                            ▣
                        </span>

                        <span>
                            Produtos
                        </span>

                    </a>


                    <!-- CRIAR PRODUTO -->

                    <a
                        href="${urlGestok("produtos/index.html#novo")}"
                        class="sidebar-nav-item sidebar-create-product"
                        data-page="produtos-novo"
                    >

                        <span class="sidebar-create-icon">
                            ＋
                        </span>

                        <span class="sidebar-create-text">

                            <strong>
                                Criar produto
                            </strong>

                            <small>
                                Novo item no estoque
                            </small>

                        </span>

                    </a>


                    <!-- ENTRADA -->

                    <a
                        href="${urlGestok("entrada/index.html")}"
                        class="sidebar-nav-item"
                        data-page="entrada"
                    >

                        <span class="sidebar-nav-icon">
                            ↓
                        </span>

                        <span>
                            Entrada
                        </span>

                    </a>


                    <!-- SAÍDA -->

                    <a
                        href="${urlGestok("saida/index.html")}"
                        class="sidebar-nav-item"
                        data-page="saida"
                    >

                        <span class="sidebar-nav-icon">
                            ↑
                        </span>

                        <span>
                            Saída
                        </span>

                    </a>


                    <!-- GESTÃO -->

                    <div class="sidebar-section-title">
                        GESTÃO
                    </div>


                    <a
                        href="${urlGestok("movimentacoes/index.html")}"
                        class="sidebar-nav-item"
                        data-page="movimentacoes"
                    >

                        <span class="sidebar-nav-icon">
                            ↕
                        </span>

                        <span>
                            Movimentações
                        </span>

                    </a>


                    <a
                        href="${urlGestok("relatorios/index.html")}"
                        class="sidebar-nav-item"
                        data-page="relatorios"
                    >

                        <span class="sidebar-nav-icon">
                            ▤
                        </span>

                        <span>
                            Relatórios
                        </span>

                    </a>


                    <a
                        href="${urlGestok("solicitacoes/index.html")}"
                        class="sidebar-nav-item"
                        data-page="solicitacoes"
                    >

                        <span class="sidebar-nav-icon">
                            ✓
                        </span>

                        <span>
                            Solicitações
                        </span>

                    </a>


                    <!-- AJUDA -->

                    <div class="sidebar-section-title">
                        AJUDA
                    </div>


                    <a
                        href="${urlGestok("perfil/index.html")}"
                        class="sidebar-nav-item"
                        data-page="perfil"
                    >

                        <span class="sidebar-nav-icon">
                            ●
                        </span>

                        <span>
                            Perfil
                        </span>

                    </a>


                    <a
                        href="${urlGestok("suporte/index.html")}"
                        class="sidebar-nav-item"
                        data-page="suporte"
                    >

                        <span class="sidebar-nav-icon">
                            ?
                        </span>

                        <span>
                            Suporte
                        </span>

                    </a>
                    <a
                    href="${urlGestok("redes_sociais/index.html")}"
                    class="sidebar-nav-item"
                    data-page="redes_sociais"
                >
                    <span class="sidebar-nav-icon">
                        ◎
                    </span>

                    <span>
                        Redes Sociais
                    </span>
                </a>


                </nav>


                <!-- =========================
                     RODAPÉ
                ========================== -->

                <div class="sidebar-bottom">

                    <div class="system-status">

                        <span class="status-dot"></span>

                        <div>

                            <strong>
                                Sistema ativo
                            </strong>

                            <small>
                                Todos os serviços funcionando
                            </small>

                        </div>

                    </div>

                </div>


            </aside>

        `;

    }


    /* =====================================
       CRIAR SIDEBAR
    ===================================== */

    function criarSidebar() {

        const container =
            document.getElementById(
                "gestok-sidebar-container"
            );


        if (!container) {

            console.error(
                "Gestok: container da sidebar não encontrado."
            );

            return;

        }


        container.innerHTML =
            criarHTMLSidebar();


        configurarMenu();

    }


    /* =====================================
       CONFIGURAR MENU
    ===================================== */

    function configurarMenu() {

        const menuButton =
            document.getElementById(
                "menuButton"
            );

        const sidebar =
            document.getElementById(
                "gestokSidebar"
            );

        const overlay =
            document.getElementById(
                "sidebarOverlay"
            );

        const closeButton =
            document.getElementById(
                "sidebarClose"
            );


        if (
            !menuButton ||
            !sidebar
        ) {

            console.error(
                "Gestok: elementos da sidebar não encontrados."
            );

            return;

        }


        /* =================================
           ABRIR
        ================================= */

        menuButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();


                sidebar.classList.add(
                    "active"
                );


                if (overlay) {

                    overlay.classList.add(
                        "active"
                    );

                }


                document.body.style.overflow =
                    "hidden";

            }
        );


        /* =================================
           FECHAR
        ================================= */

        function fecharMenu() {

            sidebar.classList.remove(
                "active"
            );


            if (overlay) {

                overlay.classList.remove(
                    "active"
                );

            }


            document.body.style.overflow =
                "";

        }


        if (closeButton) {

            closeButton.addEventListener(
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


        /* =================================
           ESC
        ================================= */

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


        /* =================================
           MARCAR PÁGINA
        ================================= */

        marcarPaginaAtual();

    }


    /* =====================================
       PÁGINA ATUAL
    ===================================== */

    function marcarPaginaAtual() {

        const caminho =
            window.location.pathname
                .toLowerCase();


        const itens =
            document.querySelectorAll(
                ".sidebar-nav-item"
            );


        itens.forEach(function (item) {

            const pagina =
                item.dataset.page;


            item.classList.remove(
                "active"
            );


            if (
                pagina === "dashboard" &&
                caminho.includes("/sistema/")
            ) {

                item.classList.add(
                    "active"
                );

            }


            if (
                pagina === "entrada" &&
                caminho.includes("/entrada/")
            ) {

                item.classList.add(
                    "active"
                );

            }


            if (
                pagina === "saida" &&
                caminho.includes("/saida/")
            ) {

                item.classList.add(
                    "active"
                );

            }


            if (
                pagina === "produtos" &&
                caminho.includes("/produtos/consulta/")
            ) {

                item.classList.add(
                    "active"
                );

            }


            if (
                pagina === "movimentacoes" &&
                caminho.includes("/movimentacoes/")
            ) {

                item.classList.add(
                    "active"
                );

            }


            if (
                pagina === "relatorios" &&
                caminho.includes("/relatorios/")
            ) {

                item.classList.add(
                    "active"
                );

            }


            if (
                pagina === "solicitacoes" &&
                caminho.includes("/solicitacoes/")
            ) {

                item.classList.add(
                    "active"
                );

            }


            if (
                pagina === "perfil" &&
                caminho.includes("/perfil/")
            ) {

                item.classList.add(
                    "active"
                );

            }


            if (
                pagina === "suporte" &&
                caminho.includes("/suporte/")
            ) {

                item.classList.add(
                    "active"
                );

            }
            if (
                pagina === "redes-sociais" &&
                caminho.includes("/redes_sociais/")
            ) {

                item.classList.add(
                    "active"
                );
            }
        });

    }


    /* =====================================
       INICIAR
    ===================================== */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            criarSidebar
        );

    } else {

        criarSidebar();

    }

})();