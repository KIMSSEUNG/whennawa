from typing import Literal

from pydantic import BaseModel, Field


class CompanyCrawlResponse(BaseModel):
    companyUrl: str
    finalUrl: str = ""
    companyName: str = ""
    title: str = ""
    description: str = ""
    headings: list[str] = Field(default_factory=list)
    links: list[str] = Field(default_factory=list)
    rawText: str = ""
    truncated: bool = False
    status: Literal["ok"] = "ok"
