# Deutscher Passwort-Generator

Eine Webseite, die zufällige deutsche Sätze als Passwort erzeugt: leicht zu
merken, schwer zu erraten. Alles läuft im Browser, es werden keine Daten
geladen oder gesendet.

Live: [https://kgt1.github.io/password-website/](https://kgt1.github.io/password-website/)

## Format

```
flinkerFuchs.malt.leise.roteTomate.42!
```

Merksatz: „Flinker Fuchs malt leise rote Tomate – 42!“

| Teil     | Beispiel       | Inhalt                                                        |
|----------|----------------|---------------------------------------------------------------|
| Subjekt  | `flinkerFuchs` | Adjektiv (passend gebeugt) + Nomen im Nominativ               |
| Verb     | `malt`         | 3. Person Singular                                            |
| Adverb   | `leise`        | entfällt bei der Länge „Kürzer“                               |
| Objekt   | `roteTomate`   | Adjektiv (passend gebeugt) + Nomen im Akkusativ               |
| Zahl     | `42`           | 0 bis 6 zufällige Ziffern (Standard: 2)                       |
| Zeichen  | `!`            | Satzzeichen am Ende: `!`, `$`, `%` oder keins (Standard: `!`) |

Die Teile werden durch ein Trennzeichen verbunden: `.` (Standard), `,`,
Leerzeichen, `!`, `$` oder `%`. Auf der Seite sind die Satzteile im Passwort und
im Merksatz farbig und mit unterschiedlichen Linien unterstrichen, wie beim
Bestimmen von Satzgliedern in der Schule.

Jeder Satzteil wird unabhängig und gleich wahrscheinlich mit
`crypto.getRandomValues` gewählt
([ger-morph-pw-gen](https://github.com/KGT1/ger-morph-pw-gen)).

## Stärkeanzeige

Die Seite zeigt live, wie stark das Passwort mit den gewählten Einstellungen ist:

- **Bit** = Zweierlogarithmus der Anzahl möglicher Passwörter, mit Einstufung:
  unter 40 Schwach, 40–59 Mittel, 60–79 Stark, ab 80 Sehr stark;
- **Mögliche Passwörter**, z. B. 4,5 · 10¹⁹;
- **Aufschlüsselung** nach Satzteil (z. B. Adjektiv 854 × Nomen 2738 × Verb 333 × …);
- **durchschnittliche Zeit zum Erraten** für mehrere Angreifer, vom
  Online-Angriff mit Sperre bis zum Datenleck mit schwach geschützten
  Passwörtern und 1000 Grafikkarten.

Die Rechnung ist ehrlich: Sie nimmt an, dass der Angreifer das Verfahren und die
Wortlisten genau kennt. Trennzeichen, Satzzeichen und Groß-/Kleinschreibung
zählen deshalb nicht mit. Die Angaben gelten nur, wenn das Passwort unverändert
übernommen wird.

| Wortliste | Normal (mit Adverb), 2 Ziffern | Kürzer, 2 Ziffern |
|-----------|--------------------------------|-------------------|
| Standard  | 65,3 Bit                       | 57,3 Bit          |
| Kinder    | 56,1 Bit                       | 49,8 Bit          |

Jede weitere Ziffer bringt 3,3 Bit.

## Gleich auf deutscher und englischer Tastatur

Jedes Zeichen liegt auf einer deutschen (QWERTZ) und einer US-Tastatur (QWERTY)
an derselben Stelle: keine Umlaute, kein ß, kein `y` oder `z` (vertauscht) und
nur die Satzzeichen `! $ % . ,` und das Leerzeichen. Das Passwort lässt sich
also auch dann richtig eintippen, wenn das Tastaturlayout nicht das erwartete
ist, etwa beim Systemstart, in einer Fernwartungssitzung oder an einem fremden
Rechner.

## Einstellungen und Datenschutz

Wortliste (Standard oder Kinder), Länge, Ziffern, Trennzeichen und Satzzeichen
am Ende werden im `localStorage` des Browsers gespeichert, ebenso Tag- oder
Nachtmodus. Passwörter werden nie gespeichert, protokolliert oder übertragen.
Die Seite lädt nichts von fremden Servern und setzt eine strenge
Content-Security-Policy.

## Wortlisten und Lizenz

Die Wortlisten stammen aus
[german-morph-filter](https://github.com/KGT1/german-morph-filter) und stehen
unter [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.de):

- Wortformen und Verwendungshinweise: Wiktionary-Autoren (über kaikki.org), CC BY-SA 4.0
- Worthäufigkeiten: wordfreq (Robyn Speer), CC BY-SA 4.0
- Hinweise für die Kinderliste: LaRS-Wortliste / Grundwortschatz Berlin (LISUM), CC BY-SA 4.0

Der Code der Webseite steht unter der MIT-Lizenz, siehe [LICENSE](LICENSE).

## Entwicklung

Die Bibliothek und die Wortlisten werden aus Nachbarordnern eingebunden, die
drei Repositories müssen also nebeneinander liegen:

```
ger-morph-pw-gen/      # https://github.com/KGT1/ger-morph-pw-gen
german-morph-filter/   # https://github.com/KGT1/german-morph-filter
password-website/      # dieses Repository
```

```bash
npm install
npm run build           # docs/script.js (esbuild, Wortlisten eingebettet)
npm run typecheck       # tsc --noEmit
npm test                # Unit-Tests (node --test)
npm run sync-wordlists  # Wortlisten aus ../german-morph-filter/data/output kopieren
npm run dev             # Watch-Modus und lokaler Server
```

GitHub Pages liefert den Ordner `docs/` aus; `docs/script.js` wird deshalb mit
eingecheckt.

```
src/
├── script.ts      # Seite: Anzeige, Einstellungen, Kopieren, Tag/Nacht
├── format.ts      # reine Hilfsfunktionen (Formatierung, Optionen), getestet
├── wordlists.ts   # eingebettete Wortlisten
└── wordlists/     # wordlist_main.json, wordlist_kids.json (CC BY-SA 4.0)
tests/             # node --test
docs/              # index.html, style.css, script.js (GitHub Pages)
```
