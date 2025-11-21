# Codex Instructions

Diese Datei beschreibt die Anforderungen an OpenAI Codex für die automatische Generierung des gesamten Projekts.

Codex darf Entscheidungen über Architektur, Framework, Technologien und Struktur **vollständig autonom** treffen, solange alle Anforderungen eingehalten werden.

---

## 1. Projektziel
Erstelle ein vollständig lauffähiges Webtool, das:

1. ein einziges Textfeld besitzt, in das der User eine chemische Versuchsbeschreibung eingibt  
2. alle Chemikalien, Mengen und Reaktionsdetails automatisch identifiziert  
3. PubChem-Abfragen sauber integriert  
4. ein vollständiges Stoichiometrie-Modul implementiert  
5. klare und hilfreiche UI-Fehlermeldungen liefert  
6. auf Vercel deploybar ist  
7. den OpenAI-Key ausschließlich über eine Serverless Function nutzt  

---

## 2. Architekturanforderungen

### 2.1 Allgemein
Codex darf den Tech-Stack komplett frei wählen.  
Erlaubte und gewünschte Technologien:

- Frontend: HTML/JS, React, Next.js, Svelte, Astro (Codex entscheidet)
- Backend: **Vercel Serverless Functions**
- Sprache: JS/TS oder Python
- Build-System: frei wählbar

### 2.2 Security
- **Der OpenAI-API-Key darf niemals im Client erscheinen.**
- API-Aufrufe an OpenAI ausschließlich über Serverless Functions.

### 2.3 PubChem
- PubChem via REST API (JSON)
- Mehrfach-Abfragen erlaubt, falls Ergebnis unklar ist
- Fehlerrobustheit: Netzwerkfehler wiederholen
- Bei Mehrdeutigkeit → UI-Feedback generieren

### 2.4 Stoichiometrie-Modul
Das Modul muss u. a. folgende Funktionen enthalten:

- Molmassenberechnung
- Stoffmengenberechnung
- Äquivalente
- Limiting reagent
- theoretische Ausbeute
- JSON-Struktur für Reaktionen und Reagenzien
- einfache Erweiterbarkeit

Die genaue interne Struktur (Klassen, Module, Files) entscheidet Codex.

---

## 3. User Experience Anforderungen

### 3.1 Ein einziges Eingabefeld
Keine weiteren Felder.  
Das System muss alle Eingabeformen automatisch erkennen (über GPT-5 als LLM):

- Freitext  
- CAS  
- SMILES  
- chemische Namen  
- Synonyme  
- unstrukturierte Beschreibungen  

### 3.2 Feedback-System
Wenn Informationen fehlen, unklar sind oder nicht eindeutig identifiziert werden können:
- UI gibt klare Hinweise
- Es wird erklärt, was der User ergänzen muss
- Keine stillen Fehler

### 3.3 Output
Das Ergebnis soll in der UI gut strukturiert angezeigt werden, z. B.:
- Tabellen der Reagenzien
- Berechnete Molmassen
- Stoffmengen
- Äquivalente
- limiting reagent
- theoretische Ausbeute

Parallel soll der komplette Output als JSON verfügbar sein.

---

## 4. Projektstruktur
Codex entscheidet die Ordnerstruktur, aber:

- Im Root müssen README.md und CODEX_INSTRUCTIONS.md bestehen bleiben
- Alle Dateien müssen deploybar sein
- Vercel-Konventionen müssen eingehalten werden

---

## 5. Qualitätsanforderungen

- Saubere Modultrennung
- Robust gegenüber fehlerhaften User-Inputs
- Verständliche interne Dokumentation
- Erweiterbare Architektur
- Klare Fehlermeldungen
- Deployment muss out-of-the-box funktionieren
- **Automatisierte Tests für die Kernlogik (mindestens Parsing, Stoichiometrie-Berechnungen und PubChem-Datenverarbeitung)**
- **Ein einfacher Test-Command (z. B. `npm test`, `pnpm test`, `pytest`), der alle Tests ausführt**


---

## 6. Hinweis für Codex
Codex ist für die **komplette Implementierung** verantwortlich:
- Parsing
- Chemikalienidentifikation
- PubChem-Client
- Reaktionsverarbeitung
- UI
- Serverless Functions
- Build und Deploybarkeit

---

## 7. Tests

Codex muss automatisierte Tests implementieren und dokumentieren.

### 7.1 Test-Framework

- Codex darf das Test-Framework passend zur gewählten Sprache/Architektur wählen:
  - Bei JavaScript/TypeScript z. B. Vitest, Jest oder ähnliches
  - Bei Python z. B. pytest
- Die Wahl des Frameworks soll im README kurz erläutert werden.

### 7.2 Testabdeckung (Minimum)

Es müssen mindestens folgende Bereiche mit Tests abgedeckt werden:

- Parsing der Nutzereingabe:
  - verschiedene Eingabetypen (Name, CAS, SMILES, gemischt)
  - fehlerhafte oder unvollständige Eingaben
- Stoichiometrie-Berechnungen:
  - korrekte Berechnung von Molmassen, Stoffmengen, Äquivalenten
  - korrekte Bestimmung des limiting reagents
  - Berechnung der theoretischen Ausbeute
- PubChem-Integration:
  - Umgang mit gültigen Treffern
  - Umgang mit mehreren Treffern (Mehrdeutigkeit)
  - Umgang mit Fehlern (z. B. keine Treffer, Netzwerkfehler)

### 7.3 Testausführung

- Es muss ein einfacher Befehl existieren, um alle Tests auszuführen, z. B.:
  - `npm test`
  - `pnpm test`
  - `pytest`
- Dieser Befehl muss im README dokumentiert sein.
- Die Tests sollen so implementiert werden, dass sie:
  - deterministisch laufen,
  - ohne spezielle Geheimnisse/Keys auskommen, oder
  - bei Bedarf Mocks/Stubs für externe APIs (PubChem, OpenAI) nutzen.

### 7.4 Verantwortung von Codex

- Codex ist dafür verantwortlich:
  - das Test-Setup anzulegen,
  - Tests für alle Kernfunktionen zu schreiben,
  - sicherzustellen, dass der Test-Command erfolgreich durchläuft.
- Wo sinnvoll, sollen zuerst Tests erstellt werden (testgetriebene oder zumindest testunterstützte Entwicklung).


Diese Instructions dürfen frei interpretiert werden, solange das Ziel erreicht wird.
