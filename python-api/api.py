from __future__ import annotations

import asyncio
import base64
from io import BytesIO
import json
from math import ceil, isfinite
import hmac
import os
from pathlib import Path
from tempfile import gettempdir
import time
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request as URLRequest, urlopen
from xml.etree import ElementTree as ET

MATPLOTLIB_CACHE = Path(os.getenv("MPLCONFIGDIR", str(Path(gettempdir()) / "coc-matplotlib-cache")))
MATPLOTLIB_CACHE.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(MATPLOTLIB_CACHE))

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator

SVG = "{http://www.w3.org/2000/svg}"
COLOR_RE = r"^#[0-9a-fA-F]{6}$"
ET.register_namespace("", "http://www.w3.org/2000/svg")
ET.register_namespace("xlink", "http://www.w3.org/1999/xlink")


class Series(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str = Field(min_length=1, max_length=120)
    label: str = Field(min_length=1, max_length=180)
    color: str = Field(pattern=COLOR_RE)
    values: list[float] = Field(max_length=40)


class TrendRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    years: list[int] = Field(min_length=1, max_length=40)
    year_labels: list[str] = Field(min_length=1, max_length=40)
    totals: list[float] = Field(min_length=1, max_length=40)
    series: list[Series] = Field(max_length=20)
    group: Literal["total", "type", "programme"]
    total_label: str = Field(min_length=1, max_length=180)
    aria_label: str = Field(min_length=1, max_length=180)

    @model_validator(mode="after")
    def align_lengths(self):
        if len(self.years) != len(self.year_labels) or len(self.years) != len(self.totals):
            raise ValueError("years, year_labels, and totals must have the same length")
        if any(len(item.values) != len(self.years) for item in self.series):
            raise ValueError("Each series must have one value for every year")
        if any(not isfinite(value) or value < 0 for item in self.series for value in item.values):
            raise ValueError("Series values must be finite and non-negative")
        if any(not isfinite(value) or value < 0 for value in self.totals):
            raise ValueError("Totals must be finite and non-negative")
        return self


class PieItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str = Field(min_length=1, max_length=120)
    label: str = Field(min_length=1, max_length=180)
    color: str = Field(pattern=COLOR_RE)
    value: int = Field(ge=0, le=1000000)


class PieRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[PieItem] = Field(max_length=20)
    total: int = Field(ge=0, le=1000000)
    aria_label: str = Field(min_length=1, max_length=180)

    @model_validator(mode="after")
    def validate_total(self):
        if sum(item.value for item in self.items) != self.total:
            raise ValueError("Pie segment values must add up to the total")
        return self


class StaffLogin(BaseModel):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=256)


class StaffPublication(BaseModel):
    authors: list[str] = Field(min_length=1, max_length=30)
    type: Literal["International Journal Articles", "International Proceedings", "National Journal Articles", "National Proceedings"]
    detail: str = Field(min_length=5, max_length=5000)
    year: int = Field(ge=1900, le=2200)
    month: int = Field(ge=1, le=12)
    index: str = Field(default="", max_length=160)
    psu: Literal["", "Y", "N"] = ""
    programmes: dict[str, list[Literal["AISE", "DE", "COMP", "Dbiz"]]] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_authors(self):
        cleaned = [name.strip() for name in self.authors]
        if any(len(name) < 2 or len(name) > 160 for name in cleaned) or len(set(cleaned)) != len(cleaned):
            raise ValueError("Authors must be unique valid names")
        programme_assignments = {faculty.strip(): values for faculty, values in self.programmes.items()}
        if any(faculty not in cleaned or len(set(values)) != len(values) for faculty, values in programme_assignments.items()):
            raise ValueError("Programme assignments must belong to selected authors and be unique")
        self.authors = cleaned
        self.programmes = programme_assignments
        self.detail = self.detail.strip()
        return self


class StaffProgrammes(BaseModel):
    faculty: str = Field(min_length=2, max_length=160)
    programmes: list[Literal["AISE", "DE", "COMP", "Dbiz"]] = Field(max_length=4)

    @model_validator(mode="after")
    def validate_mapping(self):
        self.faculty = self.faculty.strip()
        if len(set(self.programmes)) != len(self.programmes):
            raise ValueError("Programme values must be unique")
        return self


app = FastAPI(title="CoC Matplotlib Charts", docs_url=None, redoc_url=None)
API_TOKEN = os.getenv("MATPLOTLIB_API_TOKEN", "")
CLOUDFLARE_VISITORS_API = os.getenv("CLOUDFLARE_VISITORS_API", "").strip().rstrip("/")
STAFF_USERNAME = os.getenv("STAFF_USERNAME", "")
STAFF_PASSWORD = os.getenv("STAFF_PASSWORD", "")
STAFF_SESSION_SECRET = os.getenv("STAFF_SESSION_SECRET", "")
STAFF_API_TOKEN = os.getenv("STAFF_API_TOKEN", "")
STAFF_SESSION_COOKIE = "coc_staff_session"
STAFF_SESSION_SECONDS = 8 * 60 * 60


def require_same_origin(request: Request):
    origin = request.headers.get("origin", "")
    forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
    forwarded_proto = request.headers.get("x-forwarded-proto", "https")
    if not origin or origin != f"{forwarded_proto}://{forwarded_host}".rstrip("/"):
        raise HTTPException(status_code=403, detail="Invalid origin")


def create_staff_session(username: str) -> str:
    payload = base64.urlsafe_b64encode(json.dumps({"u": username, "e": int(time.time()) + STAFF_SESSION_SECONDS}, separators=(",", ":")).encode()).decode().rstrip("=")
    signature = hmac.new(STAFF_SESSION_SECRET.encode(), payload.encode(), "sha256").hexdigest()
    return f"{payload}.{signature}"


def staff_session_username(request: Request) -> str | None:
    if not STAFF_SESSION_SECRET:
        return None
    token = request.cookies.get(STAFF_SESSION_COOKIE, "")
    try:
        payload, signature = token.rsplit(".", 1)
        expected = hmac.new(STAFF_SESSION_SECRET.encode(), payload.encode(), "sha256").hexdigest()
        if not hmac.compare_digest(signature, expected):
            return None
        decoded = base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4))
        data = json.loads(decoded)
        if not isinstance(data.get("u"), str) or int(data.get("e", 0)) < int(time.time()):
            return None
        return data["u"]
    except (ValueError, TypeError, json.JSONDecodeError):
        return None


def require_staff(request: Request) -> str:
    username = staff_session_username(request)
    if not username:
        raise HTTPException(status_code=401, detail="Staff sign-in required")
    return username


async def forward_cloudflare_async(path: str, method: str = "GET", body: bytes | None = None, protected: bool = False):
    return await asyncio.to_thread(forward_cloudflare_sync, path, method, body, protected)


def forward_cloudflare_sync(path: str, method: str = "GET", body: bytes | None = None, protected: bool = False):
    if not CLOUDFLARE_VISITORS_API:
        raise HTTPException(status_code=503, detail="Cloudflare D1 API is not configured")
    if protected and not STAFF_API_TOKEN:
        raise HTTPException(status_code=503, detail="Staff API token is not configured")
    api_url = f"{CLOUDFLARE_VISITORS_API}{path}"
    parsed_api_url = urlsplit(CLOUDFLARE_VISITORS_API)
    headers = {"Origin": f"{parsed_api_url.scheme}://{parsed_api_url.netloc}", "User-Agent": "CoC-Academic-Dashboard/1.0"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if protected:
        headers["Authorization"] = f"Bearer {STAFF_API_TOKEN}"
    upstream_request = URLRequest(api_url, data=body, headers=headers, method=method)
    try:
        with urlopen(upstream_request, timeout=20) as upstream:
            return Response(content=upstream.read(), status_code=upstream.status, media_type=upstream.headers.get("content-type", "application/json").split(";", 1)[0], headers={"Cache-Control": "no-store"})
    except HTTPError as error:
        return Response(content=error.read(), status_code=error.code, media_type=error.headers.get("content-type", "application/json").split(";", 1)[0], headers={"Cache-Control": "no-store"})
    except (URLError, TimeoutError, OSError) as error:
        raise HTTPException(status_code=503, detail="Cloudflare D1 API unavailable") from error


def authorize(request: Request):
    if API_TOKEN and not hmac.compare_digest(request.headers.get("Authorization", ""), f"Bearer {API_TOKEN}"):
        raise HTTPException(status_code=401, detail="Unauthorized")


def svg_response(fig, aria_label, apply_metadata):
    buffer = BytesIO()
    try:
        fig.savefig(buffer, format="svg", transparent=True, bbox_inches="tight", pad_inches=0.06)
    finally:
        plt.close(fig)

    try:
        root = ET.fromstring(buffer.getvalue())
    except ET.ParseError as error:
        raise HTTPException(status_code=500, detail="Could not render chart SVG") from error
    root.set("role", "group")
    root.set("aria-label", aria_label)
    apply_metadata(root)
    svg = ET.tostring(root, encoding="unicode", xml_declaration=False)
    return JSONResponse({"svg": svg}, headers={"Cache-Control": "no-store"})


def set_interactive_metadata(root, gid, attributes, label):
    element = next((node for node in root.iter() if node.get("id") == gid), None)
    if element is None:
        raise HTTPException(status_code=500, detail="Rendered chart element is missing")
    element.set("class", "matplotlib-selectable")
    element.set("role", "button")
    element.set("tabindex", "0")
    element.set("aria-label", label)
    for key, value in attributes.items():
        element.set(f"data-{key}", str(value))
    title = ET.SubElement(element, f"{SVG}title")
    title.text = label


@app.get("/health")
def health():
    return {"status": "ok", "renderer": "matplotlib"}


@app.api_route("/api/visitors", methods=["GET", "POST"])
async def visitors(request: Request):
    if not CLOUDFLARE_VISITORS_API:
        raise HTTPException(status_code=503, detail="Cloudflare D1 visitor API is not configured")

    if request.method == "POST":
        origin = request.headers.get("origin", "")
        forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
        forwarded_proto = request.headers.get("x-forwarded-proto", "https")
        expected_origin = f"{forwarded_proto}://{forwarded_host}".rstrip("/")
        if origin != expected_origin:
            raise HTTPException(status_code=403, detail="Invalid origin")
        if int(request.headers.get("content-length", "0") or "0") > 256:
            raise HTTPException(status_code=413, detail="Too large")
        body = await request.body()
        if len(body) > 256:
            raise HTTPException(status_code=413, detail="Too large")
    else:
        body = None

    api_url = f"{CLOUDFLARE_VISITORS_API}/api/visitors"
    parsed_api_url = urlsplit(CLOUDFLARE_VISITORS_API)
    headers = {
        "Origin": f"{parsed_api_url.scheme}://{parsed_api_url.netloc}",
        "User-Agent": "CoC-Academic-Dashboard/1.0",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
    upstream_request = URLRequest(api_url, data=body, headers=headers, method=request.method)

    def forward_request():
        try:
            with urlopen(upstream_request, timeout=12) as upstream:
                return upstream.status, upstream.headers.get("content-type", "application/json"), upstream.read()
        except HTTPError as error:
            return error.code, error.headers.get("content-type", "application/json"), error.read()

    try:
        status, content_type, response_body = await asyncio.to_thread(forward_request)
    except (URLError, TimeoutError, OSError) as error:
        raise HTTPException(status_code=503, detail="Cloudflare D1 visitor API unavailable") from error
    return Response(
        content=response_body,
        status_code=status,
        media_type=content_type.split(";", 1)[0],
        headers={"Cache-Control": "no-store"},
    )


@app.get("/api/publications")
async def publication_overlay():
    return await forward_cloudflare_async("/api/publications")


@app.get("/api/staff/session")
def staff_session(request: Request):
    username = staff_session_username(request)
    return JSONResponse({"authenticated": bool(username), "username": username}, headers={"Cache-Control": "no-store"})


@app.post("/api/staff/login")
def staff_login(payload: StaffLogin, request: Request):
    require_same_origin(request)
    if not STAFF_USERNAME or not STAFF_PASSWORD or not STAFF_SESSION_SECRET:
        raise HTTPException(status_code=503, detail="Staff login is not configured")
    if not hmac.compare_digest(payload.username.encode("utf-8"), STAFF_USERNAME.encode("utf-8")) or not hmac.compare_digest(payload.password.encode("utf-8"), STAFF_PASSWORD.encode("utf-8")):
        raise HTTPException(status_code=401, detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")
    response = JSONResponse({"authenticated": True, "username": STAFF_USERNAME}, headers={"Cache-Control": "no-store"})
    secure = request.headers.get("x-forwarded-proto", request.url.scheme) == "https"
    response.set_cookie(STAFF_SESSION_COOKIE, create_staff_session(STAFF_USERNAME), max_age=STAFF_SESSION_SECONDS,
                        httponly=True, secure=secure, samesite="lax", path="/")
    return response


@app.post("/api/staff/logout")
def staff_logout(request: Request):
    require_same_origin(request)
    response = JSONResponse({"authenticated": False}, headers={"Cache-Control": "no-store"})
    response.delete_cookie(STAFF_SESSION_COOKIE, path="/", httponly=True, secure=request.headers.get("x-forwarded-proto", request.url.scheme) == "https", samesite="lax")
    return response


@app.post("/api/staff/publications")
async def create_publication(payload: StaffPublication, request: Request):
    require_staff(request)
    require_same_origin(request)
    body = json.dumps(payload.model_dump(), ensure_ascii=False).encode()
    return await forward_cloudflare_async("/api/staff/publications", "POST", body, protected=True)


@app.delete("/api/staff/publications/{record_id}")
async def delete_publication(record_id: str, request: Request):
    require_staff(request)
    require_same_origin(request)
    if len(record_id) > 90:
        raise HTTPException(status_code=400, detail="Invalid publication id")
    return await forward_cloudflare_async(f"/api/staff/publications/{quote(record_id, safe='')}", "DELETE", protected=True)


@app.put("/api/staff/publications/{record_id}/restore")
async def restore_publication(record_id: str, request: Request):
    require_staff(request)
    require_same_origin(request)
    if len(record_id) > 90:
        raise HTTPException(status_code=400, detail="Invalid publication id")
    return await forward_cloudflare_async(f"/api/staff/publications/{quote(record_id, safe='')}/restore", "PUT", protected=True)


@app.put("/api/staff/programmes")
async def update_staff_programmes(payload: StaffProgrammes, request: Request):
    require_staff(request)
    require_same_origin(request)
    body = json.dumps(payload.model_dump(), ensure_ascii=False).encode()
    return await forward_cloudflare_async("/api/staff/programmes", "PUT", body, protected=True)


@app.post("/api/charts/trend")
def trend_chart(payload: TrendRequest, request: Request):
    authorize(request)
    fig, ax = plt.subplots(figsize=(8.2, 3.2), dpi=100)
    fig.patch.set_alpha(0)
    ax.set_facecolor("none")
    ax.set_axisbelow(True)

    bottoms = [0.0] * len(payload.years)
    bars_metadata = []
    for series_index, series in enumerate(payload.series):
        bars = ax.bar(
            range(len(payload.years)),
            series.values,
            bottom=bottoms,
            width=0.58,
            color=series.color,
            edgecolor="none",
            linewidth=0,
            zorder=3,
        )
        for year_index, patch in enumerate(bars.patches):
            value = series.values[year_index]
            if value <= 0:
                patch.set_gid(f"coc-trend-{series_index}-{year_index}")
                continue
            patch.set_gid(f"coc-trend-{series_index}-{year_index}")
            total = payload.totals[year_index]
            label = f"{payload.year_labels[year_index]} · {series.label}: {value:g}"
            if payload.group == "total":
                label += f" · {payload.total_label}: {total:g}"
            filter_attrs = {"year": payload.years[year_index]}
            filter_attrs["type" if payload.group == "type" else "programme"] = series.key
            bars_metadata.append((patch.get_gid(), filter_attrs, label))
            bottoms[year_index] += value

    maximum = max(payload.totals or [0], default=0)
    if payload.group != "total" and bottoms:
        maximum = max(maximum, max(bottoms))
    step = max(1, ceil(maximum / 4))
    ax.set_ylim(0, max(step * 4, 1))
    ax.set_yticks(range(0, step * 4 + 1, step))
    year_count = len(payload.years)
    tick_interval = max(1, ceil((year_count - 1) / 9)) if year_count > 10 else 1
    tick_indices = list(range(0, year_count, tick_interval))
    if tick_indices and tick_indices[-1] != year_count - 1:
        tick_indices.append(year_count - 1)
    ax.set_xticks(tick_indices, [payload.year_labels[index] for index in tick_indices])
    ax.grid(axis="y", color="#e7eef2", linewidth=0.8, zorder=0)
    ax.tick_params(axis="both", colors="#668095", labelsize=9, length=0, pad=8)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.margins(x=0.06)

    def add_metadata(root):
        for gid, attributes, label in bars_metadata:
            set_interactive_metadata(root, gid, attributes, label)

    return svg_response(fig, payload.aria_label, add_metadata)


@app.post("/api/charts/pie")
def pie_chart(payload: PieRequest, request: Request):
    authorize(request)
    fig, ax = plt.subplots(figsize=(3.6, 2.75), dpi=100)
    fig.patch.set_alpha(0)
    ax.set_facecolor("none")
    ax.set_aspect("equal")
    ax.axis("off")
    metadata = []

    visible_items = [(index, item) for index, item in enumerate(payload.items) if item.value > 0]
    if payload.total:
        wedges, _ = ax.pie(
            [item.value for _, item in visible_items],
            colors=[item.color for _, item in visible_items],
            startangle=90,
            counterclock=False,
            wedgeprops={"linewidth": 1.5, "edgecolor": "white"},
        )
        for wedge, (index, item) in zip(wedges, visible_items):
            wedge.set_gid(f"coc-pie-{index}")
            percentage = round(item.value / payload.total * 100)
            label = f"{item.label}: {item.value} ({percentage}%)"
            metadata.append((wedge.get_gid(), {"type": item.key}, label))
    else:
        ax.pie([1], colors=["#e7eef2"], startangle=90, wedgeprops={"linewidth": 1.5, "edgecolor": "white"})

    def add_metadata(root):
        for gid, attributes, label in metadata:
            set_interactive_metadata(root, gid, attributes, label)

    return svg_response(fig, payload.aria_label, add_metadata)
