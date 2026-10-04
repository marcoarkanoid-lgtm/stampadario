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
