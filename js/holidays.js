/**
 * ==========================================================================
 * HOLIDAYS.JS - Calcolo Festività Nazionali, Pasqua e Festività Utente
 * ==========================================================================
 * Questo modulo calcola accuratamente tutte le festività applicabili al calendario:
 * - Algoritmo astronomico di Butcher per il computo di Pasqua e Lunedì dell'Angelo
 * - Festività nazionali fisse italiane (compreso il 4 Ottobre, San Francesco d'Assisi, L. 151/2025)
 * - Festività patronali e personalizzate impostate dall'utente (max 5)
 * - Calcolo delle sfumature per giorni feriali, sabati e domeniche/festivi
 * - Supporto per le 3 modalità cromatiche (A Colori, Corpo Grigio, Bianco e Nero)
 */

window.CalendarApp = window.CalendarApp || {};

(function (App) {
  'use strict';

  /**
   * Calcola la data esatta della Domenica di Pasqua per un dato anno
   * utilizzando l'algoritmo di Meeus/Jones/Butcher per il calendario gregoriano.
   * @param {number} year - Anno di riferimento
   * @returns {{month: number, day: number}} Mese (0-11) e giorno della Pasqua
   */
  App.getEasterDate = function (year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-based: 2=Marzo, 3=Aprile
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return { month, day };
  };

  /**
   * Restituisce la mappa completa di tutte le festività per un determinato anno
   * @param {number} year - Anno
   * @returns {Map<string, {name: string, isCustom: boolean}>} Mappa indicizzata per 'MM-DD'
   */
  App.getHolidaysForYear = function (year) {
    const holidaysMap = new Map();

    // 1. Festività nazionali fisse italiane
    App.FIXED_HOLIDAYS.forEach(h => {
      const key = `${h.month}-${h.day}`;
      holidaysMap.set(key, { name: h.name, isCustom: false });
    });

    // 2. Pasqua e Lunedì dell'Angelo (Pasquetta)
    const easter = App.getEasterDate(year);
    holidaysMap.set(`${easter.month}-${easter.day}`, { name: 'Pasqua', isCustom: false });

    // Lunedì dell'Angelo: giorno successivo a Pasqua
    const easterMondayDate = new Date(year, easter.month, easter.day + 1);
    holidaysMap.set(
      `${easterMondayDate.getMonth()}-${easterMondayDate.getDate()}`,
      { name: 'Lunedì dell\'Angelo (Pasquetta)', isCustom: false }
    );

    // 3. Festività personalizzate inserite dall'utente
    if (Array.isArray(App.state.customHolidays)) {
      App.state.customHolidays.forEach(ch => {
        const key = `${ch.month}-${ch.day}`;
        // Se coincide con una nazionale, il nome utente si affianca o prevale
        holidaysMap.set(key, {
          name: ch.name || 'Festività Utente',
          isCustom: true
        });
      });
    }

    return holidaysMap;
  };

  /**
   * Converte un colore esadecimale in valori RGB
   * @param {string} hex - Colore hex (#RRGGBB o #RGB)
   * @returns {{r: number, g: number, b: number}}
   */
  App.hexToRgb = function (hex) {
    let cleanHex = (hex || '#000000').replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const num = parseInt(cleanHex, 16) || 0;
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  };

  /**
   * Calcola il colore di sfondo della cella in base al giorno, festività, riga e modalità cromatica
   * - A Colori: desaturazione e schiaritura della tinta della colonna
   * - Righe Alternate a Colori: alternanza riga chiara (feriale) e scura (sabato); festivi riconosciuti da font data
   * - Righe Alternate in Grigio: alternanza bianco e grigio ultra-chiaro desaturato per scrittura a penna
   * - Corpo Grigio: celle feriali bianche, sabati e festivi con grigi chiarissimi desaturati
   * - Bianco e Nero: bianco per feriali, grigi neutri chiarissimi per weekend/festivi
   * @param {string} colHex - Colore di base della colonna
   * @param {number} dayOfWeek - Giorno della settimana (0 = domenica, 6 = sabato)
   * @param {boolean} isHoliday - Se il giorno è festivo
   * @param {number} rowIndex - Indice progressivo della riga nel foglio (per le righe alternate)
   * @returns {string} Codice colore CSS esatto
   */
  App.getCellBackgroundColor = function (colHex, dayOfWeek, isHoliday, rowIndex = 0) {
    const isSunday = (dayOfWeek === 0);
    const isSaturday = (dayOfWeek === 6);
    const isRedDay = isSunday || isHoliday; // Se festivo, ha sempre priorità sul sabato
    const isEvenRow = (rowIndex % 2 === 0);

    // --- MODALITÀ I: RIGHE ALTERNATE A COLORI ---
    // Le righe si alternano tra il colore feriale chiaro e quello del sabato più scuro.
    // I festivi e i sabati si riconoscono per il colore del font nella colonna data.
    if (App.state.colorMode === 'striped-color') {
      const { r, g, b } = App.hexToRgb(colHex);
      if (isEvenRow) {
        // Riga chiara (tinta feriale 7% colore + 93% bianco)
        const mixR = Math.round(r * 0.07 + 255 * 0.93);
        const mixG = Math.round(g * 0.07 + 255 * 0.93);
        const mixB = Math.round(b * 0.07 + 255 * 0.93);
        return `rgb(${mixR}, ${mixG}, ${mixB})`;
      } else {
        // Riga più scura (tinta sabato 14% colore + 86% bianco)
        const mixR = Math.round(r * 0.14 + 255 * 0.86);
        const mixG = Math.round(g * 0.14 + 255 * 0.86);
        const mixB = Math.round(b * 0.14 + 255 * 0.86);
        return `rgb(${mixR}, ${mixG}, ${mixB})`;
      }
    }

    // --- MODALITÀ II: RIGHE ALTERNATE IN GRIGIO ---
    // Alternanza bianco e grigio ultra-chiaro desaturato, ideale per scrittura a penna
    if (App.state.colorMode === 'striped-gray') {
      if (isEvenRow) {
        return '#ffffff'; // Bianco puro
      } else {
        return '#f1f5f9'; // Grigio Slate-100 ultra-chiaro (luminosità 96%)
      }
    }

    // --- MODALITÀ III: CORPO GRIGIO NEUTRO (DESATURATO & LUMINOSO PER PENNA) ---
    if (App.state.colorMode === 'gray-body') {
      if (isRedDay) return '#e2e8f0';    // Grigio festivo tenue (Slate-200, 90% luminosità)
      if (isSaturday) return '#f8fafc';  // Grigio sabato chiarissimo (Slate-50, 98% luminosità)
      return '#ffffff';                  // Bianco lavorativo
    }

    // --- MODALITÀ IV: BIANCO E NERO (Laser monochrome / fotocopie) ---
    if (App.state.colorMode === 'monochrome') {
      if (isRedDay) return '#e2e8f0';    // Grigio festivo tenue
      if (isSaturday) return '#f1f5f9';  // Grigio chiaro sabato
      return '#ffffff';                  // Bianco puro per i giorni lavorativi
    }

    // --- MODALITÀ V: A COLORI CLASSICO (Predefinita con tinte pastello) ---
    const { r, g, b } = App.hexToRgb(colHex);

    if (isRedDay) {
      // Domenica o festivo: miscela 22% colore + 78% bianco
      const mixR = Math.round(r * 0.22 + 255 * 0.78);
      const mixG = Math.round(g * 0.22 + 255 * 0.78);
      const mixB = Math.round(b * 0.22 + 255 * 0.78);
      return `rgb(${mixR}, ${mixG}, ${mixB})`;
    } else if (isSaturday) {
      // Sabato: miscela 14% colore + 86% bianco
      const mixR = Math.round(r * 0.14 + 255 * 0.86);
      const mixG = Math.round(g * 0.14 + 255 * 0.86);
      const mixB = Math.round(b * 0.14 + 255 * 0.86);
      return `rgb(${mixR}, ${mixG}, ${mixB})`;
    } else {
      // Giorni lavorativi (Lun - Ven): miscela 7% colore + 93% bianco (perfetto per scrittura a penna)
      const mixR = Math.round(r * 0.07 + 255 * 0.93);
      const mixG = Math.round(g * 0.07 + 255 * 0.93);
      const mixB = Math.round(b * 0.07 + 255 * 0.93);
      return `rgb(${mixR}, ${mixG}, ${mixB})`;
    }
  };

  /**
   * Determina il colore di sfondo della cella DATA (prima colonna)
   * @param {number} dayOfWeek - Giorno della settimana
   * @param {boolean} isHoliday - Se è festivo
   * @param {number} rowIndex - Indice di riga progressivo
   * @returns {string} Codice colore esadecimale o rgba
   */
  App.getDateCellBackground = function (dayOfWeek, isHoliday, rowIndex = 0) {
    const isSunday = (dayOfWeek === 0);
    const isSaturday = (dayOfWeek === 6);
    const isRedDay = isSunday || isHoliday;
    const isEvenRow = (rowIndex % 2 === 0);

    // Nelle modalità a righe alternate, la cella data segue l'alternanza
    if (App.state.colorMode === 'striped-color' || App.state.colorMode === 'striped-gray') {
      return isEvenRow ? '#ffffff' : '#f1f5f9';
    }

    if (App.state.colorMode === 'monochrome' || App.state.colorMode === 'gray-body') {
      if (isRedDay) return '#e2e8f0';
      if (isSaturday) return '#f8fafc';
      return '#ffffff';
    }

    if (isRedDay) {
      return 'rgba(211, 47, 47, 0.09)'; // Leggera sfumatura rossa trasparente
    } else if (isSaturday) {
      return 'rgba(211, 47, 47, 0.035)'; // Sfumatura sabato appena accennata
    }
    return '#ffffff';
  };

  /**
   * Determina il colore del testo della data (numero e nome giorno) ad inizio riga
   * - Feriali: nero (#0f172a)
   * - Sabati non festivi: via di mezzo tra nero e rosso (#991b1b)
   * - Domeniche e Festivi: rosso (#d32f2f)
   * - Fuori mese in Verticale Estesa: grigio (#94a3b8) anche se sabato o domenica
   * @param {number} dayOfWeek - 0=Dom, 6=Sab
   * @param {boolean} isHoliday - Se festivo
   * @param {boolean} isOutsideMonth - Se appartiene al mese precedente o successivo
   * @param {boolean} isExtendedLayout - Se è attiva la modalità Verticale Estesa
   * @returns {string} Codice colore esadecimale
   */
  App.getDateTextColor = function (dayOfWeek, isHoliday, isOutsideMonth = false, isExtendedLayout = false) {
    if (isExtendedLayout && isOutsideMonth) {
      return App.DATE_COLORS ? App.DATE_COLORS.outsideMonth : '#94a3b8';
    }
    const isSunday = (dayOfWeek === 0);
    const isSaturday = (dayOfWeek === 6);
    if (isSunday || isHoliday) {
      return App.DATE_COLORS ? App.DATE_COLORS.holiday : '#d32f2f';
    }
    if (isSaturday) {
      return App.DATE_COLORS ? App.DATE_COLORS.saturday : '#991b1b';
    }
    return App.DATE_COLORS ? App.DATE_COLORS.workday : '#0f172a';
  };

})(window.CalendarApp);
