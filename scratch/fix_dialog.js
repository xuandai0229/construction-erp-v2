const fs = require("fs"); 
let c = fs.readFileSync("src/components/reports/create-report-dialog.tsx", "utf8"); 

// replace type
c = c.replace("const [weeklyPreview, setWeeklyPreview] = useState<any>(null);", `type WeeklyReportPreviewClient = {
  range: { fromDate: string; toDate: string; };
  dayStatuses: any[];
  stats: { approvedReports: number; submittedReports: number; draftReports: number; rejectedReports: number; emptyDays: number; workLineCount: number; attachmentCount: number; };
  groups: { categoryId?: string; categoryName: string; items: { workItemId?: string; workContent: string; unit?: string; quantity: number; dates: string[]; sourceReports: any[]; sourceStatus: string; resultStatus?: string; issueNote?: string; attachmentCount: number; }[]; }[];
  emptyReason: string | null;
  errorMessage?: string;
};
  const [weeklyPreview, setWeeklyPreview] = useState<WeeklyReportPreviewClient | null>(null);`);

// replace setting preview
const setPrevStart = c.indexOf("const preview = await getWeeklyReportSummary(form.projectId, new Date(form.weekStartDate), new Date(form.weekEndDate));");
if (setPrevStart !== -1) {
  const setPrevEnd = c.indexOf("setWeeklyPreview(preview);", setPrevStart);
  c = c.substring(0, setPrevStart) + `const preview = await getWeeklyReportSummary(form.projectId, new Date(form.weekStartDate), new Date(form.weekEndDate));
      setWeeklyPreview({
        range: preview.range || { fromDate: "", toDate: "" },
        dayStatuses: Array.isArray(preview.dayStatuses) ? preview.dayStatuses : [],
        stats: preview.stats || { approvedReports: 0, submittedReports: 0, draftReports: 0, rejectedReports: 0, emptyDays: 0, workLineCount: 0, attachmentCount: 0 },
        groups: Array.isArray(preview.groups) ? preview.groups : [],
        emptyReason: preview.emptyReason || null
      });` + c.substring(setPrevEnd + 26);
}

// replace catch
c = c.replace(/catch \(e: unknown\) \{\n\s+toast\.error\("L?i khi t?ng h?p báo cáo tu?n"\);\n\s+console\.error\(e\);\n\s+\}/, `catch (e: any) {
      toast.error("L?i khi t?ng h?p báo cáo tu?n");
      console.error(e);
      setWeeklyPreview({
        range: { fromDate: "", toDate: "" },
        dayStatuses: [],
        stats: { approvedReports: 0, submittedReports: 0, draftReports: 0, rejectedReports: 0, emptyDays: 0, workLineCount: 0, attachmentCount: 0 },
        groups: [],
        emptyReason: "ERROR",
        errorMessage: e?.message || "L?i không xác d?nh"
      });
    }`);

// replace the UI for weeklyPreview
const uiOldStart = c.indexOf("{weeklyPreview && (\\n                <div className=\\"space-y-4\\">");
// wait, the string is {weeklyPreview && (\n                <div className="space-y-4">\n                  <div className="grid grid-cols-2

