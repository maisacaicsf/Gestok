/* =========================================
   GESTOK
   REDES SOCIAIS OFICIAIS

   Depois, basta colocar os links abaixo.
   ========================================= */

const REDES_GESTOK = {
    instagram: "https://www.instagram.com/gestok_gestor?stkn=YTI3Mm51a2M0b3Rw&utm_source=qr",
    facebook: "",
    tiktok: "",
    youtube: ""
};

function normalizarUrl(valor) {
    const url = String(valor || "").trim();

    if (!url) {
        return "";
    }

    if (/^https?:\/\//i.test(url)) {
        return url;
    }

    return `https://${url}`;
}

function atualizarCards() {
    document.querySelectorAll("[data-open]").forEach(function (botao) {
        const rede = botao.dataset.open;
        const url = normalizarUrl(REDES_GESTOK[rede]);
        const status = document.getElementById(`status-${rede}`);

        if (url) {
            botao.disabled = false;
            botao.dataset.url = url;

            if (status) {
                status.textContent = "Canal oficial disponível";
                status.className = "social-link-status available";
            }

            return;
        }

        botao.disabled = true;
        botao.removeAttribute("data-url");

        if (status) {
            status.textContent = "Link em breve";
            status.className = "social-link-status";
        }
    });
}

function configurarBotoes() {
    document.querySelectorAll("[data-open]").forEach(function (botao) {
        botao.addEventListener("click", function () {
            const url = this.dataset.url;

            if (!url) {
                return;
            }

            window.open(url, "_blank", "noopener,noreferrer");
        });
    });
}

document.addEventListener("DOMContentLoaded", function () {
    atualizarCards();
    configurarBotoes();
});
