ZARA'S LITTLE LIBRARY — THREE-LAYER READING INTERFACE

Upload index.html, books.json and the entire assets/ folder to your GitHub repository.
Cloudflare Workers must serve these static files at the site root.

Landing artwork: the exact approved image supplied in conversation.
The invisible book-cover click targets are placed over that image.
Only Kit and the Red Hat is active. Sara and Sam show a coming-soon message.

Reading interface: CSS-drawn book, separate text and controls, 8 separate image assets.
The pictures start hidden and one functional Reveal/Hide button controls visibility.
No read-aloud feature (removed per earlier request).

IMPORTANT ARTWORK NOTE:
The eight available page illustrations are older, relatively low-resolution assets
and show a GREEN triceratops named Pip, rather than the lavender Sara character on
the approved landing image. They are retained as interim story art, not newly
approved final art. Replace each file in assets/ with a full-resolution final
illustration using the same filename when available. No artwork is baked into
the reader controls.

To preview locally, use a static HTTP server (e.g. python -m http.server 8000).
