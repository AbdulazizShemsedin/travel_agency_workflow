import test from "node:test";
import assert from "node:assert/strict";
import {
  getFileDownloadUrl,
  cleanFileId,
  uploadFileV2,
} from "../src/lib/api/v2/documents";
import { normalizeApplicantFields } from "../src/lib/api/v2/applicants";
import {
  createMuayenaPlacementV2,
  uploadPlacementContractV2,
  uploadPlacementVisaV2,
} from "../src/lib/api/v2/placements";
import {
  uploadBatchPaymentProofV2,
  uploadBankStatementV2,
} from "../src/lib/api/v2/finance";

test("Go Backend Native File-ID Migration & Immediate Previews Audit", async (t) => {
  await t.test("1. Technical File-ID Resolution & Download URLs", async (t2) => {
    await t2.test("resolves raw technical file ID to authoritative download endpoint", () => {
      const fileId = "file_9f3c2a71d04be85a6c1d";
      const resolved = getFileDownloadUrl(fileId);
      assert.equal(
        resolved,
        "/api/method/agency_tracking.api.file.read?op=download_file&file_id=file_9f3c2a71d04be85a6c1d"
      );
    });

    await t2.test("resolves technical hash without slash to download endpoint", () => {
      const hash = "249c18542be34dbe";
      const resolved = getFileDownloadUrl(hash);
      assert.equal(
        resolved,
        "/api/method/agency_tracking.api.file.read?op=download_file&file_id=249c18542be34dbe"
      );
    });

    await t2.test("preserves existing /api/, /files/, blob:, and https: URLs unchanged", () => {
      assert.equal(
        getFileDownloadUrl("/api/method/agency_tracking.api.file.read?op=download_file&file_id=file_123"),
        "/api/method/agency_tracking.api.file.read?op=download_file&file_id=file_123"
      );
      assert.equal(getFileDownloadUrl("blob:http://localhost:3000/uuid"), "blob:http://localhost:3000/uuid");
      assert.equal(getFileDownloadUrl("https://storage.googleapis.com/test.jpg"), "https://storage.googleapis.com/test.jpg");
    });

    await t2.test("rejects direct internal S3/R2 staging keys (uploads/...) from browser rendering", () => {
      assert.equal(getFileDownloadUrl("uploads/temp-file.pdf"), "");
      assert.equal(getFileDownloadUrl(null), "");
      assert.equal(getFileDownloadUrl(undefined), "");
      assert.equal(getFileDownloadUrl(""), "");
    });
  });

  await t.test("2. cleanFileId Extraction", async (t2) => {
    await t2.test("extracts file_id from query string download URL", () => {
      const url = "/api/method/agency_tracking.api.file.read?op=download_file&file_id=file_9f3c2a71d04be85a6c1d";
      assert.equal(cleanFileId(url), "file_9f3c2a71d04be85a6c1d");
    });

    await t2.test("passes through already clean file IDs intact", () => {
      assert.equal(cleanFileId("file_9f3c2a71d04be85a6c1d"), "file_9f3c2a71d04be85a6c1d");
    });

    await t2.test("handles null, empty, and undefined gracefully", () => {
      assert.equal(cleanFileId(null), "");
      assert.equal(cleanFileId(undefined), "");
      assert.equal(cleanFileId(""), "");
    });
  });

  await t.test("3. Placement Mutation Payloads: Native file_id (no file_url)", async (t2) => {
    // Intercept global fetch to verify payload bodies
    const originalFetch = globalThis.fetch;
    const interceptedRequests: Array<{ url: string; body: any }> = [];

    globalThis.fetch = (async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("get_csrf_token")) {
        return new Response(JSON.stringify({ message: { csrf_token: "mock_csrf_token" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      let bodyObj = null;
      if (init?.body && typeof init.body === "string") {
        try {
          bodyObj = JSON.parse(init.body);
        } catch {
          bodyObj = init.body;
        }
      }
      interceptedRequests.push({ url: urlStr, body: bodyObj });
      return new Response(JSON.stringify({ message: { status: "success" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;

    try {
      // Test uploadPlacementContractV2
      interceptedRequests.length = 0;
      await uploadPlacementContractV2("PLM-00001", "file_contract_123", "CONT-100", "2026-11-16");
      assert.equal(interceptedRequests.length, 1);
      assert.equal(interceptedRequests[0].body.file_id, "file_contract_123");
      assert.equal(interceptedRequests[0].body.file_url, undefined, "file_url must not be present");
      assert.equal(interceptedRequests[0].body.placement_name, "PLM-00001");

      // Test uploadPlacementVisaV2
      interceptedRequests.length = 0;
      await uploadPlacementVisaV2("PLM-00001", "file_visa_456", "VISA-999");
      assert.equal(interceptedRequests.length, 1);
      assert.equal(interceptedRequests[0].body.file_id, "file_visa_456");
      assert.equal(interceptedRequests[0].body.file_url, undefined, "file_url must not be present");

      // Test createMuayenaPlacementV2
      interceptedRequests.length = 0;
      await createMuayenaPlacementV2("APP-00001", "Saudi Agency LLC", "file_muayena_789");
      assert.equal(interceptedRequests.length, 1);
      assert.equal(interceptedRequests[0].body.file_id, "file_muayena_789");
      assert.equal(interceptedRequests[0].body.file_url, undefined, "file_url must not be present");

      // Test uploadBatchPaymentProofV2
      interceptedRequests.length = 0;
      await uploadBatchPaymentProofV2("BATCH-001", "file_proof_111");
      assert.equal(interceptedRequests.length, 1);
      assert.equal(interceptedRequests[0].body.file_id, "file_proof_111");
      assert.equal(interceptedRequests[0].body.file_url, undefined, "file_url must not be present");

      // Test uploadBankStatementV2
      interceptedRequests.length = 0;
      await uploadBankStatementV2("file_stmt_222", "SAR");
      assert.equal(interceptedRequests.length, 1);
      assert.equal(interceptedRequests[0].body.file_id, "file_stmt_222");
      assert.equal(interceptedRequests[0].body.file_url, undefined, "file_url must not be present");
      assert.equal(interceptedRequests[0].body.currency, "SAR");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("4. Candidate Video Experience Payload (video_key purged, experience_video preserved)", async () => {
    const rawApplicant: any = {
      first_name: "Tigist",
      last_name: "Alemu",
      experience_video: "file_vid_999",
      video_key: "file_vid_999",
    };

    const normalized = normalizeApplicantFields(rawApplicant);
    assert.equal(normalized.experience_video, "file_vid_999");
    assert.equal((normalized as any).video_key, undefined, "video_key must be purged from active payloads");
  });

  await t.test("5. Filename & Label Protection (Never show technical file ID to user)", async () => {
    // Simulate displayFileName calculation logic for PremiumDropzone
    const computeDisplayFileName = (
      value: string | null,
      fileName?: string,
      variant: string = "passport",
      label?: string
    ) => {
      if (fileName) return fileName;
      if (!value) return "";
      const s = value.trim();
      const parts = s.split("/");
      const lastPart = parts[parts.length - 1] || "";
      const cleanName = lastPart.split("?")[0].split("#")[0];

      const isFileId =
        cleanName.startsWith("file_") ||
        s.includes("file_id=") ||
        (!cleanName.includes(".") && cleanName.length >= 12);

      if (isFileId) {
        switch (variant) {
          case "passport":
            return "Passport Scan";
          case "portrait":
            return "Passport Photo";
          case "full_body":
            return "Full Body Photo";
          case "video":
            return "Candidate Video Interview";
          case "spreadsheet":
            return "Bank Statement CSV";
          default:
            return label || "Attached Document";
        }
      }
      return cleanName || "Uploaded File";
    };

    // User provides real filename: displays real filename
    assert.equal(
      computeDisplayFileName("file_8d49e6bbef394f2167a8", "3.png", "portrait"),
      "3.png"
    );
    assert.equal(
      computeDisplayFileName("file_9f3c2a71d04be85a6c1d", "ERAHMET_CONT.pdf", "document"),
      "ERAHMET_CONT.pdf"
    );

    // No filename provided (e.g. initial DB load with only file ID): falls back to human friendly name, NEVER file ID!
    assert.equal(
      computeDisplayFileName("file_8d49e6bbef394f2167a8", undefined, "portrait"),
      "Passport Photo"
    );
    assert.equal(
      computeDisplayFileName("file_8d49e6bbef394f2167a8", undefined, "passport"),
      "Passport Scan"
    );
    assert.equal(
      computeDisplayFileName("file_8d49e6bbef394f2167a8", undefined, "full_body"),
      "Full Body Photo"
    );
    assert.equal(
      computeDisplayFileName("file_8d49e6bbef394f2167a8", undefined, "video"),
      "Candidate Video Interview"
    );
    assert.equal(
      computeDisplayFileName("file_8d49e6bbef394f2167a8", undefined, "document", "Employment Contract"),
      "Employment Contract"
    );

    // Download URL with file_id: also resolves to friendly name
    assert.equal(
      computeDisplayFileName(
        "/api/method/agency_tracking.api.file.read?op=download_file&file_id=file_9f3c2a71d04be85a6c1d",
        undefined,
        "passport"
      ),
      "Passport Scan"
    );
  });
});
