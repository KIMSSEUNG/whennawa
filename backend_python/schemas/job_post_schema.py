from typing import Literal

from pydantic import BaseModel, Field


class JobPostAnalyzeResponse(BaseModel):
    companyName: str = ""
    position: str = ""
    info: list[str] = Field(default_factory=list)
    companyProfile: dict = Field(default_factory=dict)
    embeddingSourceText: str = ""
    ragContextText: str = ""
    essayEmotionText: str = ""
    essayFormalText: str = ""
    essayRawText: str = ""
    essayPromptUsed: str = ""
    llmProvider: str = ""
    llmModel: str = ""
    rawText: str = ""
    confidence: Literal["high", "medium", "low"] = "low"
    missingFields: list[str] = Field(default_factory=list)
