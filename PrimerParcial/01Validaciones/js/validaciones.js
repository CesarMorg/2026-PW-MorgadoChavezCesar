const patrones = {
    nombre: /^[A-Za-zÁÉÍÓÚÑáéíóúñÜü\s]{2,60}$/,
    boleta: /^\d{10}$/,
    fecha: /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/
};

const mensajes = {
    nombre: "Ingrese un nombre válido.",
    boleta: "La boleta debe tener 10 dígitos.",
    fecha: "La fecha debe tener el formato DD/MM/AAAA."
};

function validarCampo(campo, valor){
    return patrones[campo].test(valor.trim());
}

const formulario = document.getElementById("form-registro");

formulario.addEventListener("submit", function(evento){

    evento.preventDefault();

    let formularioValido = true;

    for(const campo of Object.keys(patrones)){

        const input = document.getElementById(campo);
        const errorSpan = document.getElementById(`error-${campo}`);

        const esValido = validarCampo(campo,input.value);

        if(esValido){
            errorSpan.textContent = "";
        }else{
            errorSpan.textContent = mensajes[campo];
            formularioValido = false;
        }

    }

    const mensajeExito = document.getElementById("mensaje-exito");

    if(formularioValido){
        mensajeExito.textContent = "¡Registro exitoso!";
        mensajeExito.classList.add("mostrar");
        formulario.reset();
    }else{
        mensajeExito.textContent = "";
        mensajeExito.classList.remove("mostrar");
    }

});