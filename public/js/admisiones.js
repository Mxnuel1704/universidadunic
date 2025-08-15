document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const listaRequisitos = document.getElementById('lista-requisitos');
    const iniciarAdmisionBtn = document.getElementById('iniciar-admision-btn');
    const formAdmisionContainer = document.getElementById('form-admision-container');
    const formAdmisionMultistep = document.getElementById('form-admision-multistep');
    const mensajeFormulario = document.getElementById('mensaje-formulario');
    const formSteps = document.querySelectorAll('.form-step');
    const carreraSelect = document.getElementById('carrera-solicitud');
    const modalidadSelect = document.getElementById('modalidad-solicitud');
    const becaSelect = document.getElementById('beca-solicitud');
    const detallesBeca = document.getElementById('detalles-beca');

    // --- Variables de estado del formulario ---
    let currentStep = 0;
    let aspiranteId = null;
    let solicitudId = null;
    let documentosRequeridos = [];

    // --- Funciones de Utilidad ---
    function showStep(stepIndex) {
        formSteps.forEach((step, index) => {
            step.style.display = index === stepIndex ? 'block' : 'none';
        });
        currentStep = stepIndex;
    }

    function displayMessage(message, isSuccess) {
        mensajeFormulario.textContent = message;
        mensajeFormulario.style.backgroundColor = isSuccess ? '#d4edda' : '#f8d7da';
        mensajeFormulario.style.color = isSuccess ? '#155724' : '#721c24';
        mensajeFormulario.style.display = 'block';
    }

    function validateStep(stepId) {
        const stepElement = document.getElementById(stepId);
        const inputs = stepElement.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (input.type === 'file' && input.files.length === 0) {
                isValid = false;
                input.style.borderColor = 'red';
            } else if (!input.value.trim()) {
                isValid = false;
                input.style.borderColor = 'red';
            } else {
                input.style.borderColor = '#ccc';

                if (input.type === 'email' && !isValidEmail(input.value)) {
                    isValid = false;
                    input.style.borderColor = 'red';
                }

                if (input.id === 'telefono-aspirante' && !/^\d{10}$/.test(input.value)) {
                    isValid = false;
                    input.style.borderColor = 'red';
                }
            }
        });
        return isValid;
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // --- Carga de Datos desde API ---
    async function cargarRequisitos() {
        try {
            const response = await fetch('http://localhost:3000/api/documentos-requeridos');
            if (!response.ok) throw new Error('Error al cargar requisitos');
            const data = await response.json();
            documentosRequeridos = data;

            const lista = document.getElementById('lista-requisitos');
            lista.innerHTML = '';
            data.forEach(doc => {
                const li = document.createElement('li');
                li.textContent = doc.NombreDocumento;
                lista.appendChild(li);
            });
        } catch (error) {
            console.error('Error:', error);
            displayMessage('No se pudieron cargar los requisitos. Mostrando lista predeterminada.', false);
            listaRequisitos.innerHTML = `
                <li>Acta de nacimiento</li>
                <li>CURP</li>
                <li>Certificado de bachillerato</li>
            `;
        }
    }

    async function cargarCarreras() {
        try {
            const response = await fetch('http://localhost:3000/api/carreras');
            if (!response.ok) throw new Error('Error al cargar carreras');
            const data = await response.json();

            carreraSelect.innerHTML = '<option value="">Selecciona una carrera</option>';
            data.forEach(carrera => {
                const option = document.createElement('option');
                option.value = carrera.ID_Carrera;
                option.textContent = carrera.NombreCarrera;
                carreraSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error:', error);
            carreraSelect.innerHTML = '<option value="">Error al cargar carreras</option>';
            displayMessage('Error al cargar las carreras disponibles', false);
        }
    }

    async function cargarModalidades() {
        try {
            const response = await fetch('http://localhost:3000/api/modalidades');
            if (!response.ok) throw new Error('Error al cargar modalidades');
            const data = await response.json();

            modalidadSelect.innerHTML = '<option value="">Selecciona una modalidad</option>';
            data.forEach(modalidad => {
                const option = document.createElement('option');
                option.value = modalidad.ID_Modalidad;
                option.textContent = modalidad.TipoModalidad;
                modalidadSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error:', error);
            modalidadSelect.innerHTML = '<option value="">Error al cargar modalidades</option>';
            displayMessage('Error al cargar las modalidades disponibles', false);
        }
    }

    async function cargarDocumentosParaSubir() {
        try {
            const response = await fetch('http://localhost:3000/api/documentos-requeridos');
            if (!response.ok) throw new Error('Error al cargar documentos');
            const data = await response.json();

            const lista = document.getElementById('lista-documentos-subir');
            const container = document.getElementById('documentos-container');
            lista.innerHTML = '';
            container.innerHTML = '';

            data.forEach(doc => {
                const li = document.createElement('li');
                li.textContent = doc.NombreDocumento;
                lista.appendChild(li);

                const div = document.createElement('div');
                div.className = 'documento-input';
                const label = document.createElement('label');
                label.textContent = `Subir ${doc.NombreDocumento}:`;
                label.htmlFor = `doc-${doc.ID_DocRequerido}`;
                const input = document.createElement('input');
                input.type = 'file';
                input.id = `doc-${doc.ID_DocRequerido}`;
                input.name = `documento_${doc.ID_DocRequerido}`;
                input.dataset.idDoc = doc.ID_DocRequerido;
                input.accept = '.pdf';
                input.required = doc.EsObligatorio;

                div.appendChild(label);
                div.appendChild(input);
                container.appendChild(div);
            });
        } catch (error) {
            console.error('Error:', error);
            displayMessage('Error al cargar la lista de documentos para subir', false);
        }
    }

    async function cargarBecas() {
        try {
            const response = await fetch('http://localhost:3000/api/becas');
            if (!response.ok) throw new Error('Error al cargar becas');
            const data = await response.json();

            becaSelect.innerHTML = '<option value="">No solicito beca</option>';
            data.forEach(beca => {
                const option = document.createElement('option');
                option.value = beca.ID_Beca;
                option.textContent = beca.NombreBeca;
                becaSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error:', error);
            becaSelect.innerHTML = '<option value="">Error al cargar becas</option>';
        }
    }

    // --- Event Listeners ---
    iniciarAdmisionBtn.addEventListener('click', () => {
        iniciarAdmisionBtn.style.display = 'none';
        formAdmisionContainer.style.display = 'block';
        showStep(0);
        cargarCarreras();
        cargarModalidades();
    });

    document.querySelectorAll('.next-step-btn').forEach(button => {
        button.addEventListener('click', () => {
            if (validateStep(formSteps[currentStep].id)) {
                if (currentStep < formSteps.length - 1) {
                    showStep(currentStep + 1);
                    mensajeFormulario.style.display = 'none';
                    if (currentStep === 2) {
                        cargarDocumentosParaSubir();
                    }
                    if (currentStep === 3) {
                        cargarBecas();
                    }
                }
            } else {
                displayMessage('Por favor, completa todos los campos requeridos correctamente.', false);
            }
        });
    });

    document.querySelectorAll('.prev-step-btn').forEach(button => {
        button.addEventListener('click', () => {
            if (currentStep > 0) {
                showStep(currentStep - 1);
                mensajeFormulario.style.display = 'none';
            }
        });
    });

    becaSelect.addEventListener('change', async function() {
        const selectedId = this.value;
        if (!selectedId) {
            detallesBeca.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/becas/${selectedId}`);
            if (!response.ok) throw new Error('Error al cargar detalles de beca');
            const beca = await response.json();

            document.getElementById('descripcion-beca').textContent = beca.Descripcion;
            document.getElementById('monto-mensual').textContent = `$${beca.MontoMensual}`;
            document.getElementById('monto-anual').textContent = `$${beca.MontoAnual}`;
            document.getElementById('incluye-reinscripcion').textContent =
                beca.IncluyeReinscripcion ? 'Sí' : 'No';

            detallesBeca.style.display = 'block';
        } catch (error) {
            console.error('Error:', error);
            detallesBeca.style.display = 'none';
        }
    });

    // --- Lógica del Envío Final del Formulario (con correcciones) ---
    formAdmisionMultistep.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!validateStep(formSteps[currentStep].id)) {
            displayMessage('Por favor, completa todos los campos requeridos en este paso.', false);
            return;
        }

        const formData = new FormData(formAdmisionMultistep);
        const data = Object.fromEntries(formData.entries());

        try {
            // Paso 1: Registrar aspirante
            const aspiranteResponse = await fetch('http://localhost:3000/api/aspirantes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    Nombre: data.nombre,
                    Apellido: data.apellido,
                    Genero: data.genero,
                    FechaNacimiento: data.fechaNacimiento,
                    Email: data.email,
                    Telefono: data.telefono
                })
            });

            if (!aspiranteResponse.ok) {
                const error = await aspiranteResponse.json();
                throw new Error(error.error || 'Error al registrar aspirante');
            }
            const aspiranteResult = await aspiranteResponse.json();
            aspiranteId = aspiranteResult.id;

            // Paso 2: Registrar solicitud de admisión
            const hoy = new Date().toISOString().split('T')[0];
            const solicitudResponse = await fetch('http://localhost:3000/api/solicitudes-admision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    FechaSolicitud: hoy,
                    EstadoSolicitud: 'Pendiente',
                    ID_Aspirante: aspiranteId,
                    ID_Carrera: data.idCarrera,
                    ID_Modalidad: data.idModalidad
                })
            });

            if (!solicitudResponse.ok) {
                const error = await solicitudResponse.json();
                throw new Error(error.error || 'Error al registrar solicitud');
            }
            const solicitudResult = await solicitudResponse.json();
            solicitudId = solicitudResult.id;

            // Paso 3: Subir documentos (Versión corregida)
            const documentosFormData = new FormData();
            const inputsDocumentos = document.querySelectorAll('#step-3 input[type="file"]');
            let documentosSubidos = false;

            // Validar que al menos un documento obligatorio fue subido
            const documentosObligatorios = Array.from(inputsDocumentos).filter(
                input => input.required && input.files.length === 0
            );

            if (documentosObligatorios.length > 0) {
                throw new Error('Debes subir todos los documentos obligatorios');
            }

            documentosFormData.append('idAspirante', aspiranteId);

            // Agregar archivos e IDs al FormData
            const documentosIds = [];
            inputsDocumentos.forEach(input => {
                if (input.files[0]) {
                    documentosFormData.append('documentos', input.files[0]);
                    documentosIds.push(input.dataset.idDoc);
                    documentosSubidos = true;
                }
            });

            if (!documentosSubidos) {
                throw new Error('No se subieron documentos');
            }

            documentosFormData.append('documentosIds', JSON.stringify(documentosIds));

            const documentosResponse = await fetch('http://localhost:3000/api/subir-documentos', {
                method: 'POST',
                body: documentosFormData
            });

            if (!documentosResponse.ok) {
                const errorData = await documentosResponse.json();
                throw new Error(errorData.error || 'Error al subir documentos');
            }
            const documentosSubidosData = await documentosResponse.json();

            // Paso 4: Registrar documentos en BD
            const registrarDocResponse = await fetch('http://localhost:3000/api/registrar-documentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentos: documentosSubidosData.documentos.map((doc, index) => ({
                        ID_DocRequerido: parseInt(documentosIds[index]),
                        ruta: doc.ruta
                    })),
                    idSolicitud: solicitudId,
                    idAspirante: aspiranteId
                })
            });

            if (!registrarDocResponse.ok) {
                throw new Error('Error al registrar documentos en BD');
            }

            // Paso 5: Registrar beca si se seleccionó
            if (data.idBeca) {
                const becaResponse = await fetch('http://localhost:3000/api/registrar-beca', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        idSolicitudAdmision: solicitudId,
                        idBeca: data.idBeca
                    })
                });

                if (!becaResponse.ok) {
                    throw new Error('Error al registrar beca');
                }
            }

            // Éxito
            displayMessage('¡Solicitud enviada con éxito! Te contactaremos pronto.', true);
            formAdmisionMultistep.reset();
            showStep(0);
            formAdmisionContainer.style.display = 'none';
            iniciarAdmisionBtn.style.display = 'block';
        } catch (error) {
            console.error('Error:', error);
            displayMessage(`Error: ${error.message}`, false);
            
            // Mostrar botón "Anterior" para permitir corrección
            const prevBtn = document.querySelector('.prev-step-btn');
            if (prevBtn) prevBtn.style.display = 'inline-block';
        }
    });

    // --- Inicialización ---
    cargarRequisitos();
    showStep(0);
});