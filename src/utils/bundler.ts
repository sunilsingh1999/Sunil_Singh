import JSZip from 'jszip';
import type { GeneratedFile } from '../types/builder';

export function slugifyTitle(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'kinetix-app';
}

const ERROR_BRIDGE_SCRIPT = `<script>
(function() {
  window.addEventListener('error', function(e) {
    try {
      window.parent.postMessage({
        source: 'kinetix-preview',
        type: 'runtime-error',
        message: e.message || 'Runtime script error',
        line: e.lineno || 0
      }, '*');
    } catch (_) {}
  });
  window.addEventListener('unhandledrejection', function(e) {
    try {
      var reason = e.reason && e.reason.message ? e.reason.message : String(e.reason || 'Unhandled promise rejection');
      window.parent.postMessage({
        source: 'kinetix-preview',
        type: 'runtime-error',
        message: reason,
        line: 0
      }, '*');
    } catch (_) {}
  });
})();
</script>`;

export function assemblePreviewDocument(
  files: GeneratedFile[],
  options: { injectErrorBridge?: boolean } = {}
): string {
  const htmlFile = files.find((f) => f.path.toLowerCase().endsWith('.html'));
  const cssFiles = files.filter((f) => f.path.toLowerCase().endsWith('.css'));
  const jsFiles = files.filter((f) => f.path.toLowerCase().endsWith('.js'));

  const combinedCss = cssFiles.map((f) => f.content).join('\n\n');
  const combinedJs = jsFiles.map((f) => f.content).join('\n\n');

  let html =
    htmlFile?.content ??
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Generated App</title>
  </head>
  <body>
    <main style="font-family: sans-serif; padding: 2rem;">No index.html generated yet.</main>
  </body>
</html>`;

  // Remove external relative stylesheet & script references that we are inlining
  html = html.replace(/<link[^>]*href=["'](?:\.\/)?styles\.css["'][^>]*>/gi, '');
  html = html.replace(/<script[^>]*src=["'](?:\.\/)?script\.js["'][^>]*><\/script>/gi, '');

  const styleTag = combinedCss ? `<style>\n${combinedCss}\n</style>` : '';
  const bridgeTag = options.injectErrorBridge ? ERROR_BRIDGE_SCRIPT : '';
  const scriptTag = combinedJs
    ? `<script>\n${combinedJs}\n</script>`
    : '';

  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `${bridgeTag}\n${styleTag}\n</head>`);
  } else {
    html = `${bridgeTag}\n${styleTag}\n${html}`;
  }

  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `${scriptTag}\n</body>`);
  } else {
    html = `${html}\n${scriptTag}`;
  }

  return html;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function injectAdCodeIntoHtml(html: string, adHtml?: string): string {
  if (!adHtml || !adHtml.trim()) return html;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${adHtml}\n</body>`);
  }
  return `${html}\n${adHtml}`;
}

export function downloadSingleHtml(
  projectTitle: string,
  files: GeneratedFile[],
  adInjectionHtml?: string
) {
  const fullHtml = injectAdCodeIntoHtml(
    assemblePreviewDocument(files, { injectErrorBridge: false }),
    adInjectionHtml
  );
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  triggerDownload(blob, `${slugifyTitle(projectTitle)}.html`);
}

export async function downloadProjectZip(
  projectTitle: string,
  files: GeneratedFile[],
  adInjectionHtml?: string
) {
  const zip = new JSZip();
  const slug = slugifyTitle(projectTitle);

  for (const file of files) {
    const cleanPath = file.path.replace(/^\/+/, '');
    const content =
      cleanPath.toLowerCase() === 'index.html'
        ? injectAdCodeIntoHtml(file.content, adInjectionHtml)
        : file.content;
    zip.file(cleanPath, content);
  }

  const hasReadme = files.some((f) => f.path.toLowerCase() === 'readme.md');
  if (!hasReadme) {
    zip.file(
      'README.md',
      `# ${projectTitle}\n\nGenerated with AI1999 by Sunil Singh.\n\n## Run Locally\n\nOpen \`index.html\` in your browser or serve the folder with any static server:\n\n\`\`\`bash\nnpx serve .\n\`\`\`\n`
    );
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `${slug}.zip`);
}
