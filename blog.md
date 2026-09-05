# Personal Website — Document and Graph Theme Direction

## Purpose

This brief adapts the visual character of Arkon's wiki into a personal website centered on two equally important experiences:

1. reading Markdown documents;
2. exploring the relationships between those documents in a graph.

The site should feel like a bright, editorial interpretation of outer space. It should retain the reference's warmth, restraint, and generous negative space rather than becoming a dark sci-fi interface. Celestial ideas should appear through composition, color, and small details; the writing remains the focal point.

This is a theme and layout direction, not a detailed component or implementation specification.

## Content model

Every published item is a **Document** and uses the same page structure and Markdown renderer. There is no separate Blog or Knowledge content type.

Each Document has one **Category**:

- **Personal**
- **Technical**

Category is visible and filterable in both Document View and Graph View. The slug identifies the document's URL; it should not carry the responsibility for classification.

Documents become connected through links between them. These links are the foundation of the graph, not merely decorative metadata.

## Overall visual character

The reference works because it combines an editorial reading surface with the quiet utility of a knowledge tool. Its strongest visual ingredients are:

- a warm linen background rather than stark white;
- dark brown text rather than pure black;
- burnt orange as the main accent;
- a literary serif for titles and headings paired with a clean sans-serif for body text and controls;
- fine, low-contrast borders;
- shallow shadows and softly rounded corners;
- compact controls surrounded by generous empty space;
- muted supporting colors that never compete with the content.

For the personal site, this becomes **bright cosmic minimalism**. The linen field can suggest starlight or aged astronomical paper; burnt orange can behave like a small sun; muted violet, sand, or blue-gray can suggest planetary categories and graph states. Avoid large star fields, glowing gradients behind text, or ornamental space imagery inside the reading column. A faint orbit, constellation, or grain motif may appear in peripheral or empty areas only.

The theme should feel calm, human, and slightly exploratory—not futuristic, technical, or game-like.

## Shared site shell

The two modes should belong unmistakably to the same website.

A compact shared header or navigation rail should provide:

- site identity;
- access to the document collection;
- category filters for Personal and Technical;
- search;
- a clearly labeled switch to Graph View.

The shell should remain visually quiet. The active destination uses a soft tinted background or underline rather than a heavy navigation block. On smaller screens, the navigation can collapse, but the route between Document View and Graph View must remain obvious.

The reference uses a full-height sidebar because it serves a large administrative product. A personal site can use a lighter shell—a narrow rail or compact top header—while preserving the same visual hierarchy and warm material language.

## Document View

Document View is the primary reading experience. It should favor a focused editorial column, with supporting navigation placed around it rather than inside it.

### Recommended layout

On a wide desktop, use three zones:

1. **Collection navigation** — a narrow left rail for search, category filters, and the document list.
2. **Reading column** — the flexible center with a deliberately limited text width.
3. **Context rail** — a slim right rail for document metadata, connections, and a local graph.

The center column should remain visually dominant. Side rails use smaller type, softer surfaces, and lower contrast so they support reading without turning the page into a dashboard. On narrower screens, collapse the left rail and move the right-rail information below the article or into a drawer.

### Page hierarchy

The reading page should establish a calm, repeatable sequence:

- breadcrumb or simple back path;
- large serif document title;
- category label and optional publication/update date;
- optional one-sentence summary;
- rendered Markdown body;
- references and connected documents after the main content.

A strong **Graph View** action should remain visible near the page header. The right context rail can contain a small local graph centered on the current Document, creating a visual bridge to the full graph without distracting from the article.

### Markdown presentation

The same renderer must be used for full documents and graph previews. This continuity is essential: selecting a graph node should feel like opening the same Document at a smaller scale, not entering a different content system.

The Markdown theme should include:

- serif headings with a clear but gentle scale;
- comfortable line length and generous line height;
- clear vertical rhythm between sections;
- subtle rules beneath major headings where helpful;
- burnt-orange links with visible hover and focus states;
- understated inline-code backgrounds;
- bordered code blocks with a copy action;
- readable tables inside softly bordered containers;
- blockquotes with a slim accent rule;
- restrained, rounded image treatment;
- a compact table of contents for long documents;
- visible document-to-document links.

Avoid putting the reading column inside a heavy card. Let the warm page background act as the paper, using cards only for supporting elements such as the table of contents, code blocks, citations, or metadata.

### Essential document elements

The theme is on course if Document View always makes these elements easy to find:

- title and Category;
- readable Markdown content;
- document links;
- backlinks or connected Documents;
- local graph or another visual connection cue;
- search and category filtering;
- direct route to Graph View.

## Graph View

Graph View is a separate, full-page exploration mode. It should feel spacious and spatial, using the same warm background as the document experience rather than switching to a dark canvas.

### Recommended layout

Use three layers:

1. **Compact top toolbar** — back to documents, Graph View title, document/link counts, search, and category filters.
2. **Full remaining canvas** — nodes, links, labels, and generous negative space.
3. **Floating utilities** — legend at the lower left and zoom/fit controls at the lower right.

The canvas should show clusters without filling every gap. The reference's wide empty field is a defining part of its elegance: it makes each cluster feel like a constellation and prevents the interface from becoming visually anxious.

### Graph semantics

Every node represents a Document, and every edge represents a Connection between Documents. Both Personal and Technical Documents appear together.

The graph must provide:

- category filters for Personal and Technical;
- a stable legend that explains node colors;
- document and connection counts;
- node search and centering;
- pan, zoom, fit, and node dragging;
- readable labels that reduce clutter at distant zoom levels;
- hover emphasis for a node and its direct neighbors;
- dimming of unrelated nodes and edges;
- a clear selected-node state;
- a graceful empty state when a filter has no results.

Use color primarily for Category. Choose one muted celestial hue for Personal and one for Technical, while reserving burnt orange for interaction, selection, links, and key actions. This keeps classification stable and avoids overloading node appearance with too many meanings.

### Node preview

Selecting a node opens a right-side preview panel approximately 400–520 pixels wide on desktop. The graph remains visible behind it so the user does not lose spatial context.

The panel should include:

- close control;
- document title;
- Category and lightweight metadata;
- a compact rendering of the Markdown content;
- connected-document cues where space allows;
- a prominent **View full page** action.

The panel should slide over the canvas rather than permanently shrinking it. On mobile, it may become a near-full-screen sheet while retaining an obvious return to the graph.

## Relationship between the two modes

The product should behave as one connected reading system, not as a document site with an unrelated visualization attached.

The interaction loop is:

```text
Document View → Graph View → select node → Node Preview → View full page → Document View
```

Three details make this loop coherent:

1. **One renderer:** full pages and previews share Markdown styling.
2. **One classification:** Personal and Technical filters mean the same thing in both modes.
3. **Real connections:** document links generate the graph relationships and backlink lists.

The local graph in Document View and the preview panel in Graph View are the two bridges between reading and spatial exploration.

## Category treatment

Personal and Technical should be peers. Neither is visually subordinate, and both use identical document templates.

Category can appear as a small chip, dot, or short label in:

- collection navigation;
- document headers;
- search results;
- graph filters;
- graph legend;
- node previews.

Filtering should behave consistently: selecting Personal or Technical limits the visible collection in the document browser and the visible nodes and edges in the graph. When both are active, cross-category Connections should remain visible.

## What must survive future design iterations

Visual details may evolve, but the following principles carry the identity and the two core features:

- bright warm canvas with restrained cosmic references;
- serif editorial headings and clean sans-serif interface text;
- generous negative space and low-contrast supporting surfaces;
- one consistent Markdown renderer;
- equal treatment of Personal and Technical Documents;
- explicit links and backlinks as the source of graph Connections;
- obvious two-way movement between full documents and the graph;
- node preview that preserves graph context and leads to the full page;
- search, filtering, legend, and interaction states that make the graph useful rather than ornamental.

If these elements are present, the site can change its exact spacing, icons, or decorative motifs without losing the intended direction.

## Reference palette and type direction

The Arkon reference uses the following useful starting points:

| Role            | Direction                                      |
| --------------- | ---------------------------------------------- |
| Page background | Warm linen, approximately `#faf5ee`            |
| Primary text    | Deep warm brown, approximately `#3a302a`       |
| Main accent     | Burnt sienna, approximately `#c2652a`          |
| Card surface    | Slightly darker cream, approximately `#f6f0e8` |
| Muted surface   | Warm gray-beige, approximately `#ece6dc`       |
| Muted text      | Soft gray-brown, approximately `#78706a`       |
| Heading type    | Literary serif, similar to EB Garamond         |
| Body/UI type    | Clean humanist sans, similar to Manrope        |

These values are a reference, not a requirement. The personal site's category colors and cosmic accents should be tested against this base for accessible contrast before the visual system is finalized.
