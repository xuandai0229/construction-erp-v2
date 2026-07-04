const fs = require('fs');
let content = fs.readFileSync('src/components/reports/reports-workspace.tsx', 'utf8');

content = content.replace(
  'import { SiteReportGalleryDialog } from "./site-report-gallery-dialog";\r\nimport {',
  'import { SiteReportGalleryDialog } from "./site-report-gallery-dialog";\r\nimport { ReportPrintPreviewDialog } from "./report-print-preview-dialog";\r\nimport {'
);

content = content.replace(
  'const [isGalleryOpen, setIsGalleryOpen] = useState(false);\r\n\r\n  const reports = initialReports;',
  'const [isGalleryOpen, setIsGalleryOpen] = useState(false);\r\n  const [printPreviewReport, setPrintPreviewReport] = useState<FieldReport | null>(null);\r\n\r\n  const reports = initialReports;'
);

content = content.replace(
  '  const handleCloseDetail = useCallback(() => {',
  '  const handlePrintPreview = useCallback((report: FieldReport) => {\r\n    setPrintPreviewReport(report);\r\n  }, []);\r\n\r\n  const handleCloseDetail = useCallback(() => {'
);

content = content.replace(
  '          onViewGallery={(r) => { setGalleryPhotos(r.photos); setIsGalleryOpen(true); }}\r\n          onEdit={handleEdit}',
  '          onViewGallery={(r) => { setGalleryPhotos(r.photos); setIsGalleryOpen(true); }}\r\n          onPrintPreview={handlePrintPreview}\r\n          onEdit={handleEdit}'
);

content = content.replace(
  '        onEdit={handleEdit}\r\n        onDelete={handleDelete}\r\n        onViewGallery={(r, index) => { setGalleryPhotos(r.photos); setGalleryIndex(index || 0); setIsGalleryOpen(true); }}',
  '        onEdit={handleEdit}\r\n        onDelete={handleDelete}\r\n        onPrintPreview={handlePrintPreview}\r\n        onViewGallery={(r, index) => { setGalleryPhotos(r.photos); setGalleryIndex(index || 0); setIsGalleryOpen(true); }}'
);

content = content.replace(
  '        isLoading={isSubmitting}\r\n      />\r\n    </div>\r\n  );\r\n}',
  '        isLoading={isSubmitting}\r\n      />\r\n\r\n      <ReportPrintPreviewDialog\r\n        isOpen={Boolean(printPreviewReport)}\r\n        onClose={() => setPrintPreviewReport(null)}\r\n        report={printPreviewReport}\r\n      />\r\n    </div>\r\n  );\r\n}'
);

// Fallback for \n (if saved as LF)
content = content.replace(
  'import { SiteReportGalleryDialog } from "./site-report-gallery-dialog";\nimport {',
  'import { SiteReportGalleryDialog } from "./site-report-gallery-dialog";\nimport { ReportPrintPreviewDialog } from "./report-print-preview-dialog";\nimport {'
);

content = content.replace(
  'const [isGalleryOpen, setIsGalleryOpen] = useState(false);\n\n  const reports = initialReports;',
  'const [isGalleryOpen, setIsGalleryOpen] = useState(false);\n  const [printPreviewReport, setPrintPreviewReport] = useState<FieldReport | null>(null);\n\n  const reports = initialReports;'
);

content = content.replace(
  '          onViewGallery={(r) => { setGalleryPhotos(r.photos); setIsGalleryOpen(true); }}\n          onEdit={handleEdit}',
  '          onViewGallery={(r) => { setGalleryPhotos(r.photos); setIsGalleryOpen(true); }}\n          onPrintPreview={handlePrintPreview}\n          onEdit={handleEdit}'
);

content = content.replace(
  '        onEdit={handleEdit}\n        onDelete={handleDelete}\n        onViewGallery={(r, index) => { setGalleryPhotos(r.photos); setGalleryIndex(index || 0); setIsGalleryOpen(true); }}',
  '        onEdit={handleEdit}\n        onDelete={handleDelete}\n        onPrintPreview={handlePrintPreview}\n        onViewGallery={(r, index) => { setGalleryPhotos(r.photos); setGalleryIndex(index || 0); setIsGalleryOpen(true); }}'
);

content = content.replace(
  '        isLoading={isSubmitting}\n      />\n    </div>\n  );\n}',
  '        isLoading={isSubmitting}\n      />\n\n      <ReportPrintPreviewDialog\n        isOpen={Boolean(printPreviewReport)}\n        onClose={() => setPrintPreviewReport(null)}\n        report={printPreviewReport}\n      />\n    </div>\n  );\n}'
);

fs.writeFileSync('src/components/reports/reports-workspace.tsx', content);
