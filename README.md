# Smart Stoichiometry

Ein schlanker, vollständig statischer Prototyp für die AI-gestützte Extraktion, Validierung und Berechnung chemischer Reaktionen. Die Anwendung läuft als statische Seite mit einer einzelnen Eingabe und nutzt eine Vercel-Serverless-Function (`/api/analyze`) für Parsing, PubChem-Mocking und Stoichiometrie-Berechnungen. Externe API-Keys werden nicht im Browser benötigt.

## Features
- **Ein Eingabefeld** für Freitext, CAS-Nummern, SMILES oder chemische Namen.
- **Parser** erkennt Mengenangaben, Rollenhinweise und CAS-Nummern aus unstrukturiertem Text.
- **PubChem-Mock** ordnet Reagenzien anhand eines lokalen Datensatzes zu und weist Molmassen zu.
- **Stoichiometrie-Modul** berechnet Stoffmengen, Äquivalente, limiting reagent und eine einfache theoretische Ausbeute.
- **Klares Feedback** bei Mehrdeutigkeiten oder fehlenden Treffern.

## Projektstruktur
```
├─ api/               # Vercel-Serverless-Function (POST /api/analyze)
├─ lib/               # Kernlogik: Parser, PubChem-Mock, Stoichiometrie
├─ tests/             # Unit-Tests mit minimalem Node-Test-Harness
├─ index.html         # Statische UI mit einem Textfeld
├─ app.js / styles.css# UI-Logik und Gestaltung
├─ server.js          # Lokaler Dev-Server (auch als Fallback für einfache Deployments)
└─ package.json
```

## Lokale Nutzung
1. Stelle sicher, dass Node.js installiert ist.
2. Starte den integrierten Dev-Server:
   ```
   npm start
   ```
3. Öffne `http://localhost:3000` und sende deine Beschreibung ab. Die UI ruft automatisch `/api/analyze` auf.

## Tests
Die Kernlogik wird über einen leichten Node-Test-Harness geprüft.

```
npm test
```

Getestet werden Parser, PubChem-Zuordnung und Stoichiometrie-Berechnung.

## Deployment-Hinweis
- Die statische UI kann direkt von Vercel ausgeliefert werden.
- Die Serverless-Function unter `api/analyze.js` entspricht der Vercel-Konvention und kapselt Logik sowie (später) mögliche Aufrufe an GPT/PubChem.
- Der OpenAI-Key verbleibt ausschließlich serverseitig, falls eine echte Integration ergänzt wird.
