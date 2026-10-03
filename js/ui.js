/**
 * ==========================================================================
 * UI.JS - Gestione dell'Interfaccia Utente, Pop-up Modali e Interazioni
 * ==========================================================================
 * Questo modulo governa tutti i controlli della console e le interazioni a schermo:
 * - Rendering delle schede colonna (Nome 100%, bottoni Sfondo e Testo, tasto Aggiungi in fondo)
 * - Pop-up modale universale a 32 colori (riutilizzato per Nome Calendario, Sfondo e Testo colonne)
 * - Isola fluttuante interattiva (click su Nome, Formato o Periodo)
 * - Gestione drag & drop e riordinamento colonne
 * - Sincronizzazione controlli e aggiornamento dinamico delle regole di stampa @page
 */

window.CalendarApp = window.CalendarApp || {};

(function (App) {
  'use strict';

  // Stato interno per la modale colore attualmente aperta
  let activeColorContext = null; // { type: 'headerTitle' | 'colBg' | 'colText', colIndex?: number }

  /**
   * Inietta dinamicamente la regola CSS @page corretta in base a formato carta e orientamento
   */
  App.updateDynamicPrintStyle = function () {
    let styleTag = document.getElementById('dynamicPageStyle');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'dynamicPageStyle';
      document.head.appendChild(styleTag);
    }

    const isLandscape = App.state.layoutMode.startsWith('landscape');
    const orientation = isLandscape ? 'landscape' : 'portrait';
    const paper = App.state.paperSize; // 'A4' o 'A3'

    styleTag.textContent = `
      @page {
        size: ${paper} ${orientation};
        margin: 0;
      }
    `;
  };

  /**
   * Carica asincronamente i Google Fonts selezionati
   */
  App.ensureFontLoaded = function (fontId) {
    const fontObj = App.FONT_CATALOG.find(f => f.id === fontId);
    if (!fontObj || !fontObj.google) return;

    const fontSlug = fontId.replace(/ /g, '+');
    const linkId = `gfont-${fontSlug}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontSlug}:ital,wght@0,400;0,600;0,700;1,400&display=swap`;
      document.head.appendChild(link);
    }
  };

  /**
   * Popola il menu a tendina con i 24+ font suddivisi per gruppo ottico
   */
  App.populateFontSelect = function (selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = '';

    const categories = ['Moderno', 'Classico', 'Scrittura a Mano', 'Display'];
    categories.forEach(cat => {
      const group = document.createElement('optgroup');
      group.label = `Stile ${cat}`;
      App.FONT_CATALOG.filter(f => f.category === cat).forEach(font => {
        const opt = document.createElement('option');
        opt.value = font.id;
        opt.textContent = font.name;
        if (font.id === App.state.headerFont) {
          opt.selected = true;
        }
        group.appendChild(opt);
      });
      selectEl.appendChild(group);
    });
  };

  /**
   * ========================================================================
   * RENDERING SCHEDE DELLE COLONNE NELLA CONSOLE
   * ========================================================================
   * Layout richiesto dall'utente:
   * - Nome colonna largo 100%
   * - Sotto due tasti al 50%: "Sfondo" e "Testo" con colore visibile
   * - Selettore larghezza a quarti (da 0.5x a 2x) e tasti sposta su/giù
   * - In fondo alla lista: il tasto "➕ Aggiungi Colonna"
   */
  App.renderColumnsList = function () {
    const container = document.getElementById('columnsListContainer');
    if (!container) return;
    container.innerHTML = '';

    const totalQuarters = App.state.columns.reduce((sum, col) => sum + Math.round((col.factor || 1.0) * 4), 0);

    App.state.columns.forEach((col, idx) => {
      const q = Math.round((col.factor || 1.0) * 4);
      const pct = ((q / totalQuarters) * 100).toFixed(1);
      const isMonochrome = (App.state.colorMode === 'monochrome');

      const colCard = document.createElement('div');
      colCard.className = 'column-config-card';
      colCard.dataset.colIndex = idx;
      colCard.draggable = true;

      colCard.innerHTML = `
        <div class="col-card-top-row">
          <div class="drag-handle" title="Trascina per riordinare">:::</div>
          <input type="text" class="col-name-input" value="${App.sanitizeText(col.name, 30)}"
                 placeholder="Nome Colonna" maxlength="30" data-idx="${idx}">
          <button type="button" class="btn-delete-col" title="Elimina colonna" data-idx="${idx}">Elimina</button>
        </div>

        <div class="col-card-colors-row">
          <button type="button" class="btn-color-trigger btn-bg-trigger" data-idx="${idx}">
            <span class="color-swatch-circle" style="background-color: ${col.color};"></span>
            <span class="color-btn-label">Sfondo</span>
          </button>
          <button type="button" class="btn-color-trigger btn-text-trigger" data-idx="${idx}">
            <span class="color-swatch-circle" style="background-color: ${col.textColor || '#000000'}; border: 1px solid #cbd5e1;"></span>
            <span class="color-btn-label">Testo</span>
          </button>
        </div>

        <div class="col-card-footer-row">
          <div class="col-width-selector-group">
            <label>Larghezza:</label>
            <select class="col-factor-select form-control-sm" data-idx="${idx}">
              <option value="0.5" ${col.factor === 0.5 ? 'selected' : ''}>0.5x</option>
              <option value="0.75" ${col.factor === 0.75 ? 'selected' : ''}>0.75x</option>
              <option value="1.0" ${col.factor === 1.0 ? 'selected' : ''}>1.0x</option>
              <option value="1.25" ${col.factor === 1.25 ? 'selected' : ''}>1.25x</option>
              <option value="1.5" ${col.factor === 1.5 ? 'selected' : ''}>1.5x</option>
              <option value="1.75" ${col.factor === 1.75 ? 'selected' : ''}>1.75x</option>
              <option value="2.0" ${col.factor === 2.0 ? 'selected' : ''}>2.0x</option>
            </select>
          </div>
          <span class="col-ratio-badge" title="Frazione e percentuale di spazio">${q}/${totalQuarters} (${pct}%)</span>
          <div class="col-reorder-buttons">
            <button type="button" class="btn-move-col" data-dir="up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''} title="Sposta colonna su">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>
            </button>
            <button type="button" class="btn-move-col" data-dir="down" data-idx="${idx}" ${idx === App.state.columns.length - 1 ? 'disabled' : ''} title="Sposta colonna giù">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            </button>
          </div>
        </div>
      `;

      // Event listener modifica nome
      const nameInput = colCard.querySelector('.col-name-input');
      nameInput.addEventListener('input', (e) => {
        App.state.columns[idx].name = e.target.value;
        App.renderAllCalendarSheets();
        App.saveStateToLocalStorage();
      });

      // Event listener selettore larghezza a quarti
      const factorSelect = colCard.querySelector('.col-factor-select');
      factorSelect.addEventListener('change', (e) => {
        App.state.columns[idx].factor = parseFloat(e.target.value) || 1.0;
        App.renderColumnsList();
        App.renderAllCalendarSheets();
        App.saveStateToLocalStorage();
      });

      // Event listener tasto "Sfondo"
      const bgBtn = colCard.querySelector('.btn-bg-trigger');
      bgBtn.addEventListener('click', () => {
        App.openUniversalColorModal('colBg', idx);
      });

      // Event listener tasto "Testo"
      const textBtn = colCard.querySelector('.btn-text-trigger');
      textBtn.addEventListener('click', () => {
        App.openUniversalColorModal('colText', idx);
      });

      // Event listener eliminazione colonna
      const delBtn = colCard.querySelector('.btn-delete-col');
      delBtn.addEventListener('click', () => {
        if (App.state.columns.length <= 1) {
          alert('Il calendario deve contenere almeno una colonna di contenuti.');
          return;
        }
        App.state.columns.splice(idx, 1);
        App.renderColumnsList();
        App.renderAllCalendarSheets();
        App.saveStateToLocalStorage();
      });

      // Event listener spostamento su/giù
      colCard.querySelectorAll('.btn-move-col').forEach(btn => {
        btn.addEventListener('click', () => {
          const dir = btn.dataset.dir;
          const targetIdx = (dir === 'up') ? idx - 1 : idx + 1;
          if (targetIdx >= 0 && targetIdx < App.state.columns.length) {
            const temp = App.state.columns[idx];
            App.state.columns[idx] = App.state.columns[targetIdx];
            App.state.columns[targetIdx] = temp;
            App.renderColumnsList();
            App.renderAllCalendarSheets();
            App.saveStateToLocalStorage();
          }
        });
      });

      // Drag and Drop per riordinamento rapido
      colCard.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', idx);
        colCard.classList.add('is-dragging');
      });

      colCard.addEventListener('dragend', () => {
        colCard.classList.remove('is-dragging');
      });

      colCard.addEventListener('dragover', (e) => {
        e.preventDefault();
        colCard.classList.add('drag-target');
      });

      colCard.addEventListener('dragleave', () => {
        colCard.classList.remove('drag-target');
      });

      colCard.addEventListener('drop', (e) => {
        e.preventDefault();
        colCard.classList.remove('drag-target');
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (!isNaN(fromIdx) && fromIdx !== idx) {
          const movedCol = App.state.columns.splice(fromIdx, 1)[0];
          App.state.columns.splice(idx, 0, movedCol);
          App.renderColumnsList();
          App.renderAllCalendarSheets();
          App.saveStateToLocalStorage();
        }
      });

      container.appendChild(colCard);
    });

    // Inserisci il tasto "➕ Aggiungi Colonna" in fondo alla lista (con limite a 36 colonne)
    const addColBtn = document.createElement('button');
    addColBtn.type = 'button';
    addColBtn.className = 'btn-add-column-bottom';
    const isMax = App.state.columns.length >= (App.MAX_COLUMNS || 36);

    if (isMax) {
      addColBtn.disabled = true;
      addColBtn.innerHTML = `<span>Limite massimo di 36 colonne raggiunto</span>`;
      addColBtn.style.opacity = '0.5';
      addColBtn.style.cursor = 'not-allowed';
    } else {
      addColBtn.innerHTML = `<span>+ Aggiungi Colonna (${App.state.columns.length}/${App.MAX_COLUMNS || 36})</span>`;
      addColBtn.addEventListener('click', () => {
        if (App.state.columns.length >= (App.MAX_COLUMNS || 36)) return;
        const newNum = App.state.columns.length + 1;
        // Sceglie un colore piacevole a rotazione dalle palette
        const allColors = App.THEMATIC_PALETTES.flatMap(p => p.colors);
        const picked = allColors[(newNum * 3) % allColors.length].hex;
        App.state.columns.push({
          id: `col_${Date.now()}`,
          name: `Colonna ${newNum}`,
          color: picked,
          textColor: App.getOptimalTextColor(picked),
          factor: 1.0
        });
        App.renderColumnsList();
        App.renderAllCalendarSheets();
        App.saveStateToLocalStorage();
      });
    }
    container.appendChild(addColBtn);
  };

  /**
   * ========================================================================
   * POP-UP MODALE UNIVERSALE PER LA SCELTA DEL COLORE (32 PALETTE + CUSTOM)
   * ========================================================================
   * Utilizzato per:
   * 1. Colore Nome del Calendario (richiesta 1)
   * 2. Sfondo Colonna (richiesta 4)
   * 3. Testo Intestazione Colonna (richiesta 4)
   */
  App.openUniversalColorModal = function (type, colIndex = null) {
    activeColorContext = { type, colIndex };
    const modal = document.getElementById('universalColorModal');
    if (!modal) return;

    const modalTitle = document.getElementById('colorModalTitle');
    let currentColor = '#111111';

    if (type === 'headerTitle') {
      modalTitle.textContent = 'Colore Primario & Tipografia Globale';
      currentColor = App.state.headerColor;
    } else if (type === 'colBg' && colIndex !== null) {
      modalTitle.textContent = `Colore Sfondo: ${App.state.columns[colIndex].name}`;
      currentColor = App.state.columns[colIndex].color;
    } else if (type === 'colText' && colIndex !== null) {
      modalTitle.textContent = `Colore Testo: ${App.state.columns[colIndex].name}`;
      currentColor = App.state.columns[colIndex].textColor || App.getOptimalTextColor(App.state.columns[colIndex].color);
    }

    // Aggiorna l'anteprima corrente
    App.updateColorModalPreview(currentColor);

    modal.classList.add('is-open');
  };

  App.closeUniversalColorModal = function () {
    const modal = document.getElementById('universalColorModal');
    if (modal) modal.classList.remove('is-open');
    activeColorContext = null;
  };

  App.updateColorModalPreview = function (hex) {
    const swatch = document.getElementById('modalCurrentColorSwatch');
    const hexInput = document.getElementById('modalCustomHexInput');
    const nativePicker = document.getElementById('modalNativeColorPicker');

    if (swatch) swatch.style.backgroundColor = hex;
    if (hexInput) hexInput.value = hex;
    if (nativePicker) nativePicker.value = hex;
  };

  App.applyColorSelection = function (hexColor) {
    if (!activeColorContext) return;
    const cleanHex = App.validateHexColor(hexColor);

    if (activeColorContext.type === 'headerTitle') {
      App.state.headerColor = cleanHex;
      const preview = document.getElementById('headerColorCircle');
      if (preview) preview.style.backgroundColor = cleanHex;
    } else if (activeColorContext.type === 'colBg' && activeColorContext.colIndex !== null) {
      const col = App.state.columns[activeColorContext.colIndex];
      col.color = cleanHex;
      // Aggiorna automaticamente il colore del testo suggerito se non personalizzato
      col.textColor = App.getOptimalTextColor(cleanHex);
      App.renderColumnsList();
    } else if (activeColorContext.type === 'colText' && activeColorContext.colIndex !== null) {
      const col = App.state.columns[activeColorContext.colIndex];
      col.textColor = cleanHex;
      App.renderColumnsList();
    }

    App.renderAllCalendarSheets();
    App.saveStateToLocalStorage();
    App.closeUniversalColorModal();
  };

  /**
   * Costruisce i campioni cromatici all'interno della modale universale
   */
  App.populateColorModalSwatches = function () {
    const container = document.getElementById('modalThematicPalettesContainer');
    if (!container) return;
    container.innerHTML = '';

    // 1. Le 4 Palette Tematiche (32 colori)
    App.THEMATIC_PALETTES.forEach(pal => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'modal-palette-category';
      groupDiv.innerHTML = `<h4>${pal.category}</h4>`;

      const gridDiv = document.createElement('div');
      gridDiv.className = 'modal-palette-swatches-grid';

      pal.colors.forEach(col => {
        const swatchBtn = document.createElement('button');
        swatchBtn.type = 'button';
        swatchBtn.className = 'modal-color-swatch-item';
        swatchBtn.style.backgroundColor = col.hex;
        swatchBtn.title = `${col.name} (${col.hex})`;
        swatchBtn.dataset.hex = col.hex;
        swatchBtn.addEventListener('click', () => {
          App.applyColorSelection(col.hex);
        });
        gridDiv.appendChild(swatchBtn);
      });

      groupDiv.appendChild(gridDiv);
      container.appendChild(groupDiv);
    });

    // 2. Colori Classici Rapidi (Nero, Bianco, Grigio, Rosso...)
    const classicGroup = document.createElement('div');
    classicGroup.className = 'modal-palette-category';
    classicGroup.innerHTML = `<h4>Colori Classici & Contrasto</h4>`;
    const classicGrid = document.createElement('div');
    classicGrid.className = 'modal-palette-swatches-grid';

    App.CLASSIC_TEXT_COLORS.forEach(tc => {
      const swatchBtn = document.createElement('button');
      swatchBtn.type = 'button';
      swatchBtn.className = 'modal-color-swatch-item';
      swatchBtn.style.backgroundColor = tc.hex;
      swatchBtn.title = `${tc.name} (${tc.hex})`;
      swatchBtn.dataset.hex = tc.hex;
      swatchBtn.addEventListener('click', () => {
        App.applyColorSelection(tc.hex);
      });
      classicGrid.appendChild(swatchBtn);
    });

    classicGroup.appendChild(classicGrid);
    container.appendChild(classicGroup);
  };

  /**
   * ========================================================================
   * ISOLA FLUTTUANTE INTERATTIVA (FLOATING ISLAND)
   * ========================================================================
   * - Tag Nome: mostra il nome del calendario, click apre focus su Sezione 1
   * - Tag Formato: mostra "A4 Bisettimanale" ecc., click attiva Sezione 2
   * - Tag Periodo: mostra "Mese [nome]" o "Anno [xxxx]" o "Da ... A ...", click attiva Sezione 3
   */
  App.updateFloatingIsland = function () {
    const btnTitle = document.getElementById('islandBtnTitle');
    const btnPaper = document.getElementById('islandBtnPaper');
    const btnPeriod = document.getElementById('islandBtnPeriod');

    if (btnTitle) {
      btnTitle.querySelector('.island-label').textContent = App.state.calendarTitle || 'Nome Calendario';
    }

    if (btnPaper) {
      let layoutShort = 'Verticale';
      if (App.state.layoutMode === 'portrait-extended') layoutShort = 'Verticale Estesa';
      else if (App.state.layoutMode === 'landscape-biweekly') layoutShort = 'Bisettimanale';
      else if (App.state.layoutMode === 'landscape-split') layoutShort = '2 Fogli (1-15/16)';
      else if (App.state.layoutMode === 'landscape-single') layoutShort = 'Orizzontale';

      btnPaper.querySelector('.island-label').textContent = `${App.state.paperSize} ${layoutShort}`;
    }

    if (btnPeriod) {
      let periodText = '';
      if (App.state.periodMode === 'year') {
        periodText = `Anno ${App.state.fullYear}`;
      } else if (App.state.periodMode === 'range') {
        const sM = App.MONTH_NAMES[App.state.rangeStartMonth].substring(0, 3);
        const eM = App.MONTH_NAMES[App.state.rangeEndMonth].substring(0, 3);
        periodText = `Da ${sM} ${App.state.rangeStartYear} a ${eM} ${App.state.rangeEndYear}`;
      } else {
        periodText = `${App.MONTH_NAMES[App.state.month]} ${App.state.year}`;
      }
      btnPeriod.querySelector('.island-label').textContent = periodText;
    }
  };

  /**
   * Funzione di utilità per aprire ed evidenziare una specifica sezione della console
   */
  App.focusSection = function (sectionId) {
    const sec = document.getElementById(sectionId);
    if (sec) {
      sec.open = true;
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      sec.classList.add('section-highlight');
      setTimeout(() => sec.classList.remove('section-highlight'), 1600);
    }
  };

  /**
   * ========================================================================
   * GESTIONE DELLE FESTIVITÀ PERSONALIZZATE (SEZIONE 6)
   * ========================================================================
   */
  App.renderCustomHolidaysList = function () {
    const listEl = document.getElementById('customHolidaysList');
    if (!listEl) return;
    listEl.innerHTML = '';

    App.state.customHolidays.forEach((h, idx) => {
      const item = document.createElement('div');
      item.className = 'custom-holiday-item';
      item.innerHTML = `
        <span class="holiday-date-badge">${h.day} ${App.MONTH_NAMES[h.month].substring(0, 3)}</span>
        <span class="holiday-name-text">${App.sanitizeText(h.name, 35)}</span>
        <button type="button" class="btn-remove-holiday" data-idx="${idx}" title="Rimuovi">Elimina</button>
      `;

      item.querySelector('.btn-remove-holiday').addEventListener('click', () => {
        App.state.customHolidays.splice(idx, 1);
        App.renderCustomHolidaysList();
        App.renderAllCalendarSheets();
        App.saveStateToLocalStorage();
      });

      listEl.appendChild(item);
    });

    const addBtn = document.getElementById('btnAddCustomHoliday');
    if (addBtn) {
      addBtn.disabled = (App.state.customHolidays.length >= 5);
    }
  };

  /**
   * Zoom e adattamento schermo
   */
  App.applyZoom = function (zoom) {
    App.state.zoomLevel = Math.max(0.4, Math.min(1.8, zoom));
    const wrapper = document.getElementById('sheetsWrapper');
    if (wrapper) {
      wrapper.style.transform = `scale(${App.state.zoomLevel})`;
    }
    const zoomBadge = document.getElementById('badgeZoomLevel');
    if (zoomBadge) {
      zoomBadge.textContent = `${Math.round(App.state.zoomLevel * 100)}%`;
    }
  };

  App.fitZoomToScreen = function () {
    const viewport = document.getElementById('previewViewport');
    if (!viewport) return;
    const isLandscape = App.state.layoutMode.startsWith('landscape');
    const availableWidth = viewport.clientWidth - 48;

    // Larghezza base foglio: ~794px per A4 portrait, ~1123px per A4 landscape
    const sheetBaseWidth = isLandscape ? 1123 : 794;
    const idealZoom = Math.min(1.0, Math.max(0.45, availableWidth / sheetBaseWidth));
    App.applyZoom(idealZoom);
  };

  /**
   * Gestione modale informativa sulla scelta cartella di salvataggio
   */
  App.openFolderHelpModal = function () {
    const modal = document.getElementById('modalFolderHelp');
    if (modal) modal.classList.add('is-open');
  };

  App.closeFolderHelpModal = function () {
    const modal = document.getElementById('modalFolderHelp');
    if (modal) modal.classList.remove('is-open');
  };

})(window.CalendarApp);
