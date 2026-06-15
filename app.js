/* ==========================================================================
   PixelForge - Core Application JavaScript Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // Application State
    const state = {
        files: [], // Array of file objects: { id, file, name, size, type, previewUrl, status, convertedBlob, convertedSize, convertedType }
        targetFormat: 'png', // png, jpeg, webp, bmp, ico
        quality: 85,
        fillBg: false,
        bgColor: '#ffffff',
        resizeMode: 'none', // none, scale, dimensions
        scaleFactor: 100,
        customWidth: null,
        customHeight: null,
        lockAspectRatio: true,
        referenceAspectRatio: 1.0 // Aspect ratio of the first file loaded, used as reference
    };

    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const selectFilesBtns = document.querySelectorAll('.select-files-btn');
    const filesManager = document.getElementById('files-manager');
    const filesCount = document.getElementById('files-count');
    const totalOriginalSizeEl = document.getElementById('total-original-size');
    const filesList = document.getElementById('files-list');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const convertAllBtn = document.getElementById('convert-all-btn');
    const downloadZipBtn = document.getElementById('download-zip-btn');
    const conversionStats = document.getElementById('conversion-stats');
    const convertedCountEl = document.getElementById('converted-count');
    const totalCountEl = document.getElementById('total-count');
    const compressionSavingsEl = document.getElementById('compression-savings');

    // Controls & Inputs
    const formatButtons = document.querySelectorAll('.format-btn');
    const qualitySettingsGroup = document.getElementById('quality-settings-group');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityValue = document.getElementById('quality-value');
    const fillBgCheckbox = document.getElementById('fill-bg-checkbox');
    const bgColorPickerGroup = document.getElementById('bg-color-picker-group');
    const bgColorPicker = document.getElementById('bg-color-picker');
    const bgColorHex = document.getElementById('bg-color-hex');
    const resizeModeSelect = document.getElementById('resize-mode');
    const resizeScaleGroup = document.getElementById('resize-scale-group');
    const scaleSlider = document.getElementById('scale-slider');
    const scaleValue = document.getElementById('scale-value');
    const resizeDimensionsGroup = document.getElementById('resize-dimensions-group');
    const resizeWidthInput = document.getElementById('resize-width');
    const resizeHeightInput = document.getElementById('resize-height');
    const aspectRatioBtn = document.getElementById('aspect-ratio-btn');
    const dimensionsWarning = document.getElementById('dimensions-warning');

    // ==========================================================================
    // Event Listeners - Controls & Options
    // ==========================================================================

    // Target Format selection
    formatButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            formatButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.targetFormat = btn.dataset.format;
            
            // Show/Hide quality slider based on format selection
            if (state.targetFormat === 'jpeg' || state.targetFormat === 'webp') {
                qualitySettingsGroup.classList.remove('hidden');
            } else {
                qualitySettingsGroup.classList.add('hidden');
            }

            // Automatically update file cards conversion settings text
            updateAllFileStatusesPending();
        });
    });

    // Quality Slider
    qualitySlider.addEventListener('input', (e) => {
        state.quality = parseInt(e.target.value);
        qualityValue.textContent = `${state.quality}%`;
        updateAllFileStatusesPending();
    });

    // Fill Background checkbox
    fillBgCheckbox.addEventListener('change', (e) => {
        state.fillBg = e.target.checked;
        if (state.fillBg) {
            bgColorPickerGroup.classList.remove('hidden');
        } else {
            bgColorPickerGroup.classList.add('hidden');
        }
        updateAllFileStatusesPending();
    });

    // Color Pickers link Hex <-> Picker
    bgColorPicker.addEventListener('input', (e) => {
        state.bgColor = e.target.value;
        bgColorHex.value = state.bgColor;
        updateAllFileStatusesPending();
    });

    bgColorHex.addEventListener('input', (e) => {
        let val = e.target.value;
        if (val.charAt(0) !== '#') val = '#' + val;
        // Validate hex color
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            state.bgColor = val;
            bgColorPicker.value = val;
            updateAllFileStatusesPending();
        }
    });

    // Resize Mode
    resizeModeSelect.addEventListener('change', (e) => {
        state.resizeMode = e.target.value;
        resizeScaleGroup.classList.add('hidden');
        resizeDimensionsGroup.classList.add('hidden');

        if (state.resizeMode === 'scale') {
            resizeScaleGroup.classList.remove('hidden');
        } else if (state.resizeMode === 'dimensions') {
            resizeDimensionsGroup.classList.remove('hidden');
            // Preset first file dimensions if available
            if (state.files.length > 0 && !resizeWidthInput.value && !resizeHeightInput.value) {
                presetDimensionsFromFirstFile();
            }
        }
        updateAllFileStatusesPending();
    });

    // Scale Factor Slider
    scaleSlider.addEventListener('input', (e) => {
        state.scaleFactor = parseInt(e.target.value);
        scaleValue.textContent = `${state.scaleFactor}%`;
        updateAllFileStatusesPending();
    });

    // Aspect Ratio Lock button
    aspectRatioBtn.addEventListener('click', () => {
        state.lockAspectRatio = !state.lockAspectRatio;
        if (state.lockAspectRatio) {
            aspectRatioBtn.classList.add('active');
            // Synchronize dimensions
            if (resizeWidthInput.value) {
                const w = parseInt(resizeWidthInput.value);
                resizeHeightInput.value = Math.round(w / state.referenceAspectRatio);
                state.customHeight = parseInt(resizeHeightInput.value);
            }
        } else {
            aspectRatioBtn.classList.remove('active');
        }
        updateAllFileStatusesPending();
    });

    // Dimensions Inputs (Aspect Ratio Syncing)
    resizeWidthInput.addEventListener('input', () => {
        const val = parseInt(resizeWidthInput.value);
        if (isNaN(val) || val <= 0) {
            state.customWidth = null;
            dimensionsWarning.classList.remove('hidden');
            return;
        }
        dimensionsWarning.classList.add('hidden');
        state.customWidth = val;

        if (state.lockAspectRatio && state.referenceAspectRatio) {
            resizeHeightInput.value = Math.round(val / state.referenceAspectRatio);
            state.customHeight = parseInt(resizeHeightInput.value);
        }
        updateAllFileStatusesPending();
    });

    resizeHeightInput.addEventListener('input', () => {
        const val = parseInt(resizeHeightInput.value);
        if (isNaN(val) || val <= 0) {
            state.customHeight = null;
            dimensionsWarning.classList.remove('hidden');
            return;
        }
        dimensionsWarning.classList.add('hidden');
        state.customHeight = val;

        if (state.lockAspectRatio && state.referenceAspectRatio) {
            resizeWidthInput.value = Math.round(val * state.referenceAspectRatio);
            state.customWidth = parseInt(resizeWidthInput.value);
        }
        updateAllFileStatusesPending();
    });

    // ==========================================================================
    // Event Listeners - Drag & Drop Upload Handlers
    // ==========================================================================

    // Clicking dropzone / browse files button
    selectFilesBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    });

    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag-over styling
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    // Handle dropped files
    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleUploadedFiles(files);
        }
    });

    // Handle files selected via dialog
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleUploadedFiles(files);
        }
        // Reset file input so same file can be uploaded again if cleared
        fileInput.value = '';
    });

    // ==========================================================================
    // Upload Handling Logic
    // ==========================================================================

    function handleUploadedFiles(fileList) {
        let isFirstBatch = state.files.length === 0;

        Array.from(fileList).forEach(file => {
            // Validate if it is actually an image
            if (!file.type.startsWith('image/')) {
                alert(`File "${file.name}" is not an image and will be skipped.`);
                return;
            }

            // Create a unique id for tracking this file item
            const id = 'img_' + Math.random().toString(36).substr(2, 9);
            
            const fileItem = {
                id: id,
                file: file,
                name: file.name,
                size: file.size,
                type: file.type.split('/')[1] || 'unknown',
                previewUrl: URL.createObjectURL(file),
                status: 'pending',
                convertedBlob: null,
                convertedSize: 0,
                convertedType: '',
                width: 0,
                height: 0
            };

            state.files.push(fileItem);

            // Fetch intrinsic width/height of the uploaded image
            const img = new Image();
            img.onload = () => {
                fileItem.width = img.naturalWidth;
                fileItem.height = img.naturalHeight;
                
                // If it's the absolute first valid image, set the reference aspect ratio
                if (isFirstBatch && state.files[0].id === fileItem.id) {
                    state.referenceAspectRatio = img.naturalWidth / img.naturalHeight;
                    if (state.resizeMode === 'dimensions') {
                        presetDimensionsFromFirstFile();
                    }
                }
                
                // Render the card now that dimensions are loaded
                updateFileCardDimensions(fileItem);
            };
            img.src = fileItem.previewUrl;

            // Render initial loading card (dimensions will update asynchronously)
            renderFileCard(fileItem);
        });

        updateUIState();
    }

    function presetDimensionsFromFirstFile() {
        if (state.files.length > 0) {
            const first = state.files[0];
            if (first.width && first.height) {
                resizeWidthInput.value = first.width;
                resizeHeightInput.value = first.height;
                state.customWidth = first.width;
                state.customHeight = first.height;
            }
        }
    }

    function updateFileCardDimensions(fileItem) {
        const card = document.getElementById(fileItem.id);
        if (card) {
            const dimEl = card.querySelector('.file-dimensions');
            if (dimEl) {
                dimEl.textContent = `${fileItem.width} × ${fileItem.height} px`;
            }
        }
    }

    // ==========================================================================
    // DOM UI Rendering & Updating
    // ==========================================================================

    function renderFileCard(fileItem) {
        const card = document.createElement('div');
        card.className = 'file-item';
        card.id = fileItem.id;
        
        card.innerHTML = `
            <div class="file-thumbnail">
                <img src="${fileItem.previewUrl}" alt="${fileItem.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="file-thumbnail-fallback hidden">
                    <i data-lucide="image"></i>
                </div>
            </div>
            <div class="file-info">
                <div class="file-name" title="${fileItem.name}">${fileItem.name}</div>
                <div class="file-meta-row">
                    <span class="file-size">${formatBytes(fileItem.size)}</span>
                    <span class="file-type-badge">${fileItem.type}</span>
                    <span class="file-dimensions">Loading dims...</span>
                </div>
            </div>
            <div class="file-status-col">
                <div class="file-status-indicator">
                    <i data-lucide="circle-dashed"></i> Pending
                </div>
            </div>
            <div class="file-action-col">
                <button type="button" class="file-icon-btn convert-btn" title="Convert This Image">
                    <i data-lucide="play"></i>
                </button>
                <button type="button" class="file-icon-btn remove-btn" title="Remove File">
                    <i data-lucide="x"></i>
                </button>
            </div>
        `;

        // Action: Remove File
        card.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile(fileItem.id);
        });

        // Action: Convert Single File
        card.querySelector('.convert-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            convertSingleFile(fileItem);
        });

        filesList.appendChild(card);
        lucide.createIcons({ attrs: { class: 'lucide' } });
    }

    function removeFile(id) {
        const index = state.files.findIndex(f => f.id === id);
        if (index > -1) {
            // Revoke preview URL to free memory
            URL.revokeObjectURL(state.files[index].previewUrl);
            if (state.files[index].convertedBlob) {
                URL.revokeObjectURL(state.files[index].convertedBlobUrl);
            }
            state.files.splice(index, 1);
        }

        const card = document.getElementById(id);
        if (card) {
            card.remove();
        }

        // Recompute reference aspect ratio if needed
        if (state.files.length > 0) {
            const first = state.files[0];
            if (first.width && first.height) {
                state.referenceAspectRatio = first.width / first.height;
            }
        }

        updateUIState();
    }

    function updateUIState() {
        if (state.files.length > 0) {
            filesManager.classList.remove('hidden');
            filesCount.textContent = `${state.files.length} File${state.files.length > 1 ? 's' : ''} Selected`;
            
            // Total Size calculate
            const totalBytes = state.files.reduce((acc, f) => acc + f.size, 0);
            totalOriginalSizeEl.textContent = formatBytes(totalBytes);
        } else {
            filesManager.classList.add('hidden');
            downloadZipBtn.classList.add('hidden');
            conversionStats.classList.add('hidden');
        }
    }

    function updateAllFileStatusesPending() {
        state.files.forEach(fileItem => {
            // Clear any previously converted data
            if (fileItem.convertedBlob) {
                URL.revokeObjectURL(fileItem.convertedBlobUrl);
                fileItem.convertedBlob = null;
                fileItem.convertedSize = 0;
                fileItem.convertedType = '';
            }
            fileItem.status = 'pending';
            
            const card = document.getElementById(fileItem.id);
            if (card) {
                const statusCol = card.querySelector('.file-status-col');
                statusCol.innerHTML = `
                    <div class="file-status-indicator">
                        <i data-lucide="circle-dashed"></i> Pending
                    </div>
                `;

                // Show standard play button again
                const actionCol = card.querySelector('.file-action-col');
                actionCol.innerHTML = `
                    <button type="button" class="file-icon-btn convert-btn" title="Convert This Image">
                        <i data-lucide="play"></i>
                    </button>
                    <button type="button" class="file-icon-btn remove-btn" title="Remove File">
                        <i data-lucide="x"></i>
                    </button>
                `;

                // Re-bind remove & convert events
                actionCol.querySelector('.remove-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeFile(fileItem.id);
                });
                actionCol.querySelector('.convert-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    convertSingleFile(fileItem);
                });
            }
        });

        // Hide conversion stats & zip download
        conversionStats.classList.add('hidden');
        downloadZipBtn.classList.add('hidden');
        lucide.createIcons();
    }

    // ==========================================================================
    // Clear All Files Action
    // ==========================================================================

    clearAllBtn.addEventListener('click', () => {
        state.files.forEach(fileItem => {
            URL.revokeObjectURL(fileItem.previewUrl);
            if (fileItem.convertedBlob) {
                URL.revokeObjectURL(fileItem.convertedBlobUrl);
            }
        });
        state.files = [];
        filesList.innerHTML = '';
        updateUIState();
    });

    // ==========================================================================
    // Image Conversion Engine
    // ==========================================================================

    // Convert individual file
    async function convertSingleFile(fileItem) {
        updateCardStatusToConverting(fileItem.id);

        try {
            const result = await processImageConversion(fileItem);
            fileItem.status = 'success';
            fileItem.convertedBlob = result.blob;
            fileItem.convertedSize = result.blob.size;
            fileItem.convertedType = state.targetFormat;
            fileItem.convertedBlobUrl = URL.createObjectURL(result.blob);

            updateCardStatusToSuccess(fileItem);
            checkAndEnableBulkActions();
        } catch (error) {
            console.error('Conversion error for:', fileItem.name, error);
            fileItem.status = 'error';
            updateCardStatusToError(fileItem.id, error.message || 'Error converting');
        }
        lucide.createIcons();
    }

    // Convert all files
    async function convertAllFiles() {
        if (state.files.length === 0) return;

        // Reset statistics
        conversionStats.classList.add('hidden');
        downloadZipBtn.classList.add('hidden');

        // Show loading button
        convertAllBtn.disabled = true;
        const origContent = convertAllBtn.innerHTML;
        convertAllBtn.innerHTML = `<div class="spinner"></div> Converting...`;

        // Sequential async processing to prevent browser lag on main thread
        for (let fileItem of state.files) {
            // Only convert pending or error status images
            if (fileItem.status !== 'success') {
                await convertSingleFile(fileItem);
            }
        }

        // Restore button state
        convertAllBtn.disabled = false;
        convertAllBtn.innerHTML = origContent;

        displayBulkConversionStats();
    }

    convertAllBtn.addEventListener('click', convertAllFiles);

    // Core Canvas Processing routine
    function processImageConversion(fileItem) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous"; // prevent tainted canvas for CORS URLs
            
            img.onload = () => {
                try {
                    // Create working canvas
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error("Unable to create canvas 2D context"));
                        return;
                    }

                    // 1. Calculate Target Dimensions
                    let targetWidth = img.naturalWidth;
                    let targetHeight = img.naturalHeight;

                    if (state.resizeMode === 'scale') {
                        const factor = state.scaleFactor / 100;
                        targetWidth = Math.round(img.naturalWidth * factor);
                        targetHeight = Math.round(img.naturalHeight * factor);
                    } else if (state.resizeMode === 'dimensions') {
                        const wInput = state.customWidth;
                        const hInput = state.customHeight;

                        if (!wInput || !hInput) {
                            reject(new Error("Invalid custom dimensions specified"));
                            return;
                        }

                        if (state.lockAspectRatio) {
                            // Scale dimensions to fit bounding box while preserving aspect ratio
                            const imgRatio = img.naturalWidth / img.naturalHeight;
                            const targetRatio = wInput / hInput;

                            if (imgRatio > targetRatio) {
                                targetWidth = wInput;
                                targetHeight = Math.round(wInput / imgRatio);
                            } else {
                                targetWidth = Math.round(hInput * imgRatio);
                                targetHeight = hInput;
                            }
                        } else {
                            targetWidth = wInput;
                            targetHeight = hInput;
                        }
                    }

                    // Prevent zero or negative dimensions
                    targetWidth = Math.max(1, targetWidth);
                    targetHeight = Math.max(1, targetHeight);

                    // Set canvas bounds
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;

                    // 2. Transparency handling / Background Filling
                    if (state.fillBg) {
                        ctx.fillStyle = state.bgColor;
                        ctx.fillRect(0, 0, targetWidth, targetHeight);
                    }

                    // 3. Draw image onto canvas
                    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                    // 4. Extract Blob based on Target Format
                    const format = state.targetFormat;
                    const mimeType = getMimeType(format);

                    if (format === 'bmp') {
                        // Use local custom BMP encoder
                        const bmpBlob = canvasToBmpBlob(canvas);
                        resolve({ blob: bmpBlob, width: targetWidth, height: targetHeight });
                    } else if (format === 'ico') {
                        // Use local custom PNG-encapsulated ICO encoder
                        canvasToIcoBlob(canvas).then(icoBlob => {
                            if (icoBlob) {
                                resolve({ blob: icoBlob, width: targetWidth, height: targetHeight });
                            } else {
                                reject(new Error("Failed to encode ICO file"));
                            }
                        }).catch(reject);
                    } else {
                        // Use Native canvas export for WebP, JPEG, PNG
                        const qualityVal = state.quality / 100;
                        canvas.toBlob((blob) => {
                            if (blob) {
                                resolve({ blob: blob, width: targetWidth, height: targetHeight });
                            } else {
                                reject(new Error(`Failed to convert image to ${format.toUpperCase()}`));
                            }
                        }, mimeType, qualityVal);
                    }

                } catch (err) {
                    reject(err);
                }
            };

            img.onerror = () => {
                reject(new Error("Could not parse source image file"));
            };

            img.src = fileItem.previewUrl;
        });
    }

    // ==========================================================================
    // Custom Encoders (BMP and ICO)
    // ==========================================================================

    // Uncompressed 24-bit BGR BMP Encoder
    function canvasToBmpBlob(canvas) {
        const width = canvas.width;
        const height = canvas.height;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Row size in BMP requires row padding to multiple of 4 bytes
        const rowSize = Math.floor((24 * width + 31) / 32) * 4;
        const pixelDataSize = rowSize * height;
        const fileSize = 54 + pixelDataSize;

        const buffer = new ArrayBuffer(fileSize);
        const view = new DataView(buffer);

        // BMP Header
        view.setUint16(0, 0x424D, false); // Signature: 'BM'
        view.setUint32(2, fileSize, true); // File Size
        view.setUint16(6, 0, true); // Reserved
        view.setUint16(8, 0, true); // Reserved
        view.setUint32(10, 54, true); // Data offset (54 bytes header)

        // DIB BITMAPINFOHEADER
        view.setUint32(14, 40, true); // Header size (40 bytes)
        view.setInt32(18, width, true); // Width
        view.setInt32(22, height, true); // Height (positive for bottom-to-top pixel storage)
        view.setUint16(26, 1, true); // Color Planes (1)
        view.setUint16(28, 24, true); // Bits per pixel (24-bit RGB BGR order)
        view.setUint32(30, 0, true); // Compression (0 = BI_RGB, uncompressed)
        view.setUint32(34, pixelDataSize, true); // Image data size
        view.setInt32(38, 2835, true); // Horizontal resolution (2835 pixels/meter, ~72 DPI)
        view.setInt32(42, 2835, true); // Vertical resolution (2835 pixels/meter, ~72 DPI)
        view.setUint32(46, 0, true); // Number of palette colors
        view.setUint32(50, 0, true); // Number of important colors

        // Write pixel data: BMP requires pixels from bottom-to-top rows, BGR channel order
        let offset = 54;
        for (let y = height - 1; y >= 0; y--) {
            const rowStartOffset = y * width * 4;
            let xOffset = 0;
            for (let x = 0; x < width; x++) {
                const i = rowStartOffset + x * 4;
                view.setUint8(offset + xOffset, data[i + 2]);     // Blue channel
                view.setUint8(offset + xOffset + 1, data[i + 1]); // Green channel
                view.setUint8(offset + xOffset + 2, data[i]);     // Red channel
                xOffset += 3;
            }
            // Insert padding bytes (0x00) for row sizes that aren't multiples of 4
            for (let p = xOffset; p < rowSize; p++) {
                view.setUint8(offset + p, 0);
            }
            offset += rowSize;
        }

        return new Blob([buffer], { type: 'image/bmp' });
    }

    // Encapsulated PNG-ICO Encoder (Works for up to 256x256 icons)
    async function canvasToIcoBlob(canvas) {
        return new Promise((resolve) => {
            canvas.toBlob((pngBlob) => {
                if (!pngBlob) {
                    resolve(null);
                    return;
                }
                
                pngBlob.arrayBuffer().then((pngBuffer) => {
                    const pngSize = pngBuffer.byteLength;
                    const icoSize = 22 + pngSize; // 6 bytes header + 16 bytes directory + PNG data
                    const buffer = new ArrayBuffer(icoSize);
                    const view = new DataView(buffer);

                    // ICO Header
                    view.setUint16(0, 0, true);       // Reserved (0)
                    view.setUint16(2, 1, true);       // Type (1 = Icon)
                    view.setUint16(4, 1, true);       // Number of images (1)

                    // ICO Directory Entry
                    // A value of 0 indicates a width/height of 256
                    const w = canvas.width >= 256 ? 0 : canvas.width;
                    const h = canvas.height >= 256 ? 0 : canvas.height;
                    
                    view.setUint8(6, w);              // Width
                    view.setUint8(7, h);              // Height
                    view.setUint8(8, 0);              // Color palette size (0 for no palette)
                    view.setUint8(9, 0);              // Reserved (0)
                    view.setUint16(10, 1, true);      // Color planes (1)
                    view.setUint16(12, 32, true);     // Bits per pixel (32-bit RGBA)
                    view.setUint32(14, pngSize, true);// Bytes size of image entry
                    view.setUint32(18, 22, true);     // Image data offset (22 bytes header)

                    // Append PNG byte array data right after ICO headers
                    const pngBytes = new Uint8Array(pngBuffer);
                    const icoBytes = new Uint8Array(buffer);
                    icoBytes.set(pngBytes, 22);

                    resolve(new Blob([buffer], { type: 'image/x-icon' }));
                }).catch(() => resolve(null));
            }, 'image/png');
        });
    }

    // ==========================================================================
    // UI Status Indicators & State modifiers
    // ==========================================================================

    function updateCardStatusToConverting(id) {
        const card = document.getElementById(id);
        if (!card) return;

        const statusCol = card.querySelector('.file-status-col');
        statusCol.innerHTML = `
            <div class="file-status-indicator converting">
                <div class="spinner"></div> Converting
            </div>
        `;

        // Disable remove & convert buttons during processing
        const actionCol = card.querySelector('.file-action-col');
        actionCol.querySelectorAll('button').forEach(btn => btn.disabled = true);
    }

    function updateCardStatusToSuccess(fileItem) {
        const card = document.getElementById(fileItem.id);
        if (!card) return;

        const sizeDiff = fileItem.size - fileItem.convertedSize;
        const savingPercent = Math.round((sizeDiff / fileItem.size) * 100);
        let savingsBadgeHtml = '';
        
        // Show saving percentage indicator only if positive savings
        if (savingPercent > 0) {
            savingsBadgeHtml = `<span class="savings-badge">-${savingPercent}%</span>`;
        }

        const statusCol = card.querySelector('.file-status-col');
        statusCol.innerHTML = `
            <div class="file-status-indicator success">
                <i data-lucide="check-circle-2"></i> Ready
            </div>
            <div class="conversion-detail-text">
                ${formatBytes(fileItem.convertedSize)}
                ${savingsBadgeHtml}
            </div>
        `;

        // Update single-action controls (Download Converted File)
        const actionCol = card.querySelector('.file-action-col');
        actionCol.innerHTML = `
            <a href="${fileItem.convertedBlobUrl}" download="${getConvertedFileName(fileItem.name, fileItem.convertedType)}" class="file-icon-btn download-btn" title="Download Image">
                <i data-lucide="download"></i>
            </a>
            <button type="button" class="file-icon-btn remove-btn" title="Remove File">
                <i data-lucide="x"></i>
            </button>
        `;

        // Re-enable and bind remove action
        actionCol.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile(fileItem.id);
        });
    }

    function updateCardStatusToError(id, errMsg) {
        const card = document.getElementById(id);
        if (!card) return;

        const statusCol = card.querySelector('.file-status-col');
        statusCol.innerHTML = `
            <div class="file-status-indicator error" title="${errMsg}">
                <i data-lucide="alert-triangle"></i> Failed
            </div>
        `;

        // Restore action controls to allow manual retrying or deleting
        const actionCol = card.querySelector('.file-action-col');
        actionCol.innerHTML = `
            <button type="button" class="file-icon-btn convert-btn" title="Retry Conversion">
                <i data-lucide="rotate-ccw"></i>
            </button>
            <button type="button" class="file-icon-btn remove-btn" title="Remove File">
                <i data-lucide="x"></i>
            </button>
        `;

        const fileItem = state.files.find(f => f.id === id);
        
        actionCol.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile(id);
        });
        actionCol.querySelector('.convert-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (fileItem) convertSingleFile(fileItem);
        });
    }

    // Checking successful conversions and toggling ZIP downloads
    function checkAndEnableBulkActions() {
        const successCount = state.files.filter(f => f.status === 'success').length;
        if (successCount > 0) {
            downloadZipBtn.classList.remove('hidden');
        } else {
            downloadZipBtn.classList.add('hidden');
        }
    }

    function displayBulkConversionStats() {
        const total = state.files.length;
        const successList = state.files.filter(f => f.status === 'success');
        const successCount = successList.length;

        convertedCountEl.textContent = successCount;
        totalCountEl.textContent = total;
        
        // Calculate compression stats
        const originalBytes = successList.reduce((acc, f) => acc + f.size, 0);
        const convertedBytes = successList.reduce((acc, f) => acc + f.convertedSize, 0);
        const difference = originalBytes - convertedBytes;
        const percentSaved = Math.round((difference / originalBytes) * 100);

        if (percentSaved > 0 && difference > 0) {
            compressionSavingsEl.textContent = `Total space saved: ${percentSaved}% (${formatBytes(difference)})`;
            compressionSavingsEl.classList.remove('hidden');
        } else if (difference < 0) {
            compressionSavingsEl.textContent = `Quality settings increased file size by ${Math.abs(percentSaved)}%`;
            compressionSavingsEl.classList.remove('hidden');
        } else {
            compressionSavingsEl.classList.add('hidden');
        }

        conversionStats.classList.remove('hidden');
        checkAndEnableBulkActions();
        lucide.createIcons();
    }

    // ==========================================================================
    // JSZip Batch Downloader
    // ==========================================================================

    async function downloadAllAsZip() {
        const successList = state.files.filter(f => f.status === 'success');
        if (successList.length === 0) return;

        // Visual spinner
        downloadZipBtn.disabled = true;
        const origContent = downloadZipBtn.innerHTML;
        downloadZipBtn.innerHTML = `<div class="spinner"></div> Packaging...`;

        try {
            const zip = new JSZip();
            
            // Track file names to prevent collisions in ZIP file
            const nameTracker = {};

            successList.forEach(fileItem => {
                let targetName = getConvertedFileName(fileItem.name, fileItem.convertedType);
                
                // Deduplicate names if multiple files are named identically
                if (nameTracker[targetName]) {
                    const parts = targetName.split('.');
                    const ext = parts.pop();
                    const name = parts.join('.');
                    nameTracker[targetName]++;
                    targetName = `${name}_(${nameTracker[targetName]}).${ext}`;
                } else {
                    nameTracker[targetName] = 1;
                }

                zip.file(targetName, fileItem.convertedBlob);
            });

            // Generate ZIP Archive
            const zipContentBlob = await zip.generateAsync({ type: 'blob' });
            
            // Trigger browser download
            const zipUrl = URL.createObjectURL(zipContentBlob);
            const anchor = document.createElement('a');
            anchor.href = zipUrl;
            anchor.download = `converted_images_${Date.now()}.zip`;
            document.body.appendChild(anchor);
            anchor.click();
            
            // Clean up
            document.body.removeChild(anchor);
            setTimeout(() => URL.revokeObjectURL(zipUrl), 100);

        } catch (err) {
            alert('Failed to generate ZIP archive: ' + err.message);
        } finally {
            downloadZipBtn.disabled = false;
            downloadZipBtn.innerHTML = origContent;
        }
    }

    downloadZipBtn.addEventListener('click', downloadAllAsZip);

    // ==========================================================================
    // Utility / Helper Functions
    // ==========================================================================

    function getMimeType(format) {
        switch (format) {
            case 'png': return 'image/png';
            case 'jpeg': return 'image/jpeg';
            case 'webp': return 'image/webp';
            case 'bmp': return 'image/bmp';
            case 'ico': return 'image/x-icon';
            default: return 'image/png';
        }
    }

    function getConvertedFileName(originalName, targetExt) {
        // Remove existing extension
        const lastIndex = originalName.lastIndexOf('.');
        const baseName = lastIndex > 0 ? originalName.substring(0, lastIndex) : originalName;
        const ext = targetExt === 'jpeg' ? 'jpg' : targetExt; // use .jpg standard file extension for jpeg mime
        return `${baseName}.${ext}`;
    }

    function formatBytes(bytes, decimals = 1) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
});
