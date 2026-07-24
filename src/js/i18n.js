/* ================================================================
   IDIOMAS (i18n) — base de traducción del juego.

   De momento cubre la PORTADA (menú + selector de dificultad): el idioma se
   elige en el menú, se guarda como preferencia global (localStorage
   "rpm_idioma") y se aplica al instante. El resto del juego se irá traduciendo
   por fases reutilizando este mismo mecanismo: basta con añadir claves a cada
   idioma y llamar a t("clave") allí donde hoy hay texto fijo.

   t() es determinista: ante una clave o idioma desconocido, cae al español
   (idioma por defecto) y, en último término, devuelve la propia clave. */
const IDIOMAS=[
  {id:"fr",n:"Français",bandera:"🇫🇷"},
  {id:"en",n:"English", bandera:"🇬🇧"},
  {id:"es",n:"Español", bandera:"🇪🇸"},
  {id:"de",n:"Deutsch", bandera:"🇩🇪"},
  {id:"it",n:"Italiano",bandera:"🇮🇹"},
];
const IDIOMA_DEF="es";
const I18N={
  es:{
    dif_label:"Dificultad",
    idioma_label:"Idioma",
    dif_accesible_n:"Accesible",
    dif_accesible_desc:"Economía holgada, menos lesiones y una junta paciente. Para disfrutar del recorrido.",
    dif_manager_n:"Mánager",
    dif_manager_desc:"El equilibrio previsto: cada decisión pesa lo justo.",
    dif_experto_n:"Experto",
    dif_experto_desc:"Menos margen económico, más riesgo de lesión y una junta exigente. Sin red.",
    btn_carrera:"🎾 Carrera de jugador",
    btn_club:"🏟 Modo club",
    btn_superliga:"🏆 Superliga",
    menu_continuar:" ·  continuar o nueva",
    menu_info_guardado:"El guardado es automático.",
    menu_info_partida:"Tienes partida guardada: al entrar podrás continuarla o empezar una nueva.",
  },
  en:{
    dif_label:"Difficulty",
    idioma_label:"Language",
    dif_accesible_n:"Casual",
    dif_accesible_desc:"Roomy finances, fewer injuries and a patient board. To enjoy the journey.",
    dif_manager_n:"Manager",
    dif_manager_desc:"The intended balance: every decision carries its fair weight.",
    dif_experto_n:"Expert",
    dif_experto_desc:"Tighter finances, higher injury risk and a demanding board. No safety net.",
    btn_carrera:"🎾 Player career",
    btn_club:"🏟 Club mode",
    btn_superliga:"🏆 Superleague",
    menu_continuar:" ·  continue or new",
    menu_info_guardado:"Your progress is saved automatically.",
    menu_info_partida:"You have a saved game: enter to continue it or start a new one.",
  },
  fr:{
    dif_label:"Difficulté",
    idioma_label:"Langue",
    dif_accesible_n:"Accessible",
    dif_accesible_desc:"Finances confortables, moins de blessures et un conseil patient. Pour profiter du parcours.",
    dif_manager_n:"Manager",
    dif_manager_desc:"L'équilibre prévu : chaque décision pèse à sa juste mesure.",
    dif_experto_n:"Expert",
    dif_experto_desc:"Moins de marge économique, plus de risque de blessure et un conseil exigeant. Sans filet.",
    btn_carrera:"🎾 Carrière de joueur",
    btn_club:"🏟 Mode club",
    btn_superliga:"🏆 Superligue",
    menu_continuar:" ·  continuer ou nouvelle",
    menu_info_guardado:"La sauvegarde est automatique.",
    menu_info_partida:"Vous avez une partie sauvegardée : entrez pour la continuer ou en commencer une nouvelle.",
  },
  de:{
    dif_label:"Schwierigkeit",
    idioma_label:"Sprache",
    dif_accesible_n:"Locker",
    dif_accesible_desc:"Üppige Finanzen, weniger Verletzungen und ein geduldiger Vorstand. Um die Reise zu genießen.",
    dif_manager_n:"Manager",
    dif_manager_desc:"Die vorgesehene Balance: jede Entscheidung wiegt genau richtig.",
    dif_experto_n:"Experte",
    dif_experto_desc:"Weniger finanzieller Spielraum, höheres Verletzungsrisiko und ein anspruchsvoller Vorstand. Ohne Netz.",
    btn_carrera:"🎾 Spielerkarriere",
    btn_club:"🏟 Klub-Modus",
    btn_superliga:"🏆 Superliga",
    menu_continuar:" ·  fortsetzen oder neu",
    menu_info_guardado:"Der Spielstand wird automatisch gespeichert.",
    menu_info_partida:"Du hast einen gespeicherten Spielstand: fortsetzen oder neu beginnen.",
  },
  it:{
    dif_label:"Difficoltà",
    idioma_label:"Lingua",
    dif_accesible_n:"Accessibile",
    dif_accesible_desc:"Economia generosa, meno infortuni e una dirigenza paziente. Per godersi il percorso.",
    dif_manager_n:"Manager",
    dif_manager_desc:"L'equilibrio previsto: ogni decisione pesa il giusto.",
    dif_experto_n:"Esperto",
    dif_experto_desc:"Meno margine economico, più rischio di infortuni e una dirigenza esigente. Senza rete.",
    btn_carrera:"🎾 Carriera giocatore",
    btn_club:"🏟 Modalità club",
    btn_superliga:"🏆 Superlega",
    menu_continuar:" ·  continua o nuova",
    menu_info_guardado:"Il salvataggio è automatico.",
    menu_info_partida:"Hai una partita salvata: entra per continuarla o iniziarne una nuova.",
  },
};
function idiomaValido(id){ return IDIOMAS.some(l=>l.id===id); }
// Idioma vigente: la preferencia guardada en el menú, o el español por defecto.
function idiomaActual(){ try{ const s=localStorage.getItem("rpm_idioma"); if(idiomaValido(s)) return s; }catch(e){} return IDIOMA_DEF; }
// Traduce una clave al idioma vigente, con doble red: idioma por defecto y, si
// tampoco existe, la propia clave (así una clave sin traducir se nota, no rompe).
function t(clave){
  const L=I18N[idiomaActual()]||I18N[IDIOMA_DEF];
  if(L&&L[clave]!=null) return L[clave];
  const D=I18N[IDIOMA_DEF];
  return (D&&D[clave]!=null)?D[clave]:clave;
}
// Nombre y descripción de una dificultad en el idioma vigente.
function difNombre(id){ return t("dif_"+(id||DIF_DEF)+"_n"); }
function difDesc(id){ return t("dif_"+(id||DIF_DEF)+"_desc"); }
