/**
 * ==========================================================================
 * CALENDAR.JS - Motore di Generazione e Rendering della Griglia di Stampa
 * ==========================================================================
 * Questo modulo è responsabile della costruzione HTML della griglia del calendario:
 * - Calcolo delle larghezze a quarti per le colonne (da 0.5x a 2.0x)
 * - Layout Verticale a foglio singolo (A4/A3)
 * - Layout Orizzontale a 2 Fogli (1-15 e 16-fine mese)
 * - Layout Orizzontale Bisettimanale (2 settimane per foglio, 14 giorni esatti da Lun a Dom)
 *   con gestione dei giorni cuscinetto del mese precedente/successivo in grigio tenue
 * - Spazio bianco di separazione tra le settimane e sotto le intestazioni
 * - Rimozione del bordo destro esterno e supporto per le modalità cromatiche
 */

window.CalendarApp = window.CalendarApp || {};

(function (App) {
  'use strict';

  /**
   * Genera il template CSS Grid delle colonne in base alle proporzioni a quarti
   * @param {string} layoutMode - Modalità di layout corrente
   * @returns {string} Stringa css per grid-template-columns
   */
  App.buildGridColumnsTemplate = function (layoutMode) {
    // La colonna data ha larghezza minima ottimizzata (40px su foglio normale)
    const dateWidth = layoutMode.startsWith('landscape') ? '44px' : '40px';
    const cols = App.state.columns;

    if (!cols || cols.length === 0) {
      return `${dateWidth} 1fr`;
    }

    // Calcolo a quarti di colonna (fattore * 4) per assegnare i fr a CSS Grid
    const frParts = cols.map(c => {
      const q = Math.round((c.factor || 1.0) * 4);
      return `${q}fr`;
    }).join(' ');

    return `${dateWidth} ${frParts}`;
  };

  /**
   * Genera l'HTML dell'intestazione principale in cima a ciascun foglio
   * Nome del Calendario e Nome del Mese hanno LA STESSA DIMENSIONE del carattere
   * @param {string} monthTitle - Titolo del mese/anno (es. "Ottobre 2026")
   * @param {string|null} subTitle - Eventuale dicitura del foglio (es. "Settimane 40 - 41")
   * @returns {string} Markup HTML dell'header del foglio
   */
  App.buildSheetHeaderHtml = function (monthTitle, subTitle = null) {
    const rawTitle = (App.state.calendarTitle || '').trim();
    const calendarName = rawTitle ? App.sanitizeText(rawTitle, 60) : '';
    const fontObj = App.FONT_CATALOG.find(f => f.id === App.state.headerFont);
    const fontFamily = fontObj ? fontObj.family : "'Inter', sans-serif";
    const headerColor = App.state.headerColor || '#111111';

    const titleAlign = App.state.titleAlignment || 'left';
    const centerMonth = Boolean(App.state.centerMonth);

    const nameHtml = calendarName
      ? `<span class="sheet-calendar-name">${calendarName}</span>`
      : '';

    const monthHtml = `
      <div class="sheet-month-wrap">
        <span class="sheet-month-name">${monthTitle}</span>
        ${subTitle ? `<span class="sheet-subtitle-badge">${subTitle}</span>` : ''}
      </div>
    `;

    let leftSlot = '';
    let centerSlot = '';
    let rightSlot = '';

    if (centerMonth) {
      centerSlot = monthHtml;
      if (titleAlign === 'left') {
        leftSlot = nameHtml;
      } else {
        rightSlot = nameHtml;
      }
    } else {
      if (titleAlign === 'left') {
        leftSlot = nameHtml;
        rightSlot = monthHtml;
      } else {
        leftSlot = monthHtml;
        rightSlot = nameHtml;
      }
    }

    return `
      <header class="sheet-header" style="font-family: ${fontFamily}; color: ${headerColor};">
        <div class="sheet-header-left">${leftSlot}</div>
        <div class="sheet-header-center">${centerSlot}</div>
        <div class="sheet-header-right">${rightSlot}</div>
      </header>
    `;
  };

  /**
   * Genera l'HTML della riga di intestazione delle colonne (Data + Colonne utente)
   * @param {boolean} isRepeatRow - Se è una riga di ripetizione settimanale (lunedì)
   * @returns {string} Markup celle intestazione
   */
  App.buildHeaderRowCellsHtml = function (isRepeatRow = false) {
    const isMonochrome = (App.state.colorMode === 'monochrome');
    let html = '';

    // Cella angolo Data: la prima cella in alto a sinistra non ha formattazione né bordi né sfondo
    if (isRepeatRow) {
      html += `<div class="grid-cell grid-cell-repeat-header-corner"></div>`;
    } else {
      html += `<div class="grid-cell grid-cell-corner-empty"></div>`;
    }

    // Celle per ciascuna colonna utente
    App.state.columns.forEach((col, idx) => {
      const colName = App.sanitizeText(col.name || `Colonna ${idx + 1}`, 30);
      const bg = isMonochrome ? '#475569' : (col.color || '#3b82f6');
      const text = isMonochrome ? '#ffffff' : (col.textColor || App.getOptimalTextColor(bg));
      const cellClass = isRepeatRow ? 'grid-cell-repeat-header-col' : 'grid-cell-col-header';
      const isLastCol = (idx === App.state.columns.length - 1);
      const colClass = isLastCol ? ' is-last-col-cell' : '';

      html += `
        <div class="grid-cell ${cellClass}${colClass}"
             data-col-index="${idx}"
             style="background-color: ${bg}; color: ${text};">
          <span class="col-header-text">${colName}</span>
        </div>
      `;
    });

    return html;
  };

  /**
   * Genera l'HTML di una singola riga giorno del calendario
   * - Regola colori data: feriali nero, sabati via di mezzo (#991b1b), domeniche e festivi rosso
   * - Fuori mese in Verticale Estesa: data grigia (#94a3b8), celle mantengono i colori scelti
   * - Orizzontale Bisettimanale: celle mantengono sempre i colori scelti (nessun grigio forzato)
   * - Festività utente: formattazione identica alla domenica senza grassetto
   * @param {object} dayData - Oggetto giorno
   * @param {number} rowIndex - Indice progressivo della riga nel foglio
   * @param {boolean} isLastRow - Se è l'ultima riga del foglio
   * @returns {string} Markup celle della riga
   */
  App.buildDayRowCellsHtml = function (dayData, rowIndex = 0, isLastRow = false) {
    const {
      year, month, day, dayOfWeek, isOutsideMonth,
      isHoliday, holidayName
    } = dayData;

    const dayShortName = App.DAY_SHORT_NAMES[dayOfWeek];
    const isSunday = (dayOfWeek === 0);
    const isSaturday = (dayOfWeek === 6);
    const isRedDay = isSunday || isHoliday;
    const isExtendedLayout = (App.state.layoutMode === 'portrait-extended');

    let rowClass = '';
    if (isSunday) rowClass += ' is-sunday';
    if (isLastRow) rowClass += ' is-last-row-cell';

    // 1. Cella DATA (Giorno abbreviato + Numero)
    const dateTextColor = App.getDateTextColor(dayOfWeek, isHoliday, isOutsideMonth, isExtendedLayout);
    const dateBg = App.getDateCellBackground(dayOfWeek, isHoliday, rowIndex);

    const dateCellHtml = `
      <div class="grid-cell grid-cell-date ${isRedDay ? 'is-holiday' : ''} ${rowClass}"
           style="background-color: ${dateBg};"
           title="${isHoliday ? holidayName : ''}">
        <span class="date-day-name" style="color: ${dateTextColor};">${dayShortName}</span>
        <span class="date-day-num" style="color: ${dateTextColor};">${day}</span>
      </div>
    `;

    // 2. Celle CONTENUTI per ciascuna colonna: mantengono SEMPRE i colori scelti dall'utente
    let dataCellsHtml = '';
    App.state.columns.forEach((col, colIdx) => {
      const cellBg = App.getCellBackgroundColor(col.color, dayOfWeek, isHoliday, rowIndex);
      const isLastCol = (colIdx === App.state.columns.length - 1);
      const colClass = isLastCol ? ' is-last-col-cell' : '';
      dataCellsHtml += `
        <div class="grid-cell grid-cell-data ${rowClass}${colClass}" style="background-color: ${cellBg};"></div>
      `;
    });

    return dateCellHtml + dataCellsHtml;
  };

  /**
   * Renderizza un singolo foglio generico con un elenco specifico di giorni
   * @param {HTMLElement} sheetContainer - Elemento DOM del foglio
   * @param {string} monthTitle - Titolo visibile in testata
   * @param {string|null} subTitle - Eventuale sottotitolo (es. bisettimanale o quindicinale)
   * @param {Array<object>} daysArray - Array dei giorni da mostrare
   * @param {boolean} allowWeeklyHeaders - Se inserire ripetizioni il lunedì
   */
  App.renderSheetWithDays = function (sheetContainer, monthTitle, subTitle, daysArray, allowWeeklyHeaders = true) {
    const gridColsTemplate = App.buildGridColumnsTemplate(App.state.layoutMode);
    const headerHtml = App.buildSheetHeaderHtml(monthTitle, subTitle);

    let gridCellsHtml = App.buildHeaderRowCellsHtml(false);
    let totalRows = 1; // 1 riga per l'intestazione principale

    daysArray.forEach((dayData, idx) => {
      // Se richiesta la ripetizione settimanale prima del lunedì
      if (allowWeeklyHeaders && App.state.repeatHeaders && dayData.dayOfWeek === 1 && idx > 0) {
        gridCellsHtml += App.buildHeaderRowCellsHtml(true);
        totalRows++;
      }
      const isLastRow = (idx === daysArray.length - 1);
      gridCellsHtml += App.buildDayRowCellsHtml(dayData, idx, isLastRow);
      totalRows++;
    });

    // Calcolo dinamico della densità per garantire il perfetto riempimento dello spazio al 100% senza strabordare
    const isLandscape = App.state.layoutMode.startsWith('landscape');
    const isA3 = (App.state.paperSize === 'A3');
    const netGridHeight = isA3 ? (isLandscape ? 1040 : 1480) : (isLandscape ? 710 : 1030);
    const avgRowHeight = netGridHeight / totalRows;

    let densityClass = 'density-normal';
    if (avgRowHeight >= 42) {
      densityClass = 'density-spacious';
    } else if (avgRowHeight >= 30) {
      densityClass = 'density-normal';
    } else if (avgRowHeight >= 23) {
      densityClass = 'density-compact';
    } else {
      densityClass = 'density-ultra-compact';
    }

    sheetContainer.classList.remove('density-spacious', 'density-normal', 'density-compact', 'density-ultra-compact');
    sheetContainer.classList.add(densityClass);

    // Spazio bianco di 4.5px sotto l'intestazione se NON ripetute ogni settimana
    const whiteSepClass = (!App.state.repeatHeaders) ? 'headers-white-separator' : '';

    sheetContainer.innerHTML = `
      ${headerHtml}
      <div class="calendar-grid-container border-v-${App.state.verticalBorders} ${whiteSepClass} ${densityClass}">
        <div class="calendar-grid" style="
          grid-template-columns: ${gridColsTemplate};
          grid-template-rows: auto repeat(${totalRows - 1}, minmax(0, 1fr));
        ">
          ${gridCellsHtml}
        </div>
      </div>
    `;

    // Aggiungi click handler per aprire il pop-up rapido al tocco sulle intestazioni delle colonne
    sheetContainer.querySelectorAll('.grid-cell-col-header, .grid-cell-repeat-header-col').forEach(headerEl => {
      headerEl.addEventListener('click', (e) => {
        const cIdx = parseInt(e.currentTarget.dataset.colIndex, 10);
        if (!isNaN(cIdx)) {
          if (App.focusSection) App.focusSection('secColumnsConfig');
          if (App.openUniversalColorModal) App.openUniversalColorModal('colBg', cIdx);
        }
      });
    });

    // Cliccando sul nome del calendario nella testata del foglio si apre e focalizza esclusivamente la Sezione 1
    const calNameEl = sheetContainer.querySelector('.sheet-calendar-name');
    if (calNameEl) {
      calNameEl.title = 'Clicca per modificare il Nome del Calendario';
      calNameEl.addEventListener('click', () => {
        if (App.focusSection) App.focusSection('secCalendarTitle');
        const input = document.getElementById('inputCalendarTitle');
        if (input) input.focus();
      });
    }

    // Cliccando sul nome del mese nella testata del foglio si apre la sezione Periodo da Stampare
    const monthNameEl = sheetContainer.querySelector('.sheet-month-name');
    if (monthNameEl) {
      monthNameEl.title = 'Clicca per modificare il Periodo da Stampare';
      monthNameEl.addEventListener('click', () => {
        if (App.focusSection) App.focusSection('secPrintPeriod');
      });
    }
  };

  /**
   * ========================================================================
   * GENERAZIONE DEL LAYOUT BISETTIMANALE CONTINUO (2 Settimane per Foglio)
   * ========================================================================
   * Copre l'intero periodo scelto dall'utente:
   * - Inizia dall'ultimo lunedì del mese precedente se il 1° giorno non è lunedì
   * - Finisce l'ultima settimana con i giorni del mese successivo fino alla domenica
   * - MANTIENE I COLORI DEL CALENDARIO SCELTI DALL'UTENTE (nessun grigio forzato)
   */
  App.generateBiweeklySheetsForPeriod = function (monthsList) {
    if (!monthsList || monthsList.length === 0) return [];

    const firstM = monthsList[0];
    const lastM = monthsList[monthsList.length - 1];

    // Data di inizio periodo: 1° giorno del primo mese
    const firstDate = new Date(firstM.year, firstM.month, 1);
    const firstDayOfWeek = firstDate.getDay();
    const daysBeforeMonday = (firstDayOfWeek === 0) ? 6 : (firstDayOfWeek - 1);
    const startDate = new Date(firstM.year, firstM.month, 1 - daysBeforeMonday);

    // Data di fine periodo: ultimo giorno dell'ultimo mese
    const lastDate = new Date(lastM.year, lastM.month + 1, 0);
    const lastDayOfWeek = lastDate.getDay();
    const daysAfterSunday = (lastDayOfWeek === 0) ? 0 : (7 - lastDayOfWeek);
    const endDate = new Date(lastM.year, lastM.month, lastDate.getDate() + daysAfterSunday);

    // Mappa cache per le festività degli anni coinvolti
    const holidaysCache = new Map();
    function getCachedHolidays(y) {
      if (!holidaysCache.has(y)) {
        holidaysCache.set(y, App.getHolidaysForYear(y));
      }
      return holidaysCache.get(y);
    }

    const allDays = [];
    let curDate = new Date(startDate);

    while (curDate <= endDate) {
      const curY = curDate.getFullYear();
      const curM = curDate.getMonth();
      const curD = curDate.getDate();
      const curW = curDate.getDay();

      const hMap = getCachedHolidays(curY);
      const hInfo = hMap.get(`${curM}-${curD}`);

      allDays.push({
        year: curY,
        month: curM,
        day: curD,
        dayOfWeek: curW,
        isOutsideMonth: false, // Nei bisettimanali le celle mantengono sempre i colori scelti dall'utente
        isHoliday: Boolean(hInfo),
        holidayName: hInfo ? hInfo.name : '',
        isCustomHoliday: Boolean(hInfo && hInfo.isCustom)
      });

      curDate.setDate(curDate.getDate() + 1);
    }

    // Assicura che i giorni totali siano multipli esatti di 14 (fogli da 2 settimane complete)
    while (allDays.length % 14 !== 0) {
      const lastItem = allDays[allDays.length - 1];
      const nextDate = new Date(lastItem.year, lastItem.month, lastItem.day + 1);
      const cY = nextDate.getFullYear();
      const cM = nextDate.getMonth();
      const cD = nextDate.getDate();
      const cW = nextDate.getDay();
      const hMap = getCachedHolidays(cY);
      const hInfo = hMap.get(`${cM}-${cD}`);
      allDays.push({
        year: cY,
        month: cM,
        day: cD,
        dayOfWeek: cW,
        isOutsideMonth: false,
        isHoliday: Boolean(hInfo),
        holidayName: hInfo ? hInfo.name : '',
        isCustomHoliday: Boolean(hInfo && hInfo.isCustom)
      });
    }

    // Suddivisione in blocchi da 14 giorni esatti
    const biweeklySheets = [];
    for (let i = 0; i < allDays.length; i += 14) {
      const chunk = allDays.slice(i, i + 14);
      const monthsInChunk = [];
      chunk.forEach(d => {
        const key = `${App.MONTH_NAMES[d.month]} ${d.year}`;
        if (!monthsInChunk.includes(key)) monthsInChunk.push(key);
      });
      const title = monthsInChunk.join(' - ');

      biweeklySheets.push({
        days: chunk,
        title: title
      });
    }

    return biweeklySheets;
  };

  /**
   * ========================================================================
   * GENERAZIONE GENERALE DEI FOGLI (Multi-mese, Periodi e Formati Carta)
   * ========================================================================
   */
  App.renderAllCalendarSheets = function () {
    const sheetsWrapper = document.getElementById('sheetsWrapper');
    if (!sheetsWrapper) return;
    sheetsWrapper.innerHTML = '';

    const monthsToRender = App.getMonthsToRender();
    const isLandscape = App.state.layoutMode.startsWith('landscape');
    const sheetSizeClass = `size-${App.state.paperSize.toLowerCase()}-${isLandscape ? 'landscape' : 'portrait'}`;
    const layoutMode = App.state.layoutMode;

    let totalSheets = 0;

    // --- CASO SPECIALE: ORIZZONTALE BISETTIMANALE CONTINUO SULL'INTERO PERIODO ---
    if (layoutMode === 'landscape-biweekly') {
      const biSheets = App.generateBiweeklySheetsForPeriod(monthsToRender);

      biSheets.forEach((sheetObj, sIdx) => {
        totalSheets++;
        const isAbsoluteLastSheet = (sIdx === biSheets.length - 1);
        const sheetDiv = document.createElement('div');
        sheetDiv.className = `print-sheet ${sheetSizeClass} ${!isAbsoluteLastSheet ? 'page-break-after' : ''}`;

        const subTitle = `Foglio ${sIdx + 1} di ${biSheets.length} (2 Settimane)`;
        App.renderSheetWithDays(sheetDiv, sheetObj.title, subTitle, sheetObj.days, true);
        sheetsWrapper.appendChild(sheetDiv);
      });

      const badgeSheetsCount = document.getElementById('badgeSheetsCount');
      if (badgeSheetsCount) {
        badgeSheetsCount.textContent = `${totalSheets} ${totalSheets === 1 ? 'Foglio' : 'Fogli'}`;
      }
      return;
    }

    // --- ALTRI FORMATI (RENDERIZZATI MESE PER MESE) ---
    monthsToRender.forEach((mObj, mIdx) => {
      const isLastMonth = (mIdx === monthsToRender.length - 1);
      const monthTitle = `${App.MONTH_NAMES[mObj.month]} ${mObj.year}`;
      const holidaysMap = App.getHolidaysForYear(mObj.year);
      const daysInMonth = new Date(mObj.year, mObj.month + 1, 0).getDate();

      // --- CASO: VERTICALE ESTESA (Mese a Pagina Singola da Lunedì a Domenica) ---
      if (layoutMode === 'portrait-extended') {
        totalSheets++;
        const isAbsoluteLastSheet = isLastMonth;
        const sheet = document.createElement('div');
        sheet.className = `print-sheet ${sheetSizeClass} ${!isAbsoluteLastSheet ? 'page-break-after' : ''}`;

        const firstDate = new Date(mObj.year, mObj.month, 1);
        const firstDayOfWeek = firstDate.getDay();
        const daysBeforeMonday = (firstDayOfWeek === 0) ? 6 : (firstDayOfWeek - 1);
        const startDate = new Date(mObj.year, mObj.month, 1 - daysBeforeMonday);

        const lastDate = new Date(mObj.year, mObj.month, daysInMonth);
        const lastDayOfWeek = lastDate.getDay();
        const daysAfterSunday = (lastDayOfWeek === 0) ? 0 : (7 - lastDayOfWeek);
        const endDate = new Date(mObj.year, mObj.month, daysInMonth + daysAfterSunday);

        const extendedDays = [];
        let cur = new Date(startDate);
        while (cur <= endDate) {
          const cY = cur.getFullYear();
          const cM = cur.getMonth();
          const cD = cur.getDate();
          const cW = cur.getDay();
          const isOutside = (cM !== mObj.month);

          const hMap = (cY === mObj.year) ? holidaysMap : App.getHolidaysForYear(cY);
          const hInfo = hMap.get(`${cM}-${cD}`);

          extendedDays.push({
            year: cY,
            month: cM,
            day: cD,
            dayOfWeek: cW,
            isOutsideMonth: isOutside,
            isHoliday: Boolean(hInfo),
            holidayName: hInfo ? hInfo.name : '',
            isCustomHoliday: Boolean(hInfo && hInfo.isCustom)
          });
          cur.setDate(cur.getDate() + 1);
        }

        App.renderSheetWithDays(sheet, monthTitle, null, extendedDays, true);
        sheetsWrapper.appendChild(sheet);
      }
      // --- CASO: ORIZZONTALE QUINDICINALE (1-15 e 16-fine mese) ---
      else if (layoutMode === 'landscape-split') {
        // Foglio 1 (1-15)
        totalSheets++;
        const sheet1 = document.createElement('div');
        sheet1.className = `print-sheet ${sheetSizeClass} page-break-after`;
        const days1to15 = [];
        for (let d = 1; d <= 15; d++) {
          const dateObj = new Date(mObj.year, mObj.month, d);
          const hInfo = holidaysMap.get(`${mObj.month}-${d}`);
          days1to15.push({
            year: mObj.year, month: mObj.month, day: d, dayOfWeek: dateObj.getDay(),
            isOutsideMonth: false, isHoliday: Boolean(hInfo), holidayName: hInfo ? hInfo.name : '',
            isCustomHoliday: Boolean(hInfo && hInfo.isCustom)
          });
        }
        App.renderSheetWithDays(sheet1, monthTitle, 'Giorni 1 - 15', days1to15, true);
        sheetsWrapper.appendChild(sheet1);

        // Foglio 2 (16-fine)
        totalSheets++;
        const isAbsoluteLastSheet = isLastMonth;
        const sheet2 = document.createElement('div');
        sheet2.className = `print-sheet ${sheetSizeClass} ${!isAbsoluteLastSheet ? 'page-break-after' : ''}`;
        const days16toEnd = [];
        for (let d = 16; d <= daysInMonth; d++) {
          const dateObj = new Date(mObj.year, mObj.month, d);
          const hInfo = holidaysMap.get(`${mObj.month}-${d}`);
          days16toEnd.push({
            year: mObj.year, month: mObj.month, day: d, dayOfWeek: dateObj.getDay(),
            isOutsideMonth: false, isHoliday: Boolean(hInfo), holidayName: hInfo ? hInfo.name : '',
            isCustomHoliday: Boolean(hInfo && hInfo.isCustom)
          });
        }
        App.renderSheetWithDays(sheet2, monthTitle, `Giorni 16 - ${daysInMonth}`, days16toEnd, true);
        sheetsWrapper.appendChild(sheet2);
      }
      // --- CASO: FOGLIO SINGOLO MENSILE (Verticale Standard o Orizzontale Unico) ---
      else {
        totalSheets++;
        const isAbsoluteLastSheet = isLastMonth;
        const sheet = document.createElement('div');
        sheet.className = `print-sheet ${sheetSizeClass} ${!isAbsoluteLastSheet ? 'page-break-after' : ''}`;

        const monthDays = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dateObj = new Date(mObj.year, mObj.month, d);
          const hInfo = holidaysMap.get(`${mObj.month}-${d}`);
          monthDays.push({
            year: mObj.year, month: mObj.month, day: d, dayOfWeek: dateObj.getDay(),
            isOutsideMonth: false, isHoliday: Boolean(hInfo), holidayName: hInfo ? hInfo.name : '',
            isCustomHoliday: Boolean(hInfo && hInfo.isCustom)
          });
        }
        App.renderSheetWithDays(sheet, monthTitle, null, monthDays, true);
        sheetsWrapper.appendChild(sheet);
      }
    });

    // Aggiornamento badge riepilogativi
    const badgeSheetsCount = document.getElementById('badgeSheetsCount');
    if (badgeSheetsCount) {
      badgeSheetsCount.textContent = `${totalSheets} ${totalSheets === 1 ? 'Foglio' : 'Fogli'}`;
    }
  };

})(window.CalendarApp);
