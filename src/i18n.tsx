import React, { createContext, useContext, useState, useEffect } from "react";
type Language = "en" | "es";
const spanish: Record<string, string> = {
  "Add project": "Agregar proyecto",
  Username: "Nombre de usuario",
  "Accounts and password resets are managed by your administrator through the terminal.":
    "El administrador crea las cuentas y restablece las contraseñas desde la terminal.",
  "Use a username of 3–32 letters, numbers, dots, underscores or hyphens.":
    "Usa un nombre de usuario de 3 a 32 letras, números, puntos, guiones bajos o guiones.",
  "Bulk import": "Importar en lote",
  "Close import": "Cerrar importación",
  "Choose import file": "Seleccionar archivo de importación",
  "Download CSV template": "Descargar plantilla CSV",
  "File format help": "Ayuda del formato",
  "records ready": "registros listos",
  "Confirm import": "Confirmar importación",
  "Importing…": "Importando…",
  "Import completed": "Importación completada",
  "Fix the file and upload it again. Nothing has been saved.":
    "Corrige el archivo y vuelve a subirlo. No se ha guardado ningún registro.",
  "Upload tasks, events, milestones, projects and campaigns. Preview and validate before saving.":
    "Sube tareas, eventos, hitos, proyectos y campañas. Revisa y valida antes de guardar.",
  "CSV or JSON · up to 200 records · 2 MB maximum. Existing records are never overwritten.":
    "CSV o JSON · hasta 200 registros · máximo 2 MB. No se sobrescriben registros existentes.",
  "Required activity fields: title, start and end (YYYY-MM-DD). Use kind: task, event or milestone. Use semicolons for dependency IDs and tags in CSV. Assignees must match registered names.":
    "Campos requeridos: title, start y end (AAAA-MM-DD). Usa kind: task, event o milestone. Separa dependencias y etiquetas con punto y coma en CSV. Los responsables deben coincidir con nombres registrados.",
  "JSON accepts arrays named tasks, events, milestones, projects and campaigns. Projects use name, start and end. Campaigns also require project. Timed events may include startAt and endAt with a timezone offset.":
    "JSON admite listas tasks, events, milestones, projects y campaigns. Los proyectos usan name, start y end. Las campañas requieren también project. Los eventos con hora pueden incluir startAt y endAt con zona horaria.",
  "Imports use the workspace status and category names in English, even when the interface is Spanish.":
    "La importación usa los nombres de estados y categorías del espacio en inglés, aunque la interfaz esté en español.",
  "Import files must be 2 MB or smaller.":
    "Los archivos deben pesar 2 MB o menos.",
  "Choose a CSV or JSON file.": "Selecciona un archivo CSV o JSON.",
  "Record type": "Tipo de registro",
  task: "Tarea",
  event: "Evento",
  milestone: "Hito",
  tasks: "Tareas",
  projects: "Proyectos",
  campaigns: "Campañas",
  Type: "Tipo",
  "Event start (ISO with timezone)": "Inicio del evento (ISO con zona horaria)",
  "Event end (ISO with timezone)": "Fin del evento (ISO con zona horaria)",

  "Activity filter": "Filtrar actividades",
  "All dates and activities": "Todas las fechas y actividades",
  "Due today": "Vence hoy",
  Overdue: "Vencido",
  Unassigned: "Sin responsable",
  "With attachments": "Con archivos adjuntos",
  Projects: "Proyectos",
  Campaigns: "Campañas",
  "New project": "Nuevo proyecto",
  "New campaign": "Nueva campaña",
  Name: "Nombre",
  Save: "Guardar",
  Edit: "Editar",
  Archive: "Archivar",
  Archived: "Archivado",
  Active: "Activo",
  Restore: "Restaurar",
  "View activities": "Ver actividades",
  "Select project": "Selecciona un proyecto",
  "Select campaign": "Selecciona una campaña",
  "Restore this plan?": "¿Restaurar este plan?",
  "Archive this plan? Activities will be kept.":
    "¿Archivar este plan? Las actividades se conservarán.",
  "Create a project to start planning your campaign.":
    "Crea un proyecto para empezar a planificar tu campaña.",
  "Enter a name and a valid date range.": "Ingresa un nombre y fechas válidas.",
  Overview: "Resumen",
  Timeline: "Cronograma",
  Calendar: "Calendario",
  Board: "Tablero",
  "All activities": "Todas las actividades",
  Workload: "Carga de trabajo",
  Approvals: "Aprobaciones",
  Workspace: "Espacio de trabajo",
  WORKSPACE: "ESPACIO DE TRABAJO",
  "Team workspace": "Espacio del equipo",
  PROJECTS: "PROYECTOS",
  "Workspace settings": "Configuración",
  "Log out": "Cerrar sesión",
  Administrator: "Administrador",
  Manager: "Responsable",
  "Agency Editor": "Editor de agencia",
  Contributor: "Colaborador",
  Viewer: "Lector",
  "MARKETING COMMAND CENTER": "CENTRO DE MARKETING",
  "Good morning, Edgar": "Hola, Edgar",
  "Campaign timeline": "Cronograma de campaña",
  "A clear picture of what’s moving, what’s next, and what needs you.":
    "Todo lo que avanza, lo que viene y lo que necesita tu atención.",
  "Plan together. Keep every deliverable moving forward.":
    "Planifiquen juntos y mantengan cada entrega en marcha.",
  "New activity": "Nueva actividad",
  "Local demo": "Demo local",
  "Connected workspace": "Espacio conectado",
  "LOCAL PREVIEW": "VISTA PREVIA LOCAL",
  "Explore the sample campaign. Changes are saved in this browser. Connect Firebase for team collaboration.":
    "Explora la campaña de ejemplo. Los cambios se guardan en este navegador. Conecta Firebase para colaborar.",
  "Due this week": "Vence esta semana",
  "Across your campaign": "En tu campaña",
  "In progress": "En curso",
  "Work is moving forward": "El trabajo sigue avanzando",
  "Awaiting approval": "Pendiente de aprobación",
  "Ready for your feedback": "Listo para tus comentarios",
  "Overdue activities": "Actividades vencidas",
  "Let’s get these back on track": "Retomemos estas actividades",
  "Active campaign": "Campaña activa",
  "WEBINAR · OCTOBER 2026": "WEBINAR · OCTUBRE 2026",
  "What should your business": "¿Qué debería automatizar",
  "automate first?": "primero tu empresa?",
  "From first idea to live webinar. Every detail, in one place.":
    "De la primera idea al webinar en vivo. Cada detalle en un solo lugar.",
  "Oct 24 · 11:00 AM Pacific": "24 oct. · 11:00 a. m. del Pacífico",
  "Campaign progress": "Avance de la campaña",
  of: "de",
  "activities completed": "actividades completadas",
  "View timeline": "Ver cronograma",
  "Needs your attention": "Necesita tu atención",
  "deliverable awaiting approval": "entrega pendiente de aprobación",
  "Help the team move to the next step.":
    "Ayuda al equipo a dar el siguiente paso.",
  "Review deliverables": "Revisar entregas",
  "activity is blocked": "actividad bloqueada",
  "Meta Pixel configuration needs a hand.":
    "La configuración de Meta Pixel necesita ayuda.",
  "See what’s blocking": "Ver el bloqueo",
  "You’re all caught up on team mentions.": "No tienes menciones pendientes.",
  "Upcoming activities": "Próximas actividades",
  "The next steps toward a successful launch.":
    "Los próximos pasos para un lanzamiento exitoso.",
  "View all": "Ver todo",
  ACTIVITY: "ACTIVIDAD",
  ASSIGNEE: "RESPONSABLE",
  "DUE DATE": "VENCIMIENTO",
  STATUS: "ESTADO",
  "Team workload": "Carga del equipo",
  "View workload": "Ver carga de trabajo",
  "Estimated effort · current campaign": "Esfuerzo estimado · campaña actual",
  "activities ·": "actividades ·",
  "h estimated": "h estimadas",
  "Better plans start with balanced teams.":
    "Los buenos planes comienzan con equipos equilibrados.",
  "Make room for what’s next.": "Abre espacio para lo que viene.",
  "Marketing workspace · 2026": "Espacio de marketing · 2026",
  "One team. Clear direction.": "Un equipo. Una dirección clara.",
  "Your next big thing starts with a good plan.":
    "Tu próximo gran logro comienza con un buen plan.",
  "Search activities…": "Buscar actividades…",
  "Search activities": "Buscar actividades",
  "Status filter": "Filtrar por estado",
  "Person filter": "Filtrar por persona",
  "Priority filter": "Filtrar por prioridad",
  "All statuses": "Todos los estados",
  Everyone: "Todo el equipo",
  "All priorities": "Todas las prioridades",
  Clear: "Limpiar",
  "Save filter": "Guardar filtro",
  "Saved filters": "Filtros guardados",
  "October webinar launch": "Lanzamiento del webinar de octubre",
  "Automation Webinar": "Webinar de automatización",
  "Drag to reschedule · click any activity for details":
    "Arrastra para reprogramar · abre una actividad para ver sus detalles",
  "Timeline scale": "Escala del cronograma",
  Day: "Día",
  Week: "Semana",
  Month: "Mes",
  Quarter: "Trimestre",
  Year: "Año",
  Today: "Hoy",
  "Group by": "Agrupar por",
  status: "estado",
  assignee: "responsable",
  campaign: "campaña",
  priority: "prioridad",
  type: "tipo",
  "Calendar view": "Vista del calendario",
  Agenda: "Agenda",
  "Previous month": "Anterior",
  "Next month": "Siguiente",
  Sun: "Dom",
  Mon: "Lun",
  Tue: "Mar",
  Wed: "Mié",
  Thu: "Jue",
  Fri: "Vie",
  Sat: "Sáb",
  "No activities here. Adjust your filters or create an activity.":
    "No hay actividades. Ajusta los filtros o crea una actividad.",
  "No activities match your filters.":
    "Ninguna actividad coincide con los filtros.",
  "Sort by due date": "Ordenar por vencimiento",
  "Sort by title": "Ordenar por título",
  "Sort by assignee": "Ordenar por responsable",
  "Sort by status": "Ordenar por estado",
  "Sort activities": "Ordenar actividades",
  "Export CSV": "Exportar CSV",
  "Select all (": "Seleccionar todo (",
  "Change status…": "Cambiar estado…",
  "Assign to…": "Asignar a…",
  "Bulk status": "Estado en lote",
  "Bulk assignment": "Asignación en lote",
  "Bulk due date": "Vencimiento en lote",
  "Schedule warnings": "Alertas del cronograma",
  "No conflicts detected.": "No se detectaron conflictos.",
  "Ready for a second pair of eyes": "Listo para una nueva revisión",
  Notifications: "Notificaciones",
  "Close notifications": "Cerrar notificaciones",
  "ACTIVITY DETAILS": "DETALLES DE LA ACTIVIDAD",
  "Activity details": "Detalles de la actividad",
  "Create a new activity": "Crear una actividad",
  "Close details": "Cerrar detalles",
  Details: "Detalles",
  Comments: "Comentarios",
  Files: "Archivos",
  History: "Historial",
  Title: "Título",
  Description: "Descripción",
  Status: "Estado",
  Assignee: "Responsable",
  Priority: "Prioridad",
  Channel: "Canal",
  "Activity type": "Tipo de actividad",
  Project: "Proyecto",
  Campaign: "Campaña",
  "Start date": "Fecha de inicio",
  "Due date": "Fecha de vencimiento",
  "Estimated effort (hours)": "Esfuerzo estimado (horas)",
  "Progress (%)": "Avance (%)",
  Tags: "Etiquetas",
  Dependencies: "Dependencias",
  Checklist: "Lista de verificación",
  "＋ Add checklist item": "＋ Agregar elemento",
  Cancel: "Cancelar",
  "Save activity": "Guardar actividad",
  "Approve deliverable": "Aprobar entrega",
  "Request changes": "Solicitar cambios",
  "Add a comment · use @Name to mention":
    "Agrega un comentario · usa @Nombre para mencionar",
  "Add comment to draft": "Agregar comentario al borrador",
  "No changes recorded yet.": "No hay cambios registrados.",
  "Attach PDF, PNG, JPG or WebP (up to 10 MB)":
    "Adjuntar PDF, PNG, JPG o WebP (hasta 10 MB)",
  "Connect Firebase Storage to upload files.":
    "Conecta Firebase Storage para subir archivos.",
  "Your timezone": "Tu zona horaria",
  "Weekly capacity (hours)": "Capacidad semanal (horas)",
  "Statuses (comma separated)": "Estados (separados por comas)",
  "Save settings": "Guardar configuración",
  "Team access is provisioned with the trusted administrator script. No public self-registration.":
    "El administrador gestiona el acceso mediante un script seguro. No hay registro público.",
  Backlog: "Pendiente",
  Planned: "Planificado",
  "Waiting for review": "En revisión",
  "Changes requested": "Cambios solicitados",
  Approved: "Aprobado",
  Completed: "Completado",
  Blocked: "Bloqueado",
  Cancelled: "Cancelado",
  Low: "Baja",
  Medium: "Media",
  High: "Alta",
  Urgent: "Urgente",
  Strategy: "Estrategia",
  Copywriting: "Redacción",
  "Graphic design": "Diseño gráfico",
  Video: "Video",
  "Landing page": "Página de destino",
  "Paid advertising": "Publicidad pagada",
  "Social media": "Redes sociales",
  "Email marketing": "Email marketing",
  Webinar: "Webinar",
  Analytics: "Analítica",
  Reporting: "Informes",
  Approval: "Aprobación",
  Other: "Otro",
  Email: "Correo",
  Website: "Sitio web",
  "Business associate": "Socio de negocio",
  "Marketing agency": "Agencia de marketing",
  "Campaign strategy": "Estrategia de campaña",
  "Static creative concepts": "Conceptos de piezas gráficas",
  "Creative approval": "Aprobación de piezas",
  "Reel scripts": "Guiones de reels",
  "Video recording": "Grabación de video",
  "Video editing": "Edición de video",
  "Landing-page development": "Desarrollo de la página de destino",
  "Landing-page approval": "Aprobación de la página de destino",
  "Meta Pixel configuration": "Configuración de Meta Pixel",
  "Meta campaign setup": "Configuración de campaña en Meta",
  "Audience configuration": "Configuración de audiencias",
  "Registration testing": "Pruebas de registro",
  "Reminder email preparation": "Preparación de correos recordatorios",
  "Webinar presentation preparation": "Preparación de la presentación",
  "Final technical test": "Prueba técnica final",
  "Live webinar": "Webinar en vivo",
  "Lead export and follow-up": "Exportación y seguimiento de contactos",
  "Campaign performance report": "Informe de resultados de campaña",
  "Prepare first draft": "Preparar el primer borrador",
  "Review with Scala team": "Revisar con el equipo de Scala",
  "A little structure.": "Un poco de estructura.",
  "A lot of possibility.": "Muchas posibilidades.",
  "Your marketing team’s shared command center.":
    "El centro de trabajo compartido de tu equipo de marketing.",
  "WELCOME TO YOUR WORKSPACE": "BIENVENIDO A TU ESPACIO",
  "Let’s move things forward.": "Avancemos juntos.",
  "Sign in to Scala Marketing.": "Ingresa a Scala Marketing.",
  "Email address": "Correo electrónico",
  Password: "Contraseña",
  "Sign in": "Iniciar sesión",
  "Signing in…": "Ingresando…",
  "Forgot password?": "¿Olvidaste tu contraseña?",
  "Continue with Google": "Continuar con Google",
  "Explore the local demo": "Explorar la demo local",
  "Sample data · no account required": "Datos de ejemplo · sin cuenta",
  "Firebase isn’t configured yet. Use the local demo, or follow the README to connect the emulators.":
    "Firebase aún no está configurado. Usa la demo local o sigue el README para conectar los emuladores.",
  "Loading your workspace…": "Cargando tu espacio…",
  "Name this filter": "Nombre del filtro",
  "Checklist item": "Elemento de la lista",
  "Explain the changes needed": "Explica los cambios necesarios",
  "Save this schedule change?": "¿Guardar este cambio de fechas?",
  "Workspace settings saved": "Configuración guardada",
  "Filter saved": "Filtro guardado",
  "Password reset requested. Check your inbox.":
    "Restablecimiento solicitado. Revisa tu correo.",
  "You do not have permission to edit this activity.":
    "No tienes permiso para editar esta actividad.",
  "Dependencies cannot form a cycle. Remove the circular dependency before saving.":
    "Las dependencias no pueden formar un ciclo. Elimina la dependencia circular.",
  "Enter a title, valid date range and progress between 0 and 100.":
    "Ingresa un título, fechas válidas y un avance de 0 a 100.",
  Language: "Idioma",
  "Switch to Spanish": "Cambiar a español",
  "Switch to English": "Switch to English",
  "October campaign · 18 activities": "Campaña de octubre · 18 actividades",
  "activities · Dates shown in": "actividades · Fechas en",
  "estimated hours": "horas estimadas",
  Priorities: "Prioridades",
  Channels: "Canales",
  Types: "Tipos",
  "(comma separated)": "(separados por comas)",
};
function translated<T>(value: T, language: Language): T {
  if (language !== "es" || typeof value !== "string") return value;
  const text = value.trim();
  let result = spanish[text];
  if (!result) {
    const task = (v: string) => spanish[v] || v;
    const patterns: [RegExp, (...s: string[]) => string][] = [
      [/^Overdue: (.*)$/, (_all, title) => `Vencido: ${task(title)}`],
      [
        /^Approval requested: (.*)$/,
        (_all, title) => `Aprobación solicitada: ${task(title)}`,
      ],
      [
        /^Updated activity: (.*)$/,
        (_all, title) => `Actividad actualizada: ${task(title)}`,
      ],
      [
        /^(.*) starts before (.*) finishes$/,
        (_all, a, b) => `${task(a)} comienza antes de que termine ${task(b)}`,
      ],
      [
        /^(.*): (.*) overlaps (.*)$/,
        (_all, p, a, b) => `${task(p)}: ${task(a)} coincide con ${task(b)}`,
      ],
      [
        /^(.*) extends beyond the project end$/,
        (_all, a) => `${task(a)} termina después del cierre del proyecto`,
      ],
    ];
    for (const [pattern, format] of patterns)
      if (pattern.test(text)) {
        result = text.replace(pattern, format);
        break;
      }
  }
  return (result ? value.replace(text, result) : value) as T;
}
const Context = createContext({
  language: "en" as Language,
  setLanguage: (l: Language) => {
    void l;
  },
  t: <T,>(v: T) => v,
});
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>(
    localStorage.getItem("scala-language") === "es" ? "es" : "en",
  );
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  function setLanguage(l: Language) {
    setLang(l);
    localStorage.setItem("scala-language", l);
    document.documentElement.lang = l;
  }
  return (
    <Context.Provider
      value={{
        language,
        setLanguage,
        t: <T,>(v: T) => translated(v, language),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useI18n() {
  return useContext(Context);
}
export function LanguageToggle() {
  const { language, setLanguage } = useI18n();
  return (
    <button
      className="language-toggle"
      aria-label={language === "en" ? "Switch to Spanish" : "Switch to English"}
      onClick={() => setLanguage(language === "en" ? "es" : "en")}
    >
      <span aria-hidden="true">◎</span>{" "}
      {language === "en" ? "Español" : "English"}
    </button>
  );
}
