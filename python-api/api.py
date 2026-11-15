from __future__ import annotations

import asyncio
from io import BytesIO
from math import ceil, isfinite
import hmac
import os
from pathlib import Path
from tempfile import gettempdir
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
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


app = FastAPI(title="CoC Matplotlib Charts", docs_url=None, redoc_url=None)
API_TOKEN = os.getenv("MATPLOTLIB_API_TOKEN", "")
CLOUDFLARE_VISITORS_API = os.getenv("CLOUDFLARE_VISITORS_API", "").strip().rstrip("/")


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
    ax.set_xticks(range(len(payload.years)), payload.year_labels)
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
