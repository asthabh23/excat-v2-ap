export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-service-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-service-img-col');
        }
      }

      // Clean up markdown heading markers (## ) from text content
      const firstP = col.querySelector('p:first-child');
      if (firstP && firstP.textContent.startsWith('## ')) {
        firstP.textContent = firstP.textContent.replace(/^##\s*/, '');
      }

      // Split paragraphs on double line breaks to separate heading from body text
      const paragraphs = col.querySelectorAll('p');
      paragraphs.forEach((p) => {
        const html = p.innerHTML;
        // Split on <br><br> to separate heading from body
        const parts = html.split(/<br\s*\/?>\s*<br\s*\/?>/i);
        if (parts.length > 1) {
          // Clear the paragraph and rebuild with separate elements
          p.innerHTML = '';

          // Create heading for first part
          const heading = document.createElement('p');
          heading.className = 'columns-service-heading';
          heading.innerHTML = parts[0];
          p.appendChild(heading);

          // Create body paragraphs for remaining parts
          for (let i = 1; i < parts.length; i++) {
            const bodyP = document.createElement('p');
            bodyP.className = 'columns-service-body';
            bodyP.innerHTML = parts[i];
            p.appendChild(bodyP);
          }
        }
      });
    });
  });
}
