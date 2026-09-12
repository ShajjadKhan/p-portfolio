/**
 * tools-engine.js - Interactive Engine for 32+ Utilities
 * FastTrack Tools (https://www.shajjadkhan.com)
 */

document.addEventListener('DOMContentLoaded', () => {
    const workspace = document.getElementById('toolWorkspace');
    if (!workspace) return;

    const toolId = workspace.getAttribute('data-tool-id');
    const loadingEl = document.getElementById('workspaceLoading');

    try {
        if (typeof ToolRenderers[toolId] === 'function') {
            workspace.innerHTML = '';
            ToolRenderers[toolId](workspace);
        } else {
            workspace.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <h3>Tool initialization</h3>
                    <p style="color: var(--text-muted);">Workspace for <code>${toolId}</code> is ready.</p>
                </div>
            `;
        }
    } catch (err) {
        console.error('Error rendering tool workspace:', err);
        workspace.innerHTML = `
            <div style="color: var(--accent-red); padding: 2rem; text-align: center;">
                <h3>Failed to load tool workspace</h3>
                <p>${err.message}</p>
            </div>
        `;
    }
});

// --- Helper Functions ---
const Utils = {
    formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    copyToClipboard(text, btnElement) {
        navigator.clipboard.writeText(text).then(() => {
            if (btnElement) {
                const original = btnElement.textContent;
                btnElement.textContent = '✓ Copied!';
                btnElement.style.color = 'var(--accent)';
                setTimeout(() => {
                    btnElement.textContent = original;
                    btnElement.style.color = '';
                }, 2000);
            }
        });
    },

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    createDropzone(container, accept, multiple, onFilesDropped) {
        const dropzone = document.createElement('div');
        dropzone.className = 'dropzone';
        dropzone.innerHTML = `
            <div class="dropzone-icon">📁</div>
            <div class="dropzone-title">Click to browse or drag & drop files here</div>
            <div class="dropzone-subtitle">Supported: ${accept} (Instant client-side processing)</div>
            <button type="button" class="dropzone-btn">Choose Files</button>
            <input type="file" accept="${accept}" ${multiple ? 'multiple' : ''} style="display: none;">
        `;

        const fileInput = dropzone.querySelector('input[type="file"]');
        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.querySelector('.dropzone-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                onFilesDropped(Array.from(e.target.files));
            }
        });

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                onFilesDropped(Array.from(e.dataTransfer.files));
            }
        });

        container.appendChild(dropzone);
        return dropzone;
    }
};

// --- Tool Implementations ---
const ToolRenderers = {

    // 1. JPG & Images to PDF
    'jpg-to-pdf': (container) => {
        let filesList = [];
        container.innerHTML = `
            <div id="dz-area"></div>
            <div id="files-list" class="files-preview-list"></div>
            <div class="controls-panel" id="pdf-controls" style="display: none;">
                <div class="control-group">
                    <label>Page Orientation</label>
                    <select id="pdf-orientation">
                        <option value="auto">Auto (Match Image)</option>
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>Margins</label>
                    <select id="pdf-margins">
                        <option value="0">None (Full Bleed)</option>
                        <option value="20" selected>Standard (20pt)</option>
                        <option value="40">Large (40pt)</option>
                    </select>
                </div>
                <div class="control-group" style="margin-left: auto; justify-content: flex-end;">
                    <button class="btn-primary" id="btn-create-pdf">⚡ Generate & Download PDF</button>
                </div>
            </div>
            <div id="status-box" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dzArea = container.querySelector('#dz-area');
        const filesContainer = container.querySelector('#files-list');
        const controls = container.querySelector('#pdf-controls');
        const statusBox = container.querySelector('#status-box');

        Utils.createDropzone(dzArea, 'image/jpeg,image/png,image/webp', true, (newFiles) => {
            filesList = [...filesList, ...newFiles];
            renderList();
        });

        function renderList() {
            filesContainer.innerHTML = '';
            controls.style.display = filesList.length > 0 ? 'flex' : 'none';

            filesList.forEach((file, index) => {
                const card = document.createElement('div');
                card.className = 'file-preview-card';
                card.innerHTML = `
                    <img class="file-thumbnail" src="${URL.createObjectURL(file)}" alt="Preview">
                    <div class="file-card-name" title="${file.name}">${file.name}</div>
                    <div class="file-card-size">${Utils.formatBytes(file.size)}</div>
                    <div class="file-actions">
                        <button class="action-mini-btn" title="Move Left" data-action="left">◀</button>
                        <button class="action-mini-btn" title="Move Right" data-action="right">▶</button>
                        <button class="action-mini-btn btn-del" title="Remove" data-action="del">✕</button>
                    </div>
                `;

                card.querySelector('[data-action="left"]').onclick = () => {
                    if (index > 0) {
                        const temp = filesList[index - 1];
                        filesList[index - 1] = filesList[index];
                        filesList[index] = temp;
                        renderList();
                    }
                };

                card.querySelector('[data-action="right"]').onclick = () => {
                    if (index < filesList.length - 1) {
                        const temp = filesList[index + 1];
                        filesList[index + 1] = filesList[index];
                        filesList[index] = temp;
                        renderList();
                    }
                };

                card.querySelector('[data-action="del"]').onclick = () => {
                    filesList.splice(index, 1);
                    renderList();
                };

                filesContainer.appendChild(card);
            });
        }

        container.querySelector('#btn-create-pdf').onclick = async () => {
            if (!filesList.length) return;
            statusBox.textContent = 'Assembling PDF in browser...';
            try {
                const { PDFDocument } = window.PDFLib;
                const pdfDoc = await PDFDocument.create();
                const orientation = container.querySelector('#pdf-orientation').value;
                const margin = parseInt(container.querySelector('#pdf-margins').value, 10);

                for (const file of filesList) {
                    const arrayBuffer = await Utils.readFileAsArrayBuffer(file);
                    let embeddedImage;

                    if (file.type === 'image/png') {
                        embeddedImage = await pdfDoc.embedPng(arrayBuffer);
                    } else {
                        // Embed as JPG or convert WebP to JPG via canvas
                        try {
                            embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
                        } catch (e) {
                            // Fallback: draw through canvas to get JPG
                            const dataUrl = await Utils.readFileAsDataURL(file);
                            const img = new Image();
                            await new Promise(r => { img.onload = r; img.src = dataUrl; });
                            const c = document.createElement('canvas');
                            c.width = img.width;
                            c.height = img.height;
                            const ctx = c.getContext('2d');
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, c.width, c.height);
                            ctx.drawImage(img, 0, 0);
                            const jpgBlob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
                            const buf = await Utils.readFileAsArrayBuffer(jpgBlob);
                            embeddedImage = await pdfDoc.embedJpg(buf);
                        }
                    }

                    const { width, height } = embeddedImage;
                    let pageWidth = width + margin * 2;
                    let pageHeight = height + margin * 2;

                    if (orientation === 'portrait' && pageWidth > pageHeight) {
                        const t = pageWidth; pageWidth = pageHeight; pageHeight = t;
                    } else if (orientation === 'landscape' && pageHeight > pageWidth) {
                        const t = pageWidth; pageWidth = pageHeight; pageHeight = t;
                    }

                    const page = pdfDoc.addPage([pageWidth, pageHeight]);
                    page.drawImage(embeddedImage, {
                        x: margin,
                        y: margin,
                        width: pageWidth - margin * 2,
                        height: pageHeight - margin * 2
                    });
                }

                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                Utils.downloadBlob(blob, `fasttrack_images_${Date.now()}.pdf`);
                statusBox.textContent = '✓ PDF successfully created and downloaded!';
            } catch (err) {
                console.error(err);
                statusBox.textContent = 'Error creating PDF: ' + err.message;
            }
        };
    },

    // 2. PDF Merge & Combine
    'pdf-merge': (container) => {
        let pdfFiles = [];
        container.innerHTML = `
            <div id="dz-merge"></div>
            <div id="merge-list" style="margin: 1.5rem 0; display: flex; flex-direction: column; gap: 0.75rem;"></div>
            <div class="controls-panel" id="merge-controls" style="display: none; justify-content: space-between;">
                <div style="font-size: 0.9rem; color: var(--text-muted);" id="merge-stats"></div>
                <button class="btn-primary" id="btn-merge">📑 Merge into Single PDF</button>
            </div>
            <div id="merge-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dz = container.querySelector('#dz-merge');
        const list = container.querySelector('#merge-list');
        const controls = container.querySelector('#merge-controls');
        const stats = container.querySelector('#merge-stats');
        const statusBox = container.querySelector('#merge-status');

        Utils.createDropzone(dz, 'application/pdf', true, (files) => {
            pdfFiles = [...pdfFiles, ...files];
            renderList();
        });

        function renderList() {
            list.innerHTML = '';
            controls.style.display = pdfFiles.length >= 2 ? 'flex' : 'none';
            stats.textContent = `${pdfFiles.length} files selected for merging`;

            pdfFiles.forEach((f, idx) => {
                const item = document.createElement('div');
                item.style.cssText = 'background: var(--bg-surface); border: 1px solid var(--border-color); padding: 0.85rem 1.25rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between;';
                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 0.85rem;">
                        <span style="font-size: 1.2rem;">📄</span>
                        <div>
                            <div style="font-weight: 600; font-size: 0.92rem;">${idx + 1}. ${f.name}</div>
                            <div style="font-size: 0.75rem; color: var(--text-dim);">${Utils.formatBytes(f.size)}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.4rem;">
                        <button class="action-mini-btn" data-act="up">▲</button>
                        <button class="action-mini-btn" data-act="down">▼</button>
                        <button class="action-mini-btn btn-del" data-act="del">✕</button>
                    </div>
                `;

                item.querySelector('[data-act="up"]').onclick = () => {
                    if (idx > 0) {
                        const tmp = pdfFiles[idx - 1];
                        pdfFiles[idx - 1] = pdfFiles[idx];
                        pdfFiles[idx] = tmp;
                        renderList();
                    }
                };

                item.querySelector('[data-act="down"]').onclick = () => {
                    if (idx < pdfFiles.length - 1) {
                        const tmp = pdfFiles[idx + 1];
                        pdfFiles[idx + 1] = pdfFiles[idx];
                        pdfFiles[idx] = tmp;
                        renderList();
                    }
                };

                item.querySelector('[data-act="del"]').onclick = () => {
                    pdfFiles.splice(idx, 1);
                    renderList();
                };

                list.appendChild(item);
            });
        }

        container.querySelector('#btn-merge').onclick = async () => {
            if (pdfFiles.length < 2) return;
            statusBox.textContent = 'Merging documents in browser memory...';
            try {
                const { PDFDocument } = window.PDFLib;
                const mergedPdf = await PDFDocument.create();

                for (const file of pdfFiles) {
                    const buf = await Utils.readFileAsArrayBuffer(file);
                    const doc = await PDFDocument.load(buf);
                    const pages = await mergedPdf.copyPages(doc, doc.getPageIndices());
                    pages.forEach(p => mergedPdf.addPage(p));
                }

                const pdfBytes = await mergedPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                Utils.downloadBlob(blob, `merged_document_${Date.now()}.pdf`);
                statusBox.textContent = '✓ Successfully merged and downloaded!';
            } catch (err) {
                statusBox.textContent = 'Merge failed: ' + err.message;
            }
        };
    },

    // 3. PDF Page Arranger & Reorder
    'pdf-arrange': (container) => {
        let currentDoc = null;
        let pagesData = []; // { index, rotation, canvas, deleted }

        container.innerHTML = `
            <div id="dz-arrange"></div>
            <div id="arrange-workspace" style="display: none; margin-top: 1.5rem;">
                <div class="controls-panel" style="justify-content: space-between; align-items: center;">
                    <div style="font-weight: 600;" id="page-stats">Pages</div>
                    <div style="display: flex; gap: 0.75rem;">
                        <button class="btn-secondary" id="btn-rotate-all">🔄 Rotate All 90°</button>
                        <button class="btn-primary" id="btn-export-arrange">💾 Export Arranged PDF</button>
                    </div>
                </div>
                <div id="pages-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1.25rem; margin-top: 1.5rem;"></div>
            </div>
            <div id="arrange-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dz = container.querySelector('#dz-arrange');
        const ws = container.querySelector('#arrange-workspace');
        const grid = container.querySelector('#pages-grid');
        const stats = container.querySelector('#page-stats');
        const statusBox = container.querySelector('#arrange-status');

        Utils.createDropzone(dz, 'application/pdf', false, async (files) => {
            if (!files.length) return;
            const file = files[0];
            statusBox.textContent = 'Rendering PDF page previews...';
            try {
                const arrayBuffer = await Utils.readFileAsArrayBuffer(file);
                const pdfjs = window.pdfjsLib;
                const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                currentDoc = arrayBuffer;
                pagesData = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 0.3 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');
                    await page.render({ canvasContext: ctx, viewport }).promise;

                    pagesData.push({
                        origIndex: i - 1,
                        pageNum: i,
                        rotation: 0,
                        canvas: canvas,
                        deleted: false
                    });
                }

                dz.style.display = 'none';
                ws.style.display = 'block';
                statusBox.textContent = '';
                renderGrid();
            } catch (err) {
                statusBox.textContent = 'Failed to load PDF: ' + err.message;
            }
        });

        function renderGrid() {
            grid.innerHTML = '';
            const activePages = pagesData.filter(p => !p.deleted);
            stats.textContent = `${activePages.length} active pages`;

            activePages.forEach((item, displayIdx) => {
                const card = document.createElement('div');
                card.className = 'file-preview-card';
                card.style.position = 'relative';

                const img = document.createElement('img');
                img.src = item.canvas.toDataURL();
                img.style.cssText = `width: 100%; height: 140px; object-fit: contain; background: #fff; border-radius: 4px; transform: rotate(${item.rotation}deg); transition: transform 0.2s;`;

                card.innerHTML = `
                    <div style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.35rem;">Page ${item.pageNum}</div>
                `;
                card.appendChild(img);

                const actions = document.createElement('div');
                actions.className = 'file-actions';
                actions.innerHTML = `
                    <button class="action-mini-btn" title="Move Left" data-act="left">◀</button>
                    <button class="action-mini-btn" title="Rotate 90°" data-act="rot">🔄</button>
                    <button class="action-mini-btn" title="Move Right" data-act="right">▶</button>
                    <button class="action-mini-btn btn-del" title="Delete Page" data-act="del">✕</button>
                `;

                actions.querySelector('[data-act="left"]').onclick = () => {
                    const curIndex = pagesData.indexOf(item);
                    if (curIndex > 0) {
                        const tmp = pagesData[curIndex - 1];
                        pagesData[curIndex - 1] = pagesData[curIndex];
                        pagesData[curIndex] = tmp;
                        renderGrid();
                    }
                };

                actions.querySelector('[data-act="right"]').onclick = () => {
                    const curIndex = pagesData.indexOf(item);
                    if (curIndex < pagesData.length - 1) {
                        const tmp = pagesData[curIndex + 1];
                        pagesData[curIndex + 1] = pagesData[curIndex];
                        pagesData[curIndex] = tmp;
                        renderGrid();
                    }
                };

                actions.querySelector('[data-act="rot"]').onclick = () => {
                    item.rotation = (item.rotation + 90) % 360;
                    img.style.transform = `rotate(${item.rotation}deg)`;
                };

                actions.querySelector('[data-act="del"]').onclick = () => {
                    item.deleted = true;
                    renderGrid();
                };

                card.appendChild(actions);
                grid.appendChild(card);
            });
        }

        container.querySelector('#btn-rotate-all').onclick = () => {
            pagesData.forEach(p => {
                if (!p.deleted) p.rotation = (p.rotation + 90) % 360;
            });
            renderGrid();
        };

        container.querySelector('#btn-export-arrange').onclick = async () => {
            const activePages = pagesData.filter(p => !p.deleted);
            if (!activePages.length) return;

            statusBox.textContent = 'Rebuilding PDF document...';
            try {
                const { PDFDocument, degrees } = window.PDFLib;
                const sourcePdf = await PDFDocument.load(currentDoc);
                const newPdf = await PDFDocument.create();

                for (const item of activePages) {
                    const [copiedPage] = await newPdf.copyPages(sourcePdf, [item.origIndex]);
                    const currentRot = copiedPage.getRotation().angle;
                    copiedPage.setRotation(degrees((currentRot + item.rotation) % 360));
                    newPdf.addPage(copiedPage);
                }

                const pdfBytes = await newPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                Utils.downloadBlob(blob, `rearranged_pdf_${Date.now()}.pdf`);
                statusBox.textContent = '✓ Exported successfully!';
            } catch (err) {
                statusBox.textContent = 'Export error: ' + err.message;
            }
        };
    },

    // 4. PDF Splitter & Page Extractor
    'pdf-split': (container) => {
        let pdfBytes = null;
        let totalPages = 0;

        container.innerHTML = `
            <div id="dz-split"></div>
            <div id="split-ws" style="display: none; margin-top: 1.5rem;">
                <div class="controls-panel">
                    <div class="control-group">
                        <label>Total Pages Found</label>
                        <div style="font-size: 1.1rem; font-weight: 700; color: var(--accent);" id="split-pages-count">0</div>
                    </div>
                    <div class="control-group" style="flex: 1;">
                        <label>Enter Page Range(s) to Extract</label>
                        <input type="text" id="split-ranges" placeholder="e.g. 1-3, 5, 7-10">
                    </div>
                    <div class="control-group" style="align-self: flex-end;">
                        <button class="btn-primary" id="btn-split-download">✂️ Extract Pages & Download</button>
                    </div>
                </div>
            </div>
            <div id="split-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dz = container.querySelector('#dz-split');
        const ws = container.querySelector('#split-ws');
        const pagesCountEl = container.querySelector('#split-pages-count');
        const statusBox = container.querySelector('#split-status');

        Utils.createDropzone(dz, 'application/pdf', false, async (files) => {
            if (!files.length) return;
            try {
                pdfBytes = await Utils.readFileAsArrayBuffer(files[0]);
                const { PDFDocument } = window.PDFLib;
                const doc = await PDFDocument.load(pdfBytes);
                totalPages = doc.getPageCount();
                pagesCountEl.textContent = `${totalPages} Pages`;
                container.querySelector('#split-ranges').value = `1-${Math.min(totalPages, 3)}`;
                dz.style.display = 'none';
                ws.style.display = 'block';
            } catch (e) {
                statusBox.textContent = 'Error loading PDF: ' + e.message;
            }
        });

        container.querySelector('#btn-split-download').onclick = async () => {
            const rangeStr = container.querySelector('#split-ranges').value.trim();
            if (!rangeStr || !pdfBytes) return;

            statusBox.textContent = 'Extracting pages...';
            try {
                const pagesToExtract = new Set();
                const parts = rangeStr.split(',');

                for (const part of parts) {
                    const trimmed = part.trim();
                    if (trimmed.includes('-')) {
                        const [start, end] = trimmed.split('-').map(Number);
                        if (!isNaN(start) && !isNaN(end)) {
                            for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                                pagesToExtract.add(i - 1);
                            }
                        }
                    } else {
                        const num = Number(trimmed);
                        if (!isNaN(num) && num >= 1 && num <= totalPages) {
                            pagesToExtract.add(num - 1);
                        }
                    }
                }

                if (!pagesToExtract.size) {
                    statusBox.textContent = 'No valid pages found in range.';
                    return;
                }

                const { PDFDocument } = window.PDFLib;
                const source = await PDFDocument.load(pdfBytes);
                const target = await PDFDocument.create();

                const copiedPages = await target.copyPages(source, Array.from(pagesToExtract));
                copiedPages.forEach(p => target.addPage(p));

                const outBytes = await target.save();
                Utils.downloadBlob(new Blob([outBytes], { type: 'application/pdf' }), `extracted_pages_${Date.now()}.pdf`);
                statusBox.textContent = `✓ Extracted ${pagesToExtract.size} page(s) successfully!`;
            } catch (err) {
                statusBox.textContent = 'Split error: ' + err.message;
            }
        };
    },

    // 5. PDF to Images
    'pdf-to-images': (container) => {
        container.innerHTML = `
            <div id="dz-pdf2img"></div>
            <div id="p2i-workspace" style="display: none; margin-top: 1.5rem;">
                <div class="controls-panel" style="justify-content: space-between;">
                    <div style="font-weight: 600;" id="p2i-stats">Pages Ready</div>
                    <div class="control-group">
                        <label>Format</label>
                        <select id="p2i-fmt">
                            <option value="png">PNG (High Quality)</option>
                            <option value="jpeg">JPG (Compact)</option>
                        </select>
                    </div>
                </div>
                <div id="p2i-grid" class="files-preview-list" style="margin-top: 1.5rem;"></div>
            </div>
            <div id="p2i-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dz = container.querySelector('#dz-pdf2img');
        const ws = container.querySelector('#p2i-workspace');
        const grid = container.querySelector('#p2i-grid');
        const statusBox = container.querySelector('#p2i-status');

        Utils.createDropzone(dz, 'application/pdf', false, async (files) => {
            if (!files.length) return;
            statusBox.textContent = 'Rendering PDF pages to images...';
            try {
                const arrayBuffer = await Utils.readFileAsArrayBuffer(files[0]);
                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                grid.innerHTML = '';
                dz.style.display = 'none';
                ws.style.display = 'block';
                statusBox.textContent = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');
                    await page.render({ canvasContext: ctx, viewport }).promise;

                    const card = document.createElement('div');
                    card.className = 'file-preview-card';
                    card.innerHTML = `
                        <img class="file-thumbnail" src="${canvas.toDataURL('image/jpeg', 0.85)}" alt="Page ${i}">
                        <div class="file-card-name">Page ${i}</div>
                        <button class="btn-secondary" style="margin-top: 0.5rem; font-size: 0.78rem; padding: 0.35rem 0.8rem;">Download</button>
                    `;

                    card.querySelector('button').onclick = () => {
                        const fmt = container.querySelector('#p2i-fmt').value;
                        canvas.toBlob((b) => {
                            Utils.downloadBlob(b, `page_${i}.${fmt === 'jpeg' ? 'jpg' : 'png'}`);
                        }, `image/${fmt}`, 0.95);
                    };

                    grid.appendChild(card);
                }
            } catch (err) {
                statusBox.textContent = 'Error rendering pages: ' + err.message;
            }
        });
    },

    // 6. Image Format Converter
    'image-converter': (container) => {
        let loadedImg = null;
        let originalName = 'converted';

        container.innerHTML = `
            <div id="dz-conv"></div>
            <div id="conv-ws" style="display: none; margin-top: 1.5rem;">
                <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 280px; text-align: center;">
                        <img id="conv-preview" style="max-width: 100%; max-height: 320px; border-radius: var(--radius-md); border: 1px solid var(--border-color);" alt="Preview">
                    </div>
                    <div style="flex: 1; min-width: 280px;">
                        <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                            <div class="control-group">
                                <label>Target Format</label>
                                <select id="conv-target-format">
                                    <option value="png">PNG (.png) - Transparency</option>
                                    <option value="jpeg" selected>JPG / JPEG (.jpg) - Universal</option>
                                    <option value="webp">WebP (.webp) - Modern Web</option>
                                </select>
                            </div>
                            <div class="control-group" id="conv-quality-group">
                                <label>Quality</label>
                                <div class="slider-wrap">
                                    <input type="range" id="conv-quality" min="10" max="100" value="92">
                                    <span class="slider-val" id="conv-quality-val">92%</span>
                                </div>
                            </div>
                            <button class="btn-primary" id="btn-convert-download" style="margin-top: 1.5rem;">🔄 Convert & Download</button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="conv-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dz = container.querySelector('#dz-conv');
        const ws = container.querySelector('#conv-ws');
        const preview = container.querySelector('#conv-preview');
        const qSlider = container.querySelector('#conv-quality');
        const qVal = container.querySelector('#conv-quality-val');
        const statusBox = container.querySelector('#conv-status');

        qSlider.oninput = () => qVal.textContent = qSlider.value + '%';

        Utils.createDropzone(dz, 'image/*', false, async (files) => {
            if (!files.length) return;
            const file = files[0];
            originalName = file.name.replace(/\.[^/.]+$/, '');
            const dataUrl = await Utils.readFileAsDataURL(file);
            loadedImg = new Image();
            loadedImg.onload = () => {
                preview.src = dataUrl;
                dz.style.display = 'none';
                ws.style.display = 'block';
            };
            loadedImg.src = dataUrl;
        });

        container.querySelector('#btn-convert-download').onclick = () => {
            if (!loadedImg) return;
            const format = container.querySelector('#conv-target-format').value;
            const quality = parseInt(qSlider.value, 10) / 100;

            const canvas = document.createElement('canvas');
            canvas.width = loadedImg.naturalWidth;
            canvas.height = loadedImg.naturalHeight;
            const ctx = canvas.getContext('2d');

            if (format === 'jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(loadedImg, 0, 0);

            canvas.toBlob((blob) => {
                const ext = format === 'jpeg' ? 'jpg' : format;
                Utils.downloadBlob(blob, `${originalName}.${ext}`);
                statusBox.textContent = `✓ Successfully converted to ${ext.toUpperCase()} (${Utils.formatBytes(blob.size)})`;
            }, `image/${format}`, quality);
        };
    },

    // 7. Photo Resizer
    'image-resize': (container) => {
        let loadedImg = null;
        let origWidth = 0;
        let origHeight = 0;
        let origName = 'resized';

        container.innerHTML = `
            <div id="dz-resize"></div>
            <div id="resize-ws" style="display: none; margin-top: 1.5rem;">
                <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 280px; text-align: center;">
                        <img id="resize-preview" style="max-width: 100%; max-height: 300px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                        <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 0.5rem;" id="orig-dim-text"></div>
                    </div>
                    <div style="flex: 1; min-width: 280px;">
                        <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                            <div style="display: flex; gap: 1rem;">
                                <div class="control-group" style="flex: 1;">
                                    <label>Width (px)</label>
                                    <input type="number" id="resize-w">
                                </div>
                                <div class="control-group" style="flex: 1;">
                                    <label>Height (px)</label>
                                    <input type="number" id="resize-h">
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin: 0.75rem 0;">
                                <input type="checkbox" id="lock-ratio" checked>
                                <label for="lock-ratio" style="font-size: 0.85rem; cursor: pointer;">Lock Aspect Ratio</label>
                            </div>
                            <div style="margin: 0.5rem 0;">
                                <label style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Scale Presets</label>
                                <div style="display: flex; gap: 0.5rem; margin-top: 0.35rem;">
                                    <button class="sort-btn" data-pct="25">25%</button>
                                    <button class="sort-btn" data-pct="50">50%</button>
                                    <button class="sort-btn" data-pct="75">75%</button>
                                    <button class="sort-btn" data-pct="100">100%</button>
                                </div>
                            </div>
                            <button class="btn-primary" id="btn-do-resize" style="margin-top: 1.5rem;">📐 Resize & Download</button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="resize-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dz = container.querySelector('#dz-resize');
        const ws = container.querySelector('#resize-ws');
        const preview = container.querySelector('#resize-preview');
        const inputW = container.querySelector('#resize-w');
        const inputH = container.querySelector('#resize-h');
        const lockRatio = container.querySelector('#lock-ratio');
        const dimText = container.querySelector('#orig-dim-text');
        const statusBox = container.querySelector('#resize-status');

        inputW.oninput = () => {
            if (lockRatio.checked && origWidth) {
                inputH.value = Math.round((inputW.value / origWidth) * origHeight);
            }
        };

        inputH.oninput = () => {
            if (lockRatio.checked && origHeight) {
                inputW.value = Math.round((inputH.value / origHeight) * origWidth);
            }
        };

        container.querySelectorAll('[data-pct]').forEach(btn => {
            btn.onclick = () => {
                const pct = parseInt(btn.getAttribute('data-pct'), 10) / 100;
                inputW.value = Math.round(origWidth * pct);
                inputH.value = Math.round(origHeight * pct);
            };
        });

        Utils.createDropzone(dz, 'image/*', false, async (files) => {
            if (!files.length) return;
            const file = files[0];
            origName = file.name.replace(/\.[^/.]+$/, '');
            const dataUrl = await Utils.readFileAsDataURL(file);
            loadedImg = new Image();
            loadedImg.onload = () => {
                origWidth = loadedImg.naturalWidth;
                origHeight = loadedImg.naturalHeight;
                inputW.value = origWidth;
                inputH.value = origHeight;
                dimText.textContent = `Original: ${origWidth} × ${origHeight} px (${Utils.formatBytes(file.size)})`;
                preview.src = dataUrl;
                dz.style.display = 'none';
                ws.style.display = 'block';
            };
            loadedImg.src = dataUrl;
        });

        container.querySelector('#btn-do-resize').onclick = () => {
            if (!loadedImg) return;
            const w = parseInt(inputW.value, 10);
            const h = parseInt(inputH.value, 10);
            if (!w || !h) return;

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(loadedImg, 0, 0, w, h);

            canvas.toBlob((b) => {
                Utils.downloadBlob(b, `${origName}_${w}x${h}.png`);
                statusBox.textContent = `✓ Resized to ${w} × ${h} px (${Utils.formatBytes(b.size)}) and downloaded!`;
            }, 'image/png');
        };
    },

    // 8. Photo Reducer & Compressor
    'image-compress': (container) => {
        let loadedImg = null;
        let originalFile = null;

        container.innerHTML = `
            <div id="dz-comp"></div>
            <div id="comp-ws" style="display: none; margin-top: 1.5rem;">
                <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 280px; text-align: center;">
                        <img id="comp-preview" style="max-width: 100%; max-height: 320px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                    </div>
                    <div style="flex: 1; min-width: 280px;">
                        <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                            <div class="control-group">
                                <label>Target Compression Level</label>
                                <div class="slider-wrap">
                                    <input type="range" id="comp-level" min="5" max="95" value="70">
                                    <span class="slider-val" id="comp-level-val">70%</span>
                                </div>
                            </div>
                            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin: 1.25rem 0;">
                                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.5rem;">
                                    <span>Original Size:</span>
                                    <strong id="orig-size-val">0 KB</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.5rem;">
                                    <span>Estimated Size:</span>
                                    <strong id="est-size-val" style="color: var(--accent);">Calculating...</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                                    <span>Savings:</span>
                                    <strong id="savings-val" style="color: var(--accent-cyan);">0%</strong>
                                </div>
                            </div>
                            <button class="btn-primary" id="btn-compress-download">🗜️ Compress & Download</button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="comp-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dz = container.querySelector('#dz-comp');
        const ws = container.querySelector('#comp-ws');
        const preview = container.querySelector('#comp-preview');
        const levelSlider = container.querySelector('#comp-level');
        const levelVal = container.querySelector('#comp-level-val');
        const origSizeEl = container.querySelector('#orig-size-val');
        const estSizeEl = container.querySelector('#est-size-val');
        const savingsEl = container.querySelector('#savings-val');
        const statusBox = container.querySelector('#comp-status');

        function updateEstimate() {
            if (!loadedImg) return;
            const quality = parseInt(levelSlider.value, 10) / 100;
            levelVal.textContent = levelSlider.value + '%';

            const canvas = document.createElement('canvas');
            canvas.width = loadedImg.naturalWidth;
            canvas.height = loadedImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(loadedImg, 0, 0);

            canvas.toBlob((blob) => {
                estSizeEl.textContent = Utils.formatBytes(blob.size);
                const diff = originalFile.size - blob.size;
                const pct = Math.max(0, Math.round((diff / originalFile.size) * 100));
                savingsEl.textContent = `${pct}% (${Utils.formatBytes(Math.max(0, diff))})`;
            }, 'image/jpeg', quality);
        }

        levelSlider.oninput = updateEstimate;

        Utils.createDropzone(dz, 'image/*', false, async (files) => {
            if (!files.length) return;
            originalFile = files[0];
            origSizeEl.textContent = Utils.formatBytes(originalFile.size);
            const dataUrl = await Utils.readFileAsDataURL(originalFile);
            loadedImg = new Image();
            loadedImg.onload = () => {
                preview.src = dataUrl;
                dz.style.display = 'none';
                ws.style.display = 'block';
                updateEstimate();
            };
            loadedImg.src = dataUrl;
        });

        container.querySelector('#btn-compress-download').onclick = () => {
            if (!loadedImg) return;
            const quality = parseInt(levelSlider.value, 10) / 100;
            const canvas = document.createElement('canvas');
            canvas.width = loadedImg.naturalWidth;
            canvas.height = loadedImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(loadedImg, 0, 0);

            canvas.toBlob((b) => {
                const name = originalFile.name.replace(/\.[^/.]+$/, '');
                Utils.downloadBlob(b, `${name}_compressed.jpg`);
                statusBox.textContent = `✓ Compressed and saved (${Utils.formatBytes(b.size)})`;
            }, 'image/jpeg', quality);
        };
    },

    // 9. Profit Margin & Markup Calculator
    'profit-calculator': (container) => {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Input Values</h3>
                    <div class="control-group">
                        <label>Cost Price ($)</label>
                        <input type="number" id="calc-cost" value="50" step="0.01">
                    </div>
                    <div class="control-group">
                        <label>Selling Price ($)</label>
                        <input type="number" id="calc-sell" value="100" step="0.01">
                    </div>
                    <div class="control-group">
                        <label>Sales Tax / VAT (%)</label>
                        <input type="number" id="calc-tax" value="15" step="0.1">
                    </div>
                    <div class="control-group">
                        <label>Discount (%)</label>
                        <input type="number" id="calc-disc" value="0" step="0.1">
                    </div>
                </div>

                <div>
                    <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem;">
                        <h3 style="font-size: 1.1rem; margin-bottom: 1.25rem;">Financial Breakdown</h3>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.5rem;">
                            <div style="background: var(--bg-input); padding: 1rem; border-radius: var(--radius-md);">
                                <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Gross Profit</div>
                                <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent);" id="res-profit">$50.00</div>
                            </div>
                            <div style="background: var(--bg-input); padding: 1rem; border-radius: var(--radius-md);">
                                <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Gross Margin</div>
                                <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent-cyan);" id="res-margin">50.0%</div>
                            </div>
                            <div style="background: var(--bg-input); padding: 1rem; border-radius: var(--radius-md);">
                                <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Markup</div>
                                <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent-amber);" id="res-markup">100.0%</div>
                            </div>
                            <div style="background: var(--bg-input); padding: 1rem; border-radius: var(--radius-md);">
                                <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Net Revenue (After Tax)</div>
                                <div style="font-size: 1.5rem; font-weight: 800; color: var(--text-main);" id="res-net">$86.96</div>
                            </div>
                        </div>

                        <!-- Visual Breakdown Bar -->
                        <div style="margin-top: 1rem;">
                            <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.4rem;">Revenue Proportion</div>
                            <div style="height: 14px; border-radius: 99px; overflow: hidden; display: flex; background: #1e293b;">
                                <div id="bar-cost" style="background: var(--accent-red); width: 50%;" title="Cost"></div>
                                <div id="bar-profit" style="background: var(--accent); width: 50%;" title="Profit"></div>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-dim); margin-top: 0.35rem;">
                                <span>🟥 Cost (<span id="pct-cost">50%</span>)</span>
                                <span>🟩 Profit (<span id="pct-profit">50%</span>)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const costIn = container.querySelector('#calc-cost');
        const sellIn = container.querySelector('#calc-sell');
        const taxIn = container.querySelector('#calc-tax');
        const discIn = container.querySelector('#calc-disc');

        const profitOut = container.querySelector('#res-profit');
        const marginOut = container.querySelector('#res-margin');
        const markupOut = container.querySelector('#res-markup');
        const netOut = container.querySelector('#res-net');
        const barCost = container.querySelector('#bar-cost');
        const barProfit = container.querySelector('#bar-profit');
        const pctCost = container.querySelector('#pct-cost');
        const pctProfit = container.querySelector('#pct-profit');

        function recalculate() {
            const cost = parseFloat(costIn.value) || 0;
            let sell = parseFloat(sellIn.value) || 0;
            const tax = parseFloat(taxIn.value) || 0;
            const disc = parseFloat(discIn.value) || 0;

            if (disc > 0) {
                sell = sell * (1 - disc / 100);
            }

            const grossProfit = sell - cost;
            const margin = sell > 0 ? (grossProfit / sell) * 100 : 0;
            const markup = cost > 0 ? (grossProfit / cost) * 100 : 0;
            const netRev = sell / (1 + tax / 100);

            profitOut.textContent = `$${grossProfit.toFixed(2)}`;
            marginOut.textContent = `${margin.toFixed(1)}%`;
            markupOut.textContent = `${markup.toFixed(1)}%`;
            netOut.textContent = `$${netRev.toFixed(2)}`;

            const costPct = sell > 0 ? Math.min(100, Math.max(0, (cost / sell) * 100)) : 100;
            const profitPct = 100 - costPct;

            barCost.style.width = costPct + '%';
            barProfit.style.width = profitPct + '%';
            pctCost.textContent = costPct.toFixed(0) + '%';
            pctProfit.textContent = profitPct.toFixed(0) + '%';
        }

        [costIn, sellIn, taxIn, discIn].forEach(input => input.addEventListener('input', recalculate));
        recalculate();
    },

    // 10. QR Code Studio & Generator
    'qr-generator': (container) => {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <div class="control-group">
                        <label>Content Type</label>
                        <select id="qr-type">
                            <option value="url">Website URL</option>
                            <option value="text">Plain Text</option>
                            <option value="wifi">WiFi Network</option>
                            <option value="wa">WhatsApp Message</option>
                        </select>
                    </div>

                    <div id="qr-input-url" class="control-group">
                        <label>Target URL</label>
                        <input type="text" id="qr-url-val" value="https://www.shajjadkhan.com">
                    </div>

                    <div id="qr-input-wifi" class="control-group" style="display: none;">
                        <label>WiFi SSID (Network Name)</label>
                        <input type="text" id="qr-wifi-ssid" placeholder="MyHomeWiFi">
                        <label style="margin-top: 0.5rem;">Password</label>
                        <input type="text" id="qr-wifi-pass" placeholder="SecretPass123">
                    </div>

                    <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                        <div class="control-group" style="flex: 1;">
                            <label>QR Foreground</label>
                            <input type="color" id="qr-fg" value="#000000" style="width: 100%; height: 38px; padding: 2px; cursor: pointer;">
                        </div>
                        <div class="control-group" style="flex: 1;">
                            <label>QR Background</label>
                            <input type="color" id="qr-bg" value="#ffffff" style="width: 100%; height: 38px; padding: 2px; cursor: pointer;">
                        </div>
                    </div>

                    <div class="control-group" style="margin-top: 0.5rem;">
                        <label>Size</label>
                        <select id="qr-size">
                            <option value="256">Standard (256 × 256)</option>
                            <option value="400" selected>High-Res (400 × 400)</option>
                            <option value="600">Print Quality (600 × 600)</option>
                        </select>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 2rem; min-width: 0;">
                    <div id="qrcode-box" class="qr-preview-box">
                        <canvas id="qrcode-canvas" aria-label="Generated QR code"></canvas>
                    </div>
                    <p id="qr-status" style="color: var(--text-muted); font-size: 0.82rem; margin-top: 0.85rem; text-align: center;"></p>
                    <button class="btn-primary" id="btn-download-qr" style="margin-top: 1.5rem;">📱 Download QR Code</button>
                </div>
            </div>
        `;

        const qrBox = container.querySelector('#qrcode-box');
        const qrCanvas = container.querySelector('#qrcode-canvas');
        const qrStatus = container.querySelector('#qr-status');
        const typeSelect = container.querySelector('#qr-type');
        const urlInput = container.querySelector('#qr-url-val');
        const wifiGroup = container.querySelector('#qr-input-wifi');
        const urlGroup = container.querySelector('#qr-input-url');
        const fgColor = container.querySelector('#qr-fg');
        const bgColor = container.querySelector('#qr-bg');
        const sizeSelect = container.querySelector('#qr-size');
        const downloadBtn = container.querySelector('#btn-download-qr');

        const setQrStatus = (message, isError = false) => {
            qrStatus.textContent = message;
            qrStatus.style.color = isError ? '#f87171' : 'var(--text-muted)';
            downloadBtn.disabled = isError;
            downloadBtn.style.opacity = isError ? '0.65' : '';
            downloadBtn.style.cursor = isError ? 'not-allowed' : '';
        };

        const escapeWifiValue = (value) => value.replace(/([\\;,":])/g, '\\$1');

        const waitForQrLibrary = () => new Promise((resolve, reject) => {
            const started = Date.now();
            const check = () => {
                if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
                    resolve();
                    return;
                }
                if (Date.now() - started > 5000) {
                    reject(new Error('QR code library could not be loaded. Please refresh the page and try again.'));
                    return;
                }
                setTimeout(check, 120);
            };
            check();
        });

        function getPayload() {
            const type = typeSelect.value;
            if (type === 'url' || type === 'text') {
                return urlInput.value.trim() || 'https://www.shajjadkhan.com';
            } else if (type === 'wifi') {
                const ssid = container.querySelector('#qr-wifi-ssid').value.trim();
                const pass = container.querySelector('#qr-wifi-pass').value.trim();
                return `WIFI:S:${escapeWifiValue(ssid)};T:WPA;P:${escapeWifiValue(pass)};;`;
            } else if (type === 'wa') {
                return `https://wa.me/?text=${encodeURIComponent(urlInput.value.trim())}`;
            }
            return 'https://www.shajjadkhan.com';
        }

        async function updateQR() {
            const size = parseInt(sizeSelect.value, 10);
            const payload = getPayload();
            setQrStatus('Generating QR code...');
            try {
                await waitForQrLibrary();
                await window.QRCode.toCanvas(qrCanvas, payload, {
                    width: size,
                    margin: 2,
                    errorCorrectionLevel: 'H',
                    color: {
                        dark: fgColor.value,
                        light: bgColor.value
                    }
                });
                qrCanvas.style.width = '100%';
                qrCanvas.style.height = 'auto';
                qrCanvas.style.maxWidth = `${size}px`;
                qrBox.style.background = bgColor.value;
                setQrStatus(`${size} x ${size}px QR ready`);
            } catch (err) {
                console.error('QR generation failed:', err);
                setQrStatus(err.message || 'QR code generation failed.', true);
            }
        }

        typeSelect.onchange = () => {
            if (typeSelect.value === 'wifi') {
                wifiGroup.style.display = 'flex';
                urlGroup.style.display = 'none';
            } else {
                wifiGroup.style.display = 'none';
                urlGroup.style.display = 'flex';
            }
            updateQR();
        };

        [urlInput, fgColor, bgColor, sizeSelect].forEach(el => el.addEventListener('input', updateQR));
        container.querySelector('#qr-wifi-ssid').addEventListener('input', updateQR);
        container.querySelector('#qr-wifi-pass').addEventListener('input', updateQR);

        updateQR();

        downloadBtn.onclick = () => {
            if (downloadBtn.disabled) return;
            const a = document.createElement('a');
            a.href = qrCanvas.toDataURL('image/png');
            a.download = `qrcode_${Date.now()}.png`;
            a.click();
        };
    },

    // 11. XML Sitemap Auditor
    'sitemap-audit': (container) => {
        container.innerHTML = `
            <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin-bottom: 2rem;">
                <div class="control-group">
                    <label>Sitemap URL</label>
                    <div style="display: flex; gap: 0.75rem;">
                        <input type="text" id="audit-url" placeholder="https://example.com/sitemap.xml" style="flex: 1;">
                        <button class="btn-primary" id="btn-run-audit">🔍 Audit Sitemap</button>
                    </div>
                </div>
                <div style="text-align: center; margin: 0.75rem 0; color: var(--text-dim); font-size: 0.8rem;">— OR PASTE RAW XML CONTENT —</div>
                <textarea id="audit-xml-raw" placeholder="<urlset xmlns='...'>..." style="background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); font-family: var(--font-mono); font-size: 0.8rem; padding: 0.75rem; border-radius: var(--radius-sm); height: 90px; resize: vertical;"></textarea>
            </div>

            <div id="audit-results" style="display: none;">
                <!-- Score & Highlights -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                    <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; text-align: center;">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Health Score</div>
                        <div id="res-score" style="font-size: 2.4rem; font-weight: 800; color: var(--accent);">95/100</div>
                    </div>
                    <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; text-align: center;">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Total URLs</div>
                        <div id="res-total" style="font-size: 2rem; font-weight: 700;">0</div>
                    </div>
                    <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; text-align: center;">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Duplicates</div>
                        <div id="res-dups" style="font-size: 2rem; font-weight: 700; color: var(--accent-red);">0</div>
                    </div>
                    <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; text-align: center;">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Insecure (HTTP)</div>
                        <div id="res-insecure" style="font-size: 2rem; font-weight: 700; color: var(--accent-amber);">0</div>
                    </div>
                </div>

                <!-- Warnings List -->
                <div id="audit-warnings" style="margin-bottom: 2rem;"></div>

                <!-- URL Preview Table -->
                <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden;">
                    <div style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="font-size: 1rem;">Extracted Sitemap URLs</h4>
                        <button class="sort-btn" id="btn-export-urls-csv">Export CSV</button>
                    </div>
                    <div style="max-height: 400px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;" id="audit-table">
                            <thead>
                                <tr style="background: #020617; color: var(--text-dim); border-bottom: 1px solid var(--border-color);">
                                    <th style="padding: 0.75rem 1rem;">#</th>
                                    <th style="padding: 0.75rem 1rem;">URL (<loc>)</th>
                                    <th style="padding: 0.75rem 1rem;">Depth</th>
                                    <th style="padding: 0.75rem 1rem;">Priority</th>
                                    <th style="padding: 0.75rem 1rem;">Changefreq</th>
                                </tr>
                            </thead>
                            <tbody id="audit-table-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div id="audit-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const urlIn = container.querySelector('#audit-url');
        const rawIn = container.querySelector('#audit-xml-raw');
        const runBtn = container.querySelector('#btn-run-audit');
        const resBox = container.querySelector('#audit-results');
        const statusBox = container.querySelector('#audit-status');
        let currentAuditUrls = [];

        runBtn.onclick = async () => {
            const url = urlIn.value.trim();
            const xml = rawIn.value.trim();
            if (!url && !xml) {
                statusBox.textContent = 'Please enter a URL or paste raw XML.';
                return;
            }

            statusBox.textContent = 'Connecting and auditing sitemap structure...';
            try {
                const res = await fetch('/api/sitemap-audit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, xml_content: xml })
                });
                const data = await res.json();

                if (data.status !== 'success') {
                    statusBox.textContent = 'Audit error: ' + (data.message || 'Failed to inspect sitemap');
                    return;
                }

                currentAuditUrls = data.urls || [];
                statusBox.textContent = '';
                resBox.style.display = 'block';

                container.querySelector('#res-score').textContent = `${data.score}/100`;
                container.querySelector('#res-total').textContent = data.summary.total_urls;
                container.querySelector('#res-dups').textContent = data.summary.duplicates;
                container.querySelector('#res-insecure').textContent = data.summary.insecure_http;

                const warningsDiv = container.querySelector('#audit-warnings');
                warningsDiv.innerHTML = '';
                if (data.warnings && data.warnings.length) {
                    warningsDiv.innerHTML = `
                        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-md); padding: 1rem;">
                            <strong style="color: #f87171; display: block; margin-bottom: 0.5rem;">⚠️ Potential Issues Detected:</strong>
                            <ul style="padding-left: 1.25rem; color: #fca5a5; font-size: 0.85rem;">
                                ${data.warnings.map(w => `<li>${w}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }

                const tbody = container.querySelector('#audit-table-body');
                tbody.innerHTML = currentAuditUrls.map((u, i) => `
                    <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.04);">
                        <td style="padding: 0.6rem 1rem; color: var(--text-dim);">${i + 1}</td>
                        <td style="padding: 0.6rem 1rem; word-break: break-all;"><a href="${u.loc}" target="_blank" style="color: var(--accent); text-decoration: none;">${u.loc}</a></td>
                        <td style="padding: 0.6rem 1rem; color: var(--text-muted);">${u.depth}</td>
                        <td style="padding: 0.6rem 1rem; color: var(--text-muted);">${u.priority || '—'}</td>
                        <td style="padding: 0.6rem 1rem; color: var(--text-muted);">${u.changefreq || '—'}</td>
                    </tr>
                `).join('');

            } catch (err) {
                statusBox.textContent = 'Network or server error: ' + err.message;
            }
        };

        container.querySelector('#btn-export-urls-csv').onclick = () => {
            if (!currentAuditUrls.length) return;
            const csv = ['URL,Depth,Priority,Changefreq', ...currentAuditUrls.map(u => `"${u.loc}",${u.depth},"${u.priority || ''}","${u.changefreq || ''}"`)].join('\n');
            Utils.downloadBlob(new Blob([csv], { type: 'text/csv' }), `sitemap_urls_${Date.now()}.csv`);
        };
    },

    // 12. JSON Formatter, Validator & Minifier
    'json-tools': (container) => {
        container.innerHTML = `
            <div class="controls-panel" style="justify-content: space-between; margin-bottom: 1rem;">
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button class="btn-primary" id="btn-json-fmt-2">Beautify (2 Spaces)</button>
                    <button class="btn-secondary" id="btn-json-fmt-4">Beautify (4 Spaces)</button>
                    <button class="btn-secondary" id="btn-json-min">Minify</button>
                    <button class="btn-secondary" id="btn-json-val">Validate</button>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-secondary" id="btn-json-copy">Copy</button>
                    <button class="btn-secondary" id="btn-json-clear">Clear</button>
                </div>
            </div>
            <textarea id="json-input" class="code-area" style="min-height: 420px; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; background: var(--bg-surface);" placeholder="Paste JSON here...">{
  "name": "FastTrack Tools",
  "author": "Shajjad Khan",
  "status": "production",
  "tools": 32
}</textarea>
            <div id="json-status" style="margin-top: 0.75rem; font-size: 0.88rem; font-weight: 600;"></div>
        `;

        const area = container.querySelector('#json-input');
        const statusBox = container.querySelector('#json-status');

        function parse(spaces) {
            try {
                const parsed = JSON.parse(area.value);
                area.value = JSON.stringify(parsed, null, spaces);
                statusBox.textContent = '✓ Valid JSON formatted successfully';
                statusBox.style.color = 'var(--accent)';
            } catch (err) {
                statusBox.textContent = '✗ JSON Parse Error: ' + err.message;
                statusBox.style.color = 'var(--accent-red)';
            }
        }

        container.querySelector('#btn-json-fmt-2').onclick = () => parse(2);
        container.querySelector('#btn-json-fmt-4').onclick = () => parse(4);
        container.querySelector('#btn-json-min').onclick = () => parse(0);

        container.querySelector('#btn-json-val').onclick = () => {
            try {
                JSON.parse(area.value);
                statusBox.textContent = '✓ Valid JSON structure!';
                statusBox.style.color = 'var(--accent)';
            } catch (err) {
                statusBox.textContent = '✗ Invalid JSON: ' + err.message;
                statusBox.style.color = 'var(--accent-red)';
            }
        };

        container.querySelector('#btn-json-copy').onclick = (e) => Utils.copyToClipboard(area.value, e.target);
        container.querySelector('#btn-json-clear').onclick = () => { area.value = ''; statusBox.textContent = ''; };
    },

    // 13. Secure Password & Passphrase Generator
    'password-generator': (container) => {
        container.innerHTML = `
            <div class="controls-panel" style="flex-direction: column; align-items: stretch;">
                <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1.5rem;">
                    <input type="text" id="pwd-output" readonly style="flex: 1; font-family: var(--font-mono); font-size: 1.4rem; padding: 0.85rem 1.25rem; background: var(--bg-input); border: 2px solid var(--border-color); border-radius: var(--radius-md); color: var(--accent);">
                    <button class="btn-primary" id="btn-copy-pwd">Copy</button>
                    <button class="btn-secondary" id="btn-gen-pwd">🔄 Regenerate</button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem;">
                    <div class="control-group">
                        <label>Password Length (<span id="pwd-len-val">20</span> characters)</label>
                        <input type="range" id="pwd-len" min="8" max="64" value="20">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; justify-content: center;">
                        <label><input type="checkbox" id="pwd-upper" checked> Uppercase (A-Z)</label>
                        <label><input type="checkbox" id="pwd-lower" checked> Lowercase (a-z)</label>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; justify-content: center;">
                        <label><input type="checkbox" id="pwd-num" checked> Numbers (0-9)</label>
                        <label><input type="checkbox" id="pwd-sym" checked> Symbols (!@#$%^&*)</label>
                    </div>
                </div>
            </div>
        `;

        const out = container.querySelector('#pwd-output');
        const len = container.querySelector('#pwd-len');
        const lenVal = container.querySelector('#pwd-len-val');
        const upper = container.querySelector('#pwd-upper');
        const lower = container.querySelector('#pwd-lower');
        const num = container.querySelector('#pwd-num');
        const sym = container.querySelector('#pwd-sym');

        function generate() {
            let chars = '';
            if (upper.checked) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (lower.checked) chars += 'abcdefghijklmnopqrstuvwxyz';
            if (num.checked) chars += '0123456789';
            if (sym.checked) chars += '!@#$%^&*()_+~|}{[]:;?><,.-=';
            if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

            const length = parseInt(len.value, 10);
            lenVal.textContent = length;

            const randomVals = new Uint32Array(length);
            window.crypto.getRandomValues(randomVals);

            let res = '';
            for (let i = 0; i < length; i++) {
                res += chars[randomVals[i] % chars.length];
            }
            out.value = res;
        }

        len.oninput = generate;
        [upper, lower, num, sym].forEach(c => c.onchange = generate);
        container.querySelector('#btn-gen-pwd').onclick = generate;
        container.querySelector('#btn-copy-pwd').onclick = (e) => Utils.copyToClipboard(out.value, e.target);

        generate();
    },

    // 14. Hash Generator (MD5, SHA-1, SHA-256, SHA-512)
    'hash-generator': (container) => {
        container.innerHTML = `
            <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin-bottom: 1.5rem;">
                <label style="font-weight: 700; margin-bottom: 0.4rem;">Source Text</label>
                <textarea id="hash-input" class="code-area" style="height: 100px; padding: 0.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm);" placeholder="Enter text to hash...">Shajjad Khan</textarea>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${['SHA-256', 'SHA-512', 'SHA-1'].map(alg => `
                    <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem 1.25rem;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.35rem;">
                            <span>${alg}</span>
                            <button class="sort-btn" data-copy-hash="${alg}">Copy</button>
                        </div>
                        <div id="hash-out-${alg}" style="font-family: var(--font-mono); font-size: 0.88rem; color: var(--accent); word-break: break-all;">Computing...</div>
                    </div>
                `).join('')}
            </div>
        `;

        const input = container.querySelector('#hash-input');

        async function computeHashes() {
            const text = input.value;
            const enc = new TextEncoder();
            const data = enc.encode(text);

            for (const alg of ['SHA-256', 'SHA-512', 'SHA-1']) {
                try {
                    const buf = await crypto.subtle.digest(alg, data);
                    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
                    container.querySelector(`#hash-out-${alg}`).textContent = hex;
                } catch (e) {
                    container.querySelector(`#hash-out-${alg}`).textContent = 'Error computing hash';
                }
            }
        }

        input.addEventListener('input', computeHashes);
        container.querySelectorAll('[data-copy-hash]').forEach(btn => {
            btn.onclick = () => {
                const alg = btn.getAttribute('data-copy-hash');
                const text = container.querySelector(`#hash-out-${alg}`).textContent;
                Utils.copyToClipboard(text, btn);
            };
        });

        computeHashes();
    },

    // 15. Base64 Encoder & Decoder
    'base64-tools': (container) => {
        container.innerHTML = `
            <div class="controls-panel" style="justify-content: space-between; margin-bottom: 1rem;">
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" id="btn-b64-enc">Encode to Base64</button>
                    <button class="btn-secondary" id="btn-b64-dec">Decode from Base64</button>
                </div>
                <button class="btn-secondary" id="btn-b64-copy">Copy Result</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                    <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">INPUT</label>
                    <textarea id="b64-in" class="code-area" style="height: 280px; padding: 0.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-top: 0.35rem;" placeholder="Enter plain text or base64...">Hello World!</textarea>
                </div>
                <div>
                    <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">OUTPUT</label>
                    <textarea id="b64-out" class="code-area" style="height: 280px; padding: 0.75rem; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-top: 0.35rem; color: var(--accent);" readonly></textarea>
                </div>
            </div>
        `;

        const inText = container.querySelector('#b64-in');
        const outText = container.querySelector('#b64-out');

        container.querySelector('#btn-b64-enc').onclick = () => {
            try {
                outText.value = btoa(unescape(encodeURIComponent(inText.value)));
            } catch (e) {
                outText.value = 'Encode Error: ' + e.message;
            }
        };

        container.querySelector('#btn-b64-dec').onclick = () => {
            try {
                outText.value = decodeURIComponent(escape(atob(inText.value.trim())));
            } catch (e) {
                outText.value = 'Decode Error: Invalid Base64 string';
            }
        };

        container.querySelector('#btn-b64-copy').onclick = (e) => Utils.copyToClipboard(outText.value, e.target);
        container.querySelector('#btn-b64-enc').click();
    },

    // 16. UUID / GUID v4 Batch Generator
    'uuid-generator': (container) => {
        container.innerHTML = `
            <div class="controls-panel" style="justify-content: space-between;">
                <div style="display: flex; gap: 1.5rem; align-items: center;">
                    <div class="control-group">
                        <label>Quantity (<span id="uuid-qty-val">10</span>)</label>
                        <input type="range" id="uuid-qty" min="1" max="100" value="10">
                    </div>
                    <label><input type="checkbox" id="uuid-upper"> Uppercase</label>
                    <label><input type="checkbox" id="uuid-hyphen" checked> Hyphens</label>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" id="btn-gen-uuid">Generate</button>
                    <button class="btn-secondary" id="btn-copy-uuid">Copy All</button>
                </div>
            </div>
            <textarea id="uuid-out" class="code-area" style="height: 350px; padding: 1rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-top: 1rem; color: var(--accent);" readonly></textarea>
        `;

        const qty = container.querySelector('#uuid-qty');
        const qtyVal = container.querySelector('#uuid-qty-val');
        const upper = container.querySelector('#uuid-upper');
        const hyphen = container.querySelector('#uuid-hyphen');
        const out = container.querySelector('#uuid-out');

        function generate() {
            qtyVal.textContent = qty.value;
            const count = parseInt(qty.value, 10);
            const list = [];
            for (let i = 0; i < count; i++) {
                let u = crypto.randomUUID();
                if (!hyphen.checked) u = u.replace(/-/g, '');
                if (upper.checked) u = u.toUpperCase();
                list.push(u);
            }
            out.value = list.join('\n');
        }

        qty.oninput = generate;
        upper.onchange = generate;
        hyphen.onchange = generate;
        container.querySelector('#btn-gen-uuid').onclick = generate;
        container.querySelector('#btn-copy-uuid').onclick = (e) => Utils.copyToClipboard(out.value, e.target);

        generate();
    },

    // 17. Markdown Live Editor
    'markdown-editor': (container) => {
        container.innerHTML = `
            <div class="controls-panel" style="justify-content: space-between; margin-bottom: 1rem;">
                <div style="font-weight: 700; font-size: 0.9rem;">Live Dual-Pane Markdown Sync</div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" id="btn-copy-html">Copy Rendered HTML</button>
                    <button class="btn-secondary" id="btn-dl-md">Download .md</button>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; min-height: 480px;">
                <textarea id="md-in" class="code-area" style="height: 100%; padding: 1rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); resize: none;"># FastTrack Tools
Welcome to the live Markdown editor.

## Key Features
- **Instant Rendering**
- *Full GFM Support*
- Tables & code syntax

| Tool | Status | Speed |
| --- | --- | --- |
| PDF Merge | Active | 0ms |
| Resizer | Active | 0ms |

\`\`\`python
print("Built by Shajjad Khan")
\`\`\`
</textarea>
                <div id="md-preview" style="height: 100%; overflow-y: auto; padding: 1.25rem; background: #020617; border: 1px solid var(--border-color); border-radius: var(--radius-md); line-height: 1.7;"></div>
            </div>
        `;

        const mdIn = container.querySelector('#md-in');
        const preview = container.querySelector('#md-preview');

        function render() {
            if (window.marked) {
                preview.innerHTML = window.marked.parse(mdIn.value);
            }
        }

        mdIn.addEventListener('input', render);
        render();

        container.querySelector('#btn-copy-html').onclick = (e) => Utils.copyToClipboard(preview.innerHTML, e.target);
        container.querySelector('#btn-dl-md').onclick = () => {
            Utils.downloadBlob(new Blob([mdIn.value], { type: 'text/markdown' }), 'document.md');
        };
    },

    // 18. Word & Character Counter
    'word-counter': (container) => {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Words</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: var(--accent);" id="wc-words">0</div>
                </div>
                <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Characters</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: var(--accent-cyan);" id="wc-chars">0</div>
                </div>
                <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Sentences</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: var(--accent-purple);" id="wc-sentences">0</div>
                </div>
                <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Reading Time</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: var(--accent-amber);" id="wc-reading">0m</div>
                </div>
            </div>
            <textarea id="wc-text" class="code-area" style="min-height: 300px; padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);" placeholder="Paste or type text to analyze..."></textarea>
        `;

        const area = container.querySelector('#wc-text');
        const wordsEl = container.querySelector('#wc-words');
        const charsEl = container.querySelector('#wc-chars');
        const sentencesEl = container.querySelector('#wc-sentences');
        const readEl = container.querySelector('#wc-reading');

        function update() {
            const text = area.value.trim();
            const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
            const chars = text.length;
            const sentences = text ? (text.match(/[^.!?]+[.!?]+/g) || []).length || 1 : 0;
            const readTime = Math.ceil(words / 200);

            wordsEl.textContent = words;
            charsEl.textContent = chars;
            sentencesEl.textContent = text ? sentences : 0;
            readEl.textContent = `${readTime}m`;
        }

        area.addEventListener('input', update);
        update();
    },

    // 19. Text Case Converter
    'case-converter': (container) => {
        container.innerHTML = `
            <div class="controls-panel" style="gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1rem;">
                <button class="sort-btn active" data-case="upper">UPPERCASE</button>
                <button class="sort-btn" data-case="lower">lowercase</button>
                <button class="sort-btn" data-case="title">Title Case</button>
                <button class="sort-btn" data-case="sentence">Sentence case</button>
                <button class="sort-btn" data-case="camel">camelCase</button>
                <button class="sort-btn" data-case="snake">snake_case</button>
                <button class="sort-btn" data-case="kebab">kebab-case</button>
                <button class="sort-btn" data-case="constant">CONSTANT_CASE</button>
            </div>
            <textarea id="case-text" class="code-area" style="min-height: 320px; padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);" placeholder="Type or paste text here...">FastTrack tools are engineered for extreme speed and client-side performance.</textarea>
            <div style="margin-top: 1rem; display: flex; justify-content: flex-end;">
                <button class="btn-primary" id="btn-case-copy">Copy Transformed Text</button>
            </div>
        `;

        const area = container.querySelector('#case-text');

        container.querySelectorAll('[data-case]').forEach(btn => {
            btn.onclick = () => {
                const mode = btn.getAttribute('data-case');
                const val = area.value;
                if (!val) return;

                if (mode === 'upper') {
                    area.value = val.toUpperCase();
                } else if (mode === 'lower') {
                    area.value = val.toLowerCase();
                } else if (mode === 'title') {
                    area.value = val.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
                } else if (mode === 'sentence') {
                    area.value = val.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
                } else if (mode === 'camel') {
                    area.value = val.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
                        if (+match === 0) return '';
                        return index === 0 ? match.toLowerCase() : match.toUpperCase();
                    }).replace(/[^a-zA-Z0-9]/g, '');
                } else if (mode === 'snake') {
                    area.value = val.toLowerCase().trim().replace(/[\s\W-]+/g, '_');
                } else if (mode === 'kebab') {
                    area.value = val.toLowerCase().trim().replace(/[\s\W_]+/g, '-');
                } else if (mode === 'constant') {
                    area.value = val.toUpperCase().trim().replace(/[\s\W-]+/g, '_');
                }
            };
        });

        container.querySelector('#btn-case-copy').onclick = (e) => Utils.copyToClipboard(area.value, e.target);
    },

    // 10. Byte, Data Storage & Speed Converter
    'unit-converter': (container) => {
        container.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto;">
                <div class="controls-panel" style="gap: 1.25rem; align-items: flex-end;">
                    <div class="control-group" style="flex: 2;">
                        <label>Enter Value</label>
                        <input type="number" id="unit-val-in" value="1024" step="any">
                    </div>
                    <div class="control-group" style="flex: 2;">
                        <label>Source Unit</label>
                        <select id="unit-select-source">
                            <optgroup label="Decimal (Base 10)">
                                <option value="B">Bytes (B)</option>
                                <option value="KB">Kilobytes (KB) - 10³</option>
                                <option value="MB" selected>Megabytes (MB) - 10⁶</option>
                                <option value="GB">Gigabytes (GB) - 10⁹</option>
                                <option value="TB">Terabytes (TB) - 10¹²</option>
                            </optgroup>
                            <optgroup label="Binary (Base 2 - IEC)">
                                <option value="KiB">Kibibytes (KiB) - 2¹⁰</option>
                                <option value="MiB">Mebibytes (MiB) - 2²⁰</option>
                                <option value="GiB">Gibibytes (GiB) - 2³⁰</option>
                                <option value="TiB">Tebibytes (TiB) - 2⁴⁰</option>
                            </optgroup>
                            <optgroup label="Bits & Bandwidth">
                                <option value="b">Bits (b)</option>
                                <option value="Kb">Kilobits (Kb)</option>
                                <option value="Mb">Megabits (Mb)</option>
                                <option value="Gb">Gigabits (Gb)</option>
                            </optgroup>
                        </select>
                    </div>
                </div>

                <div class="output-box" style="margin-top: 1.5rem;">
                    <div class="output-header">
                        <span class="output-title">Storage Conversions</span>
                        <span style="font-size: 0.8rem; color: var(--text-dim);">Live Multi-Unit Calculation</span>
                    </div>
                    <table class="unit-table">
                        <thead>
                            <tr>
                                <th>Unit</th>
                                <th>Name & Standard</th>
                                <th>Equivalent Value</th>
                                <th>Copy</th>
                            </tr>
                        </thead>
                        <tbody id="unit-tbody"></tbody>
                    </table>
                </div>

                <div class="output-box" style="margin-top: 1.5rem;">
                    <div class="output-header">
                        <span class="output-title">Estimated Download Times</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;" id="transfer-grid"></div>
                </div>
            </div>
        `;

        const valIn = container.querySelector('#unit-val-in');
        const srcSel = container.querySelector('#unit-select-source');
        const tbody = container.querySelector('#unit-tbody');
        const transferGrid = container.querySelector('#transfer-grid');

        const multipliers = {
            'b': 0.125,
            'B': 1,
            'KB': 1e3,
            'MB': 1e6,
            'GB': 1e9,
            'TB': 1e12,
            'KiB': 1024,
            'MiB': 1024 * 1024,
            'GiB': 1024 * 1024 * 1024,
            'TiB': 1024 * 1024 * 1024 * 1024,
            'Kb': 1e3 / 8,
            'Mb': 1e6 / 8,
            'Gb': 1e9 / 8
        };

        const unitDefs = [
            { id: 'b', name: 'Bit (b)', type: 'Binary Bit' },
            { id: 'B', name: 'Byte (B)', type: 'Standard 8-bit' },
            { id: 'KB', name: 'Kilobyte (KB)', type: 'Decimal (1,000 B)' },
            { id: 'KiB', name: 'Kibibyte (KiB)', type: 'Binary (1,024 B)' },
            { id: 'MB', name: 'Megabyte (MB)', type: 'Decimal (1,000 KB)' },
            { id: 'MiB', name: 'Mebibyte (MiB)', type: 'Binary (1,024 KiB)' },
            { id: 'GB', name: 'Gigabyte (GB)', type: 'Decimal (1,000 MB)' },
            { id: 'GiB', name: 'Gibibyte (GiB)', type: 'Binary (1,024 MiB)' },
            { id: 'TB', name: 'Terabyte (TB)', type: 'Decimal (1,000 GB)' },
            { id: 'TiB', name: 'Tebibyte (TiB)', type: 'Binary (1,024 GiB)' }
        ];

        function recalculate() {
            const raw = parseFloat(valIn.value) || 0;
            const src = srcSel.value;
            const bytes = raw * (multipliers[src] || 1);

            tbody.innerHTML = unitDefs.map(u => {
                const converted = bytes / multipliers[u.id];
                const formatted = converted >= 1e6 || (converted > 0 && converted < 0.0001) ? 
                    converted.toExponential(4) : 
                    converted.toLocaleString('en-US', { maximumFractionDigits: 4 });

                return `
                    <tr>
                        <td><strong style="color: var(--text-main); font-family: var(--font-mono);">${u.id}</strong></td>
                        <td style="color: var(--text-muted); font-size: 0.85rem;">${u.name} <span style="color: var(--text-dim);">(${u.type})</span></td>
                        <td class="unit-val">${formatted}</td>
                        <td><button class="action-mini-btn" style="width: auto; padding: 0.2rem 0.5rem;" onclick="Utils.copyToClipboard('${converted}', this)">Copy</button></td>
                    </tr>
                `;
            }).join('');

            // Transfer speed estimates
            const speeds = [
                { name: '4G LTE (25 Mbps)', bps: 25 * 1e6 },
                { name: 'Home Fiber (100 Mbps)', bps: 100 * 1e6 },
                { name: '5G Ultra (300 Mbps)', bps: 300 * 1e6 },
                { name: 'Gigabit LAN (1 Gbps)', bps: 1e9 }
            ];

            const totalBits = bytes * 8;
            transferGrid.innerHTML = speeds.map(s => {
                const sec = totalBits / s.bps;
                let timeStr = `${sec.toFixed(1)}s`;
                if (sec >= 60 && sec < 3600) {
                    timeStr = `${(sec / 60).toFixed(1)} min`;
                } else if (sec >= 3600) {
                    timeStr = `${(sec / 3600).toFixed(1)} hrs`;
                } else if (sec < 0.01) {
                    timeStr = `< 10ms`;
                }

                return `
                    <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim); text-align: center;">
                        <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">${s.name}</div>
                        <div style="font-size: 1.35rem; font-weight: 800; color: var(--accent); margin-top: 0.35rem;">${timeStr}</div>
                    </div>
                `;
            }).join('');
        }

        valIn.oninput = recalculate;
        srcSel.onchange = recalculate;
        recalculate();
    },

    // 11. Lorem Ipsum & Mock Data Generator
    'lorem-ipsum': (container) => {
        container.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto;">
                <div class="controls-panel" style="gap: 1.25rem; align-items: flex-end;">
                    <div class="control-group" style="max-width: 130px;">
                        <label>Quantity</label>
                        <input type="number" id="lorem-qty" value="3" min="1" max="100">
                    </div>
                    <div class="control-group" style="flex: 2;">
                        <label>Content Type</label>
                        <select id="lorem-type">
                            <option value="paragraphs" selected>Paragraphs (Text)</option>
                            <option value="sentences">Sentences</option>
                            <option value="words">Words</option>
                            <option value="mock-users">Mock Users (JSON)</option>
                            <option value="mock-products">Mock Products (JSON)</option>
                        </select>
                    </div>
                    <div class="control-group" style="flex: 2; flex-direction: row; align-items: center; gap: 0.5rem; padding-bottom: 0.6rem;">
                        <input type="checkbox" id="lorem-lead" checked style="width: auto !important; margin: 0;">
                        <label for="lorem-lead" style="text-transform: none; font-size: 0.85rem; cursor: pointer; color: var(--text-main); margin: 0;">Include "Lorem ipsum..."</label>
                    </div>
                    <button class="btn-primary" id="btn-make-lorem">Generate</button>
                </div>

                <div class="output-box" style="margin-top: 1.25rem;">
                    <div class="output-header">
                        <span class="output-title">Generated Content</span>
                        <div style="display: flex; gap: 0.75rem; align-items: center;">
                            <span id="lorem-meta" style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">0 words</span>
                            <button class="btn-secondary" id="btn-copy-lorem" style="padding: 0.35rem 0.85rem; font-size: 0.8rem;">📋 Copy Text</button>
                        </div>
                    </div>
                    <textarea id="lorem-output" style="height: 320px; font-size: 0.95rem;"></textarea>
                </div>
            </div>
        `;

        const words = ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua", "ut", "enim", "ad", "minim", "veniam", "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi", "ut", "aliquip", "ex", "ea", "commodo", "consequat", "duis", "aute", "irure", "dolor", "in", "reprehenderit", "in", "voluptate", "velit", "esse", "cillum", "dolore", "eu", "fugiat", "nulla", "pariatur", "excepteur", "sint", "occaecat", "cupidatat", "non", "proident", "sunt", "in", "culpa", "qui", "officia", "deserunt", "mollit", "anim", "id", "est", "laborum"];

        function makeSentence() {
            const len = Math.floor(Math.random() * 10) + 8;
            const w = [];
            for (let i = 0; i < len; i++) {
                w.push(words[Math.floor(Math.random() * words.length)]);
            }
            const s = w.join(' ');
            return s.charAt(0).toUpperCase() + s.slice(1) + '.';
        }

        function generate() {
            const qty = Math.max(1, parseInt(container.querySelector('#lorem-qty').value) || 1);
            const type = container.querySelector('#lorem-type').value;
            const lead = container.querySelector('#lorem-lead').checked;
            const outArea = container.querySelector('#lorem-output');
            const meta = container.querySelector('#lorem-meta');

            let result = '';

            if (type === 'paragraphs') {
                const paras = [];
                for (let p = 0; p < qty; p++) {
                    const sentenceCount = Math.floor(Math.random() * 4) + 4;
                    const sentences = [];
                    for (let s = 0; s < sentenceCount; s++) {
                        sentences.push(makeSentence());
                    }
                    paras.push(sentences.join(' '));
                }
                if (lead && paras.length > 0) {
                    paras[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. " + paras[0];
                }
                result = paras.join('\n\n');
            } else if (type === 'sentences') {
                const s = [];
                for (let i = 0; i < qty; i++) s.push(makeSentence());
                result = s.join(' ');
            } else if (type === 'words') {
                const w = [];
                for (let i = 0; i < qty; i++) w.push(words[Math.floor(Math.random() * words.length)]);
                result = w.join(' ');
            } else if (type === 'mock-users') {
                const users = [];
                const roles = ["Software Architect", "Product Manager", "DevOps Engineer", "Frontend Developer", "Security Analyst"];
                const cities = ["Riyadh", "Dubai", "London", "San Francisco", "Singapore"];
                for (let i = 1; i <= qty; i++) {
                    users.push({
                        id: `usr_${1000 + i}`,
                        name: `User ${i}`,
                        email: `user.${i}@enterprise-cloud.io`,
                        role: roles[i % roles.length],
                        location: cities[i % cities.length],
                        active: i % 4 !== 0,
                        createdAt: new Date(Date.now() - i * 86400000).toISOString()
                    });
                }
                result = JSON.stringify(users, null, 2);
            } else if (type === 'mock-products') {
                const prods = [];
                const cats = ["Cloud SaaS", "API Gateway", "Database", "Security Suite", "Storage"];
                for (let i = 1; i <= qty; i++) {
                    prods.push({
                        id: `prod_${2000 + i}`,
                        sku: `SKU-${100 + i}`,
                        title: `Enterprise ${cats[i % cats.length]} License`,
                        price: (i * 29.99).toFixed(2),
                        currency: "USD",
                        category: cats[i % cats.length],
                        inStock: true
                    });
                }
                result = JSON.stringify(prods, null, 2);
            }

            outArea.value = result;
            const wordCount = result.trim() ? result.trim().split(/\s+/).length : 0;
            meta.textContent = `${wordCount} words • ${result.length} characters`;
        }

        container.querySelector('#btn-make-lorem').onclick = generate;
        container.querySelector('#btn-copy-lorem').onclick = (e) => {
            Utils.copyToClipboard(container.querySelector('#lorem-output').value, e.target);
        };
        generate();
    },

    // 12. SaaS Metrics, MRR, ARR & LTV / CAC
    'saas-calculator': (container) => {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">SaaS Financial Inputs</h3>
                    <div class="control-group">
                        <label>Paying Customers</label>
                        <input type="number" id="saas-customers" value="250">
                    </div>
                    <div class="control-group">
                        <label>Avg Monthly Revenue Per User - ARPU ($)</label>
                        <input type="number" id="saas-arpu" value="120">
                    </div>
                    <div class="control-group">
                        <label>Monthly Customer Churn Rate (%)</label>
                        <input type="number" id="saas-churn" value="3.5" step="0.1">
                    </div>
                    <div class="control-group">
                        <label>Customer Acquisition Cost - CAC ($)</label>
                        <input type="number" id="saas-cac" value="450">
                    </div>
                    <div class="control-group">
                        <label>Gross Margin (%)</label>
                        <input type="number" id="saas-margin" value="80">
                    </div>
                </div>

                <div>
                    <div class="output-box" style="margin: 0;">
                        <h3 style="font-size: 1.1rem; margin-bottom: 1.25rem;">SaaS Unit Economics</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                            <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim);">
                                <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Monthly Recurring (MRR)</div>
                                <div style="font-size: 1.55rem; font-weight: 800; color: var(--accent);" id="saas-res-mrr">$30,000</div>
                            </div>
                            <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim);">
                                <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Annual Run Rate (ARR)</div>
                                <div style="font-size: 1.55rem; font-weight: 800; color: var(--accent-blue);" id="saas-res-arr">$360,000</div>
                            </div>
                            <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim);">
                                <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Customer LTV</div>
                                <div style="font-size: 1.55rem; font-weight: 800; color: #a855f7;" id="saas-res-ltv">$2,742</div>
                            </div>
                            <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim);">
                                <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">LTV / CAC Ratio</div>
                                <div style="font-size: 1.55rem; font-weight: 800;" id="saas-res-ratio">6.1x</div>
                            </div>
                        </div>
                        <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
                                <span style="font-size: 0.82rem; color: var(--text-muted);">CAC Payback Period</span>
                                <span id="saas-res-payback" style="font-weight: 700; color: var(--accent);">4.7 Months</span>
                            </div>
                            <div style="font-size: 0.78rem; color: var(--text-dim);" id="saas-res-note">✅ Exceptional SaaS economics (> 3.0x benchmark)</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const inputs = container.querySelectorAll('input');
        function compute() {
            const cust = parseFloat(container.querySelector('#saas-customers').value) || 0;
            const arpu = parseFloat(container.querySelector('#saas-arpu').value) || 0;
            const churn = parseFloat(container.querySelector('#saas-churn').value) || 0;
            const cac = parseFloat(container.querySelector('#saas-cac').value) || 0;
            const margin = parseFloat(container.querySelector('#saas-margin').value) || 0;

            const mrr = cust * arpu;
            const arr = mrr * 12;
            const lifetimeMonths = churn > 0 ? (1 / (churn / 100)) : 0;
            const ltv = arpu * (margin / 100) * lifetimeMonths;
            const ratio = cac > 0 ? (ltv / cac) : 0;
            const monthlyMargin = arpu * (margin / 100);
            const payback = monthlyMargin > 0 ? (cac / monthlyMargin) : 0;

            container.querySelector('#saas-res-mrr').textContent = `$${mrr.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
            container.querySelector('#saas-res-arr').textContent = `$${arr.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
            container.querySelector('#saas-res-ltv').textContent = `$${ltv.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
            
            const ratioEl = container.querySelector('#saas-res-ratio');
            ratioEl.textContent = `${ratio.toFixed(1)}x`;
            ratioEl.style.color = ratio >= 3.0 ? 'var(--accent)' : (ratio >= 1.5 ? '#f59e0b' : '#ef4444');

            container.querySelector('#saas-res-payback').textContent = `${payback.toFixed(1)} Months`;
            container.querySelector('#saas-res-note').textContent = ratio >= 3.0 ? 
                '✅ Exceptional SaaS economics (> 3.0x industry benchmark)' : 
                (ratio >= 1.5 ? '⚠️ Acceptable but optimize CAC or reduce churn (< 3.0x)' : '⛔ Critical warning: Customer acquisition costs exceed lifetime value!');
        }

        inputs.forEach(i => i.oninput = compute);
        compute();
    },

    // 13. Discount, Coupon & VAT / Tax Calculator
    'discount-tax-calculator': (container) => {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Pricing & Discounts</h3>
                    <div class="control-group">
                        <label>Original Price ($)</label>
                        <input type="number" id="dt-price" value="120" step="0.01">
                    </div>
                    <div class="control-group">
                        <label>Primary Discount (%)</label>
                        <input type="number" id="dt-disc1" value="20" step="0.5">
                    </div>
                    <div class="control-group">
                        <label>Additional Promo / Coupon (%)</label>
                        <input type="number" id="dt-disc2" value="5" step="0.5">
                    </div>
                    <div class="control-group">
                        <label>Sales Tax / VAT (%)</label>
                        <input type="number" id="dt-vat" value="15" step="0.1">
                    </div>
                </div>

                <div>
                    <div class="output-box" style="margin: 0;">
                        <h3 style="font-size: 1.1rem; margin-bottom: 1.25rem;">Checkout Summary</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                            <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim);">
                                <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Final You Pay</div>
                                <div style="font-size: 1.65rem; font-weight: 800; color: var(--accent);" id="dt-res-pay">$104.88</div>
                            </div>
                            <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim);">
                                <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Total You Save</div>
                                <div style="font-size: 1.65rem; font-weight: 800; color: #f59e0b;" id="dt-res-saved">$28.80</div>
                            </div>
                        </div>
                        <table class="unit-table">
                            <tr><td>Discounted Base Price</td><td class="unit-val" id="dt-res-base">$91.20</td></tr>
                            <tr><td>Tax / VAT Amount</td><td class="unit-val" id="dt-res-tax">$13.68</td></tr>
                            <tr><td>Effective Total Discount Rate</td><td class="unit-val" id="dt-res-eff">24.0%</td></tr>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const inputs = container.querySelectorAll('input');
        function recalc() {
            const orig = parseFloat(container.querySelector('#dt-price').value) || 0;
            const d1 = parseFloat(container.querySelector('#dt-disc1').value) || 0;
            const d2 = parseFloat(container.querySelector('#dt-disc2').value) || 0;
            const vat = parseFloat(container.querySelector('#dt-vat').value) || 0;

            const afterD1 = orig * (1 - d1 / 100);
            const afterD2 = afterD1 * (1 - d2 / 100);
            const saved = orig - afterD2;
            const taxAmt = afterD2 * (vat / 100);
            const finalPay = afterD2 + taxAmt;
            const eff = orig > 0 ? ((saved / orig) * 100) : 0;

            container.querySelector('#dt-res-pay').textContent = `$${finalPay.toFixed(2)}`;
            container.querySelector('#dt-res-saved').textContent = `$${saved.toFixed(2)}`;
            container.querySelector('#dt-res-base').textContent = `$${afterD2.toFixed(2)}`;
            container.querySelector('#dt-res-tax').textContent = `$${taxAmt.toFixed(2)}`;
            container.querySelector('#dt-res-eff').textContent = `${eff.toFixed(1)}%`;
        }

        inputs.forEach(i => i.oninput = recalc);
        recalc();
    },

    // 14. Currency & Financial Converter
    'currency-converter': (container) => {
        container.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto;">
                <div class="controls-panel" style="gap: 1.25rem; align-items: flex-end;">
                    <div class="control-group" style="flex: 2;">
                        <label>Amount</label>
                        <input type="number" id="curr-val" value="1000" step="any">
                    </div>
                    <div class="control-group" style="flex: 2;">
                        <label>From Currency</label>
                        <select id="curr-src">
                            <option value="USD" selected>USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="SAR">SAR - Saudi Riyal</option>
                            <option value="AED">AED - UAE Dirham</option>
                            <option value="CAD">CAD - Canadian Dollar</option>
                            <option value="JPY">JPY - Japanese Yen</option>
                            <option value="INR">INR - Indian Rupee</option>
                            <option value="SGD">SGD - Singapore Dollar</option>
                        </select>
                    </div>
                    <button class="btn-secondary" id="btn-curr-swap" style="padding: 0.65rem 0.9rem;" title="Swap Currencies">⇄</button>
                    <div class="control-group" style="flex: 2;">
                        <label>To Currency</label>
                        <select id="curr-dst">
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="SAR" selected>SAR - Saudi Riyal</option>
                            <option value="AED">AED - UAE Dirham</option>
                            <option value="CAD">CAD - Canadian Dollar</option>
                            <option value="JPY">JPY - Japanese Yen</option>
                            <option value="INR">INR - Indian Rupee</option>
                            <option value="SGD">SGD - Singapore Dollar</option>
                        </select>
                    </div>
                </div>

                <div class="output-box" style="text-align: center; padding: 2rem 1.5rem;">
                    <div style="font-size: 0.9rem; color: var(--text-dim);" id="curr-rate-label">1 USD = 3.7500 SAR</div>
                    <div style="font-size: 2.5rem; font-weight: 800; color: var(--accent); margin: 0.75rem 0;" id="curr-converted">3,750.00 SAR</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Real-time peg reference rates • Accurate financial calculations</div>
                </div>

                <div class="output-box" style="margin-top: 1.5rem;">
                    <div class="output-header"><span class="output-title">Top Currency Conversions</span></div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;" id="curr-matrix"></div>
                </div>
            </div>
        `;

        const rates = {
            USD: 1.0,
            EUR: 0.92,
            GBP: 0.79,
            SAR: 3.75,
            AED: 3.6725,
            CAD: 1.36,
            JPY: 153.5,
            INR: 83.4,
            SGD: 1.35
        };

        const amtIn = container.querySelector('#curr-val');
        const srcSel = container.querySelector('#curr-src');
        const dstSel = container.querySelector('#curr-dst');
        const swapBtn = container.querySelector('#btn-curr-swap');

        function convert() {
            const amt = parseFloat(amtIn.value) || 0;
            const src = srcSel.value;
            const dst = dstSel.value;

            const inUSD = amt / rates[src];
            const result = inUSD * rates[dst];
            const singleRate = rates[dst] / rates[src];

            container.querySelector('#curr-rate-label').textContent = `1 ${src} = ${singleRate.toFixed(4)} ${dst}`;
            container.querySelector('#curr-converted').textContent = `${result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${dst}`;

            // Top conversions matrix
            const major = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'JPY', 'INR', 'CAD'];
            container.querySelector('#curr-matrix').innerHTML = major.map(c => {
                const resC = inUSD * rates[c];
                return `
                    <div style="background: var(--bg-card); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim);">
                        <div style="font-size: 0.75rem; color: var(--text-dim);">${c}</div>
                        <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-top: 0.2rem;">
                            ${resC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                `;
            }).join('');
        }

        swapBtn.onclick = () => {
            const tmp = srcSel.value;
            srcSel.value = dstSel.value;
            dstSel.value = tmp;
            convert();
        };

        amtIn.oninput = convert;
        srcSel.onchange = convert;
        dstSel.onchange = convert;
        convert();
    },

    // 16. Meta Tags & OpenGraph Previewer
    'meta-tag-generator': (container) => {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Metadata Inputs</h3>
                    <div class="control-group">
                        <label>Page Title</label>
                        <input type="text" id="meta-in-title" value="FastTrack Tools — High-Velocity Utilities">
                    </div>
                    <div class="control-group">
                        <label>Meta Description</label>
                        <textarea id="meta-in-desc" style="height: 90px;">32+ essential engineering, PDF, image, and business utilities. Free, 100% private in-browser file execution with zero lag.</textarea>
                    </div>
                    <div class="control-group">
                        <label>Canonical Page URL</label>
                        <input type="url" id="meta-in-url" value="https://www.shajjadkhan.com/tools">
                    </div>
                    <div class="control-group">
                        <label>Social Preview Image URL (OG Image)</label>
                        <input type="url" id="meta-in-img" value="https://www.shajjadkhan.com/static/images/og-tools.png">
                    </div>
                    <div class="control-group">
                        <label>Author / Publisher</label>
                        <input type="text" id="meta-in-author" value="Shajjad Khan">
                    </div>
                </div>

                <div>
                    <div class="output-box" style="margin: 0 0 1.25rem 0;">
                        <div class="output-header"><span class="output-title">Google Search Snippet Preview</span></div>
                        <div style="background: #ffffff; color: #1a0dab; border-radius: 8px; padding: 1rem; font-family: Arial, sans-serif;">
                            <div style="font-size: 12px; color: #202124;" id="meta-prev-url">https://www.shajjadkhan.com/tools</div>
                            <div style="font-size: 18px; font-weight: 400; color: #1a0dab; margin: 2px 0 4px;" id="meta-prev-title">FastTrack Tools</div>
                            <div style="font-size: 13px; color: #4d5156; line-height: 1.4;" id="meta-prev-desc">Meta description snippet preview...</div>
                        </div>
                    </div>

                    <div class="output-box">
                        <div class="output-header">
                            <span class="output-title">Generated HTML Tags</span>
                            <button class="btn-secondary" id="btn-copy-meta" style="padding: 0.35rem 0.85rem; font-size: 0.8rem;">📋 Copy Tags</button>
                        </div>
                        <pre class="code-pre" id="meta-code" style="max-height: 220px; font-size: 0.8rem;"></pre>
                    </div>
                </div>
            </div>
        `;

        const inputs = container.querySelectorAll('input, textarea');
        function update() {
            const title = container.querySelector('#meta-in-title').value.trim() || 'FastTrack Tools';
            const desc = container.querySelector('#meta-in-desc').value.trim() || '';
            const url = container.querySelector('#meta-in-url').value.trim() || 'https://www.shajjadkhan.com/tools';
            const img = container.querySelector('#meta-in-img').value.trim() || '';
            const author = container.querySelector('#meta-in-author').value.trim() || 'Shajjad Khan';

            container.querySelector('#meta-prev-url').textContent = url;
            container.querySelector('#meta-prev-title').textContent = title;
            container.querySelector('#meta-prev-desc').textContent = desc;

            const code = `<!-- Primary Meta Tags -->\n<title>${title}</title>\n<meta name="title" content="${title}">\n<meta name="description" content="${desc}">\n<meta name="author" content="${author}">\n<link rel="canonical" href="${url}">\n\n<!-- Open Graph / Facebook -->\n<meta property="og:type" content="website">\n<meta property="og:url" content="${url}">\n<meta property="og:title" content="${title}">\n<meta property="og:description" content="${desc}">\n<meta property="og:image" content="${img}">\n\n<!-- Twitter / X -->\n<meta property="twitter:card" content="summary_large_image">\n<meta property="twitter:url" content="${url}">\n<meta property="twitter:title" content="${title}">\n<meta property="twitter:description" content="${desc}">\n<meta property="twitter:image" content="${img}">`;

            container.querySelector('#meta-code').textContent = code;
        }

        container.querySelector('#btn-copy-meta').onclick = (e) => {
            Utils.copyToClipboard(container.querySelector('#meta-code').textContent, e.target);
        };

        inputs.forEach(i => i.oninput = update);
        update();
    },

    // 17. Robots.txt Generator & Rule Tester
    'robots-generator': (container) => {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Robots.txt Builder</h3>
                    <div class="control-group">
                        <label>Target User-Agent</label>
                        <select id="rob-ua">
                            <option value="*">All Web Crawlers (*)</option>
                            <option value="Googlebot">Googlebot (Google)</option>
                            <option value="Bingbot">Bingbot (Microsoft)</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label>Disallow Paths (One per line)</label>
                        <textarea id="rob-disallow" style="height: 100px;">/admin/
/private/
/api/
/tmp/</textarea>
                    </div>
                    <div class="control-group">
                        <label>Allow Paths (One per line)</label>
                        <textarea id="rob-allow" style="height: 60px;">/
/tools/</textarea>
                    </div>
                    <div class="control-group">
                        <label>Sitemap URL</label>
                        <input type="url" id="rob-sitemap" value="https://www.shajjadkhan.com/sitemap.xml">
                    </div>
                </div>

                <div>
                    <div class="output-box" style="margin: 0 0 1.25rem 0;">
                        <div class="output-header">
                            <span class="output-title">Generated robots.txt</span>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn-secondary" id="btn-copy-rob" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">📋 Copy</button>
                                <button class="btn-primary" id="btn-dl-rob" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">💾 Download</button>
                            </div>
                        </div>
                        <pre class="code-pre" id="rob-output" style="min-height: 160px; font-size: 0.85rem;"></pre>
                    </div>

                    <!-- URL Rule Tester -->
                    <div class="output-box">
                        <div class="output-header"><span class="output-title">Live URL Path Tester</span></div>
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="text" id="rob-test-in" value="/admin/users" placeholder="/path-to-test">
                            <button class="btn-primary" id="btn-rob-test">Test</button>
                        </div>
                        <div id="rob-test-badge" style="margin-top: 0.75rem; font-weight: 700; font-size: 0.95rem;"></div>
                    </div>
                </div>
            </div>
        `;

        function buildRobots() {
            const ua = container.querySelector('#rob-ua').value;
            const disallow = container.querySelector('#rob-disallow').value.trim().split('\n').filter(Boolean);
            const allow = container.querySelector('#rob-allow').value.trim().split('\n').filter(Boolean);
            const sitemap = container.querySelector('#rob-sitemap').value.trim();

            let txt = `# robots.txt generated by FastTrack Tools\nUser-agent: ${ua}\n`;
            disallow.forEach(d => txt += `Disallow: ${d.trim()}\n`);
            allow.forEach(a => txt += `Allow: ${a.trim()}\n`);
            if (sitemap) txt += `\nSitemap: ${sitemap}\n`;

            container.querySelector('#rob-output').textContent = txt;
            return txt;
        }

        function testPath() {
            const path = (container.querySelector('#rob-test-in').value || '').trim();
            const disallow = container.querySelector('#rob-disallow').value.trim().split('\n').map(s => s.trim()).filter(Boolean);
            const badge = container.querySelector('#rob-test-badge');

            const blocked = disallow.some(rule => path.startsWith(rule));
            if (blocked) {
                badge.innerHTML = `<span style="color: #ef4444;">⛔ BLOCKED</span> &bull; Path matches disallow rule`;
            } else {
                badge.innerHTML = `<span style="color: var(--accent);">✅ ALLOWED</span> &bull; Search engines can crawl this path`;
            }
        }

        container.querySelectorAll('input, textarea, select').forEach(el => el.oninput = buildRobots);
        container.querySelector('#btn-rob-test').onclick = testPath;
        container.querySelector('#btn-copy-rob').onclick = (e) => {
            Utils.copyToClipboard(container.querySelector('#rob-output').textContent, e.target);
        };
        container.querySelector('#btn-dl-rob').onclick = () => {
            const blob = new Blob([container.querySelector('#rob-output').textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'robots.txt';
            a.click();
            URL.revokeObjectURL(url);
        };

        buildRobots();
        testPath();
    },

    // 18. URL Parser & Query String Builder
    'url-parser': (container) => {
        container.innerHTML = `
            <div style="max-width: 950px; margin: 0 auto;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <div class="control-group">
                        <label>Paste Full URL to Parse</label>
                        <input type="text" id="url-parse-str" value="https://www.shajjadkhan.com/tools?category=pdf&sort=featured&token=fast2026#catalog">
                    </div>
                </div>

                <div class="output-box" style="margin-top: 1.5rem;">
                    <div class="output-header"><span class="output-title">Deconstructed URL Components</span></div>
                    <table class="unit-table" id="url-parts-tbl"></table>
                </div>

                <div class="output-box" style="margin-top: 1.5rem;">
                    <div class="output-header">
                        <span class="output-title">Query Parameters Key-Value Pair Table</span>
                    </div>
                    <table class="unit-table">
                        <thead><tr><th>Param Key</th><th>Param Value</th><th>Action</th></tr></thead>
                        <tbody id="url-query-tbl"></tbody>
                    </table>
                </div>
            </div>
        `;

        const urlInput = container.querySelector('#url-parse-str');
        const partsTbl = container.querySelector('#url-parts-tbl');
        const queryTbl = container.querySelector('#url-query-tbl');

        function parse() {
            let u;
            try {
                let raw = urlInput.value.trim();
                if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
                    raw = 'https://' + raw;
                }
                u = new URL(raw);
            } catch (e) {
                partsTbl.innerHTML = `<tr><td colspan="2" style="color: #ef4444;">Invalid URL format. Please enter a complete URL.</td></tr>`;
                queryTbl.innerHTML = '';
                return;
            }

            partsTbl.innerHTML = `
                <tr><td style="width: 180px; color: var(--text-dim);">Protocol</td><td class="unit-val">${u.protocol}</td></tr>
                <tr><td style="color: var(--text-dim);">Hostname (Domain)</td><td class="unit-val">${u.hostname}</td></tr>
                <tr><td style="color: var(--text-dim);">Port</td><td class="unit-val">${u.port || '(Default 80/443)'}</td></tr>
                <tr><td style="color: var(--text-dim);">Pathname</td><td class="unit-val">${u.pathname}</td></tr>
                <tr><td style="color: var(--text-dim);">Search Query</td><td class="unit-val">${u.search || '(None)'}</td></tr>
                <tr><td style="color: var(--text-dim);">Hash (Fragment)</td><td class="unit-val">${u.hash || '(None)'}</td></tr>
            `;

            const params = Array.from(u.searchParams.entries());
            if (params.length === 0) {
                queryTbl.innerHTML = `<tr><td colspan="3" style="color: var(--text-dim); text-align: center;">No query parameters in this URL</td></tr>`;
            } else {
                queryTbl.innerHTML = params.map(([k, v]) => `
                    <tr>
                        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent);">${k}</td>
                        <td style="font-family: var(--font-mono);">${v}</td>
                        <td><button class="action-mini-btn" style="width: auto; padding: 0.2rem 0.5rem;" onclick="Utils.copyToClipboard('${v}', this)">Copy</button></td>
                    </tr>
                `).join('');
            }
        }

        urlInput.oninput = parse;
        parse();
    },

    // 25. JWT Token Decoder & Expiration Inspector
    'jwt-decoder': (container) => {
        container.innerHTML = `
            <div style="max-width: 950px; margin: 0 auto;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <div class="control-group">
                        <label>Paste JSON Web Token (JWT)</label>
                        <textarea id="jwt-raw-in" style="height: 90px; font-size: 0.85rem;" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzg4OTIxIiwibmFtZSI6IlNoYWpqYWQgS2hhbiIsInJvbGUiOiJTeXN0ZW1BcmNoaXRlY3QiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjEzMDAwMDAwMH0.signature_fasttrack</textarea>
                    </div>
                </div>

                <div id="jwt-badge-status" style="margin-top: 1rem; padding: 0.75rem 1.25rem; border-radius: var(--radius-sm); font-weight: 700;"></div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-top: 1.25rem;">
                    <div class="output-box" style="margin: 0;">
                        <div class="output-header"><span class="output-title" style="color: #ef4444;">Header (Algorithm & Type)</span></div>
                        <pre class="code-pre" id="jwt-head-pre" style="min-height: 160px;"></pre>
                    </div>
                    <div class="output-box" style="margin: 0;">
                        <div class="output-header"><span class="output-title" style="color: #a855f7;">Payload (Claims Data)</span></div>
                        <pre class="code-pre" id="jwt-pay-pre" style="min-height: 160px;"></pre>
                    </div>
                </div>
            </div>
        `;

        const txtIn = container.querySelector('#jwt-raw-in');
        const badge = container.querySelector('#jwt-badge-status');
        const headPre = container.querySelector('#jwt-head-pre');
        const payPre = container.querySelector('#jwt-pay-pre');

        function b64Decode(str) {
            let output = str.replace(/-/g, '+').replace(/_/g, '/');
            switch (output.length % 4) {
                case 0: break;
                case 2: output += '=='; break;
                case 3: output += '='; break;
                default: throw 'Illegal base64url string!';
            }
            return decodeURIComponent(escape(atob(output)));
        }

        function decode() {
            const raw = (txtIn.value || '').trim();
            const parts = raw.split('.');
            if (parts.length < 2) {
                badge.style.background = 'rgba(239, 68, 68, 0.15)';
                badge.style.color = '#ef4444';
                badge.textContent = '⛔ Invalid JWT format (Must have at least 2 dot-separated base64 segments)';
                headPre.textContent = '';
                payPre.textContent = '';
                return;
            }

            try {
                const headerObj = JSON.parse(b64Decode(parts[0]));
                const payloadObj = JSON.parse(b64Decode(parts[1]));

                headPre.textContent = JSON.stringify(headerObj, null, 2);
                payPre.textContent = JSON.stringify(payloadObj, null, 2);

                if (payloadObj.exp) {
                    const expMs = payloadObj.exp * 1000;
                    const expDate = new Date(expMs);
                    const now = Date.now();

                    if (now < expMs) {
                        badge.style.background = 'rgba(16, 185, 129, 0.15)';
                        badge.style.color = 'var(--accent)';
                        badge.innerHTML = `🟢 TOKEN ACTIVE &bull; Expires: ${expDate.toUTCString()} (in ${Math.round((expMs - now) / 86400000)} days)`;
                    } else {
                        badge.style.background = 'rgba(239, 68, 68, 0.15)';
                        badge.style.color = '#ef4444';
                        badge.innerHTML = `🔴 TOKEN EXPIRED &bull; Expired on: ${expDate.toUTCString()}`;
                    }
                } else {
                    badge.style.background = 'rgba(59, 130, 246, 0.15)';
                    badge.style.color = '#60a5fa';
                    badge.textContent = '⚪ No Expiration (exp) claim present in token payload';
                }
            } catch (err) {
                badge.style.background = 'rgba(239, 68, 68, 0.15)';
                badge.style.color = '#ef4444';
                badge.textContent = `Parse Error: ${err.message || err}`;
            }
        }

        txtIn.oninput = decode;
        decode();
    },

    // 27. Text Diff & Comparison Checker
    'text-diff': (container) => {
        container.innerHTML = `
            <div style="max-width: 1000px; margin: 0 auto;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
                    <div>
                        <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Original Text</label>
                        <textarea id="diff-original" style="height: 160px; margin-top: 0.35rem;">System Architect: Shajjad Khan
Platform: FastTrack Tools
Status: Initial Release
Architecture: Client-side file processing</textarea>
                    </div>
                    <div>
                        <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Modified Text</label>
                        <textarea id="diff-modified" style="height: 160px; margin-top: 0.35rem;">System Architect: Shajjad Khan (Founder)
Platform: FastTrack Tools Suite 2.0
Status: Production Deployed
Architecture: Client-side file processing
Monetization: Google AdSense integrated</textarea>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                    <button class="btn-primary" id="btn-run-diff">Compare Diff</button>
                    <div id="diff-metrics" style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-muted);"></div>
                </div>

                <div class="output-box" style="margin-top: 1.25rem;">
                    <div class="output-header"><span class="output-title">Line-by-Line Difference Analysis</span></div>
                    <div id="diff-display" style="font-family: var(--font-mono); font-size: 0.85rem; line-height: 1.6;"></div>
                </div>
            </div>
        `;

        function compare() {
            const orig = container.querySelector('#diff-original').value.split('\n');
            const mod = container.querySelector('#diff-modified').value.split('\n');
            const display = container.querySelector('#diff-display');
            const metrics = container.querySelector('#diff-metrics');

            let additions = 0;
            let deletions = 0;
            let html = '';

            const max = Math.max(orig.length, mod.length);
            for (let i = 0; i < max; i++) {
                const lineO = orig[i];
                const lineM = mod[i];

                if (lineO === undefined) {
                    additions++;
                    html += `<div class="diff-output-line diff-add">+ ${escapeHtml(lineM)}</div>`;
                } else if (lineM === undefined) {
                    deletions++;
                    html += `<div class="diff-output-line diff-del">- ${escapeHtml(lineO)}</div>`;
                } else if (lineO === lineM) {
                    html += `<div class="diff-output-line diff-same">  ${escapeHtml(lineO)}</div>`;
                } else {
                    deletions++;
                    additions++;
                    html += `<div class="diff-output-line diff-del">- ${escapeHtml(lineO)}</div>`;
                    html += `<div class="diff-output-line diff-add">+ ${escapeHtml(lineM)}</div>`;
                }
            }

            display.innerHTML = html || '<div style="color: var(--text-dim); text-align: center;">Texts are identical</div>';
            metrics.innerHTML = `<span style="color: #34d399;">+${additions} added</span> &bull; <span style="color: #f87171;">-${deletions} removed</span>`;
        }

        function escapeHtml(str) {
            return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        container.querySelector('#btn-run-diff').onclick = compare;
        compare();
    },

    // 31. CSS Gradient & Box Shadow Studio
    'css-generator': (container) => {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Gradient & Shadow Controls</h3>
                    <div class="control-group">
                        <label>Gradient Angle: <span id="css-ang-lbl" style="color: var(--accent);">135deg</span></label>
                        <input type="range" id="css-ang" min="0" max="360" value="135">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="control-group">
                            <label>Start Color</label>
                            <input type="color" id="css-c1" value="#00e599" style="height: 42px; cursor: pointer;">
                        </div>
                        <div class="control-group">
                            <label>End Color</label>
                            <input type="color" id="css-c2" value="#00c2ff" style="height: 42px; cursor: pointer;">
                        </div>
                    </div>
                    <div class="control-group">
                        <label>Shadow Blur: <span id="css-blur-lbl" style="color: var(--accent);">28px</span></label>
                        <input type="range" id="css-blur-in" min="0" max="80" value="28">
                    </div>
                </div>

                <div>
                    <div class="output-box" style="margin: 0; text-align: center;">
                        <div class="output-header"><span class="output-title">Live Element Preview</span></div>
                        <div id="css-target-box" style="height: 180px; border-radius: 16px; margin: 1rem 0; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #060913; font-size: 1.25rem;">
                            Live CSS Preview
                        </div>
                    </div>

                    <div class="output-box" style="margin-top: 1.25rem;">
                        <div class="output-header">
                            <span class="output-title">Generated CSS Properties</span>
                            <button class="btn-secondary" id="btn-copy-css" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">📋 Copy CSS</button>
                        </div>
                        <pre class="code-pre" id="css-code-txt"></pre>
                    </div>
                </div>
            </div>
        `;

        const angIn = container.querySelector('#css-ang');
        const c1In = container.querySelector('#css-c1');
        const c2In = container.querySelector('#css-c2');
        const blurIn = container.querySelector('#css-blur-in');
        const target = container.querySelector('#css-target-box');
        const codePre = container.querySelector('#css-code-txt');

        function update() {
            const ang = angIn.value;
            const c1 = c1In.value;
            const c2 = c2In.value;
            const blur = blurIn.value;

            container.querySelector('#css-ang-lbl').textContent = `${ang}deg`;
            container.querySelector('#css-blur-lbl').textContent = `${blur}px`;

            const grad = `linear-gradient(${ang}deg, ${c1} 0%, ${c2} 100%)`;
            const shadow = `0 12px ${blur}px rgba(0, 229, 153, 0.35)`;

            target.style.background = grad;
            target.style.boxShadow = shadow;

            const css = `background: ${grad};\nbox-shadow: ${shadow};\nborder-radius: 16px;`;
            codePre.textContent = css;
        }

        container.querySelectorAll('input').forEach(i => i.oninput = update);
        container.querySelector('#btn-copy-css').onclick = (e) => Utils.copyToClipboard(codePre.textContent, e.target);
        update();
    },

    // 09. Image Cropper & Aspect Ratio Tool
    'image-crop': (container) => {
        container.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto;">
                <div class="dropzone" id="crop-dropzone">
                    <div class="dropzone-icon">✂️</div>
                    <div class="dropzone-title">Upload Image to Crop</div>
                    <div class="dropzone-subtitle">Supported formats: JPG, PNG, WebP</div>
                    <input type="file" id="crop-file" accept="image/*" style="display: none;">
                    <button class="dropzone-btn" onclick="document.getElementById('crop-file').click()">Choose Image</button>
                </div>

                <div id="crop-workspace" style="display: none; margin-top: 1.5rem;">
                    <div class="controls-panel" style="gap: 0.75rem; align-items: center;">
                        <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-muted);">RATIO:</span>
                        <button class="pill-btn active" data-r="1">1:1 (Square)</button>
                        <button class="pill-btn" data-r="1.777">16:9 (Landscape)</button>
                        <button class="pill-btn" data-r="1.333">4:3 (Standard)</button>
                        <button class="pill-btn" data-r="0.5625">9:16 (Story)</button>
                        <button class="btn-primary" id="btn-save-crop" style="margin-left: auto;">💾 Download Cropped Image</button>
                    </div>
                    <div style="background: #020617; border-radius: var(--radius-md); padding: 1rem; display: flex; justify-content: center; align-items: center; min-height: 320px;">
                        <canvas id="crop-canvas" style="max-width: 100%; max-height: 450px; border: 1.5px dashed var(--accent);"></canvas>
                    </div>
                </div>
            </div>
        `;

        let activeImg = null;
        let activeRatio = 1.0;

        const fileIn = container.querySelector('#crop-file');
        const workspace = container.querySelector('#crop-workspace');
        const canvas = container.querySelector('#crop-canvas');
        const ctx = canvas.getContext('2d');

        function renderCrop() {
            if (!activeImg) return;
            const imgW = activeImg.width;
            const imgH = activeImg.height;

            let targetW, targetH;
            if (imgW / imgH > activeRatio) {
                targetH = imgH;
                targetW = imgH * activeRatio;
            } else {
                targetW = imgW;
                targetH = imgW / activeRatio;
            }

            const startX = (imgW - targetW) / 2;
            const startY = (imgH - targetH) / 2;

            canvas.width = targetW;
            canvas.height = targetH;
            ctx.drawImage(activeImg, startX, startY, targetW, targetH, 0, 0, targetW, targetH);
        }

        fileIn.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (re) => {
                const img = new Image();
                img.onload = () => {
                    activeImg = img;
                    workspace.style.display = 'block';
                    renderCrop();
                };
                img.src = re.target.result;
            };
            reader.readAsDataURL(file);
        };

        container.querySelectorAll('.pill-btn').forEach(btn => {
            btn.onclick = () => {
                container.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeRatio = parseFloat(btn.dataset.r) || 1;
                renderCrop();
            };
        });

        container.querySelector('#btn-save-crop').onclick = () => {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = `cropped_image_${Date.now()}.png`;
            a.click();
        };
    },

    // 10. Image Color Picker & Palette Extractor
    'image-color-picker': (container) => {
        container.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto;">
                <div class="dropzone" id="picker-dropzone">
                    <div class="dropzone-icon">🎨</div>
                    <div class="dropzone-title">Upload Image to Extract Palette</div>
                    <div class="dropzone-subtitle">Hover over any pixel to inspect color codes or generate dominant palette</div>
                    <input type="file" id="picker-file" accept="image/*" style="display: none;">
                    <button class="dropzone-btn" onclick="document.getElementById('picker-file').click()">Select Image</button>
                </div>

                <div id="picker-workspace" style="display: none; margin-top: 1.5rem;">
                    <div style="display: flex; gap: 1.25rem; align-items: center; background: #0f172a; padding: 1rem 1.5rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; border: 1px solid var(--border-dim);">
                        <div id="swatch-hover" style="width: 50px; height: 50px; border-radius: 8px; border: 2px solid white; background: #00e599; flex-shrink: 0;"></div>
                        <div>
                            <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Hovered Pixel</div>
                            <div id="hex-hover" style="font-size: 1.35rem; font-weight: 800; font-family: var(--font-mono); color: var(--text-main);">#00E599</div>
                            <div id="rgb-hover" style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">rgb(0, 229, 153)</div>
                        </div>
                        <button class="btn-secondary" id="btn-copy-hover" style="margin-left: auto; font-size: 0.82rem;">Copy HEX</button>
                    </div>

                    <div style="text-align: center; background: #020617; padding: 1rem; border-radius: var(--radius-md); overflow: auto; max-height: 450px;">
                        <canvas id="picker-canvas" style="cursor: crosshair; max-width: 100%;"></canvas>
                    </div>

                    <div class="output-box" style="margin-top: 1.5rem;">
                        <div class="output-header"><span class="output-title">Dominant 6-Color Palette (Click to Copy)</span></div>
                        <div class="palette-grid" id="palette-chips"></div>
                    </div>
                </div>
            </div>
        `;

        const fileIn = container.querySelector('#picker-file');
        const workspace = container.querySelector('#picker-workspace');
        const canvas = container.querySelector('#picker-canvas');
        const ctx = canvas.getContext('2d');
        const swatch = container.querySelector('#swatch-hover');
        const hexTxt = container.querySelector('#hex-hover');
        const rgbTxt = container.querySelector('#rgb-hover');
        const copyBtn = container.querySelector('#btn-copy-hover');
        const paletteChips = container.querySelector('#palette-chips');

        fileIn.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (re) => {
                const img = new Image();
                img.onload = () => {
                    workspace.style.display = 'block';
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    // Extract dominant palette
                    const step = Math.max(1, Math.floor((img.width * img.height) / 500));
                    const imgData = ctx.getImageData(0, 0, img.width, img.height).data;
                    const samples = [];
                    for (let i = 0; i < imgData.length; i += step * 4) {
                        const r = imgData[i], g = imgData[i + 1], b = imgData[i + 2], a = imgData[i + 3];
                        if (a > 128) samples.push({ r, g, b });
                    }

                    // Pick 6 distinct colors
                    const palette = [];
                    for (let s of samples) {
                        if (palette.length >= 6) break;
                        const isDistinct = palette.every(p => Math.hypot(p.r - s.r, p.g - s.g, p.b - s.b) > 45);
                        if (isDistinct) palette.push(s);
                    }

                    paletteChips.innerHTML = palette.map(p => {
                        const hex = `#${((1 << 24) + (p.r << 16) + (p.g << 8) + p.b).toString(16).slice(1).toUpperCase()}`;
                        return `
                            <div class="palette-chip" onclick="Utils.copyToClipboard('${hex}', this)" title="Click to copy ${hex}">
                                <div class="palette-swatch" style="background: ${hex};"></div>
                                <div class="palette-info">
                                    <div class="palette-hex">${hex}</div>
                                    <div class="palette-rgb">rgb(${p.r}, ${p.g}, ${p.b})</div>
                                </div>
                            </div>
                        `;
                    }).join('');
                };
                img.src = re.target.result;
            };
            reader.readAsDataURL(file);
        };

        canvas.onmousemove = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = Math.floor((e.clientX - rect.left) * scaleX);
            const y = Math.floor((e.clientY - rect.top) * scaleY);

            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase()}`;
            const rgb = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;

            swatch.style.background = hex;
            hexTxt.textContent = hex;
            rgbTxt.textContent = rgb;
        };

        copyBtn.onclick = (e) => Utils.copyToClipboard(hexTxt.textContent, e.target);
    },

    // 33. DWG & CAD Drawing Viewer
    'dwg-viewer': (container) => {
        container.innerHTML = `
            <div class="cad-workspace-container" id="cadWorkspaceContainer">
                <!-- Top CAD Toolbar -->
                <div class="cad-toolbar">
                    <div class="cad-toolbar-group">
                        <input type="file" id="cadFileInput" accept=".dwg,.dxf" style="display: none;">
                        <button class="cad-btn cad-btn-primary" id="btnOpenCad">
                            <span>📁</span> Open DWG / DXF
                        </button>

                        <select class="cad-select" id="cadSampleSelect" title="Load sample CAD blueprint">
                            <option value="">⚡ Load Sample Blueprint...</option>
                            <option value="floorplan">🏢 Architectural Floor Plan</option>
                            <option value="mechanical">⚙️ Mechanical Flange & Spoke</option>
                            <option value="schematic">⚡ Electrical Circuit Schematic</option>
                        </select>
                    </div>

                    <div class="cad-toolbar-group">
                        <button class="cad-btn" id="btnCadFit" title="Fit drawing to screen (F)">
                            <span>🔍</span> Fit
                        </button>
                        <button class="cad-btn" id="btnCadReset" title="Reset view 1:1 (R)">
                            <span>🔄</span> Reset
                        </button>
                        <button class="cad-btn" id="btnCadZoomIn" title="Zoom in (+)">
                            <span>➕</span>
                        </button>
                        <button class="cad-btn" id="btnCadZoomOut" title="Zoom out (-)">
                            <span>➖</span>
                        </button>

                        <select class="cad-select" id="cadThemeSelect" title="CAD Viewport Theme">
                            <option value="dark">🖤 AutoCAD Dark</option>
                            <option value="blueprint">🔷 Blueprint Cyan</option>
                            <option value="light">⚪ Clean White</option>
                            <option value="matrix">💚 Matrix Green</option>
                        </select>

                        <button class="cad-btn" id="btnCadGrid" title="Toggle CAD grid (G)">
                            <span>🔲</span> Grid
                        </button>
                        <button class="cad-btn" id="btnCadCrosshair" title="Toggle Reticle">
                            <span>🎯</span> Reticle
                        </button>
                        <button class="cad-btn cad-btn-accent" id="btnCadMeasure" title="Distance Measurement Tool (M)">
                            <span>📏</span> Measure
                        </button>
                    </div>

                    <div class="cad-toolbar-group">
                        <button class="cad-btn" id="btnCadExportPng" title="Export 2x High-Res PNG">
                            <span>📷</span> PNG
                        </button>
                        <button class="cad-btn" id="btnCadExportSvg" title="Export Scalable Vector Graphics">
                            <span>📐</span> SVG
                        </button>
                        <button class="cad-btn" id="btnCadExportDxf" title="Download Standard DXF File">
                            <span>📄</span> DXF
                        </button>
                        <button class="cad-btn" id="btnCadFullscreen" title="Toggle Fullscreen">
                            <span>🗖</span>
                        </button>
                    </div>
                </div>

                <!-- Main Viewport Layout -->
                <div class="cad-main-viewport-layout" id="cadViewport">
                    <!-- Canvas Drawing Area -->
                    <div class="cad-canvas-container" id="cadCanvasContainer">
                        <canvas class="cad-canvas" id="cadCanvas"></canvas>

                        <!-- HUD Coordinate Reader -->
                        <div class="cad-hud-coords" id="cadHudCoords">
                            X: 0.000 | Y: 0.000 | Zoom: 100%
                        </div>

                        <!-- Active Mode Banner -->
                        <div class="cad-hud-mode-banner" id="cadModeBanner">
                            📏 Measure Mode: Click Point A to begin
                        </div>

                        <!-- UCS Icon (User Coordinate System) -->
                        <div class="cad-ucs-icon" id="cadUcsIcon">
                            <svg width="38" height="38" viewBox="0 0 40 40">
                                <line x1="6" y1="34" x2="34" y2="34" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" />
                                <polygon points="34,31 39,34 34,37" fill="#ef4444" />
                                <text x="32" y="28" fill="#ef4444" font-size="9" font-family="sans-serif" font-weight="bold">X</text>
                                <line x1="6" y1="34" x2="6" y2="6" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" />
                                <polygon points="3,6 6,1 9,6" fill="#22c55e" />
                                <text x="10" y="10" fill="#22c55e" font-size="9" font-family="sans-serif" font-weight="bold">Y</text>
                                <circle cx="6" cy="34" r="2.5" fill="#38bdf8" />
                            </svg>
                        </div>

                        <!-- Empty State Dropzone Overlay -->
                        <div class="cad-empty-dropzone" id="cadDropzone">
                            <div class="cad-dropzone-icon">📐</div>
                            <h2 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 0.4rem; color: #f8fafc;">
                                Drop AutoCAD DWG or DXF File Here
                            </h2>
                            <p style="color: var(--text-muted); max-width: 460px; font-size: 0.88rem; margin-bottom: 1.2rem;">
                                Support for all AutoCAD versions (R12 through AutoCAD 2024). Inspect vector layers, dimensions, text, measure distances, and export cleanly.
                            </p>
                            <button class="cad-btn cad-btn-primary" id="btnDropzoneUpload" style="padding: 0.6rem 1.4rem; font-size: 0.92rem;">
                                <span>📂</span> Select File from Computer
                            </button>
                            <div class="cad-sample-quicklinks">
                                <span style="font-size: 0.8rem; color: var(--text-dim); align-self: center;">Or try a sample:</span>
                                <button class="cad-btn" id="btnQuickFloorplan">🏢 Floor Plan</button>
                                <button class="cad-btn" id="btnQuickMechanical">⚙️ Flange Blueprint</button>
                                <button class="cad-btn" id="btnQuickSchematic">⚡ Schematic</button>
                            </div>
                        </div>

                        <!-- Loading Spinner Overlay -->
                        <div class="cad-loading-overlay" id="cadLoadingOverlay" style="display: none;">
                            <div class="spinner"></div>
                            <h3 id="cadLoadingText">Analyzing CAD Drawing...</h3>
                            <p style="color: var(--text-muted); font-size: 0.82rem;">Parsing layers, vectors, and bounding geometry</p>
                        </div>
                    </div>

                    <!-- Right Inspector Sidebar -->
                    <div class="cad-inspector-sidebar" id="cadSidebar">
                        <div class="cad-sidebar-tabs">
                            <button class="cad-sidebar-tab-btn active" data-tab="layers">Layers (<span id="cadLayerCount">0</span>)</button>
                            <button class="cad-sidebar-tab-btn" data-tab="properties">Properties</button>
                            <button class="cad-sidebar-tab-btn" data-tab="measurements">Measure (<span id="cadMeasureCount">0</span>)</button>
                        </div>

                        <div class="cad-sidebar-content" id="cadSidebarLayers">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Drawing Layers</span>
                                <button class="cad-btn" id="btnToggleAllLayers" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;">Toggle All</button>
                            </div>
                            <div id="cadLayersListContainer">
                                <p style="color: var(--text-dim); font-size: 0.8rem; text-align: center; padding: 2rem 0;">No active layers.</p>
                            </div>
                        </div>

                        <div class="cad-sidebar-content" id="cadSidebarProperties" style="display: none;">
                            <div class="cad-prop-card">
                                <div class="cad-prop-title">Document</div>
                                <div class="cad-prop-val" id="propFileName">—</div>
                                <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 2px;" id="propFileSize">—</div>
                            </div>
                            <div class="cad-prop-card">
                                <div class="cad-prop-title">AutoCAD Format Version</div>
                                <div class="cad-prop-val" id="propCadVersion" style="color: #38bdf8;">—</div>
                            </div>
                            <div class="cad-prop-card">
                                <div class="cad-prop-title">Drawing Extents (Units)</div>
                                <div class="cad-prop-grid">
                                    <div>
                                        <span style="font-size: 0.7rem; color: var(--text-dim);">Width:</span>
                                        <div class="cad-prop-val" id="propExtWidth">—</div>
                                    </div>
                                    <div>
                                        <span style="font-size: 0.7rem; color: var(--text-dim);">Height:</span>
                                        <div class="cad-prop-val" id="propExtHeight">—</div>
                                    </div>
                                </div>
                            </div>
                            <div class="cad-prop-card">
                                <div class="cad-prop-title">Entity Statistics</div>
                                <div class="cad-prop-grid" id="propStatsGrid">
                                    <div><span style="font-size: 0.7rem; color: var(--text-dim);">Lines:</span> <strong id="statLines">0</strong></div>
                                    <div><span style="font-size: 0.7rem; color: var(--text-dim);">Circles:</span> <strong id="statCircles">0</strong></div>
                                    <div><span style="font-size: 0.7rem; color: var(--text-dim);">Polylines:</span> <strong id="statPolylines">0</strong></div>
                                    <div><span style="font-size: 0.7rem; color: var(--text-dim);">Arcs:</span> <strong id="statArcs">0</strong></div>
                                    <div><span style="font-size: 0.7rem; color: var(--text-dim);">Texts:</span> <strong id="statTexts">0</strong></div>
                                    <div><span style="font-size: 0.7rem; color: var(--text-dim);">Total:</span> <strong id="statTotal" style="color: #38bdf8;">0</strong></div>
                                </div>
                            </div>
                        </div>

                        <div class="cad-sidebar-content" id="cadSidebarMeasurements" style="display: none;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Recorded Measurements</span>
                                <button class="cad-btn" id="btnClearMeasurements" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;">Clear</button>
                            </div>
                            <div id="cadMeasurementList">
                                <p style="color: var(--text-dim); font-size: 0.8rem; text-align: center; padding: 2rem 0;">No measurements recorded yet.<br>Click "Measure" above to measure distances.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // DOM elements
        const fileInput = container.querySelector('#cadFileInput');
        const btnOpen = container.querySelector('#btnOpenCad');
        const btnDropzoneUpload = container.querySelector('#btnDropzoneUpload');
        const dropzone = container.querySelector('#cadDropzone');
        const loadingOverlay = container.querySelector('#cadLoadingOverlay');
        const loadingText = container.querySelector('#cadLoadingText');
        const sampleSelect = container.querySelector('#cadSampleSelect');
        const themeSelect = container.querySelector('#cadThemeSelect');
        const canvasContainer = container.querySelector('#cadCanvasContainer');
        const canvas = container.querySelector('#cadCanvas');
        const hudCoords = container.querySelector('#cadHudCoords');
        const modeBanner = container.querySelector('#cadModeBanner');
        const btnFit = container.querySelector('#btnCadFit');
        const btnReset = container.querySelector('#btnCadReset');
        const btnZoomIn = container.querySelector('#btnCadZoomIn');
        const btnZoomOut = container.querySelector('#btnCadZoomOut');
        const btnGrid = container.querySelector('#btnCadGrid');
        const btnCrosshair = container.querySelector('#btnCadCrosshair');
        const btnMeasure = container.querySelector('#btnCadMeasure');
        const btnFullscreen = container.querySelector('#btnCadFullscreen');
        const btnExportPng = container.querySelector('#btnCadExportPng');
        const btnExportSvg = container.querySelector('#btnCadExportSvg');
        const btnExportDxf = container.querySelector('#btnCadExportDxf');
        const layersContainer = container.querySelector('#cadLayersListContainer');
        const layerCountEl = container.querySelector('#cadLayerCount');
        const btnToggleAllLayers = container.querySelector('#btnToggleAllLayers');
        const measurementListEl = container.querySelector('#cadMeasurementList');
        const measureCountEl = container.querySelector('#cadMeasureCount');
        const btnClearMeasurements = container.querySelector('#btnClearMeasurements');

        // Quick sample buttons
        container.querySelector('#btnQuickFloorplan').onclick = () => loadSample('floorplan');
        container.querySelector('#btnQuickMechanical').onclick = () => loadSample('mechanical');
        container.querySelector('#btnQuickSchematic').onclick = () => loadSample('schematic');

        // Theme palette definitions
        const THEMES = {
            dark: {
                bg: '#181c24',
                gridMinor: '#1e2430',
                gridMajor: '#273142',
                axisX: '#ef4444',
                axisY: '#22c55e',
                defaultStroke: '#f8fafc',
                crosshair: 'rgba(56, 189, 248, 0.45)',
                measure: '#f59e0b'
            },
            blueprint: {
                bg: '#0a2239',
                gridMinor: '#0e2e4d',
                gridMajor: '#153f68',
                axisX: '#f87171',
                axisY: '#4ade80',
                defaultStroke: '#38bdf8',
                crosshair: 'rgba(255, 255, 255, 0.4)',
                measure: '#fbbf24'
            },
            light: {
                bg: '#ffffff',
                gridMinor: '#f1f5f9',
                gridMajor: '#e2e8f0',
                axisX: '#dc2626',
                axisY: '#16a34a',
                defaultStroke: '#0f172a',
                crosshair: 'rgba(15, 23, 42, 0.4)',
                measure: '#d97706'
            },
            matrix: {
                bg: '#051a0e',
                gridMinor: '#092917',
                gridMajor: '#0f3d23',
                axisX: '#f87171',
                axisY: '#22c55e',
                defaultStroke: '#4ade80',
                crosshair: 'rgba(74, 222, 128, 0.5)',
                measure: '#facc15'
            }
        };

        // State variables
        let currentDrawing = null;
        let activeTheme = 'dark';
        let showGrid = true;
        let showCrosshair = true;
        let measureMode = false;
        let measureStart = null;
        let measureEnd = null;
        let measurements = [];

        let scale = 1.0;
        let panX = 0.0;
        let panY = 0.0;
        let isDragging = false;
        let lastMousePos = { x: 0, y: 0 };
        let mouseCAD = { x: 0, y: 0 };
        let mouseScreen = { x: 0, y: 0 };
        let layersVisibility = {};

        const ctx = canvas.getContext('2d');

        // Resize Canvas with high-DPI scaling
        function resizeCanvas() {
            const rect = canvasContainer.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.max(100, Math.floor(rect.width * dpr));
            canvas.height = Math.max(100, Math.floor(rect.height * dpr));
            render();
        }

        window.addEventListener('resize', resizeCanvas);
        setTimeout(resizeCanvas, 50);

        // Coordinate transforms
        function toScreenX(cadX) {
            const dpr = window.devicePixelRatio || 1;
            const viewW = canvas.width / dpr;
            return (cadX - panX) * scale + viewW / 2;
        }

        function toScreenY(cadY) {
            const dpr = window.devicePixelRatio || 1;
            const viewH = canvas.height / dpr;
            return viewH / 2 - (cadY - panY) * scale;
        }

        function toCADX(screenX) {
            const dpr = window.devicePixelRatio || 1;
            const viewW = canvas.width / dpr;
            return (screenX - viewW / 2) / scale + panX;
        }

        function toCADY(screenY) {
            const dpr = window.devicePixelRatio || 1;
            const viewH = canvas.height / dpr;
            return panY - (screenY - viewH / 2) / scale;
        }

        // Fit drawing extents to viewport
        function fitExtents() {
            if (!currentDrawing || !currentDrawing.extents) return;
            const ext = currentDrawing.extents;
            const dpr = window.devicePixelRatio || 1;
            const viewW = canvas.width / dpr;
            const viewH = canvas.height / dpr;

            panX = (ext.min_x + ext.max_x) / 2;
            panY = (ext.min_y + ext.max_y) / 2;

            const w = Math.max(ext.width, 10);
            const h = Math.max(ext.height, 10);
            const scaleX = (viewW * 0.82) / w;
            const scaleY = (viewH * 0.82) / h;
            scale = Math.max(0.001, Math.min(scaleX, scaleY));

            render();
        }

        // Reset view
        function resetView() {
            if (currentDrawing && currentDrawing.extents) {
                fitExtents();
            } else {
                panX = 0;
                panY = 0;
                scale = 1.0;
                render();
            }
        }

        // Main Render Loop
        function render() {
            const dpr = window.devicePixelRatio || 1;
            ctx.save();
            ctx.scale(dpr, dpr);

            const viewW = canvas.width / dpr;
            const viewH = canvas.height / dpr;
            const theme = THEMES[activeTheme] || THEMES.dark;

            // 1. Clear & fill background
            ctx.fillStyle = theme.bg;
            ctx.fillRect(0, 0, viewW, viewH);

            // 2. Draw CAD Grid
            if (showGrid) {
                drawGrid(theme, viewW, viewH);
            }

            // 3. Draw CAD Drawing Entities
            if (currentDrawing && currentDrawing.entities) {
                drawEntities(theme);
            }

            // 4. Draw Active Measurement Dimension Line
            if (measureMode && measureStart) {
                drawActiveMeasurement(theme);
            }

            // 5. Draw Completed Measurements
            drawRecordedMeasurements(theme);

            // 6. Draw Reticle / Crosshair
            if (showCrosshair && mouseScreen.x >= 0 && mouseScreen.x <= viewW && mouseScreen.y >= 0 && mouseScreen.y <= viewH) {
                drawCrosshair(theme, viewW, viewH);
            }

            ctx.restore();

            // Update Telemetry HUD
            updateHud();
        }

        function drawGrid(theme, viewW, viewH) {
            // Adaptive grid spacing based on zoom scale
            const targetPixelSpacing = 60;
            const cadSpacingRaw = targetPixelSpacing / scale;
            const power = Math.floor(Math.log10(cadSpacingRaw));
            const base = Math.pow(10, power);
            let minorStep = base;
            if (cadSpacingRaw / base > 5) minorStep = base * 5;
            else if (cadSpacingRaw / base > 2) minorStep = base * 2;
            const majorStep = minorStep * 5;

            const minCadX = toCADX(0);
            const maxCadX = toCADX(viewW);
            const minCadY = toCADY(viewH);
            const maxCadY = toCADY(0);

            const startMinorX = Math.floor(minCadX / minorStep) * minorStep;
            const startMinorY = Math.floor(minCadY / minorStep) * minorStep;

            // Draw Minor Grid
            ctx.lineWidth = 0.8;
            ctx.strokeStyle = theme.gridMinor;
            ctx.beginPath();
            for (let gx = startMinorX; gx <= maxCadX; gx += minorStep) {
                const sx = toScreenX(gx);
                ctx.moveTo(sx, 0);
                ctx.lineTo(sx, viewH);
            }
            for (let gy = startMinorY; gy <= maxCadY; gy += minorStep) {
                const sy = toScreenY(gy);
                ctx.moveTo(0, sy);
                ctx.lineTo(viewW, sy);
            }
            ctx.stroke();

            // Draw Major Grid
            const startMajorX = Math.floor(minCadX / majorStep) * majorStep;
            const startMajorY = Math.floor(minCadY / majorStep) * majorStep;
            ctx.lineWidth = 1.0;
            ctx.strokeStyle = theme.gridMajor;
            ctx.beginPath();
            for (let gx = startMajorX; gx <= maxCadX; gx += majorStep) {
                const sx = toScreenX(gx);
                ctx.moveTo(sx, 0);
                ctx.lineTo(sx, viewH);
            }
            for (let gy = startMajorY; gy <= maxCadY; gy += majorStep) {
                const sy = toScreenY(gy);
                ctx.moveTo(0, sy);
                ctx.lineTo(viewW, sy);
            }
            ctx.stroke();

            // Draw World Origin Axes (0,0)
            const originSX = toScreenX(0);
            const originSY = toScreenY(0);

            // X-Axis (Red)
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = theme.axisX;
            ctx.beginPath();
            ctx.moveTo(0, originSY);
            ctx.lineTo(viewW, originSY);
            ctx.stroke();

            // Y-Axis (Green)
            ctx.strokeStyle = theme.axisY;
            ctx.beginPath();
            ctx.moveTo(originSX, 0);
            ctx.lineTo(originSX, viewH);
            ctx.stroke();
        }

        function drawEntities(theme) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (const ent of currentDrawing.entities) {
                // Check layer visibility
                if (ent.layer && layersVisibility[ent.layer] === false) {
                    continue;
                }

                const strokeColor = ent.color || theme.defaultStroke;
                ctx.strokeStyle = strokeColor;
                ctx.fillStyle = strokeColor;

                if (ent.type === 'LINE') {
                    const sx1 = toScreenX(ent.start[0]);
                    const sy1 = toScreenY(ent.start[1]);
                    const sx2 = toScreenX(ent.end[0]);
                    const sy2 = toScreenY(ent.end[1]);
                    ctx.lineWidth = 1.4;
                    ctx.beginPath();
                    ctx.moveTo(sx1, sy1);
                    ctx.lineTo(sx2, sy2);
                    ctx.stroke();
                } else if (ent.type === 'CIRCLE') {
                    const scx = toScreenX(ent.center[0]);
                    const scy = toScreenY(ent.center[1]);
                    const sRadius = ent.radius * scale;
                    if (sRadius > 0.5) {
                        ctx.lineWidth = 1.4;
                        ctx.beginPath();
                        ctx.arc(scx, scy, sRadius, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                } else if (ent.type === 'ARC') {
                    const scx = toScreenX(ent.center[0]);
                    const scy = toScreenY(ent.center[1]);
                    const sRadius = ent.radius * scale;
                    if (sRadius > 0.5) {
                        const startRad = (ent.start_angle * Math.PI) / 180;
                        const endRad = (ent.end_angle * Math.PI) / 180;
                        ctx.lineWidth = 1.4;
                        ctx.beginPath();
                        // Note: inverted Y-axis means clockwise is counter-clockwise in screen space
                        ctx.arc(scx, scy, sRadius, -endRad, -startRad);
                        ctx.stroke();
                    }
                } else if (ent.type === 'POLYLINE') {
                    if (ent.points && ent.points.length >= 2) {
                        ctx.lineWidth = 1.4;
                        ctx.beginPath();
                        const startSX = toScreenX(ent.points[0][0]);
                        const startSY = toScreenY(ent.points[0][1]);
                        ctx.moveTo(startSX, startSY);
                        for (let p = 1; p < ent.points.length; p++) {
                            ctx.lineTo(toScreenX(ent.points[p][0]), toScreenY(ent.points[p][1]));
                        }
                        if (ent.closed) {
                            ctx.closePath();
                        }
                        ctx.stroke();
                    }
                } else if (ent.type === 'TEXT') {
                    const sx = toScreenX(ent.point[0]);
                    const sy = toScreenY(ent.point[1]);
                    const fontSize = Math.max(9, Math.min(48, (ent.height || 3.5) * scale));
                    ctx.font = `600 ${fontSize}px 'JetBrains Mono', monospace`;
                    ctx.fillText(ent.text, sx, sy);
                } else if (ent.type === 'POINT') {
                    const sx = toScreenX(ent.point[0]);
                    const sy = toScreenY(ent.point[1]);
                    ctx.beginPath();
                    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        function drawActiveMeasurement(theme) {
            const sx1 = toScreenX(measureStart.x);
            const sy1 = toScreenY(measureStart.y);
            const targetX = measureEnd ? measureEnd.x : mouseCAD.x;
            const targetY = measureEnd ? measureEnd.y : mouseCAD.y;
            const sx2 = toScreenX(targetX);
            const sy2 = toScreenY(targetY);

            // Point A glowing ring
            ctx.fillStyle = theme.measure;
            ctx.beginPath();
            ctx.arc(sx1, sy1, 4, 0, Math.PI * 2);
            ctx.fill();

            // Dashed dimension line
            ctx.lineWidth = 1.6;
            ctx.strokeStyle = theme.measure;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(sx1, sy1);
            ctx.lineTo(sx2, sy2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Point B ring
            ctx.beginPath();
            ctx.arc(sx2, sy2, 4, 0, Math.PI * 2);
            ctx.stroke();

            // Calculate distance & angle
            const dx = targetX - measureStart.x;
            const dy = targetY - measureStart.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angleDeg = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;

            // Dimension Label Badge
            const midSX = (sx1 + sx2) / 2;
            const midSY = (sy1 + sy2) / 2 - 12;
            const labelText = `Dist: ${dist.toFixed(2)} | ΔX: ${Math.abs(dx).toFixed(2)} | ΔY: ${Math.abs(dy).toFixed(2)} | ${angleDeg.toFixed(1)}°`;

            ctx.font = "bold 11px 'JetBrains Mono', monospace";
            const textMetrics = ctx.measureText(labelText);
            const pad = 6;
            ctx.fillStyle = "rgba(10, 15, 29, 0.9)";
            ctx.fillRect(midSX - textMetrics.width / 2 - pad, midSY - 12, textMetrics.width + pad * 2, 18);
            ctx.strokeStyle = theme.measure;
            ctx.strokeRect(midSX - textMetrics.width / 2 - pad, midSY - 12, textMetrics.width + pad * 2, 18);

            ctx.fillStyle = theme.measure;
            ctx.textAlign = 'center';
            ctx.fillText(labelText, midSX, midSY + 1);
            ctx.textAlign = 'start';
        }

        function drawRecordedMeasurements(theme) {
            measurements.forEach((m, idx) => {
                const sx1 = toScreenX(m.p1.x);
                const sy1 = toScreenY(m.p1.y);
                const sx2 = toScreenX(m.p2.x);
                const sy2 = toScreenY(m.p2.y);

                ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(sx1, sy1);
                ctx.lineTo(sx2, sy2);
                ctx.stroke();

                ctx.fillStyle = "rgba(245, 158, 11, 0.8)";
                ctx.beginPath();
                ctx.arc(sx1, sy1, 2.5, 0, Math.PI * 2);
                ctx.arc(sx2, sy2, 2.5, 0, Math.PI * 2);
                ctx.fill();

                const midSX = (sx1 + sx2) / 2;
                const midSY = (sy1 + sy2) / 2 - 8;
                ctx.font = "10px 'JetBrains Mono', monospace";
                ctx.fillStyle = "#f59e0b";
                ctx.fillText(`M${idx + 1}: ${m.dist.toFixed(2)}`, midSX + 4, midSY);
            });
        }

        function drawCrosshair(theme, viewW, viewH) {
            const cx = mouseScreen.x;
            const cy = mouseScreen.y;

            ctx.lineWidth = 0.9;
            ctx.strokeStyle = theme.crosshair;
            ctx.setLineDash([4, 4]);

            // Full crosshairs
            ctx.beginPath();
            ctx.moveTo(0, cy);
            ctx.lineTo(viewW, cy);
            ctx.moveTo(cx, 0);
            ctx.lineTo(cx, viewH);
            ctx.stroke();
            ctx.setLineDash([]);

            // Reticle box at intersection
            ctx.strokeRect(cx - 5, cy - 5, 10, 10);

            // Floating Coordinate Tag
            const coordTag = `(${mouseCAD.x.toFixed(2)}, ${mouseCAD.y.toFixed(2)})`;
            ctx.font = "10px 'JetBrains Mono', monospace";
            ctx.fillStyle = "rgba(10, 15, 29, 0.8)";
            ctx.fillRect(cx + 8, cy + 8, ctx.measureText(coordTag).width + 8, 16);
            ctx.fillStyle = theme.defaultStroke;
            ctx.fillText(coordTag, cx + 12, cy + 20);
        }

        function updateHud() {
            hudCoords.textContent = `X: ${mouseCAD.x.toFixed(3)} | Y: ${mouseCAD.y.toFixed(3)} | Scale: ${(scale * 100).toFixed(0)}%`;
        }

        // Mouse & Navigation Events
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const cadAtCursorX = toCADX(mouseX);
            const cadAtCursorY = toCADY(mouseY);

            const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
            scale = Math.max(0.0001, Math.min(1000, scale * zoomFactor));

            // Adjust pan so point under cursor stays at cursor
            panX = cadAtCursorX - (mouseX - (canvas.width / (window.devicePixelRatio || 1)) / 2) / scale;
            panY = cadAtCursorY + (mouseY - (canvas.height / (window.devicePixelRatio || 1)) / 2) / scale;

            render();
        }, { passive: false });

        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            if (measureMode && e.button === 0) {
                // Measure click
                const cadX = toCADX(clickX);
                const cadY = toCADY(clickY);

                if (!measureStart) {
                    measureStart = { x: cadX, y: cadY };
                    modeBanner.textContent = `📏 Point A locked at (${cadX.toFixed(2)}, ${cadY.toFixed(2)}). Click Point B to finish.`;
                } else {
                    const p1 = measureStart;
                    const p2 = { x: cadX, y: cadY };
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;

                    const record = {
                        id: measurements.length + 1,
                        p1,
                        p2,
                        dist,
                        dx,
                        dy,
                        angle,
                        time: new Date().toLocaleTimeString()
                    };
                    measurements.push(record);
                    measureStart = null;
                    modeBanner.textContent = `✅ Measured: ${dist.toFixed(2)} units (ΔX: ${Math.abs(dx).toFixed(2)}, ΔY: ${Math.abs(dy).toFixed(2)}). Click to measure again.`;
                    updateMeasurementSidebar();
                }
                render();
                return;
            }

            // Normal Pan drag (left or middle button)
            if (e.button === 0 || e.button === 1) {
                isDragging = true;
                lastMousePos = { x: e.clientX, y: e.clientY };
            }
        });

        window.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            mouseCAD = { x: toCADX(mouseScreen.x), y: toCADY(mouseScreen.y) };

            if (isDragging) {
                const deltaX = e.clientX - lastMousePos.x;
                const deltaY = e.clientY - lastMousePos.y;
                panX -= deltaX / scale;
                panY += deltaY / scale;
                lastMousePos = { x: e.clientX, y: e.clientY };
                render();
            } else if (showCrosshair || (measureMode && measureStart)) {
                render();
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            if (e.key === 'f' || e.key === 'F') fitExtents();
            else if (e.key === 'r' || e.key === 'R') resetView();
            else if (e.key === 'g' || e.key === 'G') {
                showGrid = !showGrid;
                render();
            } else if (e.key === 'm' || e.key === 'M') {
                toggleMeasureMode();
            } else if (e.key === 'Escape') {
                if (measureMode) {
                    measureStart = null;
                    toggleMeasureMode(false);
                }
            }
        });

        // Toggle measure mode
        function toggleMeasureMode(force) {
            measureMode = typeof force === 'boolean' ? force : !measureMode;
            btnMeasure.classList.toggle('active', measureMode);
            modeBanner.style.display = measureMode ? 'block' : 'none';
            if (measureMode) {
                modeBanner.textContent = "📏 Measure Mode: Click Point A on drawing";
                // Switch to measurements sidebar tab
                activateSidebarTab('measurements');
            } else {
                measureStart = null;
            }
            render();
        }

        btnMeasure.onclick = () => toggleMeasureMode();

        btnGrid.onclick = () => {
            showGrid = !showGrid;
            btnGrid.classList.toggle('cad-btn-accent', showGrid);
            render();
        };

        btnCrosshair.onclick = () => {
            showCrosshair = !showCrosshair;
            btnCrosshair.classList.toggle('cad-btn-accent', showCrosshair);
            render();
        };

        btnFit.onclick = fitExtents;
        btnReset.onclick = resetView;
        btnZoomIn.onclick = () => {
            scale *= 1.25;
            render();
        };
        btnZoomOut.onclick = () => {
            scale /= 1.25;
            render();
        };

        themeSelect.onchange = (e) => {
            activeTheme = e.target.value;
            render();
        };

        sampleSelect.onchange = (e) => {
            if (e.target.value) {
                loadSample(e.target.value);
            }
        };

        // Fullscreen toggle
        btnFullscreen.onclick = () => {
            const containerEl = container.querySelector('#cadWorkspaceContainer');
            if (!document.fullscreenElement) {
                containerEl.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
            setTimeout(resizeCanvas, 150);
        };

        // File upload handling
        btnOpen.onclick = () => fileInput.click();
        btnDropzoneUpload.onclick = () => fileInput.click();

        fileInput.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
            }
        };

        // Drag & Drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });

        async function handleFileUpload(file) {
            loadingOverlay.style.display = 'flex';
            loadingText.textContent = `Analyzing ${file.name}...`;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const resp = await fetch('/tools/api/dwg-convert', {
                    method: 'POST',
                    body: formData
                });

                const data = await resp.json();
                if (data.status === 'success') {
                    loadDrawingData(data);
                } else {
                    alert(`CAD Parsing Error: ${data.message || 'Could not parse drawing'}`);
                }
            } catch (err) {
                console.error("DWG parse error:", err);
                alert(`Error uploading file: ${err.message}`);
            } finally {
                loadingOverlay.style.display = 'none';
            }
        }

        async function loadSample(sampleType) {
            loadingOverlay.style.display = 'flex';
            loadingText.textContent = `Loading ${sampleType} blueprint...`;

            try {
                const resp = await fetch(`/tools/api/dwg-sample/${sampleType}`);
                const data = await resp.json();
                if (data.status === 'success') {
                    loadDrawingData(data);
                }
            } catch (err) {
                console.error("Error loading sample:", err);
            } finally {
                loadingOverlay.style.display = 'none';
            }
        }

        function loadDrawingData(data) {
            currentDrawing = data;
            dropzone.style.display = 'none';

            // Populate layers visibility
            layersVisibility = {};
            if (data.layers) {
                Object.keys(data.layers).forEach(layerName => {
                    layersVisibility[layerName] = data.layers[layerName].visible !== false;
                });
            }

            // Update UI sidebar tabs
            updateLayersSidebar();
            updatePropertiesSidebar();
            measurements = [];
            updateMeasurementSidebar();

            // Fit to viewport
            fitExtents();
        }

        function updateLayersSidebar() {
            if (!currentDrawing || !currentDrawing.layers) {
                layersContainer.innerHTML = '<p style="color: var(--text-dim); font-size: 0.8rem; text-align: center; padding: 2rem 0;">No layers detected.</p>';
                layerCountEl.textContent = '0';
                return;
            }

            const layerKeys = Object.keys(currentDrawing.layers);
            layerCountEl.textContent = layerKeys.length;

            layersContainer.innerHTML = layerKeys.map(k => {
                const layer = currentDrawing.layers[k];
                const isChecked = layersVisibility[k] !== false;
                return `
                    <div class="cad-layer-row">
                        <div class="cad-layer-left">
                            <input type="checkbox" id="chk_layer_${k}" ${isChecked ? 'checked' : ''} data-layer="${k}" style="cursor: pointer;">
                            <span class="cad-layer-swatch" style="background: ${layer.color};"></span>
                            <span class="cad-layer-name" title="${layer.name}">${layer.name}</span>
                        </div>
                        <span style="font-size: 0.72rem; color: var(--text-dim); font-family: var(--font-mono);">${layer.count || 0} ent</span>
                    </div>
                `;
            }).join('');

            // Bind checkbox events
            layersContainer.querySelectorAll('input[type="checkbox"]').forEach(chk => {
                chk.onchange = (e) => {
                    const layerName = e.target.getAttribute('data-layer');
                    layersVisibility[layerName] = e.target.checked;
                    render();
                };
            });
        }

        btnToggleAllLayers.onclick = () => {
            if (!currentDrawing || !currentDrawing.layers) return;
            const keys = Object.keys(currentDrawing.layers);
            const anyVisible = keys.some(k => layersVisibility[k]);
            const targetState = !anyVisible;
            keys.forEach(k => {
                layersVisibility[k] = targetState;
            });
            updateLayersSidebar();
            render();
        };

        function updatePropertiesSidebar() {
            if (!currentDrawing) return;
            container.querySelector('#propFileName').textContent = currentDrawing.filename || "drawing.dwg";
            container.querySelector('#propFileSize').textContent = currentDrawing.file_size ? Utils.formatBytes(currentDrawing.file_size) : "Native Vector";
            container.querySelector('#propCadVersion').textContent = currentDrawing.version || "AutoCAD Standard";

            const ext = currentDrawing.extents || { width: 0, height: 0 };
            container.querySelector('#propExtWidth').textContent = `${ext.width.toFixed(2)} u`;
            container.querySelector('#propExtHeight').textContent = `${ext.height.toFixed(2)} u`;

            const stats = currentDrawing.stats || {};
            container.querySelector('#statLines').textContent = stats.lines || 0;
            container.querySelector('#statCircles').textContent = stats.circles || 0;
            container.querySelector('#statPolylines').textContent = stats.polylines || 0;
            container.querySelector('#statArcs').textContent = stats.arcs || 0;
            container.querySelector('#statTexts').textContent = stats.texts || 0;
            container.querySelector('#statTotal').textContent = stats.total || 0;
        }

        function updateMeasurementSidebar() {
            measureCountEl.textContent = measurements.length;
            if (measurements.length === 0) {
                measurementListEl.innerHTML = '<p style="color: var(--text-dim); font-size: 0.8rem; text-align: center; padding: 2rem 0;">No measurements recorded yet.<br>Click "Measure" above to start.</p>';
                return;
            }

            measurementListEl.innerHTML = measurements.map((m, idx) => `
                <div class="cad-measure-item">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <strong style="color: #38bdf8;">Measurement #${idx + 1}</strong>
                        <span style="color: var(--text-dim); font-size: 0.7rem;">${m.time}</span>
                    </div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: #f59e0b;">${m.dist.toFixed(3)} units</div>
                    <div style="color: var(--text-muted); font-size: 0.72rem; margin-top: 2px;">
                        ΔX: ${Math.abs(m.dx).toFixed(2)} | ΔY: ${Math.abs(m.dy).toFixed(2)} | ∠ ${m.angle.toFixed(1)}°
                    </div>
                </div>
            `).reverse().join('');
        }

        btnClearMeasurements.onclick = () => {
            measurements = [];
            measureStart = null;
            updateMeasurementSidebar();
            render();
        };

        // Sidebar Tabs Navigation
        const tabBtns = container.querySelectorAll('.cad-sidebar-tab-btn');
        tabBtns.forEach(btn => {
            btn.onclick = () => activateSidebarTab(btn.getAttribute('data-tab'));
        });

        function activateSidebarTab(tabKey) {
            tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabKey));
            container.querySelector('#cadSidebarLayers').style.display = tabKey === 'layers' ? 'block' : 'none';
            container.querySelector('#cadSidebarProperties').style.display = tabKey === 'properties' ? 'block' : 'none';
            container.querySelector('#cadSidebarMeasurements').style.display = tabKey === 'measurements' ? 'block' : 'none';
        }

        // Export High-Res PNG
        btnExportPng.onclick = () => {
            if (!currentDrawing) {
                alert("Please load or open a DWG / DXF file first.");
                return;
            }
            const offCanvas = document.createElement('canvas');
            offCanvas.width = canvas.width;
            offCanvas.height = canvas.height;
            const offCtx = offCanvas.getContext('2d');
            offCtx.drawImage(canvas, 0, 0);

            const dataUrl = offCanvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.download = `${currentDrawing.filename ? currentDrawing.filename.replace(/\.[^/.]+$/, "") : "blueprint"}_export.png`;
            a.href = dataUrl;
            a.click();
        };

        // Export Vector SVG
        btnExportSvg.onclick = () => {
            if (!currentDrawing || !currentDrawing.extents) {
                alert("Please load or open a DWG / DXF file first.");
                return;
            }
            const ext = currentDrawing.extents;
            const pad = Math.max(ext.width, ext.height) * 0.05;
            const minX = ext.min_x - pad;
            const minY = ext.min_y - pad;
            const width = ext.width + pad * 2;
            const height = ext.height + pad * 2;

            let svgMarkup = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${-ext.max_y - pad} ${width} ${height}">\n`;
            svgMarkup += `  <rect x="${minX}" y="${-ext.max_y - pad}" width="${width}" height="${height}" fill="#181c24" />\n`;

            for (const ent of currentDrawing.entities) {
                if (ent.layer && layersVisibility[ent.layer] === false) continue;
                const col = ent.color || '#38bdf8';
                if (ent.type === 'LINE') {
                    svgMarkup += `  <line x1="${ent.start[0]}" y1="${-ent.start[1]}" x2="${ent.end[0]}" y2="${-ent.end[1]}" stroke="${col}" stroke-width="0.8" />\n`;
                } else if (ent.type === 'CIRCLE') {
                    svgMarkup += `  <circle cx="${ent.center[0]}" cy="${-ent.center[1]}" r="${ent.radius}" stroke="${col}" stroke-width="0.8" fill="none" />\n`;
                } else if (ent.type === 'POLYLINE' && ent.points) {
                    const pts = ent.points.map(p => `${p[0]},${-p[1]}`).join(' ');
                    svgMarkup += `  <${ent.closed ? 'polygon' : 'polyline'} points="${pts}" stroke="${col}" stroke-width="0.8" fill="none" />\n`;
                } else if (ent.type === 'TEXT') {
                    svgMarkup += `  <text x="${ent.point[0]}" y="${-ent.point[1]}" font-size="${ent.height || 4}" fill="${col}">${ent.text}</text>\n`;
                }
            }
            svgMarkup += `</svg>`;

            const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.download = `${currentDrawing.filename ? currentDrawing.filename.replace(/\.[^/.]+$/, "") : "drawing"}.svg`;
            a.href = url;
            a.click();
            URL.revokeObjectURL(url);
        };

        // Download Converted DXF
        btnExportDxf.onclick = async () => {
            if (!currentDrawing) {
                alert("Please load or open a DWG / DXF file first.");
                return;
            }
            if (currentDrawing.dxf_content) {
                const blob = new Blob([currentDrawing.dxf_content], { type: 'application/dxf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.download = `${currentDrawing.filename ? currentDrawing.filename.replace(/\.[^/.]+$/, "") : "drawing"}.dxf`;
                a.href = url;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                alert("DXF conversion is available directly via standard export.");
            }
        };

        // Initial render
        render();
    }
};

