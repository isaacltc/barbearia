const formulario = document.getElementById("formulario");

formulario.addEventListener("submit", async function(event) {
    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const data = document.getElementById("data").value;
    const hora = document.getElementById("hora").value;
    const endpoint = window.location.protocol === "file:"
        ? "http://localhost:5055/agendamento"
        : "/agendamento";

    try {
        const resposta = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome,
                telefone,
                data,
                hora
            })
        });

        const resultado = await resposta.text();
        alert(resultado);

        if (resposta.ok) {
            formulario.reset();
        }
    } catch (error) {
        alert("Nao foi possivel conectar ao servidor.");
    }
});
