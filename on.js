
/**
 * Ooo: Global utility for DOM access, function queueing, and dynamic resource loading.
 */
const Ooo = (() => {
  // ========== Utility Shortcuts ==========
  var norushArray = [];                            // Initialize the function queue array
  var W = window;                                  // Shortcut for window object
  var D = document;                                // Shortcut for document object
  var B = document.body;                           // Shortcut for document body element
  var Q = selector => D.querySelectorALL(selector);   // Shortcut: select one element by CSS selector
  var GA = (el, attr) => el.getAttribute(attr);    // Shortcut: get attribute value from element
  var SA = (el, attr, val) => el.setAttribute(attr, val); // Shortcut: set attribute on element
  var CE = (tag) => D.createElement(tag); // Shortcut: set attribute on element

  /**
   * norush: Queue or run functions (FIFO).
   * If arguments are given, queue them. If not, run all in queue.
   */
  function norush(...args) {
    if (args.length) {                 // If we received arguments,
      norushArray.push(...args);       // Add them to the queue.
    } else {                           // Otherwise,
      while (norushArray.length > 0) { // While the queue is not empty,
        const fn = norushArray.shift();// Remove the first function from the queue.
        if (typeof fn === 'function')  // If it's a function,
          fn();                        // Execute it.
      }
    }
  }

  // ========== CDN Resource Loading ==========
  // Shorthand library names to CDN paths
  const cdnLibraryMap = {
    jqui: 'jq @jqueryui/1.13.3/jquery-ui.min.js',
    jq: '@jquery/3.7.1/jquery.min.js',
    flowbite: '@flowbite/2.3.0/flowbite.min.js',
    googlefonts: '~google-icons.js',
    marked: '~marked.js',
    flowbitecss: '@flowbite/2.3.0/flowbite.min.css',
    chartjs: '@Chart.js/4.4.1/chart.min.js',
    codemirror:
      '@codemirror/6.65.7/codemirror.min.js\n' +
      '@codemirror/6.65.7/mode/javascript/javascript.min.js\n' +
      '@codemirror/6.65.7/addon/hint/javascript-hint.min.js\n' +
      '@codemirror/6.65.7/codemirror.min.css\n' +
      '@codemirror/6.65.7/theme/elegant.min.css\n' +
      '@codemirror/6.65.7/addon/hint/show-hint.min.css',
    pdfjs: '@pdf.js/4.3.136/pdf.min.mjs',
    dayjs: '@dayjs/1.11.11/dayjs.min.js',
    lodash: '@lodash.js/4.17.21/lodash.min.js',
    prismjs: '@prism/1.29.0/prism.min.js',
    prismcss: '@prism/1.29.0/themes/prism-tomorrow.min.css',
    d3: '@d3/7.8.5/d3.min.js',
    dtf: 'https://pono.cc/dtf.js'
  };

  // Add Bootswatch themes (iterate over the string, split into themes)
  for (const theme of 'darkly sketchy sandstone materia lux litera journal flatly simplex slate superhero yeti'.split(' ')) {
    cdnLibraryMap[theme] = `https://cdnjs.cloudflare.com/ajax/libs/bootswatch/5.3.3/${theme}/bootstrap.min.css`;
  }

  // CDN base URLs by prefix
  const cdnBaseUrls = {
    '@': 'https://cdnjs.cloudflare.com/ajax/libs/',   // For @ prefix
    '!': 'https://unpkg.com/',                        // For ! prefix
    '^': 'https://pono.cc/',                          // For ^ prefix
    '~': 'https://cbpilthem.github.io/oi/'            // For ~ prefix
  };

  // Track loaded URLs to avoid duplicates
  const loadedUrls = new Set();

  /**
   * Recursively resolve shorthands and build a flat URL list.
   */
  function parseSourceList(srcList) {
    const result = [];                    // The output array of resolved URLs
    const seen = new Set();               // Track which slugs we've already processed

    function processChunk(chunk) {
      if (!chunk) return;                 // Skip empty chunks
      for (let slug of chunk.split(/[\s%,|]+/)) {   // Split chunk on various delimiters
        slug = slug.trim();               // Remove surrounding whitespace
        if (!slug || seen.has(slug)) continue;  // Skip if already seen or empty
        seen.add(slug);                   // Mark slug as seen

        if (cdnLibraryMap[slug]) {        // If it's a known shorthand,
          processChunk(cdnLibraryMap[slug]); // Recursively process its value
        } else if (cdnBaseUrls[slug[0]]) { // If it starts with a known CDN prefix,
          const url = cdnBaseUrls[slug[0]] + slug.slice(1); // Build the full CDN URL
          if (!loadedUrls.has(url)) result.push(url);       // Add if not already loaded
        } else if (/^https?:\/\//.test(slug)) {             // If it looks like a full URL,
          if (!loadedUrls.has(slug)) result.push(slug);     // Add if not already loaded
        }
      }
    }

    processChunk(srcList);                 // Start the recursive process
    return result;                         // Return the list of URLs
  }

  /**
   * Insert a <link> stylesheet into <head>.
   */
  function insertStyleElement(linkEl) {
    const firstStyle = D.querySelector('head style'); // Find the first <style> tag in <head>
    if (firstStyle) {
      firstStyle.insertAdjacentElement('beforebegin', linkEl); // Insert before first <style>
    } else {
      D.head.appendChild(linkEl);                         // Otherwise, just append to head
    }
  }

  /**
   * Load JS and CSS resources in parallel. Calls callback when all are loaded.
   */
  function loadResources(urls, onLoaded) {
    if (!urls.length)                                // If no URLs, call callback immediately
      return void (typeof onLoaded === 'function' && onLoaded());
    let remaining = urls.length;                     // Track how many are left to load

    urls.forEach(url => {
      loadedUrls.add(url);                           // Mark URL as loaded
      const isCSS = url.endsWith('.css');            // Check if it's a CSS file
      const el = D.createElement(isCSS ? 'link' : 'script'); // Create link or script element
      if (isCSS) {                                   // If CSS,
        el.rel = 'stylesheet';                       // Set proper rel
        el.href = url;                               // Set href
        insertStyleElement(el);                      // Insert stylesheet
      } else {                                       // Otherwise,
        el.src = url;                                // Set script src
        D.head.appendChild(el);                      // Append script to head
      }
      el.onload = () => {                            // On successful load,
        if (--remaining === 0 && typeof onLoaded === 'function') onLoaded(); // Call callback if done
      };
      el.onerror = () => {                           // On error, also decrement and check
        if (--remaining === 0 && typeof onLoaded === 'function') onLoaded();
      };
    });
  }

  /**
   * Main entry: Accepts a string of shorthands/URLs and loads them, then runs callback.
   * @param {string} urls Input string of shorthands or URLs
   * @param {function|string} onLoaded Function or global name to call after load
   */
  function ezSrc(urls, onLoaded) {
    const parsedUrls = parseSourceList(urls);        // Convert input to list of URLs
    if (!parsedUrls.length) {                        // If nothing to load,
      if (typeof onLoaded === 'function') onLoaded();// Just call callback
      else if (typeof onLoaded === 'string' && typeof W[onLoaded] === 'function') W[onLoaded]();
      return;
    }
    loadResources(parsedUrls, () => {                // Load resources
      if (typeof onLoaded === 'function') onLoaded();// After all loaded, call callback
      else if (typeof onLoaded === 'string' && typeof W[onLoaded] === 'function') W[onLoaded]();
    });
    setTimeout(() => norush(), 400);                 // After short delay, run queued functions
  }

  // ========== Auto-Loader for Script Tag ==========
  (() => {
    const TAG = D.currentScript || { src: '' };              // Get current script tag
    let ezSrcStart = (TAG.src.split('?')[1] || '').replace(/%20/g, ' '); // Parse resources from src query

    if (TAG.getAttribute) {                        // If tag supports getAttribute,
      const loadAttr = TAG.getAttribute('load');   // Get 'load' attribute
      if (loadAttr) ezSrcStart += ` ${loadAttr}`;  // Add to resource string if present
    }

    if (ezSrcStart.trim()) {                       // If there is anything to load,
      ezSrc(ezSrcStart, 'firstLoad');              // Load it, call 'firstLoad' on completion
    }

    if (TAG && TAG.remove) TAG.remove();           // Remove this script tag from DOM if possible
  })();

  // Expose Ooo public API
  return { norush, W, D, B, Q, GA, SA, ezSrc };
})();

window.Ooo = Ooo; // Attach the Ooo object to the global window
