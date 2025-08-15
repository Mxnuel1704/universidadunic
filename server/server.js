import express from 'express';
import mysql from 'mysql';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();

// --- Configuración General ---
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // útil para forms simples
app.use(cors());
app.use(express.static('public'));

// --- Storage temporal para multer (NO usa req.body) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const carpetaTemporal = path.join('public/uploads', 'temp');
        try {
            if (!fs.existsSync(carpetaTemporal)) {
                fs.mkdirSync(carpetaTemporal, { recursive: true });
            }
            cb(null, carpetaTemporal);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        try {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const extension = path.extname(file.originalname).toLowerCase();
            const nombreLimpio = file.originalname
                .replace(extension, '')
                .slice(0, 40)
                .replace(/[^a-z0-9]/gi, '_');
            cb(null, `${uniqueSuffix}-${nombreLimpio}${extension}`);
        } catch (err) {
            cb(err);
        }
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
            return cb(new Error('Solo se permiten archivos PDF'));
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// --- Conexión a MySQL ---
const conexion = mysql.createConnection({
    host: "localhost",
    database: "admisiones3",
    user: "root",
    password: "Mxnuel1704",
    multipleStatements: true
});

conexion.connect(error => {
    if (error) {
        console.error("Error de conexión a MySQL:", error);
        process.exit(1);
    }
    console.log("Conexión exitosa a MySQL (admisiones3)");
});

// --- Endpoints ---

// Obtener carreras
app.get('/api/carreras', (req, res) => {
    conexion.query('SELECT * FROM Carrera', (error, results) => {
        if (error) return res.status(500).json({ error: "Error al obtener carreras" });
        res.json(results);
    });
});

// Obtener modalidades
app.get('/api/modalidades', (req, res) => {
    conexion.query('SELECT * FROM Modalidad', (error, results) => {
        if (error) return res.status(500).json({ error: "Error al obtener modalidades" });
        res.json(results);
    });
});

// Obtener documentos requeridos
app.get('/api/documentos-requeridos', (req, res) => {
    conexion.query('SELECT * FROM DocumentoRequerido WHERE EsObligatorio = TRUE', (error, results) => {
        if (error) return res.status(500).json({ error: "Error al obtener documentos" });
        res.json(results);
    });
});

// Obtener todas las becas
app.get('/api/becas', (req, res) => {
    conexion.query('SELECT * FROM Beca', (error, results) => {
        if (error) return res.status(500).json({ error: "Error al obtener becas" });
        res.json(results);
    });
});

// Obtener detalles de una beca específica
app.get('/api/becas/:id', (req, res) => {
    const { id } = req.params;
    conexion.query('SELECT * FROM Beca WHERE ID_Beca = ?', [id], (error, results) => {
        if (error) return res.status(500).json({ error: "Error al obtener detalles de beca" });
        if (results.length === 0) return res.status(404).json({ error: "Beca no encontrada" });
        res.json(results[0]);
    });
});

// Registrar nuevo aspirante
app.post('/api/aspirantes', (req, res) => {
    const { Nombre, Apellido, Genero, FechaNacimiento, Email, Telefono } = req.body;

    if (!Nombre || !Apellido || !Genero || !FechaNacimiento || !Email || !Telefono) {
        return res.status(400).json({ error: "Todos los campos son obligatorios." });
    }

    const sql = 'INSERT INTO Aspirante SET ?';
    const data = { Nombre, Apellido, Genero, FechaNacimiento, Email, Telefono };

    conexion.query(sql, data, (error, result) => {
        if (error) return res.status(500).json({ error: "Error al registrar el aspirante" });
        res.json({ id: result.insertId });
    });
});

// Registrar solicitud de admisión
app.post('/api/solicitudes-admision', (req, res) => {
    const { FechaSolicitud, EstadoSolicitud, ID_Aspirante, ID_Carrera, ID_Modalidad } = req.body;

    if (!FechaSolicitud || !EstadoSolicitud || !ID_Aspirante || !ID_Carrera || !ID_Modalidad) {
        return res.status(400).json({ error: "Faltan datos requeridos para la solicitud." });
    }

    const sql = `
        INSERT INTO SolicitudAdmision 
        (FechaSolicitud, EstadoSolicitud, FechaAltaAlumno, ID_Aspirante, ID_Carrera, ID_Modalidad) 
        VALUES (?, ?, NULL, ?, ?, ?)
    `;
    const values = [FechaSolicitud, EstadoSolicitud, ID_Aspirante, ID_Carrera, ID_Modalidad];

    conexion.query(sql, values, (error, result) => {
        if (error) return res.status(500).json({ error: "Error al registrar la solicitud" });
        res.json({ message: 'Solicitud registrada correctamente', id: result.insertId });
    });
});

// Subir documentos (Opción 3: guardar en temp y mover a carpeta del aspirante)
app.post('/api/subir-documentos', upload.array('documentos'), (req, res) => {
    // Nota: en este punto multer YA procesó el multipart y cargó req.files y req.body (strings)
    const archivosTemp = req.files || [];

    try {
        const idAspirante = req.body.idAspirante;
        if (!idAspirante) {
            // limpiar temporales si falta id
            archivosTemp.forEach(f => { try { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch (_) {} });
            return res.status(400).json({ error: "ID de aspirante es requerido" });
        }

        const carpetaDestino = path.join('public/uploads', `aspirante-${idAspirante}`);
        if (!fs.existsSync(carpetaDestino)) {
            fs.mkdirSync(carpetaDestino, { recursive: true });
        }

        let documentosIds = [];
        try {
            documentosIds = req.body.documentosIds ? JSON.parse(req.body.documentosIds) : [];
        } catch (e) {
            documentosIds = [];
        }

        const documentos = archivosTemp.map((file, index) => {
            const rutaDestino = path.join(carpetaDestino, file.filename);
            // mover desde temp a destino
            fs.renameSync(file.path, rutaDestino);

            return {
                nombre: file.originalname,
                ruta: rutaDestino.replace(/\\/g, '/'),
                tipo: path.extname(file.originalname).toLowerCase(),
                idDoc: documentosIds[index] || 'unknown'
            };
        });

        res.json({
            success: true,
            documentos,
            documentosIds
        });

    } catch (error) {
        console.error('Error en /api/subir-documentos:', error);
        // intentar limpiar cualquier archivo temp restante
        (req.files || []).forEach(file => {
            try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch (_) {}
        });
        res.status(500).json({ error: error.message });
    }
});

// Registrar documentos en BD (sin cambios de lógica)
app.post('/api/registrar-documentos', (req, res) => {
    const { documentos, idSolicitud, idAspirante } = req.body;

    if (!documentos || !Array.isArray(documentos) || documentos.length === 0 || !idSolicitud || !idAspirante) {
        return res.status(400).json({ 
            error: "Datos incompletos o formato incorrecto",
            detalles: {
                recibido: { documentos, idSolicitud, idAspirante }
            }
        });
    }

    try {
        const valores = documentos.map(doc => {
            if (!doc.ID_DocRequerido || !doc.ruta) {
                throw new Error(`Documento incompleto: ${JSON.stringify(doc)}`);
            }

            return [
                idSolicitud,
                idAspirante,
                doc.ID_DocRequerido,
                new Date().toISOString().slice(0, 10),
                doc.ruta,
                false // Validado = false por defecto
            ];
        });

        const sql = `
            INSERT INTO DocumentoEntregado 
            (ID_Solicitud, ID_Aspirante, ID_DocRequerido, FechaEntrega, RutaArchivo, Validado)
            VALUES ?
        `;

        conexion.query(sql, [valores], (error, result) => {
            if (error) {
                console.error("Error en la consulta SQL:", error);
                return res.status(500).json({ 
                    error: "Error al registrar documentos en la base de datos",
                    detalle: error.message
                });
            }
            res.json({ 
                success: true, 
                documentosRegistrados: result.affectedRows 
            });
        });
    } catch (error) {
        console.error("Error en el procesamiento:", error);
        res.status(400).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Registrar beca
app.post('/api/registrar-beca', (req, res) => {
    const { idSolicitudAdmision, idBeca } = req.body;

    if (!idSolicitudAdmision || !idBeca) {
        return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    const sql = `
        INSERT INTO SolicitudBeca 
        (ID_SolicitudAdmision, ID_Beca, FechaAsignacion)
        VALUES (?, ?, ?)
    `;
    const values = [idSolicitudAdmision, idBeca, new Date().toISOString().slice(0, 10)];

    conexion.query(sql, values, (error, result) => {
        if (error) return res.status(500).json({ error: "Error al registrar la beca" });
        res.json({ message: 'Beca registrada correctamente', id: result.insertId });
    });
});

// --- Manejo de Errores ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// --- Cierre Limpio ---
process.on('SIGINT', () => {
    try { conexion.end(); } catch (_) {}
    console.log('Conexión a MySQL cerrada.');
    process.exit();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
