# Stampadario - Linee Guida di Progetto & Regole Imperative

## 1. NESSUNA RIGA TRA INTESTAZIONE E TABELLA DEL MESE
- L'intestazione del foglio (`.sheet-header`, contenente il titolo del calendario e il mese/anno) NON deve MAI avere linee o bordi inferiori (`border-bottom: none !important`).
- Tra la testata del foglio e la tabella del calendario non deve comparire alcuna linea orizzontale, divisorio grafico o contorno.

## 2. GESTIONE BORDI DELLA TABELLA DEL MESE
- I bordi perimetrali esterni della tabella del calendario sono controllati dall'opzione "Bordi tabella" (`tableBorders` nello stato):
  - Quando disattivata (`no-table-borders`): la tabella non mostra alcun bordo perimetrale esterno (`border: none !important`).
  - Quando attivata (`has-table-borders`): la tabella presenta il bordo perimetrale esterno (1px solid #cbd5e1).
- In ogni caso, la testata `.sheet-header` non ha mai bordi inferiori.

## 3. VERSIONE MOBILE
- Su smartphone/schermi mobili (`max-width: 900px`), l'anteprima del calendario è sempre nascosta di default all'avvio.
- Il pulsante di stampa in cima è nascosto su mobile; l'utente compila le sezioni e trova il pulsante primario "Anteprima" in fondo alla pagina delle opzioni.
- Cliccando su "Anteprima", la vista passa a schermo intero mostrando il foglio scalato con i comandi mobili in basso ("← Modifica" e "Stampa / Salva PDF").

## 4. LINEA DIVISORIA TRA COLONNA DATA E PRIMA COLONNA
- Tra la colonna della data (incluso l'angolo in alto a sinistra `.grid-cell-corner-empty`) e la prima colonna di contenuti deve essere SEMPRE presente la riga/bordo verticale di divisione (`border-right: 1px solid #cbd5e1`).

## 5. NESSUNA DICITURA O NUMERO DI PAGINA NELL'INTESTAZIONE DEI FOGLI
- In tutte le impaginazioni (bisettimanale, quindicinale, verticale, orizzontale, ecc.), l'intestazione del foglio deve contenere ESCLUSIVAMENTE il nome del calendario e il mese/anno.
- NON inserire mai diciture come "Foglio X di XX (2 Settimane)", "Giorni 1 - 15", numeri di pagina o altri sottotitoli/badge nella testata del foglio sia a schermo che in stampa.
