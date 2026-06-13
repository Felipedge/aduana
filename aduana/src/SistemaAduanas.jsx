import React, { useState, useMemo, useEffect } from "react";
import {
  cargarTodo, sembrarDatos,
  guardarViajero as persistirViajero,
  guardarVehiculo as persistirVehiculo,
  guardarTramite, guardarUsuario,
  borrarViajero, borrarVehiculo,
} from "./db";
import {
  Car, FileCheck, Leaf, FileText, BarChart3,
  Users, Search, CheckCircle2, XCircle, Clock, AlertTriangle,
  QrCode, ChevronRight, Plus, Filter, Download, Eye,
  Apple, Stamp, ArrowRight, X, LogIn, LogOut,
  Pencil, Trash2, UserPlus, Save, Database, Settings,
} from "lucide-react";

/* =========================================================================
   SISTEMA DE ADUANAS — Prototipo funcional
   Modela las clases del diagrama: Viajero, Vehiculo, TramiteFrontera,
   DocumentoAduanero (abstracta) -> DeclaracionSAG, FormularioVehiculoAcuerdo,
   AutorizacionNotarial, e InformeEstadistico.
   Tres roles: Viajero (crea trámites), Funcionario (revisa/aprueba) y
   Admin (CRUD de viajeros y vehículos).
   ========================================================================= */

// ---------- Datos semilla (instancias de las clases del diagrama) ----------
const SEED_VIAJEROS = [
  { rut: "18.345.678-9", nombreCompleto: "Camila Rojas Pérez", nacionalidad: "Chilena", fechaNacimiento: "1995-03-12", email: "camila.rojas@mail.cl", telefono: "+56 9 8123 4567", esMenor: false, requiereAutorizacion: false },
  { rut: "26.111.222-3", nombreCompleto: "Mateo Rojas Pérez", nacionalidad: "Chilena", fechaNacimiento: "2014-07-08", email: "camila.rojas@mail.cl", telefono: "+56 9 8123 4567", esMenor: true, requiereAutorizacion: true, tutorRut: "18.345.678-9" },
  { rut: "14.987.654-K", nombreCompleto: "John Carter", nacionalidad: "Estadounidense", fechaNacimiento: "1980-11-30", email: "jcarter@mail.com", telefono: "+1 202 555 0143", esMenor: false, requiereAutorizacion: false },
];

const SEED_VEHICULOS = [
  { patente: "KXLR-45", marca: "Toyota", modelo: "RAV4", anio: 2021, color: "Gris", numeroChasis: "JTMB1234567890", esDiplomatico: false, tieneRestricciones: false },
  { patente: "CD-0012", marca: "Mercedes-Benz", modelo: "E-Class", anio: 2023, color: "Negro", numeroChasis: "WDD2130001A123", esDiplomatico: true, tieneRestricciones: false },
];

// Usuarios de demo para el login. password en texto plano SOLO por ser prototipo.
// Roles: 'viajero' | 'funcionario' | 'admin' | 'sag' | 'pdi' | 'registro_civil'
// Los sistemas externos (sag, pdi, registro_civil) son simulados pero tienen permisos específicos.
const USUARIOS = [
  { rut: "18.345.678-9", password: "1234", rol: "viajero", nombre: "Camila Rojas Pérez", viajeroRut: "18.345.678-9" },
  { rut: "14.987.654-K", password: "1234", rol: "viajero", nombre: "John Carter", viajeroRut: "14.987.654-K" },
  { rut: "11.222.333-4", password: "func", rol: "funcionario", nombre: "Pedro Soto (Funcionario)", puestoFronterizo: "Los Libertadores" },
  { rut: "10.000.000-0", password: "admin", rol: "admin", nombre: "Admin del Sistema" },
  // Sistemas externos simulados (generalmente no logueados, pero aquí incluidos para auditoría)
  { rut: "SAG-001", password: "sag2026", rol: "sag", nombre: "Sistema SAG", institucion: "Servicio Agrícola y Ganadero" },
  { rut: "PDI-001", password: "pdi2026", rol: "pdi", nombre: "Sistema PDI", institucion: "Policía de Investigaciones" },
  { rut: "RC-001", password: "rc2026", rol: "registro_civil", nombre: "Sistema Registro Civil", institucion: "Servicio de Registro Civil" },
];

// Auditoría global: registro de todas las acciones por usuario, rol, timestamp y detalles
let AUDITORIA = [];


let TRAMITE_SEQ = 3;
const SEED_TRAMITES = [
  {
    idTramite: 1, fechaHora: "2026-05-29 08:40", tipoViaje: "salida", estado: "aprobado",
    tiempoEstimado: 15, qrCode: "QR-AD-0001", observaciones: "Sin novedad.",
    viajeroRut: "18.345.678-9", vehiculoPatente: "KXLR-45",
    documentos: [
      { tipo: "DeclaracionSAG", idDocumento: 901, estado: "validado", fechaEmision: "2026-05-29", fechaVencimiento: "2026-06-29",
        tieneAlimentos: true, tipoProducto: "frutas", paisOrigen: "Chile", cantidadEstimada: "2 kg", tieneMascota: false, tipoMascota: null, chipIdentificacion: null },
      { tipo: "FormularioVehiculoAcuerdo", idDocumento: 902, estado: "validado", fechaEmision: "2026-05-29", fechaVencimiento: "2026-08-29",
        plazoDias: 90, paisDestino: "Argentina", fechaSalida: "2026-05-29", fechaRetorno: "2026-08-20", lugarSalida: "Paso Los Libertadores" },
    ],
  },
  {
    idTramite: 2, fechaHora: "2026-05-30 06:15", tipoViaje: "salida", estado: "en_revision",
    tiempoEstimado: 30, qrCode: "QR-AD-0002", observaciones: "Menor de edad viaja con un solo progenitor.",
    viajeroRut: "26.111.222-3", vehiculoPatente: null,
    documentos: [
      { tipo: "AutorizacionNotarial", idDocumento: 903, estado: "en_revision", fechaEmision: "2026-05-28", fechaVencimiento: "2026-07-28",
        nombreApoderado: "Camila Rojas Pérez", rutApoderado: "18.345.678-9", juzgadoFamilia: "—", fechaNotaria: "2026-05-28", numeroNotaria: "Notaría 12 Santiago", tipoAutorizacion: "notarial" },
    ],
  },
];

// ---------- Catálogo de documentos derivados de DocumentoAduanero ----------
const TIPOS_DOC = {
  DeclaracionSAG: { label: "Declaración SAG", icon: Leaf, color: "#3f7d4e" },
  FormularioVehiculoAcuerdo: { label: "Formulario Vehículo (Acuerdo)", icon: Car, color: "#b07d2a" },
  AutorizacionNotarial: { label: "Autorización Notarial", icon: Stamp, color: "#7a4fa0" },
};

const ESTADO_META = {
  pendiente:   { label: "Pendiente",    color: "#8a6d1f", bg: "#fbf2cf", icon: Clock },
  en_revision: { label: "En revisión",  color: "#1f5d8a", bg: "#d8ecfb", icon: Eye },
  aprobado:    { label: "Aprobado",     color: "#2f6b40", bg: "#d8f0dd", icon: CheckCircle2 },
  rechazado:   { label: "Rechazado",    color: "#9a2f2f", bg: "#f8d7d7", icon: XCircle },
};

const PRODUCTOS_PROHIBIDOS = ["carnes", "lacteos"];

// DEF-W003: normaliza texto (minúsculas, sin tildes) para que "CARNES",
// "Carnes" o "Lácteos" se detecten igual que "carnes" / "lacteos".
function normalizar(texto) {
  return (texto || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function esProductoProhibido(producto) {
  return PRODUCTOS_PROHIBIDOS.some((p) => normalizar(p) === normalizar(producto));
}

// ---- Simulación del Registro Civil (UC-01, CP-WEB-VEH-002 / VEH-003) ----
// En producción esto sería una llamada a la API del Registro Civil. Aquí
// devolvemos datos de prueba: patentes conocidas, una con restricción legal
// y cualquier otra como "no encontrada" (permite ingreso manual).
const REGISTRO_CIVIL_VEHICULOS = {
  "KXLR-45": { marca: "Toyota", modelo: "RAV4", anio: 2021, color: "Gris", numeroChasis: "JTMB1234567890", tieneRestricciones: false },
  "CD-0012": { marca: "Mercedes-Benz", modelo: "E-Class", anio: 2023, color: "Negro", numeroChasis: "WDD2130001A123", tieneRestricciones: false },
  "KXLR-99": { marca: "Nissan", modelo: "Versa", anio: 2019, color: "Blanco", numeroChasis: "3N1CN7AP0KL", tieneRestricciones: true, causal: "Multas de tránsito impagas / encargo por robo" },
};

function consultarRegistroCivil(patente) {
  const datos = REGISTRO_CIVIL_VEHICULOS[(patente || "").toUpperCase().trim()];
  if (!datos) return { encontrado: false };
  return { encontrado: true, ...datos };
}

// Generador de ID único para nuevos viajeros (simula RUT)
function generarRUTemporal() {
  return `EXT-${Math.floor(Math.random() * 1000000)}`;
}

// Función para validar formato de email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Función para validar RUT chileno (formato básico)
function isValidRUTChileno(rut) {
  return /^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9Kk]$/.test(rut);
}

// Calcula la edad en años a partir de una fecha de nacimiento (YYYY-MM-DD).
// Se usa para validar mayoría de edad de tutores (RN-05 a RN-09, DEF-A002/A005).
function calcularEdadAnios(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const nac = new Date(fechaNacimiento);
  if (isNaN(nac)) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

// Auditoría: registra acciones de usuarios con detalles de rol, acción y timestamp
function registrarAuditoria(sesion, accion, detalles = {}) {
  if (!sesion) return; // No registrar acciones sin usuario
  AUDITORIA.push({
    timestamp: nowStr(),
    rutUsuario: sesion.rut,
    nombre: sesion.nombre,
    rol: sesion.rol,
    accion,
    detalles,
  });
  // Limitar a últimas 1000 acciones para evitar desbordamiento en memoria
  if (AUDITORIA.length > 1000) AUDITORIA.shift();
}

// Permisos granulares por rol y tipo de documento
// Retorna true si el rol puede validar ese tipo de documento
function puedeValidarDocumento(rol, tipoDocumento) {
  const permisosPorRol = {
    sag: ["DeclaracionSAG"], // SAG solo valida declaraciones de alimentos/mascotas
    pdi: ["AutorizacionNotarial"], // PDI solo valida autorizaciones de menores
    registro_civil: ["FormularioVehiculoAcuerdo"], // Registro Civil solo valida vehículos
    funcionario: ["DeclaracionSAG", "AutorizacionNotarial", "FormularioVehiculoAcuerdo"], // Funcionario valida todo
    admin: ["DeclaracionSAG", "AutorizacionNotarial", "FormularioVehiculoAcuerdo"], // Admin valida todo
  };
  const permisos = permisosPorRol[rol] || [];
  return permisos.includes(tipoDocumento);
}

// ============================== APP ===============================
export default function SistemaAduanas() {
  const [sesion, setSesion] = useState(null); // null | objeto usuario logueado
  const [viajeros, setViajeros] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [tramites, setTramites] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [cargandoBD, setCargandoBD] = useState(true);

  // Carga inicial desde Firestore. Si la base está vacía, sube los datos
  // semilla una sola vez y luego los usa como estado inicial.
  useEffect(() => {
    (async () => {
      try {
        let datos = await cargarTodo();
        const vacia =
          datos.viajeros.length === 0 &&
          datos.vehiculos.length === 0 &&
          datos.tramites.length === 0 &&
          datos.usuarios.length === 0;
        if (vacia) {
          const semilla = {
            viajeros: SEED_VIAJEROS,
            vehiculos: SEED_VEHICULOS,
            tramites: SEED_TRAMITES,
            usuarios: USUARIOS,
          };
          await sembrarDatos(semilla);
          datos = semilla;
        }
        setViajeros(datos.viajeros);
        setVehiculos(datos.vehiculos);
        setTramites(datos.tramites);
        setUsuarios(datos.usuarios);
      } catch (e) {
        console.error("Error cargando Firestore:", e);
        alert("No se pudo conectar a la base de datos. Revisa firebase.js y las reglas de Firestore.");
      } finally {
        setCargandoBD(false);
      }
    })();
  }, []);

  if (cargandoBD) {
    return (
      <div style={S.root}>
        <StyleTag />
        <div style={{ ...S.loginWrap }}>
          <div style={{ textAlign: "center", color: "var(--muted)" }}>
            <Database size={40} style={{ marginBottom: 12, opacity: 0.6 }} />
            <p>Conectando con la base de datos…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.root}>
      <StyleTag />
      <Header sesion={sesion} onExit={() => {
        registrarAuditoria(sesion, "LOGOUT", {});
        setSesion(null);
      }} />
      {!sesion && !mostrarRegistro && (<Login 
          usuarios={usuarios}
          onLogin={(usuario) => {
            setSesion(usuario);
            registrarAuditoria(usuario, "LOGIN", { metodo: "credenciales RUT/contraseña" });
          }}
          onRegistro={() => setMostrarRegistro(true)} />)}
      {!sesion && mostrarRegistro && (
        <RegistroViajero
          onRegistroExitoso={(nuevoUsuario) => {
            setSesion(nuevoUsuario);
            setMostrarRegistro(false);
          }}
          onCancelar={() => setMostrarRegistro(false)}
          viajerosExistentes={viajeros}
          setViajeros={setViajeros}
          setUsuarios={setUsuarios}
        />
      )}
      {sesion?.rol === "viajero" && (
        <ViajeroApp
          sesion={sesion}
          viajeros={viajeros} vehiculos={vehiculos}
          tramites={tramites} setTramites={setTramites}
        />
      )}
      {sesion?.rol === "funcionario" && (
        <FuncionarioApp
          sesion={sesion}
          viajeros={viajeros} vehiculos={vehiculos}
          tramites={tramites} setTramites={setTramites}
        />
      )}
      {sesion?.rol === "admin" && (
        <AdminApp
          sesion={sesion}
          viajeros={viajeros} setViajeros={setViajeros}
          vehiculos={vehiculos} setVehiculos={setVehiculos}
          tramites={tramites}
        />
      )}
      {/* Vistas de sistemas externos simulados */}
      {(sesion?.rol === "sag" || sesion?.rol === "pdi" || sesion?.rol === "registro_civil") && (
        <SistemaExternoApp sesion={sesion} tramites={tramites} setTramites={setTramites} viajeros={viajeros} vehiculos={vehiculos} />
      )}
      <footer style={S.footer}>
        Prototipo · Sistema de Aduanas — modelado a partir del diagrama de clases
      </footer>
    </div>
  );
}

// ============================== SISTEMAS EXTERNOS (SAG, PDI, REGISTRO CIVIL) ===============================
function SistemaExternoApp({ sesion, tramites, setTramites, viajeros, vehiculos }) {
  const rol = sesion.rol;
  const tipoDocPermitido = rol === "sag" ? "DeclaracionSAG" : rol === "pdi" ? "AutorizacionNotarial" : "FormularioVehiculoAcuerdo";
  const labelRol = rol === "sag" ? "SAG — Servicio Agrícola y Ganadero" : rol === "pdi" ? "PDI — Policía de Investigaciones" : "Registro Civil";
  const descripcion = rol === "sag"
    ? "Validar declaraciones juradas de alimentos y mascotas (UC-12)."
    : rol === "pdi"
    ? "Validar autorizaciones notariales de menores (UC-09)."
    : "Validar datos de vehículos y personas (UC-06).";

  // Documentos pendientes que este sistema puede validar
  const documentosPendientes = [];
  tramites.forEach((t) => {
    t.documentos.forEach((d) => {
      if (d.tipo === tipoDocPermitido && (d.estado === "en_revision" || d.estado === "pendiente")) {
        const viajero = viajeros.find((v) => v.rut === t.viajeroRut);
        documentosPendientes.push({ ...d, idTramite: t.idTramite, viajeroNombre: viajero?.nombreCompleto, viajeroRut: t.viajeroRut });
      }
    });
  });

  function validarDocumento(idTramite, idDocumento, resultado) {
    setTramites((prev) => prev.map((t) => {
      if (t.idTramite !== idTramite) return t;
      const docs = t.documentos.map((d) =>
        d.idDocumento === idDocumento ? { ...d, estado: resultado, validadoPor: sesion.nombre, fechaValidacion: nowStr() } : d
      );
      const todosValidados = docs.every((d) => d.estado === "validado");
      const algunoRechazado = docs.some((d) => d.estado === "rechazado");
      const nuevoEstado = algunoRechazado ? "rechazado" : todosValidados ? "aprobado" : t.estado;
      const actualizado = { ...t, documentos: docs, estado: nuevoEstado };
      guardarTramite(actualizado).catch(e => console.error(e));
      return actualizado;
    }));
    registrarAuditoria(sesion, resultado === "validado" ? "VALIDAR_DOCUMENTO" : "RECHAZAR_DOCUMENTO", {
      idTramite, idDocumento, resultado, tipoDoc: tipoDocPermitido
    });
  }

  return (
    <main style={S.main}>
      <div style={{ ...S.panel, marginBottom: 16 }}>
        <div style={S.panelHead}>
          <h2 style={S.panelTitle}>{labelRol}</h2>
          <span style={S.formSub}>{descripcion}</span>
        </div>
        <div style={{ marginTop: 12 }}>
          <KV k="Tipo de documento" v={TIPOS_DOC[tipoDocPermitido]?.label} />
          <KV k="Pendientes de validación" v={documentosPendientes.length} />
          <KV k="Institución" v={sesion.institucion || labelRol} />
        </div>
      </div>

      {documentosPendientes.length === 0 ? (
        <EmptyState text="No hay documentos pendientes de validación para este sistema." />
      ) : (
        <div style={S.tableWrap}>
          {documentosPendientes.map((d) => (
            <div key={`${d.idTramite}-${d.idDocumento}`} style={{ ...S.adminRow, gap: 12, padding: "12px 14px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {TIPOS_DOC[d.tipo]?.label} — Doc #{d.idDocumento}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  Trámite #{d.idTramite} · {d.viajeroNombre} ({d.viajeroRut})
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  Emitido: {d.fechaEmision} · Vence: {d.fechaVencimiento || "N/A"}
                </div>
              </div>
              <button style={S.btnPrimary} onClick={() => validarDocumento(d.idTramite, d.idDocumento, "validado")}>
                <CheckCircle2 size={14} /> Validar
              </button>
              <button style={S.btnDanger} onClick={() => validarDocumento(d.idTramite, d.idDocumento, "rechazado")}>
                <XCircle size={14} /> Rechazar
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// ============================== LOGIN ===============================
function Login({ usuarios, onLogin, onRegistro }) {
  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function entrar() {
    const u = usuarios.find(
      (x) => x.rut.toLowerCase() === rut.trim().toLowerCase() && x.password === password
    );
    if (!u) {
      setError("RUT o contraseña incorrectos.");
      return;
    }
    setError("");
    onLogin(u);
  }

  function onKey(e) { if (e.key === "Enter") entrar(); }

  return (
    <main style={S.loginWrap}>
      <div style={S.loginCard}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <EscudoAduanas size={64} />
        </div>
        <h1 style={S.loginTitle}>Iniciar sesión</h1>
        <p style={S.loginSub}>Servicio Nacional de Aduanas · Sistema de trámites</p>

        <Field label="RUT">
          <input style={S.input} value={rut} onKeyDown={onKey}
            onChange={(e) => setRut(e.target.value)} placeholder="12.345.678-9" />
        </Field>
        <Field label="Contraseña">
          <input style={S.input} type="password" value={password} onKeyDown={onKey}
            onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
        </Field>

        {error && (
          <div style={S.loginError}><AlertTriangle size={15} /> {error}</div>
        )}

        <button style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", marginTop: 6 }} onClick={entrar}>
          <LogIn size={16} /> Entrar
        </button>
        <button style={{ ...S.btnGhost, width: "100%", justifyContent: "center", marginTop: 8 }} onClick={() => onRegistro(true)}>
          <UserPlus size={16} /> Registrarse como nuevo viajero
        </button>

        <div style={S.loginHint}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--ink)" }}>Cuentas de demostración</div>
          <DemoCred rol="Viajero (madre/tutora)" rut="18.345.678-9" pass="1234" />
          <DemoCred rol="Viajero extranjero" rut="14.987.654-K" pass="1234" />
          <DemoCred rol="Funcionario" rut="11.222.333-4" pass="func" />
          <DemoCred rol="Administrador" rut="10.000.000-0" pass="admin" />
          <DemoCred rol="SAG (sistema externo)" rut="SAG-001" pass="sag2026" />
          <DemoCred rol="PDI (sistema externo)" rut="PDI-001" pass="pdi2026" />
          <DemoCred rol="Registro Civil (externo)" rut="RC-001" pass="rc2026" />
        </div>
      </div>
    </main>
  );
}

// ============================== REGISTRO DE VIAJEROS ===============================
function RegistroViajero({ onRegistroExitoso, onCancelar, viajerosExistentes, setViajeros, setUsuarios }) {
  const [formData, setFormData] = useState({
    // Para chilenos
    rut: "",
    // Para extranjeros
    pasaporte: "",
    esExtranjero: false,
    // Datos comunes
    nombreCompleto: "",
    nacionalidad: "Chilena",
    fechaNacimiento: "",
    email: "",
    telefono: "",
    // Contraseña para login
    password: "",
    confirmPassword: "",
  });
  
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const esChileno = !formData.esExtranjero;
  const identificador = esChileno ? formData.rut : formData.pasaporte;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    // Validaciones según el documento de casos de uso
    if (!formData.nombreCompleto.trim()) {
      setError("El nombre completo es obligatorio");
      return;
    }

    // Validar identificación según tipo
    if (esChileno) {
      if (!formData.rut.trim()) {
        setError("El RUT es obligatorio para ciudadanos chilenos");
        return;
      }
      if (!isValidRUTChileno(formData.rut)) {
        setError("Formato de RUT inválido. Ejemplo: 12.345.678-9");
        return;
      }
      // Verificar RUT no existente
      if (viajerosExistentes.some(v => v.rut === formData.rut)) {
        setError("Ya existe un viajero con este RUT");
        return;
      }
    } else {
      if (!formData.pasaporte.trim()) {
        setError("El número de pasaporte es obligatorio para extranjeros");
        return;
      }
      // Verificar pasaporte no existente (usan rut como campo, pero podemos validar)
      if (viajerosExistentes.some(v => v.rut === formData.pasaporte)) {
        setError("Ya existe un viajero con este pasaporte");
        return;
      }
    }

    if (!formData.fechaNacimiento) {
      setError("La fecha de nacimiento es obligatoria");
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError("Email inválido");
      return;
    }

    if (!formData.telefono.trim()) {
      setError("El teléfono es obligatorio");
      return;
    }

    if (formData.password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setCargando(true);

    // Simular validación con Registro Civil (según documento UC-06)
    setTimeout(() => {
      // Determinar mayoría de edad (18 años)
      const fechaNac = new Date(formData.fechaNacimiento);
      const hoy = new Date();
      let edad = hoy.getFullYear() - fechaNac.getFullYear();
      const mesDiff = hoy.getMonth() - fechaNac.getMonth();
      if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < fechaNac.getDate())) {
        edad--;
      }
      const esMenor = edad < 18;
      // Si es menor de 18, requiere autorización (según RN-05 a RN-09)
      const requiereAutorizacion = esMenor;

      // Crear nuevo viajero
      const nuevoViajero = {
        rut: esChileno ? formData.rut : formData.pasaporte,
        nombreCompleto: formData.nombreCompleto,
        nacionalidad: formData.nacionalidad,
        fechaNacimiento: formData.fechaNacimiento,
        email: formData.email,
        telefono: formData.telefono,
        esMenor: esMenor,
        requiereAutorizacion: requiereAutorizacion,
      };

      // Crear usuario para login
      const nuevoUsuario = {
        rut: nuevoViajero.rut,
        password: formData.password,
        rol: "viajero",
        nombre: nuevoViajero.nombreCompleto,
        viajeroRut: nuevoViajero.rut,
      };

      // Actualizar estados globales
      setViajeros(prev => [nuevoViajero, ...prev]);
      setUsuarios(prev => [...prev, nuevoUsuario]);

      // Persistir en Firestore
      Promise.all([
        persistirViajero(nuevoViajero),
        guardarUsuario(nuevoUsuario),
      ]).catch(e => console.error("Error guardando registro:", e));

      setCargando(false);
      onRegistroExitoso(nuevoUsuario);
    }, 1500);
  };

  // Calcular mayoría de edad en tiempo real (para mostrar advertencia)
  const calcularEdad = () => {
    if (!formData.fechaNacimiento) return null;
    const fechaNac = new Date(formData.fechaNacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mesDiff = hoy.getMonth() - fechaNac.getMonth();
    if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }
    return edad;
  };

  const edad = calcularEdad();
  const esMenorPorEdad = edad !== null && edad < 18;

  return (
    <main style={S.loginWrap}>
      <div style={{ ...S.loginCard, maxWidth: 500 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <EscudoAduanas size={56} />
        </div>
        <h1 style={S.loginTitle}>Registro de Viajero</h1>
        <p style={S.loginSub}>Complete sus datos para realizar trámites fronterizos</p>

        <form onSubmit={handleSubmit}>
          {/* Tipo de viajero: Chileno / Extranjero */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, esExtranjero: false, rut: "", pasaporte: "" })}
              style={{ ...S.radio, ...(!formData.esExtranjero ? S.radioActive : {}) }}
            >
              🇨🇱 Viajero Chileno
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, esExtranjero: true, rut: "", pasaporte: "" })}
              style={{ ...S.radio, ...(formData.esExtranjero ? S.radioActive : {}) }}
            >
              🌎 Viajero Extranjero
            </button>
          </div>

          {/* Campo de identificación según tipo */}
          {esChileno ? (
            <Field label="RUT (Formato: 12.345.678-9)">
              <input
                style={S.input}
                name="rut"
                value={formData.rut}
                onChange={handleChange}
                placeholder="12.345.678-9"
              />
            </Field>
          ) : (
            <Field label="Número de Pasaporte">
              <input
                style={S.input}
                name="pasaporte"
                value={formData.pasaporte}
                onChange={handleChange}
                placeholder="AB123456"
              />
            </Field>
          )}

          <Field label="Nombre Completo">
            <input
              style={S.input}
              name="nombreCompleto"
              value={formData.nombreCompleto}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez González"
            />
          </Field>

          <Field label="Nacionalidad">
            <input
              style={S.input}
              name="nacionalidad"
              value={formData.nacionalidad}
              onChange={handleChange}
              placeholder="Ej: Chilena, Argentina, Española"
            />
          </Field>

          <Field label="Fecha de Nacimiento">
            <input
              type="date"
              style={S.input}
              name="fechaNacimiento"
              value={formData.fechaNacimiento}
              onChange={handleChange}
            />
          </Field>

          {edad !== null && esMenorPorEdad && (
            <Banner
              tone="warn"
              icon={AlertTriangle}
              title="Viajero menor de edad"
              text="Según RN-05 a RN-09, deberá presentar autorización notarial o judicial para viajar sin ambos padres."
            />
          )}

          <Field label="Correo Electrónico">
            <input
              style={S.input}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="ejemplo@correo.com"
            />
          </Field>

          <Field label="Teléfono">
            <input
              style={S.input}
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="+56 9 1234 5678"
            />
          </Field>

          <Field label="Contraseña (mínimo 4 caracteres)">
            <input
              style={S.input}
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••"
            />
          </Field>

          <Field label="Confirmar Contraseña">
            <input
              style={S.input}
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••"
            />
          </Field>

          {error && (
            <div style={S.loginError}>
              <AlertTriangle size={15} /> {error}
            </div>
          )}

          <div style={{ ...S.wizardNav, marginTop: 20 }}>
            <button type="button" style={S.btnGhost} onClick={onCancelar}>
              Cancelar
            </button>
            <button type="submit" style={{ ...S.btnPrimary, justifyContent: "center" }} disabled={cargando}>
              {cargando ? "Registrando..." : "Registrarse"}
            </button>
          </div>
        </form>

        <div style={S.loginHint}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>📋 Nota importante</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            • Los datos serán validados con Registro Civil (UC-06) en producción.<br />
            • Los viajeros menores de edad requieren Autorización Notarial (UC-02).<br />
            • La declaración SAG es obligatoria para todos los ingresos (UC-03).
          </div>
        </div>
      </div>
    </main>
  );
}

function DemoCred({ rol, rut, pass }) {
  return (
    <div style={S.demoRow}>
      <span style={{ color: "var(--muted)" }}>{rol}</span>
      <span style={{ fontFamily: "monospace", fontSize: 12.5 }}>{rut} · {pass}</span>
    </div>
  );
}

// ============================== HEADER ===============================
function Header({ sesion, onExit }) {
  return (
    <header style={S.header}>
      <div style={S.brand}>
        <EscudoAduanas size={42} />
        <div>
          <div style={S.brandTitle}>SERVICIO NACIONAL DE <span style={{ color: "var(--accent2)" }}>ADUANAS</span></div>
          <div style={S.brandSub}>República de Chile · Trámites de frontera</div>
        </div>
      </div>
      {sesion && (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{sesion.nombre}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", textTransform: "capitalize" }}>{sesion.rol}</div>
          </div>
          <button style={S.exitBtn} onClick={onExit}>
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      )}
    </header>
  );
}

// Escudo institucional propio (inspirado en la identidad de Aduanas, no es el logo oficial)
function EscudoAduanas({ size = 42 }) {
  return (
    <svg width={size} height={size * 1.18} viewBox="0 0 100 118" style={{ flexShrink: 0 }} aria-label="Escudo Aduanas">
      {/* cuerpo del escudo */}
      <path d="M50 2 L96 14 V64 C96 92 74 108 50 116 C26 108 4 92 4 64 V14 Z"
        fill="#013171" stroke="#ffffff" strokeWidth="3" />
      <path d="M50 2 L96 14 V64 C96 92 74 108 50 116 C26 108 4 92 4 64 V14 Z"
        fill="none" stroke="#013171" strokeWidth="6" transform="scale(0.9) translate(5.6,6.5)" opacity="0.0" />
      {/* texto ADUANAS */}
      <text x="50" y="26" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="800" fontFamily="Arial, sans-serif" letterSpacing="0.5">ADUANAS</text>
      {/* círculo */}
      <circle cx="50" cy="58" r="24" fill="none" stroke="#fff" strokeWidth="4" />
      {/* estrella */}
      <Estrella cx={50} cy={58} r={16} fill="#fff" />
      {/* texto CHILE */}
      <text x="50" y="104" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800" fontFamily="Arial, sans-serif" letterSpacing="1">CHILE</text>
    </svg>
  );
}

function Estrella({ cx, cy, r, fill }) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const aOut = (Math.PI / 180) * (-90 + i * 72);
    const aIn = (Math.PI / 180) * (-90 + i * 72 + 36);
    pts.push(`${cx + r * Math.cos(aOut)},${cy + r * Math.sin(aOut)}`);
    pts.push(`${cx + r * 0.42 * Math.cos(aIn)},${cy + r * 0.42 * Math.sin(aIn)}`);
  }
  return <polygon points={pts.join(" ")} fill={fill} />;
}

// ============================== VIAJERO ===============================
function ViajeroApp({ sesion, viajeros, vehiculos, tramites, setTramites }) {
  const [view, setView] = useState("inicio"); // inicio | nuevo
  // El actor es el viajero correspondiente a la sesión iniciada.
  const actor = viajeros.find((v) => v.rut === sesion.viajeroRut);

  // Si el viajero fue eliminado por el admin, evitamos que reviente la vista.
  if (!actor) {
    return (
      <main style={S.main}>
        <Banner tone="danger" icon={AlertTriangle}
          title="Cuenta sin ficha de viajero"
          text="Tu usuario no tiene una ficha de viajero asociada. Contacta al administrador." />
      </main>
    );
  }

  const misTramites = tramites.filter((t) => t.viajeroRut === actor.rut);

  return (
    <main style={S.main}>
      <SectionTabs
        actorLabel={`${actor.nombreCompleto} · ${actor.rut}`}
        tabs={[
          { id: "inicio", label: "Mis trámites", icon: FileCheck },
          { id: "nuevo", label: "Nuevo trámite", icon: Plus },
        ]}
        active={view} onChange={setView}
      />

      {view === "inicio" && (
        <>
          {actor.requiereAutorizacion && (
            <Banner tone="warn" icon={AlertTriangle}
              title="Este viajero es menor de edad"
              text="Requiere una Autorización Notarial vigente y validada con PDI para salir del país." />
          )}
          <div style={S.cardGrid}>
            {misTramites.length === 0 && (
              <EmptyState text="Aún no tienes trámites. Crea uno nuevo para comenzar." />
            )}
            {misTramites.map((t) => (
              <TramiteCard key={t.idTramite} t={t}
                viajero={viajeros.find((v) => v.rut === t.viajeroRut)}
                vehiculo={vehiculos.find((v) => v.patente === t.vehiculoPatente)}
                readOnly />
            ))}
          </div>
        </>
      )}

      {view === "nuevo" && (
        <NuevoTramite
          actor={actor} vehiculos={vehiculos}
          onCreate={(t) => {
            guardarTramite(t).catch(e => console.error("Error guardando trámite:", e));
            setTramites((p) => [t, ...p]);
            registrarAuditoria(sesion, "CREAR_TRAMITE", { idTramite: t.idTramite, tipo: t.tipoViaje, viajeroRut: t.viajeroRut });
            setView("inicio");
          }}
          onCancel={() => setView("inicio")}
        />
      )}
    </main>
  );
}

// ---- Wizard de creación de trámite (TramiteFrontera.iniciarTramite) ----
function NuevoTramite({ actor, vehiculos, onCreate, onCancel }) {
  const [paso, setPaso] = useState(1);
  const [tipoViaje, setTipoViaje] = useState("salida");
  const [llevaVehiculo, setLlevaVehiculo] = useState(false);
  const [patente, setPatente] = useState(vehiculos[0]?.patente || "");

  // CP-WEB-VEH-002/003, DEF-W009: validación de patente contra Registro Civil
  const [patenteConsulta, setPatenteConsulta] = useState("");
  const [resultadoRC, setResultadoRC] = useState(null); // null | objeto resultado
  const [ingresoManual, setIngresoManual] = useState(false);
  const [vehManual, setVehManual] = useState({ marca: "", modelo: "", anio: "", numeroChasis: "" });
  const [plazoVehiculo, setPlazoVehiculo] = useState(90); // R.04: máximo 180 días

  function validarPatente() {
    const r = consultarRegistroCivil(patenteConsulta);
    setResultadoRC(r);
    setIngresoManual(false);
    if (r.encontrado && !r.tieneRestricciones) {
      setPatente(patenteConsulta.toUpperCase().trim());
    } else {
      setPatente("");
    }
  }

  // DeclaracionSAG
  const [tieneAlimentos, setTieneAlimentos] = useState(false);
  const [tipoProducto, setTipoProducto] = useState("frutas");
  const [paisOrigen, setPaisOrigen] = useState("Chile");
  const [cantidad, setCantidad] = useState("");
  const [tieneMascota, setTieneMascota] = useState(false);
  const [tipoMascota, setTipoMascota] = useState("perro");
  const [chip, setChip] = useState("");
  const [fechaVacuna, setFechaVacuna] = useState(""); // RN-11: vacuna antirrábica

  // AutorizacionNotarial (sólo menor)
  const [apoderado, setApoderado] = useState("");
  const [rutApoderado, setRutApoderado] = useState("");
  const [numeroNotaria, setNumeroNotaria] = useState("");
  const [fechaNotaria, setFechaNotaria] = useState("");

  const productoProhibido = tieneAlimentos && esProductoProhibido(tipoProducto);
  const totalPasos = 4;

  // Validación 1: si el viajero requiere autorización (es menor), quien gestiona
  // el trámite (actor) debe ser mayor de 18. Si el propio actor es el menor,
  // su edad será < 18 y se bloquea la autogestión de la autorización.
  const edadActor = calcularEdadAnios(actor.fechaNacimiento);
  const tutorMenorDeEdad = actor.requiereAutorizacion && edadActor != null && edadActor < 18;

  // Validación 8: cantidad debe ser numérica positiva (acepta "2 kg", "2kg", "2")
  const cantidadNum = parseFloat(String(cantidad).replace(",", ".").replace(/[^\d.]/g, ""));
  const cantidadInvalida = tieneAlimentos && cantidad.trim() && (isNaN(cantidadNum) || cantidadNum <= 0);

  // Validación 2 (RN-11): la vacuna antirrábica debe tener al menos 30 días
  // de antigüedad respecto a hoy.
  let vacunaInvalida = false;
  if (tieneMascota && fechaVacuna) {
    const dias = Math.floor((new Date() - new Date(fechaVacuna)) / (1000 * 60 * 60 * 24));
    vacunaInvalida = isNaN(dias) || dias < 30;
  }

  // CP-WEB-SAG-003: campos obligatorios en la declaración SAG
  const sagIncompleto =
    (tieneAlimentos && (!paisOrigen.trim() || !cantidad.trim() || cantidadInvalida)) ||
    (tieneMascota && (!chip.trim() || !fechaVacuna || vacunaInvalida));

  // Bloqueo de avance en paso 1 según validación de patente (CP-WEB-VEH-002/003)
  const vehiculoBloquea =
    llevaVehiculo && (
      !resultadoRC ||                                   // aún no valida
      (resultadoRC.encontrado && resultadoRC.tieneRestricciones) || // restricción legal
      (!resultadoRC.encontrado && !ingresoManual) ||    // no encontrada y sin ingreso manual
      (plazoVehiculo < 1 || plazoVehiculo > 180)        // R.04: plazo fuera de rango
    );

  function finalizar() {
    const documentos = [];
    documentos.push({
      tipo: "DeclaracionSAG", idDocumento: Math.floor(Math.random() * 9000) + 1000,
      estado: "pendiente", fechaEmision: today(), fechaVencimiento: addDays(today(), 30),
      tieneAlimentos, tipoProducto: tieneAlimentos ? tipoProducto : null, paisOrigen,
      cantidadEstimada: cantidad || "—", tieneMascota,
      tipoMascota: tieneMascota ? tipoMascota : null, chipIdentificacion: tieneMascota ? chip : null,
      fechaVacunaMascota: tieneMascota ? fechaVacuna : null,
    });
    if (llevaVehiculo && patente) {
      const esManual = ingresoManual && resultadoRC && !resultadoRC.encontrado;
      documentos.push({
        tipo: "FormularioVehiculoAcuerdo", idDocumento: Math.floor(Math.random() * 9000) + 1000,
        estado: "pendiente", fechaEmision: today(), fechaVencimiento: addDays(today(), plazoVehiculo),
        plazoDias: plazoVehiculo, paisDestino: "Argentina", fechaSalida: today(), fechaRetorno: addDays(today(), plazoVehiculo - 10),
        lugarSalida: "Paso Los Libertadores",
        // CP-WEB-VEH-003: si fue ingreso manual, queda con validación pendiente
        validacionPendiente: !!esManual,
        marca: esManual ? vehManual.marca : undefined,
        modelo: esManual ? vehManual.modelo : undefined,
        anioVehiculo: esManual ? vehManual.anio : undefined,
        numeroChasis: esManual ? vehManual.numeroChasis : undefined,
      });
    }
    if (actor.requiereAutorizacion) {
      documentos.push({
        tipo: "AutorizacionNotarial", idDocumento: Math.floor(Math.random() * 9000) + 1000,
        estado: "pendiente", fechaEmision: today(), fechaVencimiento: addDays(today(), 60),
        nombreApoderado: apoderado || "—", rutApoderado: rutApoderado || "—",
        juzgadoFamilia: "—", fechaNotaria: fechaNotaria || today(),
        numeroNotaria: numeroNotaria || "—", tipoAutorizacion: "notarial",
      });
    }
    const nuevo = {
      idTramite: ++TRAMITE_SEQ, fechaHora: nowStr(), tipoViaje,
      estado: "pendiente", tiempoEstimado: 15 + documentos.length * 5,
      qrCode: `QR-AD-${String(TRAMITE_SEQ).padStart(4, "0")}`,
      observaciones: "", viajeroRut: actor.rut,
      vehiculoPatente: llevaVehiculo ? patente : null, documentos,
    };
    onCreate(nuevo);
  }

  return (
    <div style={S.wizard}>
      <Stepper paso={paso} total={totalPasos}
        labels={["Tipo de viaje", "Declaración SAG", actor.requiereAutorizacion ? "Autorización" : "Vehículo", "Confirmar"]} />

      {/* Validación 1 (DEF-A002, RN-05 a RN-09): gestor menor de edad */}
      {tutorMenorDeEdad && (
        <Banner tone="danger" icon={XCircle} title="Debe ser mayor de 18 años"
          text="La autorización de un menor debe ser gestionada por un adulto responsable. Este perfil corresponde a un menor de edad, por lo que no puede completar la autorización por sí mismo." />
      )}

      {paso === 1 && (
        <FormBlock title="Tipo de viaje" sub="TramiteFrontera.tipoViaje">
          <RadioRow value={tipoViaje} onChange={setTipoViaje}
            options={[{ v: "salida", l: "Salida del país" }, { v: "entrada", l: "Entrada al país" }]} />
          <Toggle label="Viajo con vehículo" checked={llevaVehiculo} onChange={setLlevaVehiculo} />
          {llevaVehiculo && (
            <>
              <Field label="Patente del vehículo">
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={{ ...S.input, flex: 1 }} placeholder="ej: KXLR-45"
                    value={patenteConsulta} onChange={(e) => { setPatenteConsulta(e.target.value); setResultadoRC(null); }} />
                  <button style={S.btnGhost} onClick={validarPatente}>Validar</button>
                </div>
              </Field>

              {/* CP-WEB-VEH-002 + DEF-W009: vehículo con restricciones → BLOQUEA */}
              {resultadoRC?.encontrado && resultadoRC.tieneRestricciones && (
                <Banner tone="danger" icon={XCircle} title="Vehículo con impedimento legal"
                  text={`${resultadoRC.causal}. No es posible continuar con este vehículo.`} />
              )}

              {/* Flujo principal: patente válida sin restricciones */}
              {resultadoRC?.encontrado && !resultadoRC.tieneRestricciones && (
                <Banner tone="ok" icon={CheckCircle2} title="Vehículo validado"
                  text={`${resultadoRC.marca} ${resultadoRC.modelo} · ${resultadoRC.color} · ${resultadoRC.anio}. Validado con Registro Civil.`} />
              )}

              {/* CP-WEB-VEH-003: patente no encontrada → permitir ingreso manual */}
              {resultadoRC && !resultadoRC.encontrado && (
                <>
                  <Banner tone="warn" icon={AlertTriangle} title="Patente no encontrada"
                    text="No existe en Registro Civil. Puedes ingresar los datos manualmente; el trámite quedará con validación pendiente para revisión de un funcionario." />
                  {!ingresoManual && (
                    <button style={S.btnGhost} onClick={() => { setIngresoManual(true); setPatente(patenteConsulta.toUpperCase().trim()); }}>
                      Ingresar datos manualmente
                    </button>
                  )}
                  {ingresoManual && (
                    <>
                      <Field label="Marca"><input style={S.input} value={vehManual.marca} onChange={(e) => setVehManual({ ...vehManual, marca: e.target.value })} /></Field>
                      <Field label="Modelo"><input style={S.input} value={vehManual.modelo} onChange={(e) => setVehManual({ ...vehManual, modelo: e.target.value })} /></Field>
                      <Field label="Año"><input style={S.input} value={vehManual.anio} onChange={(e) => setVehManual({ ...vehManual, anio: e.target.value })} /></Field>
                      <Field label="N° de chasis"><input style={S.input} value={vehManual.numeroChasis} onChange={(e) => setVehManual({ ...vehManual, numeroChasis: e.target.value })} /></Field>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </FormBlock>
      )}

      {paso === 2 && (
        <FormBlock title="Declaración SAG" sub="DeclaracionSAG — productos y mascotas">
          <Toggle label="Llevo alimentos / productos agropecuarios" checked={tieneAlimentos} onChange={setTieneAlimentos} />
          {tieneAlimentos && (
            <>
              <Field label="Tipo de producto">
                <select style={S.select} value={tipoProducto} onChange={(e) => setTipoProducto(e.target.value)}>
                  <option value="frutas">Frutas</option>
                  <option value="vegetales">Vegetales</option>
                  <option value="carnes">Carnes</option>
                  <option value="lacteos">Lácteos</option>
                </select>
              </Field>
              <Field label="País de origen"><input style={S.input} value={paisOrigen} onChange={(e) => setPaisOrigen(e.target.value)} /></Field>
              <Field label="Cantidad estimada"><input style={S.input} placeholder="ej: 2 kg" value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></Field>
              {productoProhibido && (
                <Banner tone="danger" icon={XCircle} title="Producto restringido"
                  text="Las carnes y lácteos suelen estar prohibidos para el ingreso/salida. El SAG validará esta declaración." />
              )}
            </>
          )}
          <Toggle label="Viajo con mascota" checked={tieneMascota} onChange={setTieneMascota} />
          {tieneMascota && (
            <>
              <Field label="Tipo de mascota">
                <select style={S.select} value={tipoMascota} onChange={(e) => setTipoMascota(e.target.value)}>
                  <option value="perro">Perro</option><option value="gato">Gato</option><option value="otro">Otro</option>
                </select>
              </Field>
              <Field label="Chip de identificación"><input style={S.input} placeholder="N° de microchip" value={chip} onChange={(e) => setChip(e.target.value)} /></Field>
              <Field label="Fecha de vacuna antirrábica"><input type="date" style={S.input} value={fechaVacuna} onChange={(e) => setFechaVacuna(e.target.value)} /></Field>
            </>
          )}
          {cantidadInvalida && (
            <Banner tone="danger" icon={XCircle} title="Cantidad inválida"
              text="La cantidad debe ser un número positivo (ej: 2 kg)." />
          )}
          {vacunaInvalida && (
            <Banner tone="danger" icon={XCircle} title="Vacuna no vigente"
              text="La vacuna antirrábica debe tener al menos 30 días de antigüedad antes del viaje (RN-11)." />
          )}
          {sagIncompleto && !cantidadInvalida && !vacunaInvalida && (
            <Banner tone="warn" icon={AlertTriangle} title="Campos obligatorios incompletos"
              text="Completa el país de origen y la cantidad del producto, y el chip y la fecha de vacuna de la mascota, antes de continuar." />
          )}
        </FormBlock>
      )}

      {paso === 3 && actor.requiereAutorizacion && (
        <FormBlock title="Autorización Notarial" sub="AutorizacionNotarial — requerida para menores">
          <Banner tone="warn" icon={AlertTriangle} title="Menor de edad"
            text="Debes adjuntar los datos de la autorización notarial. Será validada con PDI." />
          <Field label="Nombre del apoderado"><input style={S.input} value={apoderado} onChange={(e) => setApoderado(e.target.value)} /></Field>
          <Field label="RUT del apoderado"><input style={S.input} value={rutApoderado} onChange={(e) => setRutApoderado(e.target.value)} /></Field>
          <Field label="Notaría"><input style={S.input} value={numeroNotaria} onChange={(e) => setNumeroNotaria(e.target.value)} /></Field>
          <Field label="Fecha de notaría"><input type="date" style={S.input} value={fechaNotaria} onChange={(e) => setFechaNotaria(e.target.value)} /></Field>
        </FormBlock>
      )}
      {paso === 3 && !actor.requiereAutorizacion && (
        <FormBlock title="Vehículo" sub="FormularioVehiculoAcuerdo">
          {llevaVehiculo
            ? <>
                <p style={S.muted}>Se generará el Formulario de Vehículo bajo Acuerdo para la patente <b>{patente}</b> (dos copias).</p>
                <Field label="Plazo de permanencia (días)">
                  <input type="number" style={S.input} value={plazoVehiculo}
                    onChange={(e) => setPlazoVehiculo(parseInt(e.target.value) || 0)} />
                </Field>
                {(plazoVehiculo < 1 || plazoVehiculo > 180) && (
                  <Banner tone="danger" icon={XCircle} title="Plazo inválido"
                    text="El plazo máximo de admisión temporal del vehículo es de 180 días corridos (Acuerdo Chileno-Argentino, R.04)." />
                )}
              </>
            : <p style={S.muted}>No registraste vehículo. Puedes volver al paso 1 para añadir uno.</p>}
        </FormBlock>
      )}

      {paso === 4 && (
        <FormBlock title="Confirmar trámite" sub="Resumen antes de iniciar">
          <ResumenLine k="Tipo de viaje" v={tipoViaje} />
          <ResumenLine k="Viajero" v={`${actor.nombreCompleto} (${actor.rut})`} />
          <ResumenLine k="Vehículo" v={llevaVehiculo ? patente : "Sin vehículo"} />
          <ResumenLine k="Documentos a generar" v={
            [
              "Declaración SAG",
              llevaVehiculo && "Formulario Vehículo",
              actor.requiereAutorizacion && "Autorización Notarial",
            ].filter(Boolean).join(", ")
          } />
          <p style={{ ...S.muted, marginTop: 12 }}>
            Al confirmar, el trámite queda en estado <b>pendiente</b> a la espera de revisión por un funcionario.
          </p>
        </FormBlock>
      )}

      <div style={S.wizardNav}>
        <button style={S.btnGhost} onClick={paso === 1 ? onCancel : () => setPaso(paso - 1)}>
          {paso === 1 ? "Cancelar" : "Atrás"}
        </button>
        {paso < totalPasos
          ? <button
              style={{ ...S.btnPrimary, ...((paso === 1 && vehiculoBloquea) || (paso === 2 && sagIncompleto) ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}
              disabled={(paso === 1 && vehiculoBloquea) || (paso === 2 && sagIncompleto)}
              onClick={() => setPaso(paso + 1)}>
              Continuar <ArrowRight size={16} />
            </button>
          : <button
              style={{ ...S.btnPrimary, ...(tutorMenorDeEdad ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}
              disabled={tutorMenorDeEdad}
              onClick={finalizar}><CheckCircle2 size={16} /> Iniciar trámite</button>}
      </div>
    </div>
  );
}

// ============================== UC-04: ESCANEO DE QR EN FRONTERA ===============================
function EscaneoQRFrontera({ qrCode, setQrCode, tramites, viajeros, vehiculos }) {
  const [tramiteEncontrado, setTramiteEncontrado] = useState(null);
  
  function buscarTramitePorQR() {
    if (!qrCode.trim()) return;
    const t = tramites.find((x) => x.qrCode.toLowerCase() === qrCode.trim().toLowerCase());
    setTramiteEncontrado(t || null);
  }

  function onKey(e) { if (e.key === "Enter") buscarTramitePorQR(); }

  return (
    <div style={S.wizard}>
      <h2 style={{ ...S.formTitle, marginBottom: 12 }}>Validación Rápida en Frontera (UC-04)</h2>
      <p style={{ ...S.muted, marginBottom: 20 }}>
        Escanea o ingresa el código QR del viajero. El sistema validará su documentación automáticamente.
      </p>

      <div style={{ marginBottom: 20 }}>
        <Field label="Código QR">
          <input
            style={S.input}
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            onKeyDown={onKey}
            placeholder="QR-AD-0001"
            autoFocus
          />
        </Field>
        <button style={S.btnPrimary} onClick={buscarTramitePorQR}>
          <QrCode size={16} /> Escanear
        </button>
      </div>

      {tramiteEncontrado ? (
        <div>
          <div style={{ ...S.panel, background: tramiteEncontrado.estado === "aprobado" ? "#d8f0dd" : "#fbf2cf" }}>
            <EstadoPill estado={tramiteEncontrado.estado} />
            <h3 style={{ ...S.formTitle, marginTop: 12, marginBottom: 6 }}>
              {viajeros.find((v) => v.rut === tramiteEncontrado.viajeroRut)?.nombreCompleto}
            </h3>
            <KV k="RUT" v={tramiteEncontrado.viajeroRut} />
            <KV k="Tipo de viaje" v={tramiteEncontrado.tipoViaje === "salida" ? "Salida" : "Entrada"} />
            <KV k="Documentos" v={tramiteEncontrado.documentos.length} />
            {tramiteEncontrado.vehiculoPatente && <KV k="Vehículo" v={tramiteEncontrado.vehiculoPatente} />}
          </div>

          {/* Validación de documentos */}
          <div style={{ ...S.panel, marginTop: 16, borderLeft: "4px solid #013171" }}>
            <h3 style={S.panelTitle}>Validación de documentos</h3>
            {tramiteEncontrado.documentos.map((d) => {
              const vencido = d.fechaVencimiento && String(d.fechaVencimiento).slice(0, 10) < today();
              const docOK = d.estado === "validado" && !vencido;
              return (
                <div key={d.idDocumento} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{TIPOS_DOC[d.tipo]?.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: docOK ? "#2f6b40" : vencido ? "#9a2f2f" : "var(--muted)" }}>
                    {vencido ? "VENCIDO" : d.estado.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>

          {tramiteEncontrado.estado === "aprobado" ? (
            <Banner tone="ok" icon={CheckCircle2} title="Documento completo y válido"
              text="El viajero puede proceder. Presione 'Autorizar paso' para registrar el cruce." />
          ) : tramiteEncontrado.estado === "pendiente" ? (
            <Banner tone="warn" icon={AlertTriangle} title="Documentación pendiente"
              text="Este trámite aún no ha sido revisado. Debe pasar por bandeja de revisión primero." />
          ) : (
            <Banner tone="danger" icon={XCircle} title="Trámite rechazado"
              text="Este viajero ha sido rechazado. No se permite el paso." />
          )}

          <div style={S.wizardNav}>
            <button style={S.btnGhost} onClick={() => { setQrCode(""); setTramiteEncontrado(null); }}>
              Escanear otro QR
            </button>
            {tramiteEncontrado.estado === "aprobado" && (
              <button style={S.btnPrimary} onClick={() => alert("✓ Cruce registrado en la base de datos")}>
                <CheckCircle2 size={16} /> Autorizar paso
              </button>
            )}
          </div>
        </div>
      ) : qrCode && !tramiteEncontrado ? (
        <Banner tone="danger" icon={XCircle} title="QR no encontrado"
          text="No se encontró un trámite asociado a este código. Verifique que esté escaneando un QR válido." />
      ) : null}
    </div>
  );
}

// ============================== FUNCIONARIO ===============================
function FuncionarioApp({ sesion, viajeros, vehiculos, tramites, setTramites }) {
  const [view, setView] = useState("bandeja"); // bandeja | escaneo_qr | informes
  const [filtro, setFiltro] = useState("todos");
  const [sel, setSel] = useState(null);
  const [qrEscaneado, setQrEscaneado] = useState(""); // UC-04

  const filtrados = useMemo(
    () => tramites.filter((t) => filtro === "todos" || t.estado === filtro),
    [tramites, filtro]
  );

  function cambiarEstado(idTramite, estado, obs) {
    setTramites((prev) => {
      const actualizados = prev.map((t) =>
        t.idTramite === idTramite
          ? { ...t, estado, observaciones: obs ?? t.observaciones,
              documentos: t.documentos.map((d) => ({ ...d, estado: estado === "aprobado" ? "validado" : estado === "rechazado" ? "rechazado" : d.estado })) }
          : t
      );
      const modificado = actualizados.find((t) => t.idTramite === idTramite);
      if (modificado) guardarTramite(modificado).catch(e => console.error("Error actualizando trámite:", e));
      return actualizados;
    });
    // Auditoría: registrar cambio de estado
    registrarAuditoria(sesion, estado === "aprobado" ? "APROBAR_TRAMITE" : estado === "rechazado" ? "RECHAZAR_TRAMITE" : "REVISAR_TRAMITE", {
      idTramite, nuevoEstado: estado, observaciones: obs || ""
    });
    setSel(null);
  }

  return (
    <main style={S.main}>
      <SectionTabs
        actorLabel="Funcionario de turno"
        tabs={[
          { id: "bandeja", label: "Bandeja de revisión", icon: FileCheck },
          { id: "escaneo_qr", label: "Escanear QR (UC-04)", icon: QrCode },
          { id: "informes", label: "Informes estadísticos", icon: BarChart3 },
        ]}
        active={view} onChange={setView}
      />

      {view === "bandeja" && (
        <>
          <div style={S.filterRow}>
            <Filter size={16} style={{ color: "var(--muted)" }} />
            {["todos", "pendiente", "en_revision", "aprobado", "rechazado"].map((f) => (
              <button key={f} onClick={() => setFiltro(f)}
                style={{ ...S.chip, ...(filtro === f ? S.chipActive : {}) }}>
                {f === "todos" ? "Todos" : ESTADO_META[f].label}
              </button>
            ))}
          </div>
          <div style={S.cardGrid}>
            {filtrados.length === 0 && <EmptyState text="No hay trámites en esta categoría." />}
            {filtrados.map((t) => (
              <TramiteCard key={t.idTramite} t={t}
                viajero={viajeros.find((v) => v.rut === t.viajeroRut)}
                vehiculo={vehiculos.find((v) => v.patente === t.vehiculoPatente)}
                onClick={() => setSel(t)} />
            ))}
          </div>
        </>
      )}

      {view === "informes" && <Informes tramites={tramites} />}

      {view === "escaneo_qr" && (
        <EscaneoQRFrontera qrCode={qrEscaneado} setQrCode={setQrEscaneado} 
          tramites={tramites} viajeros={viajeros} vehiculos={vehiculos} />
      )}

      {sel && (
        <RevisionDrawer
          t={sel}
          sesion={sesion}
          viajero={viajeros.find((v) => v.rut === sel.viajeroRut)}
          vehiculo={vehiculos.find((v) => v.patente === sel.vehiculoPatente)}
          onClose={() => setSel(null)}
          onAprobar={(obs) => cambiarEstado(sel.idTramite, "aprobado", obs)}
          onRechazar={(obs) => cambiarEstado(sel.idTramite, "rechazado", obs)}
          onRevisar={() => cambiarEstado(sel.idTramite, "en_revision")}
        />
      )}
    </main>
  );
}

// ---- Drawer de revisión: valida documentos y cambia estado ----
function RevisionDrawer({ t, sesion, viajero, vehiculo, onClose, onAprobar, onRechazar, onRevisar }) {
  const [obs, setObs] = useState(t.observaciones || "");
  const hayProhibido = t.documentos.some(
    (d) => d.tipo === "DeclaracionSAG" && d.tieneAlimentos && esProductoProhibido(d.tipoProducto)
  );

  // Permisos granulares: qué documentos puede validar este rol
  const permisosDocumentos = t.documentos.map((d) => ({
    ...d,
    puedeValidar: puedeValidarDocumento(sesion?.rol, d.tipo),
    entidadResponsable: d.tipo === "DeclaracionSAG" ? "SAG" : d.tipo === "AutorizacionNotarial" ? "PDI" : "Registro Civil",
  }));

  return (
    <>
      <div style={S.overlay} onClick={onClose} />
      <aside style={S.drawer}>
        <div style={S.drawerHead}>
          <div>
            <p style={S.kickerSm}>Trámite #{t.idTramite}</p>
            <h3 style={S.drawerTitle}>{viajero?.nombreCompleto}</h3>
          </div>
          <button style={S.iconBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <EstadoPill estado={t.estado} />

        <Section title="Viajero">
          <KV k="RUT" v={viajero?.rut} />
          <KV k="Nacionalidad" v={viajero?.nacionalidad} />
          <KV k="Menor de edad" v={viajero?.esMenor ? "Sí" : "No"} />
          <KV k="Contacto" v={viajero?.email} />
        </Section>

        {vehiculo && (
          <Section title="Vehículo">
            <KV k="Patente" v={vehiculo.patente} />
            <KV k="Marca/Modelo" v={`${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.anio})`} />
            <KV k="Diplomático" v={vehiculo.esDiplomatico ? "Sí" : "No"} />
          </Section>
        )}

        <Section title={`Documentos (${t.documentos.length})`}>
          {permisosDocumentos.map((d) => (
            <div key={d.idDocumento}>
              <DocRow d={d} />
              <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "2px 0 6px 0" }}>
                <span style={{ fontSize: 10, color: "var(--muted)", fontStyle: "italic" }}>
                  Entidad responsable: {d.entidadResponsable}
                </span>
                {d.puedeValidar ? (
                  <span style={{ fontSize: 10, color: "#2f6b40", fontWeight: 700 }}>✓ Puede validar</span>
                ) : (
                  <span style={{ fontSize: 10, color: "#9a2f2f", fontWeight: 700 }}>✗ Sin permiso</span>
                )}
              </div>
            </div>
          ))}
        </Section>

        {hayProhibido && (
          <Banner tone="danger" icon={AlertTriangle} title="Validación SAG"
            text="La declaración contiene productos potencialmente prohibidos (carnes/lácteos). Revisar antes de aprobar." />
        )}
        {viajero?.requiereAutorizacion && (
          <Banner tone="warn" icon={Stamp} title="Validar con PDI"
            text="Menor de edad: confirmar autenticidad de la autorización notarial." />
        )}

        <Field label="Observaciones">
          <textarea style={{ ...S.input, minHeight: 70, resize: "vertical" }} value={obs} onChange={(e) => setObs(e.target.value)} />
        </Field>

        <div style={S.drawerActions}>
          <button style={S.btnGhost} onClick={onRevisar}><Eye size={15} /> Marcar en revisión</button>
          <button style={S.btnDanger} onClick={() => onRechazar(obs)}><XCircle size={15} /> Rechazar</button>
          <button style={S.btnPrimary} onClick={() => onAprobar(obs)}><CheckCircle2 size={15} /> Aprobar</button>
        </div>
      </aside>
    </>
  );
}

// ---- Informes estadísticos (InformeEstadistico) ----
function Informes({ tramites }) {
  const [desde, setDesde] = useState("2026-05-01");
  const [hasta, setHasta] = useState("2026-05-31");
  const [tipo, setTipo] = useState("personas"); // personas | vehiculos

  // DEF-W008: comparar solo la parte de fecha (YYYY-MM-DD) evita el desfase
  // de zona horaria. No se construyen objetos Date en UTC para el filtro.
  const enRango = (fechaHora) => {
    const f = String(fechaHora).slice(0, 10);
    return (!desde || f >= desde) && (!hasta || f <= hasta);
  };

  const filtrados = useMemo(
    () => tramites.filter((t) => enRango(t.fechaHora)),
    [tramites, desde, hasta]
  );

  const stats = useMemo(() => {
    const por = { pendiente: 0, en_revision: 0, aprobado: 0, rechazado: 0 };
    filtrados.forEach((t) => { por[t.estado] = (por[t.estado] || 0) + 1; });
    const conVehiculo = filtrados.filter((t) => t.vehiculoPatente).length;
    const conSAG = filtrados.filter((t) => t.documentos.some((d) => d.tipo === "DeclaracionSAG" && d.tieneAlimentos)).length;
    return { por, total: filtrados.length, conVehiculo, conSAG };
  }, [filtrados]);

  const max = Math.max(1, ...Object.values(stats.por));
  const sinDatos = filtrados.length === 0; // CP-WEB-INF-002

  // DEF-W010: exportación con identidad institucional (logo textual SNA,
  // fecha de generación, período y total) y fechas en formato chileno.
  function exportarHTML() {
    const filas = filtrados.map((t) =>
      `<tr><td>${t.idTramite}</td><td>${fmtFechaCL(t.fechaHora)}</td><td>${t.tipoViaje}</td><td>${ESTADO_META[t.estado]?.label || t.estado}</td><td>${t.vehiculoPatente || "—"}</td></tr>`
    ).join("");
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
      <title>Informe SNA</title></head><body style="font-family:Arial,sans-serif;padding:30px">
      <div style="border-bottom:3px solid #013171;padding-bottom:12px;margin-bottom:18px">
        <h1 style="color:#013171;margin:0">🛂 Servicio Nacional de Aduanas</h1>
        <p style="margin:4px 0;color:#555">Informe estadístico — Trámites de ${tipo}</p>
      </div>
      <p><b>Período:</b> ${fmtFechaCL(desde)} al ${fmtFechaCL(hasta)}<br>
         <b>Fecha de generación:</b> ${fmtFechaCL(nowStr())}<br>
         <b>Total de registros:</b> ${filtrados.length}</p>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
        <thead style="background:#013171;color:#fff">
          <tr><th>ID</th><th>Fecha</th><th>Tipo viaje</th><th>Estado</th><th>Vehículo</th></tr>
        </thead><tbody>${filas}</tbody></table>
      <p style="margin-top:24px;color:#888;font-size:12px">Documento generado por el Sistema de Gestión de Pasos Fronterizos — SNA</p>
      </body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    descargar(blob, `informe_SNA_${desde}_${hasta}.html`);
  }

  function exportarCSV() {
    // DEF-W005: fechas en formato chileno DD/MM/AAAA, no ISO.
    const cab = "ID;Fecha;Tipo de viaje;Estado;Vehiculo\n";
    const filas = filtrados.map((t) =>
      `${t.idTramite};${fmtFechaCL(t.fechaHora)};${t.tipoViaje};${ESTADO_META[t.estado]?.label || t.estado};${t.vehiculoPatente || "—"}`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + cab + filas], { type: "text/csv;charset=utf-8" });
    descargar(blob, `informe_SNA_${desde}_${hasta}.csv`);
  }

  return (
    <div>
      {/* Selección de período y tipo (CP-WEB-INF-001) */}
      <div style={{ ...S.panel, marginBottom: 18 }}>
        <div style={S.formGrid}>
          <Field label="Tipo de informe">
            <select style={S.select} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="personas">Personas</option>
              <option value="vehiculos">Vehículos</option>
            </select>
          </Field>
          <Field label="Desde"><input type="date" style={S.input} value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
          <Field label="Hasta"><input type="date" style={S.input} value={hasta} onChange={(e) => setHasta(e.target.value)} /></Field>
        </div>
      </div>

      {/* CP-WEB-INF-002: período sin datos */}
      {sinDatos ? (
        <Banner tone="warn" icon={AlertTriangle} title="Sin datos en el período"
          text="No hay trámites registrados en el período seleccionado. Elige otro período o cancela." />
      ) : (
        <>
          <div style={S.statRow}>
            <StatCard label="Trámites en período" value={stats.total} icon={FileText} />
            <StatCard label="Con vehículo" value={stats.conVehiculo} icon={Car} />
            <StatCard label="Declaran alimentos" value={stats.conSAG} icon={Apple} />
            <StatCard label="Aprobados" value={stats.por.aprobado} icon={CheckCircle2} />
          </div>

          <div style={S.panel}>
            <div style={S.panelHead}>
              <h3 style={S.panelTitle}>Distribución por estado</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={S.btnGhostSm} onClick={exportarHTML}><Download size={14} /> PDF/HTML</button>
                <button style={S.btnGhostSm} onClick={exportarCSV}><Download size={14} /> Excel/CSV</button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
              {Object.entries(stats.por).map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ width: 110, fontSize: 13, color: "var(--ink)" }}>{ESTADO_META[k].label}</span>
                  <div style={{ flex: 1, background: "#e3e8f0", borderRadius: 6, height: 22, overflow: "hidden" }}>
                    <div style={{ width: `${(v / max) * 100}%`, height: "100%", background: ESTADO_META[k].color, borderRadius: 6, transition: "width .5s" }} />
                  </div>
                  <span style={{ width: 28, textAlign: "right", fontWeight: 700, fontSize: 14 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================== PANEL AUDITORÍA ===============================
function PanelAuditoria() {
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroAccion, setFiltroAccion] = useState("todos");

  const filtradas = AUDITORIA.filter((a) =>
    (filtroRol === "todos" || a.rol === filtroRol) &&
    (filtroAccion === "todos" || a.accion === filtroAccion)
  );

  // Roles únicos en auditoría
  const rolesUnicos = [...new Set(AUDITORIA.map((a) => a.rol))].sort();
  const acciones = [...new Set(AUDITORIA.map((a) => a.accion))].sort();

  return (
    <div>
      <div style={{ ...S.filterRow, marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>Filtrar por rol:</span>
        <button onClick={() => setFiltroRol("todos")} style={{ ...S.chip, ...(filtroRol === "todos" ? S.chipActive : {}) }}>Todos</button>
        {rolesUnicos.map((r) => (
          <button key={r} onClick={() => setFiltroRol(r)} style={{ ...S.chip, ...(filtroRol === r ? S.chipActive : {}) }}>
            {r}
          </button>
        ))}
      </div>
      <div style={{ ...S.filterRow, marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>Filtrar por acción:</span>
        <button onClick={() => setFiltroAccion("todos")} style={{ ...S.chip, ...(filtroAccion === "todos" ? S.chipActive : {}) }}>Todos</button>
        {acciones.map((ac) => (
          <button key={ac} onClick={() => setFiltroAccion(ac)} style={{ ...S.chip, ...(filtroAccion === ac ? S.chipActive : {}) }}>
            {ac}
          </button>
        ))}
      </div>

      <div style={S.panel}>
        <div style={S.panelHead}>
          <h3 style={S.panelTitle}>Registro de auditoría ({filtradas.length} eventos)</h3>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Total: {AUDITORIA.length} eventos registrados</span>
        </div>

        {filtradas.length === 0 ? (
          <EmptyState text="No hay eventos de auditoría con esos filtros." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 16 }}>
            {filtradas.map((a, i) => (
              <div key={i} style={{ ...S.adminRow, gap: 12, padding: "10px 12px" }}>
                <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "monospace", minWidth: 140 }}>
                  {a.timestamp}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", minWidth: 70 }}>
                  {a.rol}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#013171", minWidth: 80 }}>
                  {a.accion}
                </span>
                <span style={{ fontSize: 12, color: "var(--muted)", flex: 1 }}>
                  {a.nombre}
                </span>
                {Object.keys(a.detalles).length > 0 && (
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>
                    {JSON.stringify(a.detalles).slice(0, 50)}…
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================== PANEL CONFIGURACIÓN ===============================
function PanelConfiguracion() {
  const [productosProhibidos, setProductosProhibidos] = useState(["carnes", "lacteos"]);
  const [nuevoProducto, setNuevoProducto] = useState("");

  function agregarProducto() {
    if (!nuevoProducto.trim()) return;
    if (!productosProhibidos.includes(nuevoProducto.trim().toLowerCase())) {
      setProductosProhibidos([...productosProhibidos, nuevoProducto.trim().toLowerCase()]);
      setNuevoProducto("");
    }
  }

  function removerProducto(p) {
    setProductosProhibidos(productosProhibidos.filter((x) => x !== p));
  }

  return (
    <div>
      <div style={S.panel}>
        <div style={S.panelHead}>
          <h3 style={S.panelTitle}>Configuración del Sistema</h3>
          <span style={S.formSub}>Parámetros controlables por administrador</span>
        </div>

        <Section title="Productos prohibidos (SAG)">
          <p style={{ ...S.muted, marginBottom: 12 }}>
            Estos productos son rechazados automáticamente en la declaración SAG.
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "flex-end" }}>
            <Field label="Agregar producto">
              <input
                style={S.input}
                value={nuevoProducto}
                onChange={(e) => setNuevoProducto(e.target.value)}
                placeholder="ej: quesos, carnes"
              />
            </Field>
            <button style={S.btnPrimary} onClick={agregarProducto}>
              <Plus size={16} /> Agregar
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {productosProhibidos.map((p) => (
              <div key={p} style={{ ...S.tag, background: "#f8dada", borderColor: "#e09a9a", color: "#9a2f2f" }}>
                {p}
                <button
                  onClick={() => removerProducto(p)}
                  style={{ marginLeft: 6, border: "none", background: "none", color: "#9a2f2f", cursor: "pointer", fontSize: 14 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Plazo máximo de vehículos">
          <p style={{ ...S.muted }}>
            Según el Acuerdo Chileno-Argentino, los vehículos pueden salir temporalmente por máximo <b>180 días</b>.
            Este parámetro es validado en el wizard de creación de trámites.
          </p>
        </Section>

        <Section title="Vigencia de documentos">
          <KV k="Declaración SAG" v="30 días" />
          <KV k="Autorización notarial" v="1 año" />
          <KV k="Formulario vehículo" v="Plazo configurable (máx 180 días)" />
        </Section>

        <Section title="Integración de sistemas externos">
          <p style={{ ...S.muted, marginBottom: 6 }}>
            Los siguientes sistemas simulados están integrados (actualmente con funciones mock):
          </p>
          <KV k="SAG (Servicio Agrícola)" v="✓ Conectado (simulado)" />
          <KV k="PDI (Policía)" v="✓ Conectado (simulado)" />
          <KV k="Registro Civil" v="✓ Conectado (simulado)" />
        </Section>
      </div>
    </div>
  );
}

// ============================== ADMIN ===============================
function AdminApp({ sesion, viajeros, setViajeros, vehiculos, setVehiculos, tramites }) {
  const [view, setView] = useState("viajeros"); // viajeros | vehiculos | auditoria | configuracion
  const [editing, setEditing] = useState(null); // objeto en edición o null
  const [creating, setCreating] = useState(false);

  // ¿Está el registro en uso por algún trámite? (para advertir al eliminar)
  function tramitesDeViajero(rut) { return tramites.filter((t) => t.viajeroRut === rut); }
  function viajeroEnUso(rut) { return tramitesDeViajero(rut).length > 0; }
  function vehiculoEnUso(pat) { return tramites.some((t) => t.vehiculoPatente === pat); }

  function eliminarViajero(rut) {
    const asociados = tramitesDeViajero(rut);
    // DEF-W006: advertir cuántos trámites activos quedarían huérfanos
    if (asociados.length > 0) {
      const activos = asociados.filter((t) => t.estado === "pendiente" || t.estado === "en_revision").length;
      const msg = activos > 0
        ? `Este viajero tiene ${asociados.length} trámite(s), ${activos} de ellos activo(s) (pendientes o en revisión). Si lo eliminas, esos trámites quedarán huérfanos. ¿Continuar?`
        : `Este viajero tiene ${asociados.length} trámite(s) asociado(s). ¿Eliminar de todos modos?`;
      if (!window.confirm(msg)) return;
    }
    setViajeros((p) => p.filter((v) => v.rut !== rut));
    borrarViajero(rut).catch(e => console.error("Error eliminando viajero:", e));
    registrarAuditoria(sesion, "ELIMINAR_VIAJERO", { rut });
  }
  function eliminarVehiculo(pat) {
    if (vehiculoEnUso(pat)) {
      if (!window.confirm("Este vehículo tiene trámites asociados. ¿Eliminar de todos modos?")) return;
    }
    setVehiculos((p) => p.filter((v) => v.patente !== pat));
    borrarVehiculo(pat).catch(e => console.error("Error eliminando vehículo:", e));
    registrarAuditoria(sesion, "ELIMINAR_VEHICULO", { patente: pat });
  }

  function guardarViajero(data, original) {
    setViajeros((p) => original
      ? p.map((v) => (v.rut === original.rut ? data : v))
      : [data, ...p]);
    // Si cambió el rut (id del documento) hay que borrar el viejo en Firestore.
    if (original && original.rut !== data.rut) {
      borrarViajero(original.rut).catch(e => console.error(e));
    }
    persistirViajero(data).catch(e => console.error("Error guardando viajero:", e));
    registrarAuditoria(sesion, original ? "EDITAR_VIAJERO" : "CREAR_VIAJERO", { rut: data.rut, nombre: data.nombreCompleto });
    setEditing(null); setCreating(false);
  }
  function guardarVehiculo(data, original) {
    setVehiculos((p) => original
      ? p.map((v) => (v.patente === original.patente ? data : v))
      : [data, ...p]);
    if (original && original.patente !== data.patente) {
      borrarVehiculo(original.patente).catch(e => console.error(e));
    }
    persistirVehiculo(data).catch(e => console.error("Error guardando vehículo:", e));
    registrarAuditoria(sesion, original ? "EDITAR_VEHICULO" : "CREAR_VEHICULO", { patente: data.patente, marca: data.marca });
    setEditing(null); setCreating(false);
  }

  
  // Las dos nuevas vistas:
  return (
    <main style={S.main}>
      <SectionTabs
        actorLabel="Administrador del sistema"
        tabs={[
          { id: "viajeros", label: "Viajeros", icon: Users },
          { id: "vehiculos", label: "Vehículos", icon: Car },
          { id: "auditoria", label: "Auditoría", icon: FileText },
          { id: "configuracion", label: "Configuración", icon: Settings },
        ]}
        active={view}
        onChange={(v) => { setView(v); setEditing(null); setCreating(false); }}
      />

      {/* Formulario de creación/edición */}
      {(creating || editing) && view === "viajeros" && (
        <ViajeroForm
          original={editing}
          existentes={viajeros}
          onSave={guardarViajero}
          onCancel={() => { setEditing(null); setCreating(false); }}
        />
      )}
      {(creating || editing) && view === "vehiculos" && (
        <VehiculoForm
          original={editing}
          existentes={vehiculos}
          onSave={guardarVehiculo}
          onCancel={() => { setEditing(null); setCreating(false); }}
        />
      )}

      {/* Vista dinámica según el tab seleccionado */}
      {view === "viajeros" && (
        <>
          <div style={S.adminBar}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <Database size={17} style={{ color: "var(--accent)" }} />
              <span style={{ fontWeight: 700, fontSize: 15 }}>{viajeros.length} viajeros registrados</span>
            </div>
            <button style={S.btnPrimary} onClick={() => { setCreating(true); setEditing(null); }}>
              <UserPlus size={16} /> Nuevo viajero
            </button>
          </div>
          <div style={S.tableWrap}>
            {viajeros.length === 0 && <EmptyState text="No hay viajeros registrados." />}
            {viajeros.map((v) => (
              <div key={v.rut} style={S.adminRow}>
                <div style={S.adminAvatar}>{iniciales(v.nombreCompleto)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                    {v.nombreCompleto}
                    {v.esMenor && <span style={S.menorBadge}>Menor</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {v.rut} · {v.nacionalidad} · {v.email}
                  </div>
                </div>
                {viajeroEnUso(v.rut) && <Tag icon={FileCheck}>En uso</Tag>}
                <button style={S.iconBtnSm} title="Editar"
                  onClick={() => { setEditing(v); setCreating(false); }}><Pencil size={15} /></button>
                <button style={{ ...S.iconBtnSm, color: "#9a2f2f" }} title="Eliminar"
                  onClick={() => eliminarViajero(v.rut)}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </>
      )}

      {view === "vehiculos" && (
        <>
          <div style={S.adminBar}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <Database size={17} style={{ color: "var(--accent)" }} />
              <span style={{ fontWeight: 700, fontSize: 15 }}>{vehiculos.length} vehículos registrados</span>
            </div>
            <button style={S.btnPrimary} onClick={() => { setCreating(true); setEditing(null); }}>
              <Plus size={16} /> Nuevo vehículo
            </button>
          </div>
          <div style={S.tableWrap}>
            {vehiculos.length === 0 && <EmptyState text="No hay vehículos registrados." />}
            {vehiculos.map((v) => (
              <div key={v.patente} style={S.adminRow}>
                <div style={{ ...S.adminAvatar, background: "#b07d2a22", color: "#8a5e16" }}><Car size={18} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                    {v.patente}
                    {v.esDiplomatico && <span style={{ ...S.menorBadge, background: "#7a4fa022", color: "#5e3a82" }}>Diplomático</span>}
                    {v.tieneRestricciones && <span style={{ ...S.menorBadge, background: "#9a2f2f22", color: "#9a2f2f" }}>Restringido</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {v.marca} {v.modelo} ({v.anio}) · {v.color} · Chasis {v.numeroChasis}
                  </div>
                </div>
                {vehiculoEnUso(v.patente) && <Tag icon={FileCheck}>En uso</Tag>}
                <button style={S.iconBtnSm} title="Editar"
                  onClick={() => { setEditing(v); setCreating(false); }}><Pencil size={15} /></button>
                <button style={{ ...S.iconBtnSm, color: "#9a2f2f" }} title="Eliminar"
                  onClick={() => eliminarVehiculo(v.patente)}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </>
      )}

      {view === "auditoria" && (
        <PanelAuditoria />
      )}

      {view === "configuracion" && (
        <PanelConfiguracion />
      )}
    </main>
  );
}

// ---- Formulario de Viajero (crear / editar) ----
function ViajeroForm({ original, existentes = [], onSave, onCancel }) {
  const [f, setF] = useState(original || {
    rut: "", nombreCompleto: "", nacionalidad: "Chilena", fechaNacimiento: "",
    email: "", telefono: "", esMenor: false, requiereAutorizacion: false,
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  // Validaciones
  const errores = [];
  if (!f.rut.trim()) errores.push("El RUT es obligatorio.");
  else if (!isValidRUTChileno(f.rut)) errores.push("El RUT no tiene un formato válido (ej: 12.345.678-9).");
  if (!f.nombreCompleto.trim()) errores.push("El nombre completo es obligatorio.");
  if (f.email.trim() && !isValidEmail(f.email)) errores.push("El email no tiene un formato válido.");
  // RUT duplicado (solo al crear, o si se cambió el RUT al editar)
  const rutDuplicado = existentes.some(
    (v) => v.rut.toLowerCase() === f.rut.trim().toLowerCase() && (!original || v.rut !== original.rut)
  );
  if (rutDuplicado) errores.push("Ya existe un viajero con ese RUT.");

  const edad = calcularEdadAnios(f.fechaNacimiento);
  const valido = errores.length === 0;

  function guardar() {
    // Recalcula menor de edad y autorización a partir de la fecha real
    const datos = { ...f };
    if (edad != null) {
      datos.esMenor = edad < 18;
      datos.requiereAutorizacion = edad < 18;
    }
    onSave(datos, original);
  }

  return (
    <div style={S.adminForm}>
      <div style={S.formHead}>
        <h3 style={S.formTitle}>{original ? "Editar viajero" : "Nuevo viajero"}</h3>
        <span style={S.formSub}>Clase Viajero</span>
      </div>
      <div style={S.formGrid}>
        <Field label="RUT"><input style={S.input} value={f.rut} onChange={(e) => set("rut", e.target.value)} placeholder="12.345.678-9" /></Field>
        <Field label="Nombre completo"><input style={S.input} value={f.nombreCompleto} onChange={(e) => set("nombreCompleto", e.target.value)} /></Field>
        <Field label="Nacionalidad"><input style={S.input} value={f.nacionalidad} onChange={(e) => set("nacionalidad", e.target.value)} /></Field>
        <Field label="Fecha de nacimiento"><input type="date" style={S.input} value={f.fechaNacimiento} onChange={(e) => set("fechaNacimiento", e.target.value)} /></Field>
        <Field label="Email"><input style={S.input} value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Teléfono"><input style={S.input} value={f.telefono} onChange={(e) => set("telefono", e.target.value)} /></Field>
      </div>
      {edad != null && (
        <p style={{ ...S.muted, marginTop: 10 }}>
          Edad calculada: <b>{edad} años</b> · {edad < 18 ? "menor de edad (requiere autorización notarial)" : "mayor de edad"}.
        </p>
      )}
      {errores.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {errores.map((er, i) => (
            <div key={i} style={S.loginError}><AlertTriangle size={14} /> {er}</div>
          ))}
        </div>
      )}
      <div style={S.wizardNav}>
        <button style={S.btnGhost} onClick={onCancel}>Cancelar</button>
        <button style={{ ...S.btnPrimary, opacity: valido ? 1 : 0.5, cursor: valido ? "pointer" : "not-allowed" }} disabled={!valido}
          onClick={guardar}><Save size={16} /> Guardar</button>
      </div>
    </div>
  );
}

// ---- Formulario de Vehículo (crear / editar) ----
function VehiculoForm({ original, existentes = [], onSave, onCancel }) {
  const [f, setF] = useState(original || {
    patente: "", marca: "", modelo: "", anio: 2024, color: "",
    numeroChasis: "", esDiplomatico: false, tieneRestricciones: false,
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const anioActual = new Date().getFullYear();
  const errores = [];
  if (!f.patente.trim()) errores.push("La patente es obligatoria.");
  if (!f.marca.trim()) errores.push("La marca es obligatoria.");
  if (!f.modelo.trim()) errores.push("El modelo es obligatorio.");
  if (!f.anio || f.anio < 1900 || f.anio > anioActual + 1)
    errores.push(`El año debe estar entre 1900 y ${anioActual + 1}.`);
  const patenteDuplicada = existentes.some(
    (v) => v.patente.toLowerCase() === f.patente.trim().toLowerCase() && (!original || v.patente !== original.patente)
  );
  if (patenteDuplicada) errores.push("Ya existe un vehículo con esa patente.");

  const valido = errores.length === 0;

  return (
    <div style={S.adminForm}>
      <div style={S.formHead}>
        <h3 style={S.formTitle}>{original ? "Editar vehículo" : "Nuevo vehículo"}</h3>
        <span style={S.formSub}>Clase Vehículo</span>
      </div>
      <div style={S.formGrid}>
        <Field label="Patente"><input style={S.input} value={f.patente} onChange={(e) => set("patente", e.target.value)} placeholder="ABCD-12" /></Field>
        <Field label="Marca"><input style={S.input} value={f.marca} onChange={(e) => set("marca", e.target.value)} /></Field>
        <Field label="Modelo"><input style={S.input} value={f.modelo} onChange={(e) => set("modelo", e.target.value)} /></Field>
        <Field label="Año"><input type="number" style={S.input} value={f.anio} onChange={(e) => set("anio", parseInt(e.target.value) || 0)} /></Field>
        <Field label="Color"><input style={S.input} value={f.color} onChange={(e) => set("color", e.target.value)} /></Field>
        <Field label="N° de chasis"><input style={S.input} value={f.numeroChasis} onChange={(e) => set("numeroChasis", e.target.value)} /></Field>
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
        <Toggle label="Es diplomático" checked={f.esDiplomatico} onChange={(v) => set("esDiplomatico", v)} />
        <Toggle label="Tiene restricciones" checked={f.tieneRestricciones} onChange={(v) => set("tieneRestricciones", v)} />
      </div>
      {errores.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {errores.map((er, i) => (
            <div key={i} style={S.loginError}><AlertTriangle size={14} /> {er}</div>
          ))}
        </div>
      )}
      <div style={S.wizardNav}>
        <button style={S.btnGhost} onClick={onCancel}>Cancelar</button>
        <button style={{ ...S.btnPrimary, opacity: valido ? 1 : 0.5 }} disabled={!valido}
          onClick={() => onSave(f, original)}><Save size={16} /> Guardar</button>
      </div>
    </div>
  );
}

function iniciales(nombre) {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

// ============================== COMPONENTES UI ===============================
function SectionTabs({ tabs, active, onChange, actorLabel, actorPicker }) {
  return (
    <div style={S.tabsBar}>
      <div style={S.tabs}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => onChange(t.id)}
            style={{ ...S.tab, ...(active === t.id ? S.tabActive : {}) }}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>
      <div style={S.actorBox}>
        {actorPicker}
        <span style={S.actorLabel}>{actorLabel}</span>
      </div>
    </div>
  );
}

function TramiteCard({ t, viajero, vehiculo, onClick, readOnly }) {
  return (
    <button onClick={onClick} className="tramiteCard"
      style={{ ...S.tramiteCard, cursor: onClick ? "pointer" : "default" }}>
      <div style={S.tcTop}>
        <span style={S.tcId}>#{String(t.idTramite).padStart(4, "0")}</span>
        <EstadoPill estado={t.estado} small />
      </div>
      <div style={S.tcName}>{viajero?.nombreCompleto}</div>
      <div style={S.tcMeta}>
        <span>{t.tipoViaje === "salida" ? "Salida" : "Entrada"}</span>
        <span>·</span><span>{fmtFechaCL(t.fechaHora)}</span>
      </div>
      <div style={S.tcRow}>
        {vehiculo && <Tag icon={Car}>{vehiculo.patente}</Tag>}
        {t.documentos.map((d) => {
          const meta2 = TIPOS_DOC[d.tipo];
          return <Tag key={d.idDocumento} icon={meta2.icon} color={meta2.color}>{meta2.label}</Tag>;
        })}
      </div>
      <div style={S.tcFoot}>
        <span style={S.qrBadge}><QrCode size={13} /> {t.qrCode}</span>
        {!readOnly && <span style={S.tcAction}>Revisar <ChevronRight size={14} /></span>}
        {readOnly && <span style={{ ...S.muted, fontSize: 12 }}><Clock size={12} /> ~{t.tiempoEstimado} min</span>}
      </div>
    </button>
  );
}

function DocRow({ d }) {
  const meta = TIPOS_DOC[d.tipo];
  const Icon = meta.icon;
  // Validación 3 (R.03): documento vencido si su fecha de vencimiento ya pasó.
  const vencido = d.fechaVencimiento && String(d.fechaVencimiento).slice(0, 10) < today();
  return (
    <div style={S.docRow}>
      <div style={{ ...S.docIcon, background: meta.color + "1f", color: meta.color }}><Icon size={16} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>
          {meta.label}
          {vencido && <span style={{ ...S.menorBadge, background: "#9a2f2f22", color: "#9a2f2f", marginLeft: 8 }}>Vencido</span>}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          {d.tipo === "DeclaracionSAG" && (d.tieneAlimentos ? `${d.tipoProducto} · ${d.cantidadEstimada}` : "Sin alimentos") + (d.tieneMascota ? ` · mascota (${d.tipoMascota})` : "")}
          {d.tipo === "FormularioVehiculoAcuerdo" && `${d.paisDestino} · ${d.plazoDias} días`}
          {d.tipo === "AutorizacionNotarial" && `${d.numeroNotaria} · ${d.tipoAutorizacion}`}
          {d.fechaVencimiento && ` · vence ${fmtFechaCL(d.fechaVencimiento)}`}
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: d.estado === "validado" ? "#2f6b40" : d.estado === "rechazado" ? "#9a2f2f" : "var(--muted)" }}>
        {d.estado}
      </span>
    </div>
  );
}

function EstadoPill({ estado, small }) {
  const m = ESTADO_META[estado];
  const Icon = m.icon;
  return (
    <span style={{ ...S.pill, background: m.bg, color: m.color, ...(small ? { fontSize: 11, padding: "3px 8px" } : {}) }}>
      <Icon size={small ? 12 : 14} /> {m.label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div style={S.statCard}>
      <div style={S.statIcon}><Icon size={18} /></div>
      <div><div style={S.statValue}>{value}</div><div style={S.statLabel}>{label}</div></div>
    </div>
  );
}

function Tag({ icon: Icon, children, color }) {
  return <span style={{ ...S.tag, ...(color ? { color, borderColor: color + "55" } : {}) }}>{Icon && <Icon size={12} />}{children}</span>;
}
function Banner({ tone, icon: Icon, title, text }) {
  const tones = {
    warn: { bg: "#fbf2cf", bd: "#e6cd7a", ink: "#7a5e16" },
    danger: { bg: "#f8dada", bd: "#e09a9a", ink: "#8a2727" },
    ok: { bg: "#d8f0dd", bd: "#9fcead", ink: "#2f6b40" },
  }[tone];
  return (
    <div style={{ ...S.banner, background: tones.bg, borderColor: tones.bd, color: tones.ink }}>
      <Icon size={18} style={{ flexShrink: 0, marginTop: 1 }} />
      <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{title}</div><div style={{ fontSize: 13 }}>{text}</div></div>
    </div>
  );
}
function FormBlock({ title, sub, children }) {
  return (
    <div style={S.formBlock}>
      <div style={S.formHead}><h3 style={S.formTitle}>{title}</h3><span style={S.formSub}>{sub}</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </div>
  );
}
function Field({ label, children }) {
  return <label style={S.field}><span style={S.fieldLabel}>{label}</span>{children}</label>;
}
function Toggle({ label, checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} style={S.toggleRow}>
      <span style={{ ...S.toggle, background: checked ? "var(--accent)" : "#aeb6c4" }}>
        <span style={{ ...S.toggleDot, transform: checked ? "translateX(18px)" : "translateX(0)" }} />
      </span>
      <span style={{ fontSize: 14 }}>{label}</span>
    </button>
  );
}
function RadioRow({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)}
          style={{ ...S.radio, ...(value === o.v ? S.radioActive : {}) }}>{o.l}</button>
      ))}
    </div>
  );
}
function Stepper({ paso, total, labels }) {
  return (
    <div style={S.stepper}>
      {Array.from({ length: total }).map((_, i) => {
        const n = i + 1, done = n < paso, cur = n === paso;
        return (
          <React.Fragment key={n}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...S.stepDot, background: done ? "var(--accent)" : cur ? "var(--ink)" : "#c4ccd9", color: (done || cur) ? "#fff" : "var(--muted)" }}>
                {done ? <CheckCircle2 size={14} /> : n}
              </span>
              <span style={{ fontSize: 12.5, color: cur ? "var(--ink)" : "var(--muted)", fontWeight: cur ? 700 : 500 }}>{labels[i]}</span>
            </div>
            {n < total && <span style={S.stepLine} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
function Section({ title, children }) {
  return <div style={S.section}><div style={S.sectionTitle}>{title}</div><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div></div>;
}
function KV({ k, v }) {
  return <div style={S.kv}><span style={{ color: "var(--muted)" }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>;
}
function ResumenLine({ k, v }) {
  return <div style={S.kv}><span style={{ color: "var(--muted)" }}>{k}</span><span style={{ fontWeight: 600, textAlign: "right" }}>{v}</span></div>;
}
function EmptyState({ text }) {
  return <div style={S.empty}><Search size={28} style={{ color: "var(--muted)", marginBottom: 8 }} /><p style={{ color: "var(--muted)" }}>{text}</p></div>;
}

// ============================== HELPERS ===============================
function today() { return new Date().toISOString().slice(0, 10); }
function nowStr() { const d = new Date(); return d.toISOString().slice(0, 10) + " " + d.toTimeString().slice(0, 5); }
function addDays(iso, n) { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

// DEF-W005: muestra fechas en formato chileno DD/MM/AAAA.
// Acepta "2026-05-29" o "2026-05-29 08:40" y conserva la hora si viene.
function fmtFechaCL(valor) {
  if (!valor) return "—";
  const [fecha, hora] = String(valor).split(" ");
  const partes = fecha.split("-");
  if (partes.length !== 3) return valor;
  const [a, m, d] = partes;
  return `${d}/${m}/${a}` + (hora ? ` ${hora}` : "");
}

// Dispara la descarga de un Blob como archivo.
function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================== ESTILOS ===============================
function StyleTag() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Spline+Sans:wght@400;500;600;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      :root{
        --bg:#eef1f6; --paper:#ffffff; --ink:#1a1f2b; --muted:#6b7180;
        --accent:#013171; --accent2:#C22A22; --line:#d8dde7;
      }
      .roleCard:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(1,49,113,.16)}
      .tramiteCard:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(1,49,113,.12);border-color:var(--accent)}
      button{font-family:inherit;cursor:pointer;border:none;background:none}
      input,select,textarea{font-family:inherit}
      ::selection{background:#013171;color:#fff}
    `}</style>
  );
}

const S = {
  root: { fontFamily: "'Spline Sans', sans-serif", background: "var(--bg)", minHeight: "100vh", color: "var(--ink)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 28px", borderBottom: "1px solid var(--line)", borderTop: "4px solid var(--accent)", background: "var(--paper)", position: "sticky", top: 0, zIndex: 20, boxShadow: "0 0 0 0 transparent" },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandTitle: { fontFamily: "'Spline Sans', sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: 0.3, lineHeight: 1.1, color: "var(--accent)" },
  brandSub: { fontSize: 11.5, color: "var(--muted)", letterSpacing: 1.5, textTransform: "uppercase" },
  exitBtn: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", padding: "8px 12px", borderRadius: 9, border: "1px solid var(--line)" },

  landing: { maxWidth: 1000, margin: "0 auto", padding: "70px 28px 40px", position: "relative" },
  heroDeco: { position: "absolute", top: -40, right: -60, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,#01317122,transparent 70%)", pointerEvents: "none" },
  kicker: { color: "var(--accent)", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", fontSize: 12 },
  kickerSm: { color: "var(--muted)", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontSize: 11 },
  heroTitle: { fontFamily: "'Fraunces', serif", fontSize: 52, fontWeight: 600, letterSpacing: -1.5, margin: "10px 0 14px", lineHeight: 1.02 },
  heroLead: { fontSize: 17, color: "var(--muted)", maxWidth: 560, lineHeight: 1.5 },
  roleGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 22, marginTop: 44 },
  roleCard: { textAlign: "left", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 20, padding: 28, transition: "all .25s", display: "flex", flexDirection: "column", gap: 14 },
  roleCardAccent: { background: "linear-gradient(160deg,#ffffff,#f0ebe0)" },
  roleIcon: { width: 56, height: 56, borderRadius: 15, background: "#01317118", color: "var(--accent)", display: "grid", placeItems: "center" },
  roleTitle: { fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600 },
  roleDesc: { color: "var(--muted)", fontSize: 14.5, lineHeight: 1.5 },
  roleList: { listStyle: "none", display: "flex", flexDirection: "column", gap: 7, margin: "4px 0" },
  roleListItem: { display: "flex", alignItems: "center", gap: 7, fontSize: 13.5 },
  roleEnter: { display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 700, color: "var(--accent)", fontSize: 15, marginTop: 4 },

  main: { maxWidth: 1080, margin: "0 auto", padding: "28px 28px 60px" },
  tabsBar: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 24 },
  tabs: { display: "flex", gap: 6, background: "var(--paper)", padding: 5, borderRadius: 13, border: "1px solid var(--line)" },
  tab: { display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, fontSize: 14, fontWeight: 600, color: "var(--muted)" },
  tabActive: { background: "var(--accent)", color: "#fff" },
  actorBox: { display: "flex", alignItems: "center", gap: 12 },
  actorLabel: { fontSize: 13, color: "var(--muted)" },

  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(310px,1fr))", gap: 16 },
  tramiteCard: { textAlign: "left", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: 18, transition: "all .2s", display: "flex", flexDirection: "column", gap: 10, width: "100%" },
  tcTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  tcId: { fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, color: "var(--muted)" },
  tcName: { fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600 },
  tcMeta: { display: "flex", gap: 6, fontSize: 12.5, color: "var(--muted)" },
  tcRow: { display: "flex", flexWrap: "wrap", gap: 6 },
  tcFoot: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, paddingTop: 12, borderTop: "1px solid var(--line)" },
  tcAction: { display: "flex", alignItems: "center", gap: 3, fontWeight: 700, color: "var(--accent)", fontSize: 13 },
  qrBadge: { display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--muted)", fontFamily: "monospace" },

  tag: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, padding: "4px 9px", borderRadius: 20, border: "1px solid var(--line)", color: "var(--muted)", background: "#fff" },
  pill: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, padding: "5px 11px", borderRadius: 20 },

  filterRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  chip: { padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "var(--muted)", border: "1px solid var(--line)", background: "var(--paper)" },
  chipActive: { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" },

  banner: { display: "flex", gap: 11, padding: "13px 15px", borderRadius: 12, border: "1px solid", marginBottom: 18 },

  wizard: { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: 28, maxWidth: 680, margin: "0 auto" },
  stepper: { display: "flex", alignItems: "center", gap: 6, marginBottom: 26, flexWrap: "wrap" },
  stepDot: { width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700 },
  stepLine: { flex: 1, minWidth: 12, height: 2, background: "var(--line)" },
  formBlock: { marginBottom: 6 },
  formHead: { marginBottom: 18 },
  formTitle: { fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600 },
  formSub: { fontSize: 12.5, color: "var(--muted)" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: 600, color: "var(--ink)" },
  input: { padding: "10px 13px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 14, background: "#fff", outline: "none", color: "var(--ink)" },
  select: { padding: "10px 13px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 14, background: "#fff", outline: "none", color: "var(--ink)" },
  muted: { color: "var(--muted)", fontSize: 14, lineHeight: 1.5 },
  toggleRow: { display: "flex", alignItems: "center", gap: 11, padding: "4px 0", width: "fit-content" },
  toggle: { width: 38, height: 21, borderRadius: 20, position: "relative", transition: "background .2s", flexShrink: 0 },
  toggleDot: { position: "absolute", top: 2.5, left: 2.5, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "transform .2s" },
  radio: { padding: "11px 18px", borderRadius: 11, border: "1.5px solid var(--line)", fontSize: 14, fontWeight: 600, color: "var(--muted)", background: "#fff", flex: 1 },
  radioActive: { borderColor: "var(--accent)", color: "var(--accent)", background: "#0131710e" },
  wizardNav: { display: "flex", justifyContent: "space-between", marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--line)" },

  btnPrimary: { display: "flex", alignItems: "center", gap: 7, background: "var(--accent)", color: "#fff", padding: "11px 20px", borderRadius: 11, fontWeight: 700, fontSize: 14 },
  btnGhost: { display: "flex", alignItems: "center", gap: 7, color: "var(--ink)", padding: "11px 18px", borderRadius: 11, fontWeight: 600, fontSize: 14, border: "1px solid var(--line)", background: "#fff" },
  btnGhostSm: { display: "flex", alignItems: "center", gap: 5, color: "var(--ink)", padding: "7px 12px", borderRadius: 9, fontWeight: 600, fontSize: 12.5, border: "1px solid var(--line)", background: "#fff" },
  btnDanger: { display: "flex", alignItems: "center", gap: 6, color: "#9a2f2f", padding: "11px 16px", borderRadius: 11, fontWeight: 700, fontSize: 14, border: "1px solid #e0a5a5", background: "#fff" },

  overlay: { position: "fixed", inset: 0, background: "rgba(35,32,26,.4)", zIndex: 40 },
  drawer: { position: "fixed", top: 0, right: 0, height: "100vh", width: "min(440px,92vw)", background: "var(--paper)", borderLeft: "1px solid var(--line)", padding: 24, overflowY: "auto", zIndex: 50, display: "flex", flexDirection: "column", gap: 16, boxShadow: "-16px 0 40px rgba(0,0,0,.12)" },
  drawerHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  drawerTitle: { fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, marginTop: 2 },
  iconBtn: { width: 34, height: 34, borderRadius: 9, border: "1px solid var(--line)", display: "grid", placeItems: "center", background: "#fff" },
  drawerActions: { display: "flex", gap: 8, marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--line)", flexWrap: "wrap" },

  section: { background: "#fff", border: "1px solid var(--line)", borderRadius: 13, padding: 15 },
  sectionTitle: { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", marginBottom: 10 },
  kv: { display: "flex", justifyContent: "space-between", gap: 16, fontSize: 13.5, padding: "2px 0" },

  docRow: { display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: "1px solid var(--line)" },
  docIcon: { width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", flexShrink: 0 },

  statRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 22 },
  statCard: { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, padding: 18, display: "flex", alignItems: "center", gap: 14 },
  statIcon: { width: 42, height: 42, borderRadius: 11, background: "#01317114", color: "var(--accent)", display: "grid", placeItems: "center" },
  statValue: { fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, lineHeight: 1 },
  statLabel: { fontSize: 12.5, color: "var(--muted)", marginTop: 3 },
  panel: { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: 22 },
  panelHead: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 },
  panelTitle: { fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600 },

  empty: { gridColumn: "1/-1", textAlign: "center", padding: "50px 20px", background: "var(--paper)", border: "1px dashed var(--line)", borderRadius: 16 },

  loginWrap: { minHeight: "calc(100vh - 160px)", display: "grid", placeItems: "center", padding: "40px 20px" },
  loginCard: { width: "100%", maxWidth: 400, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 12px 40px rgba(1,49,113,.10)" },
  loginTitle: { fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, textAlign: "center", marginTop: 4 },
  loginSub: { fontSize: 13, color: "var(--muted)", textAlign: "center", marginTop: -8, marginBottom: 6 },
  loginError: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#9a2f2f", background: "#f8dada", border: "1px solid #e09a9a", borderRadius: 9, padding: "9px 12px" },
  loginHint: { marginTop: 10, paddingTop: 16, borderTop: "1px dashed var(--line)", fontSize: 12.5 },
  demoRow: { display: "flex", justifyContent: "space-between", gap: 12, padding: "3px 0" },

  adminBar: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 },
  tableWrap: { display: "flex", flexDirection: "column", gap: 8 },
  adminRow: { display: "flex", alignItems: "center", gap: 13, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 13, padding: "12px 15px" },
  adminAvatar: { width: 40, height: 40, borderRadius: 10, background: "#01317118", color: "var(--accent)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 },
  menorBadge: { marginLeft: 8, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "2px 7px", borderRadius: 20, background: "#8a6d1f22", color: "#7a5e16" },
  iconBtnSm: { width: 32, height: 32, borderRadius: 8, border: "1px solid var(--line)", display: "grid", placeItems: "center", background: "#fff", color: "var(--ink)", flexShrink: 0 },
  adminForm: { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: 24, marginBottom: 20 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 },

  footer: { textAlign: "center", padding: "24px", fontSize: 12.5, color: "var(--muted)", borderTop: "1px solid var(--line)" },
};
