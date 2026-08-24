import { NextRequest, NextResponse } from "next/server";

function getFrappeConfig(req: NextRequest) {
  const url =
    process.env.FRAPPE_BASE_URL ||
    process.env.NEXT_PUBLIC_FRAPPE_URL ||
    "https://applicantprocessing-production.up.railway.app";

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
  }

  return {
    url: url.replace(/\/$/, ""),
    headers,
  };
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
        body[key] = "YES";
      } else if (
        val === false ||
        val === "False" ||
        val === "false" ||
        val === 0 ||
        val === "0" ||
        val === "" ||
        val === null
      ) {
        body[key] = "";
      }
    }
  }
}

function sanitizeClearanceBody(body: any) {
  if (!body || typeof body !== "object") return;
  if (body.employee && typeof body.employee === "string") {
    const match = body.employee.match(/\(([^)]+@[^)]+)\)/);
    if (match) {
      body.employee = match[1].trim();
    } else {
      const emailMatch = body.employee.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        body.employee = emailMatch[0].trim();
      }
    }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const doctype = decodeURIComponent(slug[0] || "");
  const docname = slug[1] ? decodeURIComponent(slug[1]) : null;
  const config = getFrappeConfig(req);

  try {
    const search = req.nextUrl.search || "";
    const url = docname
      ? `${config.url}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}${search}`
      : `${config.url}/api/resource/${encodeURIComponent(doctype)}${search}`;

    const res = await fetch(url, {
      method: "GET",
      headers: config.headers,
      cache: "no-store",
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
      sanitizeClearanceBody(body);
    }

    const forwardHeaders: Record<string, string> = {
      ...config.headers,
      "Content-Type": "application/json",
    };

    const url = `${config.url}/api/resource/${encodeURIComponent(doctype)}`;
    const res = await fetch(url, {
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
  const docname = slug[1] ? decodeURIComponent(slug[1]) : "";
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
      sanitizeClearanceBody(body);
    }

    const forwardHeaders: Record<string, string> = {
      ...config.headers,
      "Content-Type": "application/json",
    };

    const url = `${config.url}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}`;
    const res = await fetch(url, {
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
    const res = await fetch(url, {
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
