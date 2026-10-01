# ScanMaster Pro PDF Suite — Implementation Plan

## Brainstorming outcome

Build a complete, lightweight PDF workspace inside the existing ScanMaster Pro single-page app. Preserve ScanMaster branding and the existing camera scanner. Use the familiar PDF-tool workflow of choosing a tool, adding files, setting options, processing, previewing the result, and downloading it. Keep documents in the browser wherever the current libraries allow and explain when an operation rasterizes pages or has format limits.

The GitHub repository currently implements camera scanning, image editing, merge, raster-based compression, page extraction, rotation, watermarking, OCR, image-to-PDF, PDF-to-JPG, and Word/PDF conversions. This is the starting point; the plan does not assume a server-side conversion service or paid account model.

## Product decisions

- Keep the ScanMaster Pro name, colors, and existing scanner. Use an original layout and copy; do not reuse iLovePDF logos, copy, or proprietary visual assets.
- Put PDF tools first, with categories, search, and clear descriptions. Retain scanner and settings as first-class destinations.
- Use one consistent upload → options → process → result/download flow where possible.
- Prioritize tools that can be implemented reliably in-browser: merge, split/extract, remove/reorder/rotate pages, image/PDF conversions, OCR, watermark, page numbering, signature, and the existing scanner/converters.
- Preserve the existing no-upload privacy model. CDN libraries may still be downloaded by the browser; disclose that tools need a network connection on first use.
- Clearly identify the current raster-based conversions and compression, which can discard searchable text, links, forms, or metadata. Do not describe raster recompression as guaranteed size reduction.
- Do not promise PDF password protection/unlocking, repair, PDF/A, or redaction until a compatible implementation is verified.
- Deploy to the connected Vercel production project only after the local UI and core workflows have been validated.

## Work plan

1. **Inspect and baseline**: map existing HTML sections, event bindings, PDF functions, third-party dependencies, Vercel connection, and current live behavior.
2. **Workspace redesign**: create a searchable, categorized tool catalog, drag-and-drop entry point, clear PDF-first landing state, result states, and mobile-friendly navigation while retaining scanner access.
3. **Tool workflows**: unify inputs and result feedback; add practical missing page operations and any additional tools supported by the current browser libraries; prevent misleading success messages and handle unavailable libraries/file errors.
4. **Accessibility and performance**: keep keyboard access, labels, modal focus handling, progress feedback, and sensible file/page memory bounds.
5. **Validation**: run the repository HTML validator, check inline JavaScript syntax, and use `agent-browser` on the local app to inspect desktop/mobile layouts and exercise tool navigation plus upload/cancel paths. Exercise a real PDF operation if a safe fixture is available.
6. **Release**: commit the reviewed changes to the connected GitHub branch and trigger/verify Vercel production deployment. If the repository connection or deployment credentials are unavailable, report that blocker with the validated local result.

## Acceptance criteria

- The landing page clearly communicates the PDF workspace and lets a user find a tool without losing scanner access.
- Tool cards are grouped, searchable, keyboard reachable, and describe actual behavior.
- Existing operations remain accessible and error states do not leave stale file selections or loading overlays.
- Added operations work entirely in the browser and produce downloadable output.
- Mobile viewport has no horizontal overflow; keyboard focus is visible and modal behavior is accessible.
- HTML and JavaScript validation pass, and `agent-browser` confirms the rendered interface and core navigation.
- The deployed production URL serves the new version, or any deployment blocker is clearly identified.

## Explicit limitations

“Every iLovePDF feature” is a moving service catalog that includes server-backed and licensed capabilities. This plan implements a substantial browser-based equivalent with the available repository and libraries; it does not claim feature parity with remote, proprietary services.
