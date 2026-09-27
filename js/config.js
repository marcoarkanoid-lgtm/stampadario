/**
 * ==========================================================================
 * CONFIG.JS - Costanti, Palette, Tipografia e Festività Nazionali Italiane
 * ==========================================================================
 * Questo modulo contiene tutte le definizioni statiche dell'applicazione:
 * - 24+ font liberamente utilizzabili (Google Fonts + web safe)
 * - 32 tonalità cromatiche tematiche divise in 4 categorie
 * - 16 colori classici per il testo
 * - Nomi di mesi e giorni in italiano
 * - Festività nazionali italiane conformi alla normativa vigente (inclusa L. 151/2025)
 */

// Esportazione nello scope globale per architettura modulare senza build tools
window.CalendarApp = window.CalendarApp || {};

(function (App) {
  'use strict';

  // --- CATALOGO DEI FONT DI LIBERO UTILIZZO COMMERCIALE (24+ Caratteri) ---
  // Suddivisi per stile per offrire massima varietà ed eleganza tipografica
  App.FONT_CATALOG = [
    // Stile Moderno / Sans-Serif
    { id: 'Inter', name: 'Inter (Moderno essenziale)', category: 'Moderno', family: "'Inter', sans-serif", google: true },
    { id: 'Roboto', name: 'Roboto (Google Standard)', category: 'Moderno', family: "'Roboto', sans-serif", google: true },
    { id: 'Montserrat', name: 'Montserrat (Geometrico pulito)', category: 'Moderno', family: "'Montserrat', sans-serif", google: true },
    { id: 'Poppins', name: 'Poppins (Arrotondato contemporaneo)', category: 'Moderno', family: "'Poppins', sans-serif", google: true },
    { id: 'Outfit', name: 'Outfit (Minimalista fresco)', category: 'Moderno', family: "'Outfit', sans-serif", google: true },
    { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans (Editoriale tech)', category: 'Moderno', family: "'Plus Jakarta Sans', sans-serif", google: true },
    { id: 'Raleway', name: 'Raleway (Lineare elegante)', category: 'Moderno', family: "'Raleway', sans-serif", google: true },
    { id: 'Nunito', name: 'Nunito (Morbido e leggibile)', category: 'Moderno', family: "'Nunito', sans-serif", google: true },
    { id: 'Arial', name: 'Arial (Classico di sistema)', category: 'Moderno', family: "Arial, Helvetica, sans-serif", google: false },
    { id: 'Segoe UI', name: 'Segoe UI (Sistema Windows)', category: 'Moderno', family: "'Segoe UI', Tahoma, sans-serif", google: false },

    // Stile Classico / Serif
    { id: 'Playfair Display', name: 'Playfair Display (Serif di prestigio)', category: 'Classico', family: "'Playfair Display', Georgia, serif", google: true },
    { id: 'Merriweather', name: 'Merriweather (Serif editoriale caldo)', category: 'Classico', family: "'Merriweather', Georgia, serif", google: true },
    { id: 'Lora', name: 'Lora (Serif calligrafico moderno)', category: 'Classico', family: "'Lora', serif", google: true },
    { id: 'Cormorant Garamond', name: 'Cormorant Garamond (Raffinato nobiliare)', category: 'Classico', family: "'Cormorant Garamond', serif", google: true },
    { id: 'Cinzel', name: 'Cinzel (Ispirazione lapidaria romana)', category: 'Classico', family: "'Cinzel', serif", google: true },
    { id: 'Georgia', name: 'Georgia (Serif tradizionale)', category: 'Classico', family: "Georgia, 'Times New Roman', serif", google: false },

    // Stile Scrittura a Mano / Script
    { id: 'Caveat', name: 'Caveat (Corsivo naturale vivace)', category: 'Scrittura a Mano', family: "'Caveat', cursive", google: true },
    { id: 'Dancing Script', name: 'Dancing Script (Scrittura fluida gioiosa)', category: 'Scrittura a Mano', family: "'Dancing Script', cursive", google: true },
    { id: 'Kalam', name: 'Kalam (Grafia quotidiana spontanea)', category: 'Scrittura a Mano', family: "'Kalam', cursive", google: true },
    { id: 'Pacifico', name: 'Pacifico (Pennello retrò morbido)', category: 'Scrittura a Mano', family: "'Pacifico', cursive", google: true },
    { id: 'Shadows Into Light', name: 'Shadows Into Light (Corsivo d\'autore delicato)', category: 'Scrittura a Mano', family: "'Shadows Into Light', cursive", google: true },

    // Stile Display / Geometrico
    { id: 'Oswald', name: 'Oswald (Compatto e incisivo)', category: 'Display', family: "'Oswald', sans-serif", google: true },
    { id: 'Comfortaa', name: 'Comfortaa (Ultra arrotondato moderno)', category: 'Display', family: "'Comfortaa', cursive", google: true },
    { id: 'Quicksand', name: 'Quicksand (Geometrico amichevole)', category: 'Display', family: "'Quicksand', sans-serif", google: true }
  ];

  // --- 32 PALETTE TEMATICHE SUDDIVISE IN 4 CATEGORIE ---
  // Ogni colore è accuratamente selezionato per garantire un'ottima estetica in stampa
  App.THEMATIC_PALETTES = [
    {
      category: 'Pastello (Tenui & Rilassanti)',
      colors: [
        { name: 'Cipria', hex: '#f8bbd0' },
        { name: 'Lavanda', hex: '#e1bee7' },
        { name: 'Salvia', hex: '#c8e6c9' },
        { name: 'Menta', hex: '#b2dfdb' },
        { name: 'Pesca', hex: '#ffe0b2' },
        { name: 'Azzurro Polvere', hex: '#b3e5fc' },
        { name: 'Crema Limone', hex: '#fff9c4' },
        { name: 'Lilla Malva', hex: '#d1c4e9' }
      ]
    },
    {
      category: 'Vivaci / Fluo (Brillanti & Decisi)',
      colors: [
        { name: 'Blu Elettrico', hex: '#1976d2' },
        { name: 'Corallo', hex: '#ff5722' },
        { name: 'Smeraldo', hex: '#00897b' },
        { name: 'Giallo Sole', hex: '#fbc02d' },
        { name: 'Turchese', hex: '#00acc1' },
        { name: 'Fucsia', hex: '#d81b60' },
        { name: 'Mandarino', hex: '#fb8c00' },
        { name: 'Indaco', hex: '#3949ab' }
      ]
    },
    {
      category: 'Naturali / Earthy (Toni della Terra)',
      colors: [
        { name: 'Terracotta', hex: '#d87d4a' },
        { name: 'Verde Oliva', hex: '#708238' },
        { name: 'Ocra Calda', hex: '#c68b59' },
        { name: 'Sabbia', hex: '#d4b28c' },
        { name: 'Foresta', hex: '#3b5a45' },
        { name: 'Argilla', hex: '#a0522d' },
        { name: 'Eucalipto', hex: '#6b8e88' },
        { name: 'Ardesia', hex: '#546e7a' }
      ]
    },
    {
      category: 'Eleganti / Classici (Tonalità Profonde)',
      colors: [
        { name: 'Blu Navy', hex: '#1a365d' },
        { name: 'Borgogna', hex: '#701a2b' },
        { name: 'Grigio Antracite', hex: '#374151' },
        { name: 'Petrolio', hex: '#0f4c5c' },
        { name: 'Prugna', hex: '#581c87' },
        { name: 'Cioccolato', hex: '#4a2c11' },
        { name: 'Rame Satinato', hex: '#9c411f' },
        { name: 'Verde Bottiglia', hex: '#1b4332' }
      ]
    }
  ];

  // --- 16 COLORI CLASSICI PER TESTI ---
  App.CLASSIC_TEXT_COLORS = [
    { name: 'Nero', hex: '#000000' },
    { name: 'Grigio Scuro', hex: '#333333' },
    { name: 'Bianco', hex: '#ffffff' },
    { name: 'Rosso', hex: '#d32f2f' },
    { name: 'Rosso Chiaro', hex: '#ef5350' },
    { name: 'Rosa', hex: '#e91e63' },
    { name: 'Blu Scuro', hex: '#1565c0' },
    { name: 'Azzurro', hex: '#0288d1' },
    { name: 'Giallo Ocra', hex: '#f57f17' },
    { name: 'Arancione', hex: '#e65100' },
    { name: 'Verde Scuro', hex: '#1b5e20' },
    { name: 'Verde Chiaro', hex: '#4caf50' },
    { name: 'Verde Smeraldo', hex: '#00897b' },
    { name: 'Viola', hex: '#7b1fa2' },
    { name: 'Marrone', hex: '#5d4037' },
    { name: 'Ocra Dorata', hex: '#b78103' }
  ];

  // --- NOMI DEI MESI IN LINGUA ITALIANA ---
  App.MONTH_NAMES = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  // --- NOMI ABBREVIATI DEI GIORNI (TUTTO MINUSCOLO PER COMPATTEZZA) ---
  // L'utente ha specificato il giorno minuscolo per ridurre l'ingombro orizzontale
  App.DAY_SHORT_NAMES = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

  // --- COLORI STANDARD PER LE DATE AD INIZIO RIGA ---
  App.DATE_COLORS = {
    workday: '#0f172a',      // Nero per giorni feriali (Lun-Ven)
    saturday: '#991b1b',     // Via di mezzo tra nero e rosso (bordeaux intenso) per i sabati non festivi
    holiday: '#d32f2f',      // Rosso brillante per domeniche e festivi
    outsideMonth: '#94a3b8'  // Grigio per i giorni cuscinetto fuori mese in Verticale Estesa
  };

  // --- FESTIVITÀ NAZIONALI ITALIANE A DATA FISSA ---
  // Inclusa San Francesco d'Assisi (4 Ottobre, istituita dalla Legge 151/2025)
  App.FIXED_HOLIDAYS = [
    { month: 0, day: 1, name: 'Capodanno' },
    { month: 0, day: 6, name: 'Epifania' },
    { month: 3, day: 25, name: 'Liberazione' },
    { month: 4, day: 1, name: 'Festa del Lavoro' },
    { month: 5, day: 2, name: 'Festa della Repubblica' },
    { month: 7, day: 15, name: 'Ferragosto / Assunzione' },
    { month: 9, day: 4, name: 'San Francesco d\'Assisi (Patrono d\'Italia - L. 151/2025)' },
    { month: 10, day: 1, name: 'Tutti i Santi' },
    { month: 11, day: 8, name: 'Immacolata Concezione' },
    { month: 11, day: 25, name: 'Natale' },
    { month: 11, day: 26, name: 'Santo Stefano' }
  ];

  // --- PRESET TEMATICI PREDEFINITI (SOLO PALETTE CROMATICA) ---
  App.THEME_PRESETS = [
    {
      id: 'family-pastel',
      name: 'Pastello Famiglia (Delicato)',
      headerColor: '#1e293b',
      columns: [
        { name: 'Mamma', color: '#f8bbd0', textColor: '#880e4f' },
        { name: 'Papà', color: '#b3e5fc', textColor: '#01579b' },
        { name: 'Bambini', color: '#c8e6c9', textColor: '#1b5e20' },
        { name: 'Note Casa', color: '#ffe0b2', textColor: '#e65100' }
      ]
    },
    {
      id: 'office-pro',
      name: 'Business Navy (Professionale)',
      headerColor: '#0f172a',
      columns: [
        { name: 'Progetti', color: '#1a365d', textColor: '#ffffff' },
        { name: 'Scadenze', color: '#701a2b', textColor: '#ffffff' },
        { name: 'Meeting', color: '#0f4c5c', textColor: '#ffffff' },
        { name: 'Task Team', color: '#374151', textColor: '#ffffff' }
      ]
    },
    {
      id: 'nature-earth',
      name: 'Terra & Foresta (Naturale)',
      headerColor: '#27272a',
      columns: [
        { name: 'Attività', color: '#708238', textColor: '#ffffff' },
        { name: 'Orto / Giardino', color: '#3b5a45', textColor: '#ffffff' },
        { name: 'Spesa Bio', color: '#c68b59', textColor: '#ffffff' },
        { name: 'Appunti', color: '#d87d4a', textColor: '#ffffff' }
      ]
    },
    {
      id: 'bright-energy',
      name: 'Energia Fluo (Vivace)',
      headerColor: '#09090b',
      columns: [
        { name: 'Priorità A', color: '#ff5722', textColor: '#ffffff' },
        { name: 'Priorità B', color: '#1976d2', textColor: '#ffffff' },
        { name: 'Palestra / Sport', color: '#00897b', textColor: '#ffffff' },
        { name: 'Tempo Libero', color: '#fbc02d', textColor: '#000000' }
      ]
    }
  ];

})(window.CalendarApp);
