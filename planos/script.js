document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("btnComecar");
    if (btn) btn.addEventListener("click", function () {
        window.location.href = "../cadastro/index.html";
    });
});
