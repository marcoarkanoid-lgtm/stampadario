# Stampadario - Linee Guida di Progetto & Regole Imperative

## 1. NESSUNA RIGA TRA INTESTAZIONE E TABELLA DEL MESE
- L'intestazione del foglio (`.sheet-header`, contenente il titolo del calendario e il mese/anno) NON deve MAI avere linee o bordi inferiori (`border-bottom: none !important`).
- Tra la testata del foglio e la tabella del calendario non deve comparire alcuna linea orizzontale, divisorio grafico o contorno.

## 2. NESSUN BORDO ESTERNO SULLA TABELLA DEL MESE
- La tabella del calendario (`.calendar-grid-container` e `.calendar-grid`) NON deve avere alcun bordo perimetrale esterno (`border: none !important`).
- La riga superiore delle colonne non deve avere `border-top`.
- La prima colonna a sinistra (colonna data) non deve avere `border-left`.
- L'ultima colonna a destra non deve avere `border-right`.
- L'ultima riga in basso non deve avere `border-bottom` (anche se cade di domenica o in qualsiasi modalità di densità).
- La cella vuota d'angolo in alto a sinistra (`.grid-cell-corner-empty`) non deve avere bordi.
- Restano unicamente le linee divisorie interne tra le celle feriali/festive e tra le colonne contenuti.

## 3. VERSIONE MOBILE
- Su smartphone/schermi mobili (`max-width: 900px`), l'anteprima del calendario è sempre nascosta di default all'avvio.
- Il pulsante di stampa in cima è nascosto su mobile; l'utente compila le sezioni e trova il pulsante primario "Anteprima" in fondo alla pagina delle opzioni.
- Cliccando su "Anteprima", la vista passa a schermo intero mostrando il foglio scalato con i comandi mobili in basso ("← Modifica" e "Stampa / Salva PDF").
