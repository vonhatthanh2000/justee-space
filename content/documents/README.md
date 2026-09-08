# Bilingual documents

Each document has one stable slug and can provide one or both language versions:

- `english/my-document.md` is the English version.
- `vietnamese/my-document.md` is the Vietnamese version.

Translated files must use the same slug, category, tags, publication date, and internal `/blog/<slug>` links. The blog groups these files into one document and displays the available language flags automatically.

Add one or more stable topic tags to every document:

```yaml
tags:
  - ai
  - systems-design
```

Tags use lowercase letters, numbers, and hyphens. Keep the same tags, in the same order, in the English and Vietnamese versions. Tags are identifiers rather than translated display copy, so a reader can filter the collection consistently in either language.

Readers can select more than one tag in Document View or Graph View. A document is included when it matches any selected tag; category and text-search filters are then applied as additional constraints.

Documents can also include an optional part label:

```yaml
part: Part 1. Hello World
```

The part is display copy shown directly above the document title. It may be translated independently in each language version. Omit it for standalone documents that do not belong to a series.

Vietnamese is the default reading language when a translation exists. English remains available at `/blog/<slug>?lang=en`.
