# Personal Publishing

The personal publishing context defines the written material on the site and the relationships readers can explore between pieces of writing.

## Language

**Blog**:
The public section of the website where readers browse, read, and spatially explore published writing.
_Avoid_: Knowledge base, wiki, documents section

**Document**:
A single published Markdown item within the Blog. Personal and Technical writing use the same structure and reading experience.
_Avoid_: Post, article, note

**Category**:
The single classification assigned to a Document: either Personal or Technical.
_Avoid_: Type, section, tag

**Connection**:
A non-directional relationship established when one Document contains an internal Markdown link to another Document. The originating link remains available when distinguishing outgoing links from backlinks in Document View.
_Avoid_: Directed edge, association, manually curated edge

**Unresolved Reference**:
A link to a Document that does not exist. Graph View represents it as a warning placeholder rather than treating it as a Document.
_Avoid_: Missing Document, broken Document, Document node

**Document View**:
The Blog mode centered on reading one Document and navigating its immediate context.
_Avoid_: Article page, post page, reader mode

**Graph View**:
The Blog mode for spatially exploring Documents and their Connections.
_Avoid_: Knowledge graph, network page, visualization mode

**Node Preview**:
A compact excerpt of a selected Document shown without leaving Graph View.
_Avoid_: Modal, detail page, quick view

**Draft**:
A Document intentionally excluded from the public Blog until it is ready to publish.
_Avoid_: Private document, unpublished page
