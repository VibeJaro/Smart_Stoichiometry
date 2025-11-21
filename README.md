# Smart_Stoichiometry

Dieses Projekt ist ein AI-gestütztes Tool zur automatischen Extraktion, Interpretation und Berechnung chemischer Reaktionen.  
Der User gibt eine chemische Versuchsbeschreibung in **natürlicher Sprache** in ein einzelnes Textfeld ein.  
Das Tool identifiziert automatisch alle Chemikalien, Mengen und Reaktionsbeziehungen und erstellt ein vollständiges, strukturiertes Stoichiometrie-Set.

Das Projekt wird (durch OpenAI Codex) automatisch generiert und soll eine moderne, leicht deploybare Architektur verwenden, die vollständig auf **Vercel** laufen kann.

---

## Kernfunktionen

### 1. Natürliche Spracheingabe
Ein einziges Input-Feld verarbeitet beliebige chemische Angaben:
- Freitext  
- CAS-Nummern (z. B. „64-19-7“)  
- SMILES (z. B. „CC(=O)O“)  
- IUPAC-Namen  
- Synonyme („Essigsäure“, „AcOH“, „Ethansäure“)  
- Mengenangaben in g, mg, mmol, mL, % usw.

Keine separaten Felder, keine formale Struktur notwendig.  
Der User kann *alles* einfach reinschreiben.

### 2. Chemie-Erkennung & PubChem-Validierung
Ein KI-Agent (GPT-5) analysiert:
- Reagenzien
- Mengen
- Rollen (Edukten, Reaktionsmedium, ggf. Katalysator)
- Reaktionsrichtung
- eindeutige Identifikation über PubChem

Mehrdeutigkeit wird erkannt → UI liefert Feedback („Butanol ist nicht eindeutig, bitte spezifizieren“).

### 3. Stoichiometrie-Modul
Das Tool generiert eine vollständige Reaktionsstruktur:
- Molmassen
- Stoffmengen
- Äquivalente
- limiting reagent
- theoretische Ausbeute
- optionale automatische Reaktionsgleichung

Alle Daten werden strukturiert als JSON gespeichert und zusätzlich in einer nutzbaren UI angezeigt.

### 4. Feedback-System
Wenn Informationen fehlen oder unklar sind:
- Der User bekommt klare, verständliche Rückmeldungen
- Fehlende Angaben werden abgefragt
- Fehler werden nicht stillschweigend ignoriert

### 5. Architekturrahmen
Codex darf Architektur und Framework wählen, aber:

- Das Projekt **muss vollständig auf Vercel deploybar sein**
- Serverless Functions sind erlaubt
- Der OpenAI-Key darf **nicht** im Browser liegen
- Die Anwendung muss komplett clientseitig bedienbar sein (UI)
- Backend ausschließlich als Vercel-Functions

---

## Technische Anforderungen

- Programmiersprache: frei wählbar (JS/TS/Python)
- Framework: frei wählbar (vanilla, React, Next.js, Astro, Svelte)
- Deployment: Vercel
- Chemie-API: PubChem (REST)
- AI-Modell (nach Fertigstellung): GPT-5.1  
- AI-Modell (für die **Entwicklung**): Codex (OpenAI)

---

## Ziel dieses Repos
Dieses Repository dient als Basis, damit OpenAI Codex autonom:

1. die vollständige Architektur entscheidet  
2. alle Module implementiert  
3. die userfreundliche, schlichte aber optisch angenehmne UI baut  
4. die Vercel-Functions implementiert  
5. die PubChem-Anbindung integriert  
6. das Stoichiometrie-System entwickelt  
7. robuste Fehlerbehandlung implementiert  


