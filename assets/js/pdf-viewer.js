pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

const pdfUrl = 'assets/pdf/RayMack-Catalog.pdf';
let pdfDoc = null;
const scale = 2; 
let originalPageWidth = 0;
let originalPageHeight = 0;
const renderedPages = new Set();

function calculateSize() {
    const isMobile = window.innerWidth < 768;
    const containerWidth = $('.catalog-wrapper').width(); 
    
    let width, height;
    if (isMobile) {
        width = containerWidth;
        height = width * (originalPageHeight / originalPageWidth);
    } else {
        width = containerWidth;
        height = (width / 2) * (originalPageHeight / originalPageWidth);
        const maxHeight = window.innerHeight * 0.8;
        if (height > maxHeight) {
            height = maxHeight;
            width = (height / (originalPageHeight / originalPageWidth)) * 2;
        }
    }
    return { width, height, isMobile };
}

async function initCatalog() {
    const $flipbook = $("#flipbook");

    try {
        pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
        const totalPages = pdfDoc.numPages;
        document.getElementById("page-count").textContent = totalPages;

        const firstPage = await pdfDoc.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        originalPageWidth = viewport.width;
        originalPageHeight = viewport.height;

        const size = calculateSize();

        for (let i = 1; i <= totalPages; i++) {
            const pageDiv = $('<div />', { "class": "page" }).append($('<canvas />', { id: `canvas-p${i}` }));
            $flipbook.append(pageDiv);
        }

        $flipbook.turn({
            width: size.width,
            height: size.height,
            autoCenter: true,
            display: size.isMobile ? 'single' : 'double',
            acceleration: true,
            elevation: 50,
            gradients: true,
            when: {
                turning: function(event, page, view) {
                    view.forEach(p => { if (p !== 0) renderPage(p); });
                },
                turned: function(event, page) {
                    const view = $(this).turn('view');
                    // 修正 undefined 判斷邏輯
                    if (view.length > 1 && view[0] !== 0 && view[1] !== 0) {
                        // 雙頁模式且兩頁都有數值
                        document.getElementById("page-num").textContent = view[0] + " - " + view[1];
                    } else {
                        // 單頁模式或封面/封底
                        document.getElementById("page-num").textContent = view[0] || view[1];
                    }
                }
            }
        });

        renderPage(1);
        if (!size.isMobile) renderPage(2);

        $(window).resize(function() {
            const newSize = calculateSize();
            $flipbook.turn('display', newSize.isMobile ? 'single' : 'double');
            $flipbook.turn('size', newSize.width, newSize.height);
        });

        $("#prev-btn").click(() => $flipbook.turn("previous"));
        $("#next-btn").click(() => $flipbook.turn("next"));

    } catch (err) {
        console.error("Error loading PDF: ", err);
    }
}

async function renderPage(num) {
    if (renderedPages.has(num)) return;
    renderedPages.add(num);

    const page = await pdfDoc.getPage(num);
    const canvas = document.getElementById(`canvas-p${num}`);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: scale });
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
}

$(window).ready(initCatalog);