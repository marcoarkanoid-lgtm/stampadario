/**
 * ==========================================================================
 * STATE.JS - Gestione dello Stato, Sicurezza, Validazione e Persistenza
 * ==========================================================================
 * Questo modulo gestisce lo stato centrale dell'applicazione:
 * - Dati reattivi di configurazione (titolo, formato, periodo, colonne, festività)
 * - Sanitizzazione input rigorosa (Anti-XSS per sicurezza online)
 * - Validazione intervalli temporali (limite massimo a 24 mesi)
 * - Persistenza locale nel browser (LocalStorage con conformità GDPR)
 * - Esportazione e importazione sicura di file JSON e preset tematici
 */

window.CalendarApp = window.CalendarApp || {};

(function (App) {
  'use strict';

  const STORAGE_KEY = 'calendar_maker_v3_state';

  // --- STATO PREDEFINITO DELL'APPLICAZIONE ---
  const defaultState = {
    // 1. Intestazione del Calendario e Stile Testata
    calendarTitle: 'Planning Mensile',
    titleAlignment: 'left',                // 'left' (sinistra) oppure 'right' (destra)
    centerMonth: false,                    // true (mese centrato) oppure false (lato opposto)
    headerFont: 'Comfortaa',
    headerColor: '#111111',

    // 2. Formato Foglio e Impaginazione
    paperSize: 'A4',                       // 'A4' oppure 'A3'
    layoutMode: 'portrait-single',         // 'portrait-single', 'portrait-extended', 'landscape-biweekly', 'landscape-split', 'landscape-single'

    // 3. Periodo da Stampare
    periodMode: 'single',                  // 'single', 'year', 'range'
    month: new Date().getMonth(),          // 0-11
    year: new Date().getFullYear(),        // Anno corrente
    fullYear: new Date().getFullYear(),    // Anno per la modalità "Anno Intero"
    rangeStartMonth: new Date().getMonth(),
    rangeStartYear: new Date().getFullYear(),
    rangeEndMonth: (new Date().getMonth() + 2) % 12,
    rangeEndYear: new Date().getFullYear() + ((new Date().getMonth() + 2) >= 12 ? 1 : 0),

    // 4. Colonne Contenuti (Nome 100%, Sfondo, Testo con contrasto, Fattore larghezza a quarti)
    columns: [
      { id: 'col_1', name: 'Famiglia', color: '#f8bbd0', textColor: '#880e4f', factor: 1.0 },
      { id: 'col_2', name: 'Lavoro', color: '#b3e5fc', textColor: '#01579b', factor: 1.0 },
      { id: 'col_3', name: 'Appuntamenti', color: '#c8e6c9', textColor: '#1b5e20', factor: 1.0 },
      { id: 'col_4', name: 'Varie / Note', color: '#ffe0b2', textColor: '#e65100', factor: 1.0 }
    ],

    // 5. Grafica, Bordi e Modalità Cromatica
    colorMode: 'color',                    // 'color' (A Colori), 'monochrome' (Bianco e Nero)
    rowStyle: 'weekend',                   // 'striped' (Righe Alternate), 'weekend' (Evidenzia Finesettimana), 'neutral' (Neutro)
    verticalBorders: 'columns-only',       // 'columns-only', 'none'
    tableBorders: false,                   // true: mostra bordi perimetrali esterni della tabella; false: nessun bordo esterno
    repeatHeaders: false,                  // Ripetizione prima del Lunedì

    // 6. Festività Personalizzate (max 5)
    customHolidays: [],                    // Array di { id, month, day, name }

    // Visualizzazione anteprima
    zoomLevel: 1.0
  };

  // Creazione dello stato clonando i valori predefiniti
  App.state = JSON.parse(JSON.stringify(defaultState));

  // --- FUNZIONI DI SICUREZZA E SANITIZZAZIONE INPUT (ANTI-XSS) ---
  /**
   * Sanitizza qualsiasi stringa inserita dall'utente prima dell'inserimento nel DOM
   * Previene attacchi di tipo Cross-Site Scripting (XSS).
   * @param {string} str - Testo da sanificare
   * @param {number} maxLen - Lunghezza massima consentita
   * @returns {string} Stringa con caratteri HTML convertiti in entità sicure
   */
  App.sanitizeText = function (str, maxLen = 100) {
    if (typeof str !== 'string') return '';
    const trimmed = str.slice(0, maxLen);
    return trimmed
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  /**
   * Valida un codice colore esadecimale valido (#RRGGBB)
   * @param {string} hex - Codice colore
   * @returns {string} Codice valido o colore di fallback
   */
  App.validateHexColor = function (hex, fallback = '#111111') {
    if (typeof hex === 'string' && /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(hex)) {
      return hex;
    }
    return fallback;
  };

  /**
   * Calcola il colore di testo ideale (nero o bianco) per massimizzare il contrasto
   * in base alla luminanza percepita del colore di sfondo scelto (formula WCAG).
   * @param {string} hexColor - Colore di sfondo in formato #RRGGBB
   * @returns {string} '#000000' per sfondi chiari, '#ffffff' per sfondi scuri
   */
  App.getOptimalTextColor = function (hexColor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16) || 0;
    // Calcolo luminanza percepita ITU-R BT.709
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? '#000000' : '#ffffff';
  };

  // --- VALIDAZIONE DEL PERIODO DA/A (MASSIMO 24 MESI & TERMINE >= INIZIO) ---
  /**
   * Assicura che la data di termine sia successiva o uguale a quella di inizio
   * e che l'intervallo temporale non superi i 24 mesi consecutivi.
   */
  App.validateAndClampPeriod = function () {
    const sY = App.state.rangeStartYear;
    const sM = App.state.rangeStartMonth;
    let eY = App.state.rangeEndYear;
    let eM = App.state.rangeEndMonth;

    const startTotalMonths = sY * 12 + sM;
    let endTotalMonths = eY * 12 + eM;

    // Regola 1: il mese di termine deve essere successivo o uguale all'inizio
    if (endTotalMonths < startTotalMonths) {
      endTotalMonths = startTotalMonths;
    }

    // Regola 2: massimo 24 mesi consecutivi
    if (endTotalMonths - startTotalMonths >= 24) {
      endTotalMonths = startTotalMonths + 23;
    }

    App.state.rangeEndYear = Math.floor(endTotalMonths / 12);
    App.state.rangeEndMonth = endTotalMonths % 12;
  };

  /**
   * Calcola la lista dei mesi e relativi anni da generare per il rendering
   * @returns {Array<{month: number, year: number}>} Array dei mesi ordinati
   */
  App.getMonthsToRender = function () {
    const list = [];
    if (App.state.periodMode === 'year') {
      for (let m = 0; m < 12; m++) {
        list.push({ month: m, year: App.state.fullYear });
      }
    } else if (App.state.periodMode === 'range') {
      App.validateAndClampPeriod();
      const startTotal = App.state.rangeStartYear * 12 + App.state.rangeStartMonth;
      const endTotal = App.state.rangeEndYear * 12 + App.state.rangeEndMonth;
      for (let t = startTotal; t <= endTotal; t++) {
        list.push({
          year: Math.floor(t / 12),
          month: t % 12
        });
      }
    } else {
      // Mese singolo
      list.push({ month: App.state.month, year: App.state.year });
    }
    return list;
  };

  // --- PERSISTENZA LOCALSTORAGE (100% LOCALE, ZERO TRACCIAMENTO ESTERNO) ---
  App.saveStateToLocalStorage = function () {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(App.state));
    } catch (e) {
      console.warn('Impossibile salvare lo stato in LocalStorage:', e);
    }
  };

  App.loadStateFromLocalStorage = function () {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          // Applica i dati memorizzati aggiornando lo stato
          Object.assign(App.state, parsed);

          // Migrazione e validazione colorMode ('color' o 'monochrome')
          if (parsed.colorMode === 'monochrome' || parsed.colorMode === 'striped-gray') {
            App.state.colorMode = 'monochrome';
          } else {
            App.state.colorMode = 'color';
          }

          // Migrazione e validazione rowStyle ('striped', 'weekend', 'neutral')
          if (['striped', 'weekend', 'neutral'].includes(parsed.rowStyle)) {
            App.state.rowStyle = parsed.rowStyle;
          } else if (parsed.colorMode === 'striped-color' || parsed.colorMode === 'striped-gray') {
            App.state.rowStyle = 'striped';
          } else if (parsed.colorMode === 'gray-body') {
            App.state.rowStyle = 'neutral';
          } else {
            App.state.rowStyle = 'weekend';
          }

          if (App.state.verticalBorders === 'all') {
            App.state.verticalBorders = 'columns-only';
          }
          App.state.tableBorders = Boolean(App.state.tableBorders);
          // Verifica integrità colonne
          if (!Array.isArray(App.state.columns) || App.state.columns.length === 0) {
            App.state.columns = JSON.parse(JSON.stringify(defaultState.columns));
          }
          // Verifica periodo
          App.validateAndClampPeriod();
          return true;
        }
      }
    } catch (e) {
      console.warn('Errore nel ripristino da LocalStorage:', e);
    }
    return false;
  };

  App.clearLocalStorageData = function () {
    try {
      localStorage.removeItem(STORAGE_KEY);
      Object.assign(App.state, JSON.parse(JSON.stringify(defaultState)));
      return true;
    } catch (e) {
      return false;
    }
  };

  App.MAX_COLUMNS = 36;

  // --- ESPORTAZIONE E IMPORTAZIONE JSON SICURA ---
  /**
   * Genera ed avvia il salvataggio con nome del file JSON (con scelta cartella e nome)
   */
  App.exportStateToJson = async function () {
    const exportData = {
      app: 'CalendarioMakerPro',
      version: '3.1',
      exportedAt: new Date().toISOString(),
      state: App.state
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const safeTitle = (App.state.calendarTitle || 'calendario').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const defaultFileName = `config_${safeTitle}_${App.state.year}.json`;

    // 1. Prova prima con il server locale integrato con supporto alla finestra nativa Zenity (./avvia.sh)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('/api/save-native', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: defaultFileName, content: jsonStr }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.cancelled) return; // L'utente ha premuto Annulla nella finestra
        if (data.success) {
          alert(`Configurazione salvata con successo nella cartella scelta:\n${data.path}`);
          return;
        }
      }
    } catch (e) {
      // Server locale non attivo o non raggiungibile (es. app aperta direttamente via file://), proseguiamo
    }

    // 2. Prova con l'API nativa del browser showSaveFilePicker (disponibile in Chrome/Edge in contesti sicuri)
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: defaultFileName,
          types: [{
            description: 'File Configurazione Calendario JSON (*.json)',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(jsonStr);
        await writable.close();
        alert('Configurazione salvata con successo nella cartella scelta!');
        return;
      } catch (err) {
        if (err.name === 'AbortError') {
          // L'utente ha annullato la finestra di dialogo Salva con Nome
          return;
        }
        console.warn('showSaveFilePicker non riuscito, uso fallback:', err);
      }
    }

    // 3. Fallback per browser (Firefox o senza server locale):
    // Esegue il download diretto e pulito del file (senza prompt ingannevole)
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Mostra la finestra di spiegazione con le istruzioni semplici per Firefox
    if (typeof App.openFolderHelpModal === 'function') {
      App.openFolderHelpModal();
    }
  };

  /**
   * Importa e valida in modo sicuro un file JSON caricato dall'utente
   * @param {string} jsonString - Contenuto JSON da analizzare
   * @returns {{success: boolean, message: string}} Esito dell'operazione
   */
  App.importStateFromJson = function (jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      const incomingState = parsed.state || parsed;

      if (!incomingState || typeof incomingState !== 'object') {
        return { success: false, message: 'Struttura JSON non valida.' };
      }

      // Validazione e sanitizzazione campi
      if (typeof incomingState.calendarTitle === 'string') {
        App.state.calendarTitle = App.sanitizeText(incomingState.calendarTitle, 60);
      }
      if (['left', 'right'].includes(incomingState.titleAlignment)) {
        App.state.titleAlignment = incomingState.titleAlignment;
      }
      if (incomingState.centerMonth !== undefined) {
        App.state.centerMonth = Boolean(incomingState.centerMonth);
      }
      if (typeof incomingState.headerFont === 'string') {
        App.state.headerFont = incomingState.headerFont;
      }
      if (incomingState.headerColor) {
        App.state.headerColor = App.validateHexColor(incomingState.headerColor);
      }
      if (['A4', 'A3'].includes(incomingState.paperSize)) {
        App.state.paperSize = incomingState.paperSize;
      }
      if (['portrait-single', 'portrait-extended', 'landscape-biweekly', 'landscape-split', 'landscape-single'].includes(incomingState.layoutMode)) {
        App.state.layoutMode = incomingState.layoutMode;
      }
      if (['single', 'year', 'range'].includes(incomingState.periodMode)) {
        App.state.periodMode = incomingState.periodMode;
      }
      // Validazione e migrazione colorMode
      if (['color', 'monochrome'].includes(incomingState.colorMode)) {
        App.state.colorMode = incomingState.colorMode;
      } else if (incomingState.colorMode === 'striped-gray') {
        App.state.colorMode = 'monochrome';
      } else {
        App.state.colorMode = 'color';
      }

      // Validazione e migrazione rowStyle
      if (['striped', 'weekend', 'neutral'].includes(incomingState.rowStyle)) {
        App.state.rowStyle = incomingState.rowStyle;
      } else if (incomingState.colorMode === 'striped-color' || incomingState.colorMode === 'striped-gray') {
        App.state.rowStyle = 'striped';
      } else if (incomingState.colorMode === 'gray-body') {
        App.state.rowStyle = 'neutral';
      } else {
        App.state.rowStyle = 'weekend';
      }
      if (incomingState.verticalBorders === 'all') {
        App.state.verticalBorders = 'columns-only';
      } else if (['columns-only', 'none'].includes(incomingState.verticalBorders)) {
        App.state.verticalBorders = incomingState.verticalBorders;
      }
      if (incomingState.tableBorders !== undefined) {
        App.state.tableBorders = Boolean(incomingState.tableBorders);
      }
      if (incomingState.repeatHeaders !== undefined) {
        App.state.repeatHeaders = Boolean(incomingState.repeatHeaders);
      }

      // Colonne (limitate rigorosamente a MAX 36)
      if (Array.isArray(incomingState.columns) && incomingState.columns.length > 0) {
        App.state.columns = incomingState.columns.slice(0, App.MAX_COLUMNS).map((col, idx) => ({
          id: col.id || `col_${Date.now()}_${idx}`,
          name: App.sanitizeText(col.name || `Colonna ${idx + 1}`, 30),
          color: App.validateHexColor(col.color, '#b3e5fc'),
          textColor: col.textColor ? App.validateHexColor(col.textColor) : App.getOptimalTextColor(col.color || '#b3e5fc'),
          factor: [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].includes(col.factor) ? col.factor : 1.0
        }));
      }

      // Festività personalizzate
      if (Array.isArray(incomingState.customHolidays)) {
        App.state.customHolidays = incomingState.customHolidays.slice(0, 5).map((h, idx) => ({
          id: h.id || `cust_${Date.now()}_${idx}`,
          month: Math.max(0, Math.min(11, parseInt(h.month, 10) || 0)),
          day: Math.max(1, Math.min(31, parseInt(h.day, 10) || 1)),
          name: App.sanitizeText(h.name || 'Festa locale', 40)
        }));
      }

      App.validateAndClampPeriod();
      App.saveStateToLocalStorage();
      return { success: true, message: 'Configurazione caricata con successo!' };
    } catch (e) {
      return { success: false, message: 'Errore di decodifica JSON: il file è corrotto.' };
    }
  };

  /**
   * Importa ESCLUSIVAMENTE un tema cromatico (palette e font)
   * SENZA sovrascrivere o alterare i nomi delle colonne, le festività o i testi dell'utente.
   * @param {object} preset - Oggetto preset tematico
   */
  App.applyThemePreset = function (preset) {
    if (!preset || !Array.isArray(preset.columns)) return;

    if (preset.headerColor) {
      App.state.headerColor = preset.headerColor;
    }

    // Applica i colori mantenendo i nomi esistenti delle colonne dell'utente
    App.state.columns.forEach((col, idx) => {
      const themeCol = preset.columns[idx % preset.columns.length];
      if (themeCol) {
        col.color = themeCol.color;
        col.textColor = themeCol.textColor || App.getOptimalTextColor(themeCol.color);
      }
    });

    App.saveStateToLocalStorage();
  };

})(window.CalendarApp);
