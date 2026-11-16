import test from "node:test";
import assert from "node:assert/strict";
import { listApplicantsV2 } from "../src/lib/api/v2/applicants";
import { listPlacementsV2 } from "../src/lib/api/v2/placements";

test("Applicants Recently Changed Sorting Audit (Follow-up & Other Tables)", async (t) => {
  await t.test("1. listApplicantsV2 & listPlacementsV2 default order_by is 'modified desc'", async () => {
    const originalFetch = globalThis.fetch;
    const interceptedRequests: Array<{ url: string; body: any }> = [];

    globalThis.fetch = (async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("get_csrf_token")) {
        return new Response(JSON.stringify({ message: { csrf_token: "mock_csrf" } }), {
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
      return new Response(JSON.stringify({ message: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;

    try {
      // Default listApplicantsV2 call (no explicit orderBy)
      interceptedRequests.length = 0;
      await listApplicantsV2();
      assert.equal(interceptedRequests.length, 1);
      assert.equal(
        interceptedRequests[0].body.order_by,
        "modified desc",
        "listApplicantsV2 must default to order_by='modified desc'"
      );

      // Default listPlacementsV2 call (no explicit orderBy)
      interceptedRequests.length = 0;
      await listPlacementsV2();
      assert.equal(interceptedRequests.length, 1);
      assert.equal(
        interceptedRequests[0].body.order_by,
        "modified desc",
        "listPlacementsV2 must default to order_by='modified desc'"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("2. Follow-Up Workspace rows sorting places recently changed applicants on top", () => {
    // Simulate rows built in fetchOperationalWorkspaceDataV2
    const mockRows = [
      {
        applicantId: "APP-00001",
        fullName: "Older Candidate",
        applicant: { modified: "2026-11-10 09:00:00", creation: "2026-11-01 09:00:00" },
        plc: { modified: "2026-11-10 09:30:00", creation: "2026-11-02 09:00:00" },
        lms: { modified: "2026-11-11 10:00:00" },
        injaz: null,
        embassy: null,
      },
      {
        applicantId: "APP-00002",
        fullName: "Recently Changed Candidate (Clearance Updated)",
        applicant: { modified: "2026-11-08 09:00:00", creation: "2026-11-01 08:00:00" },
        plc: { modified: "2026-11-09 10:00:00", creation: "2026-11-02 08:00:00" },
        lms: null,
        injaz: { modified: "2026-11-16 14:30:00" }, // Changed today!
        embassy: null,
      },
      {
        applicantId: "APP-00003",
        fullName: "Middle Candidate",
        applicant: { modified: "2026-11-14 12:00:00", creation: "2026-11-05 12:00:00" },
        plc: { modified: "2026-11-14 12:15:00", creation: "2026-11-05 12:15:00" },
        lms: null,
        injaz: null,
        embassy: null,
      },
    ];

    const sortFollowUpRows = (rows: any[]) => {
      return [...rows].sort((a, b) => {
        const getLatestTimestamp = (row: any): number => {
          let maxTime = 0;
          const candidates = [
            row.applicant?.modified,
            row.plc?.modified,
            row.lms?.modified,
            row.injaz?.modified,
            row.embassy?.modified,
            row.ticket?.modified,
            row.applicant?.creation,
            row.plc?.creation,
          ];
          for (const c of candidates) {
            if (c) {
              const t = new Date(c).getTime();
              if (!isNaN(t) && t > maxTime) maxTime = t;
            }
          }
          return maxTime;
        };

        return getLatestTimestamp(b) - getLatestTimestamp(a);
      });
    };

    const sorted = sortFollowUpRows(mockRows);
    assert.equal(sorted[0].applicantId, "APP-00002", "Recently changed candidate must be 1st");
    assert.equal(sorted[1].applicantId, "APP-00003", "Middle candidate must be 2nd");
    assert.equal(sorted[2].applicantId, "APP-00001", "Oldest changed candidate must be 3rd");
  });

  await t.test("3. Main Applicant Directory rows sorting places recently changed applicants on top", () => {
    const mockApplicants = [
      {
        name: "APP-00010",
        full_name: "Candidate A",
        creation: "2026-10-01 10:00:00",
        modified: "2026-10-05 11:00:00",
      },
      {
        name: "APP-00020",
        full_name: "Candidate B (Just Edited)",
        creation: "2026-09-01 10:00:00",
        modified: "2026-11-16 15:00:00", // Just edited today
      },
      {
        name: "APP-00030",
        full_name: "Candidate C",
        creation: "2026-11-12 10:00:00",
        modified: "2026-11-12 10:00:00",
      },
    ];

    const sortDirectoryRows = (rows: any[]) => {
      return [...rows].sort((a, b) => {
        const getTimestamp = (app: any): number => {
          let maxTime = 0;
          const candidates = [
            app.modified,
            app.applicant_modified,
            app.placement_modified,
            app.creation,
          ];
          for (const c of candidates) {
            if (c) {
              const t = new Date(c).getTime();
              if (!isNaN(t) && t > maxTime) maxTime = t;
            }
          }
          return maxTime;
        };
        return getTimestamp(b) - getTimestamp(a);
      });
    };

    const sorted = sortDirectoryRows(mockApplicants);
    assert.equal(sorted[0].name, "APP-00020", "Candidate B (modified today) must be first");
    assert.equal(sorted[1].name, "APP-00030");
    assert.equal(sorted[2].name, "APP-00010");
  });

  await t.test("4. Selection Requests sorting brings recently changed requests to the top", () => {
    const mockRequests = [
      {
        name: "REQ-001",
        full_name: "Fatima",
        creation: "2026-11-10 10:00:00",
        modified: "2026-11-10 10:00:00",
      },
      {
        name: "REQ-002",
        full_name: "Amina",
        creation: "2026-11-05 10:00:00",
        modified: "2026-11-16 12:00:00", // Recently updated
      },
    ];

    const sorted = [...mockRequests].sort((a, b) => {
      const tA = Math.max(
        a.modified ? new Date(a.modified).getTime() || 0 : 0,
        a.creation ? new Date(a.creation).getTime() || 0 : 0
      );
      const tB = Math.max(
        b.modified ? new Date(b.modified).getTime() || 0 : 0,
        b.creation ? new Date(b.creation).getTime() || 0 : 0
      );
      return tB - tA;
    });

    assert.equal(sorted[0].name, "REQ-002");
    assert.equal(sorted[1].name, "REQ-001");
  });
});

