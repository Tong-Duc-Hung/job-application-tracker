import { test, expect } from "./fixtures";
import { readFile } from "node:fs/promises";
import {
  apiCreateNote,
  createApplication,
  createInterview,
  createNote,
  loginAsFreshTestUser,
} from "./helpers";

/**
 * Hợp đồng export xuyên tính năng: kinh nghiệm của đơn ứng tuyển, nhận xét
 * phỏng vấn, và ghi chú phải được giữ TÁCH BIỆT trong file xuất ra.
 */
test.describe("Cross-feature export workflow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFreshTestUser(page);
  });

  // Seed 4 loại dữ liệu (application experience, interview review, application note,
  // interview note) rồi export ra cả 4 định dạng để xác nhận mỗi loại rơi đúng
  // vào cột/sheet của nó — không bị trộn lẫn vào nhau.
  test("keeps application experience, interview review, and notes in separate export records", async ({ page }) => {
    const application = await createApplication(page, { experience: "Export experience details" });
    const interview = await createInterview(page, application.id, { title: "Export interview round", review: "Interview review journal" });
    await createNote(page, application.id, { title: "Application note", content: "Application note content" });
    await apiCreateNote(
      page.request,
      { interviewId: interview.id },
      { title: "Interview note", content: "Interview note content" }
    );

    await page.goto("/settings");
    await page.getByRole("button", { name: "Xuất", exact: true }).click();

    // Mỗi lựa chọn định dạng là một <button> có accessible name là label CỘNG
    // phần mô tả ("JSON" + "Toàn bộ dữ liệu gốc…"), nên tìm exact-name chỉ với
    // "JSON" không bao giờ khớp — click vào chữ label, sự kiện sẽ bubble lên button.
    const jsonDownload = page.waitForEvent("download");
    await page.getByText("JSON", { exact: true }).click();
    const jsonFile = await jsonDownload;
    expect(jsonFile.suggestedFilename()).toMatch(/\.json$/);
    const jsonPath = await jsonFile.path();
    if (!jsonPath) throw new Error("JSON export did not produce a file");
    const jsonData = JSON.parse(await readFile(jsonPath, "utf8"));
    expect(jsonData.applications[0].interviews[0].title).toBe("Export interview round");
    expect(jsonData.applications[0].interviews[0].review).toBe("Interview review journal");
    expect(jsonData.applications[0].interviews[0].notes[0].content).toBe("Interview note content");
    expect(jsonData.applications[0].notes[0].content).toBe("Application note content");
    expect(jsonData.applications[0].experience).toBe("Export experience details");

    await page.getByRole("button", { name: "Xuất", exact: true }).click();
    const csvDownload = page.waitForEvent("download");
    await page.getByText("CSV", { exact: true }).click();
    const csvFile = await csvDownload;
    expect(csvFile.suggestedFilename()).toMatch(/\.csv$/);
    const csvPath = await csvFile.path();
    if (!csvPath) throw new Error("CSV export did not produce a file");
    const csvContents = await readFile(csvPath, "utf8");
    expect(csvContents).toContain("Đơn ứng tuyển");
    expect(csvContents).toContain("Lịch phỏng vấn");
    expect(csvContents).toContain("Export interview round");
    expect(csvContents).toContain("Nhận xét phỏng vấn");
    expect(csvContents).toContain("Interview review journal");
    expect(csvContents).toContain("Kinh nghiệm");
    expect(csvContents).toContain("Export experience details");
    expect(csvContents).toContain("Application note content");
    expect(csvContents).toContain("Interview note content");

    await page.getByRole("button", { name: "Xuất", exact: true }).click();
    const xlsxDownload = page.waitForEvent("download");
    await page.getByText("Excel (.xlsx)", { exact: true }).click();
    const xlsxFile = await xlsxDownload;
    expect(xlsxFile.suggestedFilename()).toMatch(/\.xlsx$/);
    const xlsxPath = await xlsxFile.path();
    if (!xlsxPath) throw new Error("Excel export did not produce a file");
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await readFile(xlsxPath), { type: "buffer" });
    expect(workbook.SheetNames).toEqual(["Đơn ứng tuyển", "Phỏng vấn", "Ghi chú"]);
    const applicationRows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets["Đơn ứng tuyển"]!);
    expect(applicationRows[0]["Kinh nghiệm"]).toBe("Export experience details");
    expect(XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets["Phỏng vấn"]!)[0]["Tiêu đề"]).toBe(
      "Export interview round"
    );
    const interviewRows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets["Phỏng vấn"]!);
    expect(interviewRows[0]["Nhận xét"]).toBe("Interview review journal");
    const noteRows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets["Ghi chú"]!);
    expect(noteRows.map((row) => row["Nội dung"])).toEqual(
      expect.arrayContaining(["Application note content", "Interview note content"])
    );
    expect(noteRows.map((row) => row["Nội dung"])).not.toContain("Export experience details");

    await page.getByRole("button", { name: "Xuất", exact: true }).click();
    const pdfDownload = page.waitForEvent("download");
    await page.getByText("PDF", { exact: true }).click();
    const pdfFile = await pdfDownload;
    expect(pdfFile.suggestedFilename()).toMatch(/\.pdf$/);
    const pdfPath = await pdfFile.path();
    if (!pdfPath) throw new Error("PDF export did not produce a file");
    expect((await readFile(pdfPath)).subarray(0, 4).toString()).toBe("%PDF");
  });

});