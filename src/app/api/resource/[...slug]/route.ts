import { NextRequest, NextResponse } from "next/server";

function getFrappeConfig(req: NextRequest) {
  const url =
    process.env.FRAPPE_BASE_URL ||
    process.env.NEXT_PUBLIC_FRAPPE_URL ||
    "https://applicantprocessing-production-e2e7.up.railway.app";

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const cookie = req.headers.get("cookie");
  const authHeader = req.headers.get("authorization");

  // Forward user session credentials transparently
  if (cookie) {
    headers["Cookie"] = cookie;
  }
  if (authHeader) {
    headers["Authorization"] = authHeader;
  } else if (process.env.FRAPPE_API_KEY && process.env.FRAPPE_API_SECRET) {
    const hasValidUserSession = Boolean(
      cookie &&
      cookie.includes("sid=") &&
      !cookie.includes("sid=Guest") &&
      !cookie.includes("sid=;")
    );
    if (!hasValidUserSession) {
      headers["Authorization"] = `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}`;
    }
  }

  return {
    url: url.replace(/\/$/, ""),
    headers,
  };
}

async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, init);
      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

const SKILL_KEYS = [
  "skill_cleaning",
  "skill_cooking",
  "skill_washing",
  "skill_ironing",
  "skill_baby_sitting",
  "skill_baby_care",
  "skill_children_care",
  "skill_arabic_cooking",
  "skill_sewing",
  "skill_elder_care",
  "skill_elderly_care",
  "skill_driving",
];

function sanitizeApplicantBody(body: any) {
  if (!body || typeof body !== "object") return;
  for (const key of SKILL_KEYS) {
    if (key in body) {
      const val = body[key];
      if (
        val === true ||
        val === "True" ||
        val === "true" ||
        val === 1 ||
        val === "1" ||
        val === "YES" ||
        val === "yes"
      ) {
        body[key] = 1;
      } else if (
        val === false ||
        val === "False" ||
        val === "false" ||
        val === 0 ||
        val === "0" ||
        val === "" ||
        val === null ||
        val === undefined
      ) {
        body[key] = 0;
      }
    }
  }
}

function sanitizeClearanceBody(body: any, doctype: string) {
  if (!body || typeof body !== "object") return;
  if (body.employee && typeof body.employee === "string") {
    const match = body.employee.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      body.employee = match[1].trim();
    } else {
      body.employee = body.employee.trim();
    }
  }
  if (doctype === "LMS Clearance" && Array.isArray(body.financials)) {
    body.financials = body.financials.map((f: any) => ({
      ...f,
      category: f.category || "Agency Commission",
    }));
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const doctype = decodeURIComponent(slug[0] || "");
  const rawDocname = slug[1] ? decodeURIComponent(slug[1]) : null;
  const docname = rawDocname && rawDocname !== "None" && rawDocname !== "undefined" ? rawDocname : null;
  const config = getFrappeConfig(req);

  try {
    const search = req.nextUrl.search || "";
    const url = docname
      ? `${config.url}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}${search}`
      : `${config.url}/api/resource/${encodeURIComponent(doctype)}${search}`;

    const res = await fetchWithRetry(url, {
      method: "GET",
      headers: config.headers,
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({ message: "Non-JSON response from backend" }));
    const response = NextResponse.json(data, { status: res.status });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  } catch (err: any) {
    return NextResponse.json(
      {
        exc_type: "BackendConnectionError",
        message: `Unable to connect to backend engine: ${err.message}`,
      },
      { status: 502 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const doctype = decodeURIComponent(slug[0] || "");
  const config = getFrappeConfig(req);

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (doctype === "Applicant") {
      sanitizeApplicantBody(body);
    }
    if (doctype.includes("Clearance")) {
      sanitizeClearanceBody(body, doctype);
    }

    const forwardHeaders: Record<string, string> = {
      ...config.headers,
      "Content-Type": "application/json",
    };

    const url = `${config.url}/api/resource/${encodeURIComponent(doctype)}`;
    const res = await fetchWithRetry(url, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({ message: "Non-JSON response from backend" }));
    const response = NextResponse.json(data, { status: res.status });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  } catch (err: any) {
    return NextResponse.json(
      {
        exc_type: "BackendConnectionError",
        message: `Unable to connect to backend engine: ${err.message}`,
      },
      { status: 502 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const doctype = decodeURIComponent(slug[0] || "");
  const rawDocname = slug[1] ? decodeURIComponent(slug[1]) : "";
  let docname = rawDocname && rawDocname !== "None" && rawDocname !== "undefined" ? rawDocname : "";
  const config = getFrappeConfig(req);

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (doctype === "Applicant") {
      sanitizeApplicantBody(body);
    }
    if (doctype.includes("Clearance")) {
      sanitizeClearanceBody(body, doctype);
    }

    const forwardHeaders: Record<string, string> = {
      ...config.headers,
      "Content-Type": "application/json",
    };

    // If docname is empty / invalid but dsr is provided in body, look up existing clearance doc
    if (!docname && body.dsr) {
      try {
        const lookupRes = await fetchWithRetry(
          `${config.url}/api/resource/${encodeURIComponent(doctype)}?filters=[["dsr","=","${encodeURIComponent(body.dsr)}"]]&fields=["name"]&limit_page_length=1`,
          { method: "GET", headers: config.headers, cache: "no-store" }
        );
        if (lookupRes.ok) {
          const lookupJson = await lookupRes.json();
          if (lookupJson.data?.[0]?.name) {
            docname = lookupJson.data[0].name;
          }
        }
      } catch {}
    }

    // If still no docname, route to POST if creating new clearance linked to DSR
    if (!docname) {
      if (body.dsr) {
        const createRes = await fetchWithRetry(`${config.url}/api/resource/${encodeURIComponent(doctype)}`, {
          method: "POST",
          headers: forwardHeaders,
          body: JSON.stringify(body),
        });
        const createData = await createRes.json().catch(() => ({ message: "Non-JSON response from backend" }));
        const response = NextResponse.json(createData, { status: createRes.status });
        const setCookie = createRes.headers.get("set-cookie");
        if (setCookie) response.headers.set("set-cookie", setCookie);
        return response;
      }
      return NextResponse.json(
        { exc_type: "ValidationError", message: `Missing document identifier for ${doctype}` },
        { status: 400 }
      );
    }

    // For LMS Clearance with status Issued or updating fields, if financials not in payload, fetch existing
    if (doctype === "LMS Clearance" && !body.financials) {
      try {
        const exRes = await fetchWithRetry(
          `${config.url}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}`,
          { method: "GET", headers: config.headers, cache: "no-store" }
        );
        if (exRes.ok) {
          const exJson = await exRes.json();
          if (exJson.data?.financials && Array.isArray(exJson.data.financials)) {
            body.financials = exJson.data.financials.map((f: any) => ({
              ...f,
              category: f.category || "Agency Commission",
            }));
          }
        }
      } catch {}
    }

    const url = `${config.url}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}`;
    const res = await fetchWithRetry(url, {
      method: "PUT",
      headers: forwardHeaders,
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({ message: "Non-JSON response from backend" }));
    const response = NextResponse.json(data, { status: res.status });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  } catch (err: any) {
    return NextResponse.json(
      {
        exc_type: "BackendConnectionError",
        message: `Unable to connect to backend engine: ${err.message}`,
      },
      { status: 502 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const doctype = decodeURIComponent(slug[0] || "");
  const docname = slug[1] ? decodeURIComponent(slug[1]) : "";
  const config = getFrappeConfig(req);

  try {
    const url = `${config.url}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}`;
    const res = await fetchWithRetry(url, {
      method: "DELETE",
      headers: config.headers,
    });

    const data = await res.json().catch(() => ({ message: "Non-JSON response from backend" }));
    const response = NextResponse.json(data, { status: res.status });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  } catch (err: any) {
    return NextResponse.json(
      {
        exc_type: "BackendConnectionError",
        message: `Unable to connect to backend engine: ${err.message}`,
      },
      { status: 502 }
    );
  }
}
