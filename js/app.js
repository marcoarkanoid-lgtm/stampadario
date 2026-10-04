/**
 * ==========================================================================
 * APP.JS - Entry Point, Inizializzazione e Cablaggio Event Listener
 * ==========================================================================
 * Questo modulo è l'orchestratore principale dell'applicazione:
 * - Inizializza lo stato e i componenti al caricamento del DOM
 * - Collega gli event listener a tutte le sezioni della console nell'ordine esatto
 * - Gestisce i comandi dell'isola fluttuante (click rapidi su Nome, Formato, Periodo)
 * - Coordina le modali colore, i preset tematici e le azioni di stampa
 */

window.CalendarApp = window.CalendarApp || {};

(function (App) {
  'use strict';

  // Oggetto contenitore per i riferimenti DOM frequentemente utilizzati
  const dom = {};

  /**
   * Esegue il rendering completo di tutte le viste (griglia, colonne, festività, isola)
   */
  App.renderAll = function () {
    App.updateDynamicPrintStyle();
    App.ensureFontLoaded(App.state.headerFont);
    App.renderColumnsList();
    App.renderAllCalendarSheets();
    App.renderCustomHolidaysList();
    App.updateFloatingIsland();
    App.saveStateToLocalStorage();
  };

  /**
   * Sincronizza lo stato corrente con i controlli input della console
   */
  App.syncControlsFromState = function () {
    // 1. Intestazione Calendario e Stile
    if (dom.inputCalendarTitle) dom.inputCalendarTitle.value = App.state.calendarTitle;
    if (dom.btnTitleAlignLeft && dom.btnTitleAlignRight) {
      dom.btnTitleAlignLeft.classList.toggle('active', App.state.titleAlignment === 'left');
      dom.btnTitleAlignRight.classList.toggle('active', App.state.titleAlignment === 'right');
    }
    if (dom.checkCenterMonth) dom.checkCenterMonth.checked = Boolean(App.state.centerMonth);
    if (dom.selectHeaderFont) dom.selectHeaderFont.value = App.state.headerFont;
    if (dom.headerColorCircle) dom.headerColorCircle.style.backgroundColor = App.state.headerColor;

    // 2. Formato Foglio
    if (dom.btnPaperSizeA4 && dom.btnPaperSizeA3) {
      dom.btnPaperSizeA4.classList.toggle('active', App.state.paperSize === 'A4');
      dom.btnPaperSizeA3.classList.toggle('active', App.state.paperSize === 'A3');
    }
    const activeLayoutRadio = document.querySelector(`input[name="layoutModeRadio"][value="${App.state.layoutMode}"]`);
    if (activeLayoutRadio) activeLayoutRadio.checked = true;

    // 3. Periodo da stampare
    dom.periodToggles.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === App.state.periodMode);
    });
    if (dom.containerSingleMonth) dom.containerSingleMonth.style.display = (App.state.periodMode === 'single') ? 'block' : 'none';
    if (dom.containerFullYear) dom.containerFullYear.style.display = (App.state.periodMode === 'year') ? 'block' : 'none';
    if (dom.containerCustomPeriod) dom.containerCustomPeriod.style.display = (App.state.periodMode === 'range') ? 'block' : 'none';

    if (dom.selectMonth) dom.selectMonth.value = App.state.month;
    if (dom.inputYear) dom.inputYear.value = App.state.year;
    if (dom.inputFullYear) dom.inputFullYear.value = App.state.fullYear;

    if (dom.selectRangeStartMonth) dom.selectRangeStartMonth.value = App.state.rangeStartMonth;
    if (dom.inputRangeStartYear) dom.inputRangeStartYear.value = App.state.rangeStartYear;
    if (dom.selectRangeEndMonth) dom.selectRangeEndMonth.value = App.state.rangeEndMonth;
    if (dom.inputRangeEndYear) dom.inputRangeEndYear.value = App.state.rangeEndYear;

    // 5. Grafica & Temi Cromatici
    document.querySelectorAll('.btn-color-mode-toggle').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.colorMode === App.state.colorMode);
    });
    document.querySelectorAll('.btn-row-style-toggle').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.rowStyle === (App.state.rowStyle || 'weekend'));
    });
    if (dom.selectVerticalBorders) dom.selectVerticalBorders.value = App.state.verticalBorders;
    if (dom.checkTableBorders) dom.checkTableBorders.checked = Boolean(App.state.tableBorders);
    if (dom.checkRepeatHeaders) dom.checkRepeatHeaders.checked = App.state.repeatHeaders;
  };

  /**
   * Inizializzazione principale al caricamento della pagina
   */
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Memorizzazione elementi DOM
    dom.sidebar = document.getElementById('controlSidebar');
    dom.btnPrint = document.getElementById('btnPrint');
    dom.btnPrintHint = document.getElementById('printScopeHint');

    // Sezione 1: Intestazione Calendario
    dom.inputCalendarTitle = document.getElementById('inputCalendarTitle');
    dom.btnTitleAlignLeft = document.getElementById('btnTitleAlignLeft');
    dom.btnTitleAlignRight = document.getElementById('btnTitleAlignRight');
    dom.checkCenterMonth = document.getElementById('checkCenterMonth');

    // Sezione 2: Tipografia & Stile
    dom.selectHeaderFont = document.getElementById('selectHeaderFont');
    dom.btnHeaderColorTrigger = document.getElementById('btnHeaderColorTrigger');
    dom.headerColorCircle = document.getElementById('headerColorCircle');

    // Sezione 3: Formato Foglio
    dom.btnPaperSizeA4 = document.getElementById('btnPaperSizeA4');
    dom.btnPaperSizeA3 = document.getElementById('btnPaperSizeA3');
    dom.layoutRadios = document.querySelectorAll('input[name="layoutModeRadio"]');

    // Sezione 4: Periodo
    dom.periodToggles = document.querySelectorAll('.btn-period-toggle');
    dom.containerSingleMonth = document.getElementById('containerSingleMonth');
    dom.containerFullYear = document.getElementById('containerFullYear');
    dom.containerCustomPeriod = document.getElementById('containerCustomPeriod');
    dom.selectMonth = document.getElementById('selectMonth');
    dom.inputYear = document.getElementById('inputYear');
    dom.btnPrevMonth = document.getElementById('btnPrevMonth');
    dom.btnNextMonth = document.getElementById('btnNextMonth');
    dom.btnCurrentMonth = document.getElementById('btnCurrentMonth');
    dom.inputFullYear = document.getElementById('inputFullYear');
    dom.btnPrevFullYear = document.getElementById('btnPrevFullYear');
    dom.btnNextFullYear = document.getElementById('btnNextFullYear');
    dom.selectRangeStartMonth = document.getElementById('selectRangeStartMonth');
    dom.inputRangeStartYear = document.getElementById('inputRangeStartYear');
    dom.selectRangeEndMonth = document.getElementById('selectRangeEndMonth');
    dom.inputRangeEndYear = document.getElementById('inputRangeEndYear');

    // Sezione 6: Grafica e Bordi
    dom.selectVerticalBorders = document.getElementById('selectVerticalBorders');
    dom.checkTableBorders = document.getElementById('checkTableBorders');
    dom.checkRepeatHeaders = document.getElementById('checkRepeatHeaders');

    // Sezione 6: Festività Utente
    dom.selectCustomMonth = document.getElementById('selectCustomMonth');
    dom.inputCustomDay = document.getElementById('inputCustomDay');
    dom.inputCustomName = document.getElementById('inputCustomName');
    dom.btnAddCustomHoliday = document.getElementById('btnAddCustomHoliday');

    // Sezione 7: Salvataggio e Preset
    dom.btnExportJson = document.getElementById('btnExportJson');
    dom.fileImportJson = document.getElementById('fileImportJson');
    dom.selectThemePreset = document.getElementById('selectThemePreset');
    dom.btnApplyThemePreset = document.getElementById('btnApplyThemePreset');
    dom.btnClearData = document.getElementById('btnClearData');

    // Isola fluttuante
    dom.islandBtnTitle = document.getElementById('islandBtnTitle');
    dom.islandBtnPaper = document.getElementById('islandBtnPaper');
    dom.islandBtnPeriod = document.getElementById('islandBtnPeriod');
    dom.islandBtnZoomIn = document.getElementById('islandBtnZoomIn');
    dom.islandBtnZoomOut = document.getElementById('islandBtnZoomOut');
    dom.islandBtnFitScreen = document.getElementById('islandBtnFitScreen');

    // Pop-up modale colore universale
    dom.colorModal = document.getElementById('universalColorModal');
    dom.btnCloseColorModal = document.getElementById('btnCloseColorModal');
    dom.modalCustomHexInput = document.getElementById('modalCustomHexInput');
    dom.modalNativeColorPicker = document.getElementById('modalNativeColorPicker');
    dom.btnApplyCustomColor = document.getElementById('btnApplyCustomColor');

    // Pop-up modale informativa scelta cartella
    dom.modalFolderHelp = document.getElementById('modalFolderHelp');
    dom.btnCloseFolderHelp = document.getElementById('btnCloseFolderHelp');
    dom.btnConfirmFolderHelp = document.getElementById('btnConfirmFolderHelp');

    // Mobile controls
    dom.btnMobilePreview = document.getElementById('btnMobilePreview');
    dom.btnMobileBack = document.getElementById('btnMobileBackToControls');
    dom.btnMobilePrint = document.getElementById('btnMobilePrint');

    // 2. Ripristino stato salvato o impostazioni predefinite
    App.loadStateFromLocalStorage();

    // 3. Popolamento elenchi dinamici
    App.populateFontSelect(dom.selectHeaderFont);
    App.populateColorModalSwatches();

    // 4. Configurazione Event Listener

    // --- AZIONE PRINCIPALE: STAMPA / SALVA PDF ---
    dom.btnPrint.addEventListener('click', () => {
      window.print();
    });

    // --- SEZIONE 1: INTESTAZIONE CALENDARIO ---
    dom.inputCalendarTitle.addEventListener('input', (e) => {
      App.state.calendarTitle = e.target.value;
      App.renderAllCalendarSheets();
      App.updateFloatingIsland();
      App.saveStateToLocalStorage();
    });

    if (dom.btnTitleAlignLeft) {
      dom.btnTitleAlignLeft.addEventListener('click', () => {
        App.state.titleAlignment = 'left';
        App.syncControlsFromState();
        App.renderAllCalendarSheets();
        App.saveStateToLocalStorage();
      });
    }

    if (dom.btnTitleAlignRight) {
      dom.btnTitleAlignRight.addEventListener('click', () => {
        App.state.titleAlignment = 'right';
        App.syncControlsFromState();
        App.renderAllCalendarSheets();
        App.saveStateToLocalStorage();
      });
    }

    if (dom.checkCenterMonth) {
      dom.checkCenterMonth.addEventListener('change', (e) => {
        App.state.centerMonth = e.target.checked;
        App.renderAllCalendarSheets();
        App.saveStateToLocalStorage();
      });
    }

    // --- SEZIONE 2: TIPOGRAFIA & STILE GLOBALE ---
    dom.selectHeaderFont.addEventListener('change', (e) => {
      App.state.headerFont = e.target.value;
      App.ensureFontLoaded(App.state.headerFont);
      App.renderAllCalendarSheets();
      App.saveStateToLocalStorage();
    });

    dom.btnHeaderColorTrigger.addEventListener('click', () => {
      App.openUniversalColorModal('headerTitle');
    });

    // --- SEZIONE 2: FORMATO FOGLIO & IMPAGINAZIONE ---
    dom.btnPaperSizeA4.addEventListener('click', () => {
      App.state.paperSize = 'A4';
      App.syncControlsFromState();
      App.renderAll();
      App.fitZoomToScreen();
    });

    dom.btnPaperSizeA3.addEventListener('click', () => {
      App.state.paperSize = 'A3';
      App.syncControlsFromState();
      App.renderAll();
      App.fitZoomToScreen();
    });

    dom.layoutRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        App.state.layoutMode = e.target.value;
        App.renderAll();
        App.fitZoomToScreen();
      });
    });

    // --- SEZIONE 3: PERIODO DA STAMPARE ---
    dom.periodToggles.forEach(btn => {
      btn.addEventListener('click', () => {
        App.state.periodMode = btn.dataset.period;
        App.syncControlsFromState();
        App.renderAll();
      });
    });

    // Mese Singolo
    dom.selectMonth.addEventListener('change', (e) => {
      App.state.month = parseInt(e.target.value, 10);
      App.renderAll();
    });

    dom.inputYear.addEventListener('change', (e) => {
      App.state.year = parseInt(e.target.value, 10) || new Date().getFullYear();
      App.renderAll();
    });

    dom.btnPrevMonth.addEventListener('click', () => {
      if (App.state.month === 0) {
        App.state.month = 11;
        App.state.year--;
      } else {
        App.state.month--;
      }
      App.syncControlsFromState();
      App.renderAll();
    });

    dom.btnNextMonth.addEventListener('click', () => {
      if (App.state.month === 11) {
        App.state.month = 0;
        App.state.year++;
      } else {
        App.state.month++;
      }
      App.syncControlsFromState();
      App.renderAll();
    });

    dom.btnCurrentMonth.addEventListener('click', () => {
      const now = new Date();
      App.state.month = now.getMonth();
      App.state.year = now.getFullYear();
      App.syncControlsFromState();
      App.renderAll();
    });

    // Anno Intero
    dom.inputFullYear.addEventListener('change', (e) => {
      App.state.fullYear = parseInt(e.target.value, 10) || 2026;
      App.renderAll();
    });

    dom.btnPrevFullYear.addEventListener('click', () => {
      App.state.fullYear--;
      dom.inputFullYear.value = App.state.fullYear;
      App.renderAll();
    });

    dom.btnNextFullYear.addEventListener('click', () => {
      App.state.fullYear++;
      dom.inputFullYear.value = App.state.fullYear;
      App.renderAll();
    });

    // Periodo Da/A
    [dom.selectRangeStartMonth, dom.inputRangeStartYear, dom.selectRangeEndMonth, dom.inputRangeEndYear].forEach(el => {
      el.addEventListener('change', () => {
        App.state.rangeStartMonth = parseInt(dom.selectRangeStartMonth.value, 10);
        App.state.rangeStartYear = parseInt(dom.inputRangeStartYear.value, 10) || 2026;
        App.state.rangeEndMonth = parseInt(dom.selectRangeEndMonth.value, 10);
        App.state.rangeEndYear = parseInt(dom.inputRangeEndYear.value, 10) || 2026;
        App.validateAndClampPeriod();
        App.syncControlsFromState();
        App.renderAll();
      });
    });

    // --- SEZIONE 6: GRAFICA, BORDI & MODALITÀ CROMATICA ---
    document.querySelectorAll('.btn-color-mode-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        App.state.colorMode = btn.dataset.colorMode;
        document.querySelectorAll('.btn-color-mode-toggle').forEach(b => {
          b.classList.toggle('active', b === btn);
        });
        App.renderAllCalendarSheets();
        App.renderColumnConfigCards();
        App.saveStateToLocalStorage();
      });
    });

    document.querySelectorAll('.btn-row-style-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        App.state.rowStyle = btn.dataset.rowStyle;
        document.querySelectorAll('.btn-row-style-toggle').forEach(b => {
          b.classList.toggle('active', b === btn);
        });
        App.renderAllCalendarSheets();
        App.saveStateToLocalStorage();
      });
    });

    dom.selectVerticalBorders.addEventListener('change', (e) => {
      App.state.verticalBorders = e.target.value;
      App.renderAllCalendarSheets();
      App.saveStateToLocalStorage();
    });

    if (dom.checkTableBorders) {
      dom.checkTableBorders.addEventListener('change', (e) => {
        App.state.tableBorders = e.target.checked;
        App.renderAllCalendarSheets();
        App.saveStateToLocalStorage();
      });
    }

    dom.checkRepeatHeaders.addEventListener('change', (e) => {
      App.state.repeatHeaders = e.target.checked;
      App.renderAllCalendarSheets();
      App.saveStateToLocalStorage();
    });

    // --- SEZIONE 6: FESTIVITÀ PERSONALIZZATE ---
    dom.btnAddCustomHoliday.addEventListener('click', () => {
      if (App.state.customHolidays.length >= 5) {
        alert('Hai raggiunto il limite massimo di 5 festività personalizzate.');
        return;
      }
      const m = parseInt(dom.selectCustomMonth.value, 10);
      const d = parseInt(dom.inputCustomDay.value, 10);
      const name = (dom.inputCustomName.value || '').trim();

      if (isNaN(d) || d < 1 || d > 31) {
        alert('Inserisci un giorno valido compreso tra 1 e 31.');
        return;
      }
      if (!name) {
        alert('Inserisci una descrizione per la festività (es. Santo Patrono).');
        return;
      }

      App.state.customHolidays.push({
        id: `cust_${Date.now()}`,
        month: m,
        day: d,
        name: App.sanitizeText(name, 35)
      });

      dom.inputCustomName.value = '';
      App.renderCustomHolidaysList();
      App.renderAllCalendarSheets();
      App.saveStateToLocalStorage();
    });

    // --- SEZIONE 7: SALVATAGGIO, PRESET & PRIVACY ---
    dom.btnExportJson.addEventListener('click', () => {
      App.exportStateToJson();
    });

    dom.fileImportJson.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const res = App.importStateFromJson(evt.target.result);
        if (res.success) {
          App.syncControlsFromState();
          App.renderAll();
          alert(res.message);
        } else {
          alert(res.message);
        }
        dom.fileImportJson.value = '';
      };
      reader.readAsText(file);
    });

    dom.btnApplyThemePreset.addEventListener('click', () => {
      const presetId = dom.selectThemePreset.value;
      const preset = App.THEME_PRESETS.find(p => p.id === presetId);
      if (preset) {
        App.applyThemePreset(preset);
        App.syncControlsFromState();
        App.renderAll();
        alert(`Tema "${preset.name}" applicato! Le tue note e i tuoi testi sono stati preservati.`);
      }
    });

    dom.btnClearData.addEventListener('click', () => {
      if (confirm('Sei sicuro di voler resettare tutte le impostazioni e cancellare i dati memorizzati in locale?')) {
        App.clearLocalStorageData();
        App.syncControlsFromState();
        App.renderAll();
        alert('Dati ripristinati con successo.');
      }
    });

    // --- ISOLA FLUTTUANTE INTERATTIVA ---
    dom.islandBtnTitle.addEventListener('click', () => {
      App.focusSection('secCalendarTitle');
      dom.inputCalendarTitle.focus();
    });

    dom.islandBtnPaper.addEventListener('click', () => {
      App.focusSection('secPaperFormat');
    });

    dom.islandBtnPeriod.addEventListener('click', () => {
      App.focusSection('secPrintPeriod');
    });

    dom.islandBtnZoomIn.addEventListener('click', () => {
      App.applyZoom(App.state.zoomLevel + 0.1);
    });

    dom.islandBtnZoomOut.addEventListener('click', () => {
      App.applyZoom(App.state.zoomLevel - 0.1);
    });

    dom.islandBtnFitScreen.addEventListener('click', () => {
      App.fitZoomToScreen();
    });

    // --- MODALE COLORE UNIVERSALE ---
    dom.btnCloseColorModal.addEventListener('click', () => {
      App.closeUniversalColorModal();
    });

    dom.colorModal.addEventListener('click', (e) => {
      if (e.target === dom.colorModal) {
        App.closeUniversalColorModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (dom.colorModal && dom.colorModal.classList.contains('is-open')) {
          App.closeUniversalColorModal();
        }
        if (dom.modalFolderHelp && dom.modalFolderHelp.classList.contains('is-open')) {
          App.closeFolderHelpModal();
        }
      }
    });

    dom.modalNativeColorPicker.addEventListener('input', (e) => {
      App.updateColorModalPreview(e.target.value);
    });

    dom.modalCustomHexInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        App.updateColorModalPreview(val);
      }
    });

    dom.btnApplyCustomColor.addEventListener('click', () => {
      App.applyColorSelection(dom.modalCustomHexInput.value);
    });

    // --- MODALE INFORMAZIONI SCELTA CARTELLA ---
    if (dom.btnCloseFolderHelp) {
      dom.btnCloseFolderHelp.addEventListener('click', () => {
        App.closeFolderHelpModal();
      });
    }

    if (dom.btnConfirmFolderHelp) {
      dom.btnConfirmFolderHelp.addEventListener('click', () => {
        App.closeFolderHelpModal();
      });
    }

    if (dom.modalFolderHelp) {
      dom.modalFolderHelp.addEventListener('click', (e) => {
        if (e.target === dom.modalFolderHelp) {
          App.closeFolderHelpModal();
        }
      });
    }

    // --- MOBILE CONTROLS ---
    if (dom.btnMobilePreview) {
      dom.btnMobilePreview.addEventListener('click', () => {
        document.body.classList.add('mobile-preview-active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          App.fitZoomToScreen();
        }, 100);
      });
    }

    if (dom.btnMobileBack) {
      dom.btnMobileBack.addEventListener('click', () => {
        document.body.classList.remove('mobile-preview-active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    if (dom.btnMobilePrint) {
      dom.btnMobilePrint.addEventListener('click', () => {
        window.print();
      });
    }

    // 5. Prima sincronizzazione e rendering iniziale
    App.syncControlsFromState();
    App.renderAll();
    setTimeout(App.fitZoomToScreen, 150);

    window.addEventListener('resize', () => {
      App.fitZoomToScreen();
    });
  });

})(window.CalendarApp);
