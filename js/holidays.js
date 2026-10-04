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
    const isRedDay = isSunday || isHoliday; // Se festivo, ha sempre priorità sul sabato (sabati festivi come festivi)
    const isEvenRow = (rowIndex % 2 === 0);
    const isMonochrome = (App.state.colorMode === 'monochrome');
    const rowStyle = App.state.rowStyle || 'weekend';

    // 1. NEUTRO: lascia tutti gli sfondi bianchi anche nella colonna della data ma lascia l'intestazione
    if (rowStyle === 'neutral') {
      return '#ffffff';
    }

    // 2. RIGHE ALTERNATE: alternarsi di righe chiare e scure
    if (rowStyle === 'striped') {
      if (isMonochrome) {
        return isEvenRow ? '#ffffff' : '#f1f5f9';
      } else {
        const { r, g, b } = App.hexToRgb(colHex);
        if (isEvenRow) {
          // Riga chiara (tinta 7% colore + 93% bianco)
          const mixR = Math.round(r * 0.07 + 255 * 0.93);
          const mixG = Math.round(g * 0.07 + 255 * 0.93);
          const mixB = Math.round(b * 0.07 + 255 * 0.93);
          return `rgb(${mixR}, ${mixG}, ${mixB})`;
        } else {
          // Riga scura (tinta 16% colore + 84% bianco)
          const mixR = Math.round(r * 0.16 + 255 * 0.84);
          const mixG = Math.round(g * 0.16 + 255 * 0.84);
          const mixB = Math.round(b * 0.16 + 255 * 0.84);
          return `rgb(${mixR}, ${mixG}, ${mixB})`;
        }
      }
    }

    // 3. EVIDENZIA IL FINESETTIMANA:
    // sabato un po' piu scuro, domenica e festivi ancora un po' piu scuri, sabati festivi come festivi
    if (isMonochrome) {
      if (isRedDay) return '#e2e8f0';    // Domenica e festivi (inclusi sabati festivi)
      if (isSaturday) return '#f1f5f9';  // Sabato non festivo
      return '#ffffff';                  // Feriali
    } else {
      const { r, g, b } = App.hexToRgb(colHex);
      if (isRedDay) {
        // Domenica e festivi (inclusi sabati festivi): miscela 22% colore + 78% bianco
        const mixR = Math.round(r * 0.22 + 255 * 0.78);
        const mixG = Math.round(g * 0.22 + 255 * 0.78);
        const mixB = Math.round(b * 0.22 + 255 * 0.78);
        return `rgb(${mixR}, ${mixG}, ${mixB})`;
      } else if (isSaturday) {
        // Sabato non festivo: miscela 13% colore + 87% bianco (un po' più scuro)
        const mixR = Math.round(r * 0.13 + 255 * 0.87);
        const mixG = Math.round(g * 0.13 + 255 * 0.87);
        const mixB = Math.round(b * 0.13 + 255 * 0.87);
        return `rgb(${mixR}, ${mixG}, ${mixB})`;
      } else {
        // Feriali (Lun - Ven non festivi): miscela 6% colore + 94% bianco (chiaro per scrittura)
        const mixR = Math.round(r * 0.06 + 255 * 0.94);
        const mixG = Math.round(g * 0.06 + 255 * 0.94);
        const mixB = Math.round(b * 0.06 + 255 * 0.94);
        return `rgb(${mixR}, ${mixG}, ${mixB})`;
      }
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
    const isMonochrome = (App.state.colorMode === 'monochrome');
    const rowStyle = App.state.rowStyle || 'weekend';

    // 1. NEUTRO: tutti gli sfondi bianchi anche nella colonna della data
    if (rowStyle === 'neutral') {
      return '#ffffff';
    }

    // 2. RIGHE ALTERNATE: la cella data segue l'alternanza
    if (rowStyle === 'striped') {
      return isEvenRow ? '#ffffff' : '#f1f5f9';
    }

    // 3. EVIDENZIA IL FINESETTIMANA:
    if (isMonochrome) {
      if (isRedDay) return '#e2e8f0';    // Festivi (inclusi sabati festivi)
      if (isSaturday) return '#f8fafc';  // Sabato non festivo
      return '#ffffff';                  // Feriali
    } else {
      if (isRedDay) {
        return 'rgba(211, 47, 47, 0.09)'; // Festivi (inclusi sabati festivi)
      } else if (isSaturday) {
        return 'rgba(211, 47, 47, 0.035)'; // Sabato non festivo
      }
      return '#ffffff';
    }
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
    const isMonochrome = (App.state.colorMode === 'monochrome');
    if (isMonochrome) {
      return '#0f172a';
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
