# Registro Presenze

Web app (HTML + JavaScript, senza build) che sostituisce il file Excel "Registro Presenze": **Calendario**, **Report**, **Impostazioni**.
I dati iniziali (2023, 2026) sono importati dal tuo Excel in `seed.js`.

## Pubblicazione su GitHub Pages (passo-passo)
1. Crea un account su github.com → **New repository** → nome `registro-presenze` → *Public* → **Create**.
2. Nel repository: **Add file → Upload files**, trascina TUTTO il contenuto di questa cartella (anche `tools/`), poi **Commit changes**.
3. **Settings → Pages** → *Source*: **Deploy from a branch** → Branch: `main` / `(root)` → **Save**.
4. Dopo 1–2 minuti il sito è su `https://TUOUSERNAME.github.io/registro-presenze/`.
5. Sul telefono apri il link → menu del browser → **Aggiungi a schermata Home**.

## Uso in locale
Doppio clic su `index.html` (oppure `python3 -m http.server` e apri http://localhost:8000).
Nessuna installazione, nessuna variabile d'ambiente. L'import/export Excel usa la libreria SheetJS da CDN (serve internet solo per quello).

## Dati e backup
I dati sono nel **browser del dispositivo** (localStorage): PC e telefono NON sono sincronizzati.
Fai spesso **Impostazioni → Backup e dati → Esporta backup** (JSON); per spostare i dati da un dispositivo all'altro usa *Importa backup*.

## Struttura
- `index.html`, `style.css`, `app.js` – interfaccia · `calc.js` – calcoli (equivalenti alle formule Excel) · `seed.js` – dati iniziali
- `tools/xlsx_to_seed.py` – rigenera `seed.js` da un Excel nel formato originale

## Logica dei calcoli (dal file Excel)
- Permessi: somma delle fasce orarie "Dalle/Alle" del mese; residuo = disponibilità mensile (240 min) − usati. **Si azzera ogni mese** (come nel file).
- Congedi (C6/C5/C4 nel 2026): residuo = disponibilità iniziale − numero di codici usati, **cumulato** mese dopo mese.
- Straordinari: somma ore delle fasce "Dalle/Alle", cumulata nell'anno. Trasferta (T), Malattia (M), Infortunio (I), Festività nazionali (FN) e soppresse (FS): conteggio mensile del codice.
